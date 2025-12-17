import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase/config";

export default function DashboardCajero() {
  const [pedidos, setPedidos] = useState([]);

  // 🔥 Pedidos abiertos
  useEffect(() => {
    const qRef = query(
      collection(db, "pedidos"),
      where("estado", "==", "abierto")
    );

    const unsub = onSnapshot(qRef, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setPedidos(data);
    });

    return () => unsub();
  }, []);

  const cerrarPedido = async (pedido) => {
    const ok = confirm(
      `¿Confirmar pago del pedido de la Mesa ${pedido.mesaNumero}?`
    );
    if (!ok) return;

    await updateDoc(doc(db, "pedidos", pedido.id), {
      estado: "cerrado",
    });
  };

  return (
    <section style={{ padding: 20 }}>
      <h1>💰 Dashboard Cajero</h1>
      <p>Pedidos abiertos</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
          marginTop: 20,
        }}
      >
        {pedidos.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <h3>Mesa {p.mesaNumero}</h3>

            <div style={{ fontSize: 14, marginBottom: 6 }}>
              Mozo ID: <code>{p.mozoId}</code>
            </div>

            <ul>
              {p.items.map((i, idx) => (
                <li key={idx}>
                  {i.plato} — S/ {i.precio}
                </li>
              ))}
            </ul>

            <strong>Total: S/ {p.total}</strong>

            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => cerrarPedido(p)}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 10,
                  border: "none",
                  background: "#2a9d8f",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cerrar pedido (Pagar)
              </button>
            </div>
          </div>
        ))}

        {pedidos.length === 0 && (
          <div
            style={{
              padding: 20,
              border: "1px dashed #aaa",
              borderRadius: 12,
            }}
          >
            No hay pedidos abiertos.
          </div>
        )}
      </div>
    </section>
  );
}
