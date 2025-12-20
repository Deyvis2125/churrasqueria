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
import { db, auth } from "../../firebase/config";
import { useNavigate } from 'react-router-dom';
import { logAudit, archiveDeletedEntity } from "../../services/auditService.js";
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
const PedidoRow = ({ pedido, actions = [], loadingId }) => (
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
      {actions.map((a, i) => (
        <BigButton
          key={i}
          onClick={() => a.onClick(pedido)}
          disabled={(loadingId === pedido.id) || a.disabled}
          primary={!!a.primary}
          style={{ marginRight: 8 }}
        >
          {loadingId === pedido.id && a.showLoading ? 'Cargando...' : <>{a.icon} {a.text}</>}
        </BigButton>
      ))}
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

    try {
      await logAudit({
        userId: auth.currentUser?.uid || null,
        userName: auth.currentUser?.displayName || null,
        userRole: 'mozo',
        action: 'update',
        entityType: 'pedido',
        entityId: pedido.id,
        entityName: `Pedido Mesa ${pedido.mesaNumero}`,
        oldValues: { estado: 'pendiente' },
        newValues: { estado: 'entregado' },
      });
    } catch (e) {
      console.error('logAudit error', e);
    }
  });

  // Los mozos no pueden eliminar pedidos desde aquí. La eliminación
  // queda reservada para otros roles (p. ej. admin/cajero).

  const navigate = useNavigate();
  const editarPedido = (p) => {
    navigate(`/mozo/editar-pedido/${p.id}`);
  };

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
                  loadingId={loadingId}
                  actions={[
                    { onClick: marcarEntregado, text: 'Marcar Entregado', icon: '✅', primary: true, showLoading: true },
                    { onClick: editarPedido, text: 'Editar', icon: '✏️' },
                  ]}
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
              </tr>
            </thead>
            <tbody>
              {pedidosEntregados.map((p) => (
                <tr key={p.id}>
                  <td>{p.mesaNumero}</td>
                  <td>{formatDate(p.createdAt)}</td>
                  <td>
                    <ul>
                      {(p.items || []).map((item, idx) => (
                        <li key={idx}>{item.qty}x {item.plato}</li>
                      ))}
                    </ul>
                  </td>
                  <td>S/ {p.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
