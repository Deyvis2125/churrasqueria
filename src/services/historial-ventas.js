import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { logAudit } from "./auditService.js";

/**
 * COBRAR pedido:
 * - pedido debe estar en "entregado"
 * - crea doc en historial_ventas (aquí "nace" la colección si no existe)
 * - cambia pedido.estado a "cancelado"
 * - libera mesa
 */
export async function cobrarPedidoYGuardarHistorial(pedidoId, cajeroId = null, datosPago = null, reservationId = null) {
  const pedidoRef = doc(db, "pedidos", pedidoId);
  const pedidoSnap = await getDoc(pedidoRef);

  if (!pedidoSnap.exists()) throw new Error("El pedido no existe.");

  const pedido = pedidoSnap.data();

  if (pedido.estado !== "entregado") {
    throw new Error("Solo se puede cobrar pedidos en estado ENTREGADO.");
  }

  const historialData = {
    pedidoId,
    estado: "cancelado",
    fechaHora: serverTimestamp(),

    mesaId: pedido.mesaId || null,
    mesaNumero: Number(pedido.mesaNumero || 0),

    mozoId: pedido.mozoId || null,
    cajeroId: cajeroId || null,

    items: Array.isArray(pedido.items) ? pedido.items : [],
    total: Number(pedido.total || 0),
    // Incluir datos del comprobante si vienen desde la UI
    documentType: datosPago?.tipoComprobante || null,
    payments: datosPago?.payments || null,
    customer: datosPago?.cliente || null,
  };

  const batch = writeBatch(db);

  // 1) Guardar en historial_ventas (CREA la colección automáticamente)
  // Antes de guardar, generar serie y número único (atomically) si es necesario
  // If there's a reservation, try to read it and mark it used in the same batch
  let reservationRef = null;
  if (reservationId) {
    try {
      reservationRef = doc(db, 'comprobante_reservas', reservationId);
      const reservationSnap = await getDoc(reservationRef);
      if (reservationSnap.exists()) {
        const r = reservationSnap.data();
        historialData.series = r.series || null;
        historialData.number = r.number || null;
      }
    } catch (e) {
      console.error('Error leyendo reservation:', e);
    }
  }

  const histRef = doc(collection(db, "historial_ventas"));
  batch.set(histRef, historialData);

  // If we have a reservationRef, mark it as used by linking to historialId
  if (reservationRef) {
    batch.update(reservationRef, { status: 'used', usedAt: serverTimestamp(), historialId: histRef.id });
  }

  // 2) Marcar pedido como cancelado (pagado)
  batch.update(pedidoRef, { estado: "cancelado" });

  // 3) Liberar mesa
  if (pedido.mesaId) {
    const mesaRef = doc(db, "mesa", pedido.mesaId);
    batch.update(mesaRef, { disponible: true });
  }

  await batch.commit();
  // Auditoría: registrar movimiento de caja / cobro
  try {
    await logAudit({
      userId: cajeroId || auth.currentUser?.uid || null,
      userName: auth.currentUser?.displayName || null,
      userRole: 'cajero',
      action: 'create',
      entityType: 'historial_ventas',
      entityId: histRef.id,
      entityName: `Venta Pedido ${pedidoId}`,
      newValues: historialData,
    });
  } catch (e) {
    console.error('logAudit error', e);
  }

  return { ok: true, historialId: histRef.id };
}

/**
 * Reserva (sin persistir historial) un número para la serie indicada.
 * Crea/actualiza contador en `counters/{series}` y añade doc en `comprobante_reservas`.
 * Devuelve { reservationId, series, number }
 */
export async function reserveComprobante(tipoComprobante = 'Boleta', pedidoId = null, userId = null) {
  const series = (String(tipoComprobante).toLowerCase().startsWith('f') || String(tipoComprobante).toLowerCase() === 'factura') ? 'F001' : 'B001';
  const counterRef = doc(db, 'counters', series);

  const result = await runTransaction(db, async (tx) => {
    const ctr = await tx.get(counterRef);
    let next = 1;
    if (ctr.exists()) {
      const last = Number(ctr.data().last || 0);
      next = last + 1;
      tx.update(counterRef, { last: next });
    } else {
      tx.set(counterRef, { last: 1 });
      next = 1;
    }

    const formattedNumber = String(next).padStart(7, '0');
    const reservaRef = doc(collection(db, 'comprobante_reservas'));
    tx.set(reservaRef, {
      series,
      number: formattedNumber,
      pedidoId: pedidoId || null,
      userId: userId || null,
      status: 'reserved',
      reservedAt: serverTimestamp(),
    });

    return { reservationId: reservaRef.id, series, number: formattedNumber };
  });

  return result;
}

export async function cancelComprobanteReservation(reservationId, reason = null) {
  try {
    const ref = doc(db, 'comprobante_reservas', reservationId);
    const batch = writeBatch(db);
    batch.update(ref, { status: 'cancelled', cancelledAt: serverTimestamp(), cancelReason: reason || null });
    await batch.commit();
    return { ok: true };
  } catch (e) {
    // fallback to update without batch
    try {
      const r = doc(db, 'comprobante_reservas', reservationId);
      const b = writeBatch(db);
      b.update(r, { status: 'cancelled', cancelledAt: serverTimestamp(), cancelReason: reason || null });
      await b.commit();
      return { ok: true };
    } catch (err) {
      console.error('cancelComprobanteReservation error', err);
      return { ok: false, error: err };
    }
  }
}
