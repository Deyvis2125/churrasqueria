import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase/config";

export default function MozoMesas({ onSeleccionarMesa }) {
  const [mesas, setMesas] = useState([]);

  useEffect(() => {
    const qRef = query(
      collection(db, "mesa"),
      orderBy("numero", "asc")
    );

    const unsub = onSnapshot(qRef, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setMesas(data);
    });

    return () => unsub();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Mesas</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        {mesas.map((m) => (
          <div
            key={m.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 700 }}>Mesa {m.numero}</div>

            <div style={{ margin: "8px 0" }}>
              Estado:{" "}
              <b>{m.disponible ? "Disponible ✅" : "Ocupada ❌"}</b>
            </div>

            <button
              disabled={!m.disponible}
              onClick={() => onSeleccionarMesa(m)}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                background: m.disponible ? "#ffb703" : "#ccc",
                border: "none",
                cursor: m.disponible ? "pointer" : "not-allowed",
                fontWeight: 600,
              }}
            >
              Hacer pedido
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
