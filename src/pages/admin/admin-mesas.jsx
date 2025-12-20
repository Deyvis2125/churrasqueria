import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db, auth } from "../../firebase/config"; // ajusta si tu export es diferente
import { logAudit, archiveDeletedEntity } from "../../services/auditService.js";

export default function AdminMesas() {
  const [mesas, setMesas] = useState([]);
  const [numero, setNumero] = useState("");
  const [q, setQ] = useState("");

  // Escucha en tiempo real a la colección "mesa"
  useEffect(() => {
    const ref = collection(db, "mesa");
    const qRef = query(ref, orderBy("numero", "asc"));

    const unsub = onSnapshot(qRef, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMesas(data);
    });

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const queryText = q.trim().toLowerCase();
    if (!queryText) return mesas;
    return mesas.filter((m) => String(m.numero ?? "").includes(queryText));
  }, [mesas, q]);

  const crearMesa = async () => {
    const num = Number(numero);

    if (!Number.isFinite(num) || num <= 0) return alert("Número de mesa inválido.");

    // Evitar duplicados por número (en UI; lo ideal es reforzarlo con reglas o validación extra)
    const yaExiste = mesas.some((m) => Number(m.numero) === num);
    if (yaExiste) return alert(`La mesa ${num} ya existe.`);

    const docRef = await addDoc(collection(db, "mesa"), {
      numero: num,
      disponible: true,
      createdAt: serverTimestamp(),
    });

    try {
      await logAudit({
        userId: auth.currentUser?.uid || null,
        userName: auth.currentUser?.displayName || null,
        userRole: 'admin',
        action: 'create',
        entityType: 'mesa',
        entityId: docRef.id,
        entityName: `Mesa ${num}`,
        newValues: { numero: num, disponible: true },
      });
    } catch (e) {
      console.error('logAudit error', e);
    }

    setNumero("");
  };

  const toggleDisponible = async (mesa) => {
    await updateDoc(doc(db, "mesa", mesa.id), {
      disponible: !mesa.disponible,
    });

    try {
      await logAudit({
        userId: auth.currentUser?.uid || null,
        userName: auth.currentUser?.displayName || null,
        userRole: 'admin',
        action: 'update',
        entityType: 'mesa',
        entityId: mesa.id,
        entityName: `Mesa ${mesa.numero}`,
        oldValues: { disponible: mesa.disponible },
        newValues: { disponible: !mesa.disponible },
      });
    } catch (e) {
      console.error('logAudit error', e);
    }
  };

  const eliminarMesa = async (mesa) => {
    const ok = confirm(`¿Eliminar la mesa ${mesa.numero}?`);
    if (!ok) return;
    try {
      await archiveDeletedEntity({ entityType: 'mesa', entityId: mesa.id, data: mesa, deletedBy: { id: auth.currentUser?.uid, name: auth.currentUser?.displayName } });
    } catch (e) {
      console.error('archiveDeletedEntity error', e);
    }

    await deleteDoc(doc(db, "mesa", mesa.id));

    try {
      await logAudit({
        userId: auth.currentUser?.uid || null,
        userName: auth.currentUser?.displayName || null,
        userRole: 'admin',
        action: 'delete',
        entityType: 'mesa',
        entityId: mesa.id,
        entityName: `Mesa ${mesa.numero}`,
        oldValues: mesa,
      });
    } catch (e) {
      console.error('logAudit error', e);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Admin • Mesas</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="Número de mesa (ej: 1)"
          style={{ padding: 8, width: 220 }}
        />
        <button onClick={crearMesa}>Crear mesa</button>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por número…"
          style={{ padding: 8, width: 220 }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {filtered.map((m) => (
          <div
            key={m.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 16 }}>Mesa {m.numero}</div>

            <div style={{ margin: "8px 0" }}>
              Estado:{" "}
              <b>{m.disponible ? "Disponible ✅" : "No disponible / Ocupada ❌"}</b>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => toggleDisponible(m)}>
                {m.disponible ? "Marcar ocupada" : "Marcar disponible"}
              </button>
              <button onClick={() => eliminarMesa(m)}>Eliminar</button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: 12, border: "1px dashed #bbb", borderRadius: 10 }}>
            No hay mesas para mostrar.
          </div>
        )}
      </div>
    </div>
  );
}
