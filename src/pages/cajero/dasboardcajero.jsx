import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  updateDoc,
  doc,
  writeBatch,
  serverTimestamp,
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
    const ok = confirm(`¿Confirmar pago y liberar Mesa ${pedido.mesaNumero}?`);
    if (!ok) return;

  try {
    const batch = writeBatch(db);

    // 1. Relación con 'ventas': Creamos un documento nuevo
    const ventaRef = doc(collection(db, "ventas"));
    batch.set(ventaRef, {
      pedidoId: pedido.id,       // <--- Vinculamos la venta al pedido original
      items: pedido.items,       // <--- Copiamos los productos (denormalización)
      total: pedido.total,
      mozoId: pedido.mozoId,     // <--- Atribuimos la venta al mozo
      mesaNumero: pedido.mesaNumero,
      fecha: serverTimestamp(),  // <--- Fecha de la venta
      metodoPago: "efectivo",    // Podrías agregar un selector para esto
    });

    // 2. Actualizar el Pedido
    const pedidoRef = doc(db, "pedidos", pedido.id);
    batch.update(pedidoRef, { estado: "cerrado" });

    // 3. Relación con 'mesa': ¡Muy importante! 
    // Usamos el mesaId que el mozo guardó en el pedido anteriormente
    if (pedido.mesaId) {
      const mesaRef = doc(db, "mesa", pedido.mesaId);
      batch.update(mesaRef, { disponible: true }); // <--- La mesa vuelve a estar libre
    }

    await batch.commit();
    alert("Venta registrada y mesa liberada ✅");

  } catch (error) {
    console.error("Error en la venta:", error);
    alert("No se pudo procesar el pago");
  }
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
                  background: "#33a598ff",
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
