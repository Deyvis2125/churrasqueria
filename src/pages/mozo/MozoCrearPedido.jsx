import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import { logAudit } from "../../services/auditService.js";
import { BigButton, Card, Pill } from "./mozo.ui"; // si tu archivo es mozo.ui.jsx, también sirve

export default function MozoCrearPedido({ mozoId = null }) {
  const [mesas, setMesas] = useState([]);
  const [menus, setMenus] = useState([]);

  const [mesaId, setMesaId] = useState("");
  const [pedido, setPedido] = useState([]); // [{menuId, plato, precio, qty}]
  const [loading, setLoading] = useState(false);

  // ✅ Mesas (corregido: id al final para que no lo pise d.data())
  useEffect(() => {
    const qRef = query(collection(db, "mesa"), orderBy("numero", "asc"));
    return onSnapshot(qRef, (snap) => {
      setMesas(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
  }, []);

  // ✅ Menus (corregido: id al final para que no lo pise d.data())
  useEffect(() => {
    const qRef = query(collection(db, "menus"), orderBy("plato", "asc"));
    return onSnapshot(qRef, (snap) => {
      setMenus(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
  }, []);

  const mesa = useMemo(
    () => mesas.find((m) => m.id === mesaId) || null,
    [mesas, mesaId]
  );

  const mesasDisponibles = useMemo(
    () => mesas.filter((m) => m.disponible),
    [mesas]
  );

  const total = useMemo(
    () => pedido.reduce((acc, it) => acc + Number(it.precio) * Number(it.qty), 0),
    [pedido]
  );

  const agregar = (menuItem) => {
    const menuId = menuItem.id; // ✅ ahora será docId real
    const plato = String(menuItem.plato || "");
    const precio = Number(menuItem.precio || 0);

    if (!menuId) return alert("Error: el menú no tiene id (revisa Firestore).");

    setPedido((prev) => {
      const idx = prev.findIndex((x) => x.menuId === menuId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, { menuId, plato, precio, qty: 1 }];
    });
  };

  const qty = (menuId, delta) => {
    setPedido((prev) =>
      prev
        .map((it) => (it.menuId === menuId ? { ...it, qty: it.qty + delta } : it))
        .filter((it) => it.qty > 0)
    );
  };

  const limpiar = () => {
    setMesaId("");
    setPedido([]);
  };

  const confirmar = async () => {
    if (!mesa) return alert("Selecciona una mesa.");
    if (!mesa.disponible) return alert("Esa mesa ya está ocupada.");
    if (pedido.length === 0) return alert("Agrega al menos 1 producto.");

    try {
      setLoading(true);

      const mesaRef = doc(db, "mesa", mesa.id);

      // Revalidar mesa al confirmar
      const mesaSnap = await getDoc(mesaRef);
      if (!mesaSnap.exists()) return alert("La mesa ya no existe.");
      if (!mesaSnap.data().disponible) return alert("La mesa se ocupó. Elige otra.");

      const items = pedido.map((p) => ({
        menuId: p.menuId,
        plato: p.plato,
        precio: Number(p.precio),
        qty: Number(p.qty),
        subtotal: Number(p.precio) * Number(p.qty),
      }));

      const pedidoData = {
        createdAt: serverTimestamp(),
        estado: "pendiente",
        mesaId: mesa.id,
        mesaNumero: Number(mesa.numero),
        mozoId: mozoId || null,
        items,
        total: Number(items.reduce((acc, it) => acc + it.subtotal, 0)),
      };

      const batch = writeBatch(db);

      // Crear pedido
      const pedidoRef = doc(collection(db, "pedidos"));
      batch.set(pedidoRef, pedidoData);

      // Ocupar mesa
      batch.update(mesaRef, { disponible: false });

      await batch.commit();

      // Auditoría: registrar creación de pedido
      try {
        await logAudit({
          userId: auth.currentUser?.uid || mozoId || null,
          userName: auth.currentUser?.displayName || null,
          userRole: 'mozo',
          action: 'create',
          entityType: 'pedido',
          entityId: pedidoRef.id,
          entityName: `Pedido Mesa ${mesa.numero}`,
          newValues: pedidoData,
        });
      } catch (e) {
        console.error('logAudit error', e);
      }

      alert("Pedido enviado ✅ Mesa ocupada ✅");
      limpiar();
    } catch (e) {
      console.error(e);
      alert("Error al confirmar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mozo-grid">
      <Card>
        <h2>1) Selecciona Mesa</h2>

        <div className="mesas-grid">
          {mesasDisponibles.map((m) => (
            <button
              key={m.id}
              className={`mesa-btn ${mesaId === m.id ? "active" : ""}`}
              onClick={() => setMesaId(m.id)}
              disabled={loading}
            >
              Mesa {m.numero}
              <div className="mesa-sub">Disponible</div>
            </button>
          ))}

          {mesasDisponibles.length === 0 && (
            <p className="muted">No hay mesas disponibles.</p>
          )}
        </div>

        {mesa && (
          <div style={{ marginTop: 12 }}>
            <Pill>Seleccionada: Mesa {mesa.numero}</Pill>
          </div>
        )}
      </Card>

      <Card>
        <h2>2) Menú (toca para agregar)</h2>

        <div className="menu-grid">
          {menus.map((m) => (
            <button
              key={m.id}
              className="menu-btn"
              onClick={() => agregar(m)}
              disabled={loading}
              title={loading ? "Espere..." : "Agregar"}
            >
              <div className="menu-row">
                <img
                  className="menu-img"
                  src={m.img || m.imagen || m.image || "/imagen/logyn.webp"}
                  alt={m.plato}
                />
                <div className="menu-info">
                  <div className="menu-name">{m.plato}</div>
                  <div className="menu-price">S/ {m.precio}</div>
                </div>
              </div>
              <div className="menu-add">+ AGREGAR</div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2>3) Confirmación</h2>

        {!mesa ? (
          <p className="muted">Primero selecciona una mesa.</p>
        ) : pedido.length === 0 ? (
          <p className="muted">Agrega productos tocando el menú.</p>
        ) : (
          <div className="pedido-list">
            {pedido.map((p) => (
              <div key={p.menuId} className="pedido-item">
                <div className="pedido-left">
                  <b>{p.plato}</b>
                  <span className="muted">S/ {p.precio}</span>
                </div>

                <div className="pedido-right">
                  <button className="qty-btn" onClick={() => qty(p.menuId, -1)} disabled={loading}>
                    -
                  </button>
                  <div className="qty-num">{p.qty}</div>
                  <button className="qty-btn" onClick={() => qty(p.menuId, +1)} disabled={loading}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="total-row">
          <span>Total</span>
          <b>S/ {total}</b>
        </div>

        <div className="actions-row">
          <BigButton onClick={limpiar} disabled={loading}>
            🧹 Limpiar
          </BigButton>

          <BigButton primary onClick={confirmar} disabled={loading || !mesa || pedido.length === 0}>
            {loading ? "Enviando..." : "✅ Confirmar y Enviar"}
          </BigButton>
        </div>
      </Card>
    </div>
  );
}
