import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { cobrarPedidoYGuardarHistorial } from "../../services/historial-ventas";

const money = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

export default function CajeroEntregados() {
  const [pedidos, setPedidos] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    const qRef = query(collection(db, "pedidos"), orderBy("createdAt", "asc"));
    return onSnapshot(qRef, (snap) => {
      setPedidos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const entregados = useMemo(
    () => pedidos.filter((p) => p.estado === "entregado"),
    [pedidos]
  );

  const cobrar = async (p) => {
    try {
      setLoadingId(p.id);

      const cajeroId = auth.currentUser?.uid || null;
      await cobrarPedidoYGuardarHistorial(p.id, cajeroId);

      alert("✅ Cobrado: guardado en historial y mesa liberada.");
    } catch (e) {
      console.error(e);
      alert("❌ " + (e.message || "No se pudo cobrar"));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div>
      <h2>Pedidos ENTREGADOS (para cobrar)</h2>
      <p style={{ opacity: 0.8 }}>
        Al cobrar se guarda en <b>historial_ventas</b> y se libera la mesa.
      </p>

      {entregados.length === 0 ? (
        <p style={{ opacity: 0.8 }}>No hay pedidos entregados.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {entregados.map((p) => (
            <div
              key={p.id}
              style={{
                border: "1px solid rgba(255,255,255,.14)",
                borderRadius: 18,
                padding: 14,
                background: "rgba(0,0,0,.25)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>Mesa {p.mesaNumero}</h3>
                  <div style={{ opacity: 0.8 }}>Estado: <b>{p.estado}</b></div>
                </div>
                <div style={{ fontSize: 18 }}>
                  Total: <b>{money(p.total)}</b>
                </div>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {(p.items || []).map((it, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{it.plato} x{it.qty}</span>
                    <b>{money(it.subtotal ?? it.precio)}</b>
                  </div>
                ))}
              </div>

              <button
                onClick={() => cobrar(p)}
                disabled={loadingId === p.id}
                style={{
                  marginTop: 12,
                  width: "100%",
                  padding: "16px 18px",
                  fontSize: 18,
                  fontWeight: 900,
                  borderRadius: 16,
                  cursor: "pointer",
                }}
              >
                {loadingId === p.id ? "Cobrando..." : "💳 COBRAR (pasar a CANCELADO)"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
