import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { BigButton, Card } from "./mozo.ui";

// Helper para formatear fecha
const formatDate = (timestamp) => {
  if (!timestamp || !timestamp.seconds) return "Fecha no disponible";
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Componente para una fila de pedido (reutilizable)
const PedidoRow = ({ pedido, onAction, actionText, actionIcon, loading, disabled }) => (
  <tr>
    <td>{pedido.mesaNumero}</td>
    <td>{formatDate(pedido.createdAt)}</td>
    <td>
      <ul>
        {(pedido.items || []).map((item, idx) => (
          <li key={idx}>
            {item.qty}x {item.plato}
          </li>
        ))}
      </ul>
    </td>
    <td>S/ {pedido.total.toFixed(2)}</td>
    <td>
      <BigButton
        onClick={() => onAction(pedido)}
        disabled={loading || disabled}
        primary={!disabled}
      >
        {loading ? "Cargando..." : <>{actionIcon} {actionText}</>}
      </BigButton>
    </td>
  </tr>
);

export default function MozoPedidosActivos() {
  const [pedidos, setPedidos] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    const qRef = query(collection(db, "pedidos"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(qRef, (snap) => {
      setPedidos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const pedidosPendientes = useMemo(() => {
    return pedidos.filter((p) => p.estado === "pendiente");
  }, [pedidos]);

  const pedidosEntregados = useMemo(() => {
    return pedidos.filter((p) => p.estado === "entregado");
  }, [pedidos]);

  const handleAction = async (pedido, action) => {
    setLoadingId(pedido.id);
    try {
      await action(pedido);
    } catch (e) {
      console.error(e);
      alert(`No se pudo realizar la acción: ${e.message}`);
    } finally {
      setLoadingId(null);
    }
  };
  
  const marcarEntregado = (p) => handleAction(p, async (pedido) => {
    await updateDoc(doc(db, "pedidos", pedido.id), { estado: "entregado" });
  });

  const eliminarPedido = (p) => handleAction(p, async (pedido) => {
    const ok = confirm(`¿Eliminar el pedido de la Mesa ${pedido.mesaNumero} y liberar la mesa?`);
    if (!ok) return;

    const batch = writeBatch(db);
    batch.delete(doc(db, "pedidos", pedido.id));
    if (pedido.mesaId) {
      batch.update(doc(db, "mesa", pedido.mesaId), { disponible: true });
    }
    await batch.commit();
  });

  return (
    <div className="pedidos-wrap">
      <Card>
        <h2>Pedidos Pendientes</h2>
        {pedidosPendientes.length === 0 ? (
          <p className="muted">No hay pedidos pendientes.</p>
        ) : (
          <table className="pedidos-table">
            <thead>
              <tr>
                <th>Mesa</th>
                <th>Fecha</th>
                <th>Items</th>
                <th>Total</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {pedidosPendientes.map((p) => (
                <PedidoRow
                  key={p.id}
                  pedido={p}
                  onAction={marcarEntregado}
                  actionText="Marcar Entregado"
                  actionIcon="✅"
                  loading={loadingId === p.id}
                />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <h2>Pedidos Entregados</h2>
        {pedidosEntregados.length === 0 ? (
          <p className="muted">No hay pedidos entregados.</p>
        ) : (
          <table className="pedidos-table">
            <thead>
              <tr>
                <th>Mesa</th>
                <th>Fecha</th>
                <th>Items</th>
                <th>Total</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {pedidosEntregados.map((p) => (
                <PedidoRow
                  key={p.id}
                  pedido={p}
                  onAction={eliminarPedido}
                  actionText="Eliminar y Liberar Mesa"
                  actionIcon="🗑️"
                  loading={loadingId === p.id}
                />
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
