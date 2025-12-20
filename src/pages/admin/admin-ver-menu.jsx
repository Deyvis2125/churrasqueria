import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import { archiveDeletedEntity, logAudit } from "../../services/auditService.js";

export default function AdminMenusList() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  // estado para edición
  const [editId, setEditId] = useState(null);
  const [editPlato, setEditPlato] = useState("");
  const [editPrecio, setEditPrecio] = useState("");

  useEffect(() => {
    const q = query(collection(db, "menus"), orderBy("plato", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((docu) => ({
        id: docu.id,
        ...docu.data(),
      }));
      setMenus(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const eliminarMenu = async (id, plato) => {
    const ok = window.confirm(`¿Eliminar el menú "${plato}"?`);
    if (!ok) return;

    try {
      // Archive and then delete
      try {
        await archiveDeletedEntity({ entityType: 'menu', entityId: id, data: null, deletedBy: { id: auth.currentUser?.uid, name: auth.currentUser?.displayName } });
      } catch (e) {
        console.error('archiveDeletedEntity error', e);
      }
      await deleteDoc(doc(db, "menus", id));

      try {
        await logAudit({
          userId: auth.currentUser?.uid || null,
          userName: auth.currentUser?.displayName || null,
          userRole: 'admin',
          action: 'delete',
          entityType: 'menu',
          entityId: id,
          entityName: plato,
        });
      } catch (e) {
        console.error('logAudit error', e);
      }

      alert("Menú eliminado");
    } catch (e) {
      console.error(e);
      alert("Error al eliminar menú");
    }
  };

  const iniciarEdicion = (menu) => {
    setEditId(menu.id);
    setEditPlato(menu.plato);
    setEditPrecio(menu.precio);
  };

  const cancelarEdicion = () => {
    setEditId(null);
    setEditPlato("");
    setEditPrecio("");
  };

  const guardarEdicion = async () => {
    if (!editPlato || !editPrecio) {
      alert("Completa los campos");
      return;
    }

    try {
      await updateDoc(doc(db, "menus", editId), {
        plato: editPlato,
        precio: Number(editPrecio),
      });

      setEditId(null);
      alert("Menú actualizado");
    } catch (e) {
      console.error(e);
      alert("Error al actualizar menú");
    }
  };

  if (loading) {
    return <p className="muted">Cargando menús...</p>;
  }

  return (
    <div>
      <h2>Menús Registrados</h2>

      {menus.length === 0 ? (
        <p className="muted">No hay menús registrados.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {menus.map((menu) => (
            <div
              key={menu.id}
              style={{
                border: "1px solid rgba(255,255,255,.15)",
                borderRadius: 16,
                padding: 12,
                background: "rgba(0,0,0,.35)",
              }}
            >
              <img
                src={menu.img}
                alt={menu.plato}
                style={{
                  width: "100%",
                  height: 140,
                  objectFit: "cover",
                  borderRadius: 12,
                  marginBottom: 8,
                }}
              />

              {/* MODO EDICIÓN */}
              {editId === menu.id ? (
                <>
                  <input
                    value={editPlato}
                    onChange={(e) => setEditPlato(e.target.value)}
                    placeholder="Nombre del plato"
                    style={{ width: "100%", marginBottom: 6 }}
                  />

                  <input
                    type="number"
                    value={editPrecio}
                    onChange={(e) => setEditPrecio(e.target.value)}
                    placeholder="Precio"
                    style={{ width: "100%", marginBottom: 8 }}
                  />

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={guardarEdicion}>💾 Guardar</button>
                    <button onClick={cancelarEdicion}>❌ Cancelar</button>
                  </div>
                </>
              ) : (
                <>
                  <h3 style={{ margin: "6px 0" }}>{menu.plato}</h3>
                  <p style={{ fontWeight: 700 }}>S/ {menu.precio}</p>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <button onClick={() => iniciarEdicion(menu)}>
                      ✏️ Editar
                    </button>

                    <button
                      onClick={() => eliminarMenu(menu.id, menu.plato)}
                    >
                      🗑 Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
