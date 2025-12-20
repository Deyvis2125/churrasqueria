import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
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
export async function cobrarPedidoYGuardarHistorial(pedidoId, cajeroId = null) {
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
  };

  const batch = writeBatch(db);

  // 1) Guardar en historial_ventas (CREA la colección automáticamente)
  const histRef = doc(collection(db, "historial_ventas"));
  batch.set(histRef, historialData);

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
