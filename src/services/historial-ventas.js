import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  writeBatch,
  runTransaction,
  increment,
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
    hideFromCajero: true,
  };

  // Guardar todo en una transacción para evitar problemas de concurrencia
  const result = await runTransaction(db, async (tx) => {
    // Releer pedido dentro de la transacción
    const pedidoSnapTx = await tx.get(pedidoRef);
    if (!pedidoSnapTx.exists()) throw new Error('El pedido no existe (tx).');
    const pedidoTx = pedidoSnapTx.data();
    if (pedidoTx.estado !== 'entregado') throw new Error('Solo se puede cobrar pedidos en estado ENTREGADO. (tx)');

    // Obtener datos de la reserva (si aplica)
    let reservationRef = null;
    if (reservationId) {
      reservationRef = doc(db, 'comprobante_reservas', reservationId);
      const reservationSnap = await tx.get(reservationRef);
      if (reservationSnap.exists()) {
        const r = reservationSnap.data();
        historialData.series = r.series || null;
        historialData.number = r.number || null;
      } else {
        // si la reserva no existe o fue consumida, lanzar error
        throw new Error('Reserva de comprobante no encontrada o ya usada.');
      }
    }

    const histRef = doc(collection(db, 'historial_ventas'));
    // incluir fecha exacta de creación con serverTimestamp
    historialData.createdAt = serverTimestamp();
    tx.set(histRef, historialData);

    // Marcar reserva como usada y enlazar historial
    if (reservationRef) {
      tx.update(reservationRef, { status: 'used', usedAt: serverTimestamp(), historialId: histRef.id });
    }

    // Marcar pedido como cancelado (pagado)
    tx.update(pedidoRef, { estado: 'cancelado' });

    // Liberar mesa si aplica
    if (pedidoTx.mesaId) {
      const mesaRef = doc(db, 'mesa', pedidoTx.mesaId);
      tx.update(mesaRef, { disponible: true });
    }

    return { historialId: histRef.id, series: historialData.series || null, number: historialData.number || null };
  });
  // Auditoría: registrar movimiento de caja / cobro (fuera de la transacción)
  try {
    await logAudit({
      userId: cajeroId || auth.currentUser?.uid || null,
      userName: auth.currentUser?.displayName || null,
      userRole: 'cajero',
      action: 'create',
      entityType: 'historial_ventas',
      entityId: result.historialId,
      entityName: `Venta Pedido ${pedidoId}`,
      newValues: historialData,
    });
  } catch (e) {
    console.error('logAudit error', e);
  }

  return { ok: true, historialId: result.historialId, series: result.series, number: result.number };
}

/**
 * Reserva (sin persistir historial) un número para la serie indicada.
 * Usa increment() para evitar problemas de precondición en concurrencia.
 * Devuelve { reservationId, series, number }
 */
export async function reserveComprobante(tipoComprobante = 'Boleta', pedidoId = null, userId = null) {
  const series = (String(tipoComprobante).toLowerCase().startsWith('f') || String(tipoComprobante).toLowerCase() === 'factura') ? 'F001' : 'B001';
  const counterRef = doc(db, 'counters', series);

  try {
    // Leer el contador actual (fuera de transacción)
    const counterSnap = await getDoc(counterRef);
    let currentLast = counterSnap.exists() ? (Number(counterSnap.data().last || 0)) : 0;
    const next = currentLast + 1;

    // Reservar: crear doc de reserva e incrementar contador en misma operación
    const result = await runTransaction(db, async (tx) => {
      // Usar increment() para actualizar el contador de forma atómica (sin precondición)
      tx.update(counterRef, { last: increment(1) }, { merge: true });

      const formattedNumber = String(next).padStart(7, '0');
      const reservaRef = doc(collection(db, 'comprobante_reservas'));
      tx.set(reservaRef, {
        series,
        number: formattedNumber,
        pedidoId: pedidoId || null,
        userId: userId || null,
        reservedBy: userId || null,
        status: 'reserved',
        reservedAt: serverTimestamp(),
      });

      return { reservationId: reservaRef.id, series, number: formattedNumber };
    });

    return result;
  } catch (err) {
    console.error('⚠️ Error en reserveComprobante:', err.message);
    // Fallback: crear la reserva sin incrementar el counter
    const next = Math.floor(Math.random() * 1000000) + 1;
    const formattedNumber = String(next).padStart(7, '0');
    const reservaRef = doc(collection(db, 'comprobante_reservas'));
    await setDoc(reservaRef, {
      series,
      number: formattedNumber,
      pedidoId: pedidoId || null,
      userId: userId || null,
      reservedBy: userId || null,
      status: 'reserved',
      reservedAt: serverTimestamp(),
    });
    console.warn(`⚠️ Reserva fallback creada: ${series} ${formattedNumber}`);
    return { reservationId: reservaRef.id, series, number: formattedNumber };
  }
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

export async function markComprobantePrinted(historialId, printedBy, printUrl = null) {
  try {
    const ref = doc(db, 'historial_ventas', historialId);
    const batch = writeBatch(db);
    const updateData = { printedAt: serverTimestamp(), printedBy: printedBy || auth.currentUser?.uid || null };
    if (printUrl) updateData.printUrl = printUrl;
    batch.update(ref, updateData);
    await batch.commit();
    return { ok: true };
  } catch (e) {
    console.error('markComprobantePrinted error', e);
    try {
      const r = doc(db, 'historial_ventas', historialId);
      const b = writeBatch(db);
      const updateData = { printedAt: serverTimestamp(), printedBy: printedBy || auth.currentUser?.uid || null };
      if (printUrl) updateData.printUrl = printUrl;
      b.update(r, updateData);
      await b.commit();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err };
    }
  }
}
