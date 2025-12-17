import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { BigButton, Card, Pill } from "./mozo.ui";

export default function MozoPedidosActivos() {
  const [pedidos, setPedidos] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    const qRef = query(collection(db, "pedidos"), orderBy("createdAt", "asc"));
    return onSnapshot(qRef, (snap) => {
      setPedidos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const activos = useMemo(() => {
    // Mostrar pedidos pendientes o entregados
    return pedidos.filter(
      (p) => p.estado === "pendiente" || p.estado === "entregado"
    );
  }, [pedidos]);

  // ✅ Marcar ENTREGADO (NO libera mesa)
  const marcarEntregado = async (p) => {
    try {
      setLoadingId(p.id);

      await updateDoc(doc(db, "pedidos", p.id), {
        estado: "entregado",
      });
    } catch (e) {
      console.error(e);
      alert("No se pudo marcar como entregado");
    } finally {
      setLoadingId(null);
    }
  };

  // ✅ Eliminar pedido y LIBERAR mesa
  const eliminarPedido = async (p) => {
    const ok = confirm(
      `¿Eliminar el pedido de la Mesa ${p.mesaNumero} y liberar la mesa?`
    );
    if (!ok) return;

    try {
      setLoadingId(p.id);

      const batch = writeBatch(db);

      // 🗑️ eliminar pedido
      batch.delete(doc(db, "pedidos", p.id));

      // 🪑 liberar mesa
      if (p.mesaId) {
        batch.update(doc(db, "mesa", p.mesaId), {
          disponible: true,
        });
      }

      await batch.commit();
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar el pedido");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="pedidos-wrap">
      <Card>
        <h2>Pedidos Activos (Mozo)</h2>
        <p className="muted">
          <b>ENTREGADO</b> no libera mesa. <br />
          <b>Eliminar pedido</b> SÍ libera la mesa.
        </p>
      </Card>

      {activos.length === 0 ? (
        <Card>
          <p className="muted">No hay pedidos activos.</p>
        </Card>
      ) : (
        <div className="pedidos-grid">
          {activos.map((p) => (
            <Card key={p.id}>
              <div className="pedido-head">
                <div>
                  <h3>Mesa {p.mesaNumero}</h3>
                  <Pill>{p.estado}</Pill>
                </div>
                <div className="pedido-total">
                  Total: <b>S/ {p.total}</b>
                </div>
              </div>

              <div className="pedido-items">
                {(p.items || []).map((it, idx) => (
                  <div key={idx} className="pedido-line">
                    <span>
                      {it.plato} {it.qty ? `x${it.qty}` : ""}
                    </span>
                    <b>S/ {it.subtotal ?? it.precio}</b>
                  </div>
                ))}
              </div>

              {/* BOTONES GRANDES */}
              <div style={{ display: "grid", gap: 10 }}>
                <BigButton
                  primary
                  onClick={() => marcarEntregado(p)}
                  disabled={loadingId === p.id || p.estado !== "pendiente"}
                >
                  {loadingId === p.id
                    ? "Actualizando..."
                    : p.estado === "entregado"
                    ? "✅ Ya ENTREGADO"
                    : "✅ Marcar ENTREGADO"}
                </BigButton>

                <BigButton
                  onClick={() => eliminarPedido(p)}
                  disabled={loadingId === p.id}
                >
                  🗑️ Eliminar pedido y liberar mesa
                </BigButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
