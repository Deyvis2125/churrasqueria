import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";

export default function PedidoModal({ mesa, mozoId, onClose }) {
  const [menus, setMenus] = useState([]);
  const [pedido, setPedido] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "menus"), (snap) => {
      setMenus(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const agregar = (item) => {
    setPedido(prev => [...prev, item]);
  };

  const total = pedido.reduce((a, b) => a + b.precio, 0);

  const guardarPedido = async () => {
    if (pedido.length === 0) {
      alert("Agrega al menos un producto");
      return;
    }

    await addDoc(collection(db, "pedidos"), {
      mesaId: mesa.id,
      mesaNumero: mesa.numero,
      mozoId,
      items: pedido.map(p => ({
        plato: p.plato,
        precio: p.precio,
      })),
      total,
      estado: "abierto",
      createdAt: serverTimestamp(),
    });

    onClose();
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <h2>Pedido - Mesa {mesa.numero}</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {menus.map(m => (
            <div key={m.id} style={card}>
              <img src={m.img} style={img} />
              <strong>{m.plato}</strong>
              <span>S/ {m.precio}</span>
              <button onClick={() => agregar(m)}>Agregar</button>
            </div>
          ))}
        </div>

        <hr />

        <h3>Pedido</h3>
        {pedido.map((p, i) => (
          <div key={i}>
            {p.plato} — S/ {p.precio}
          </div>
        ))}

        <strong>Total: S/ {total}</strong>

        <div style={{ marginTop: 12 }}>
          <button onClick={guardarPedido}>Confirmar pedido</button>
          <button onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* estilos simples */
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
};

const modal = {
  background: "#fff",
  padding: 20,
  borderRadius: 12,
  width: "80%",
  maxHeight: "90vh",
  overflowY: "auto",
};

const card = {
  border: "1px solid #ddd",
  padding: 8,
  borderRadius: 8,
};

const img = {
  width: "100%",
  height: 100,
  objectFit: "cover",
};
