import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import { archiveDeletedEntity, logAudit } from "../../services/auditService.js";
import "./admin-users.css";

export default function AdminUsersList() {
  const [users, setUsers] = useState([]);
  const [filterRol, setFilterRol] = useState("todos");
  const [search, setSearch] = useState("");

  const [editingUser, setEditingUser] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editRol, setEditRol] = useState("cajero");

  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const ref = collection(db, "users");
    const qRef = query(ref, orderBy("fechaRegistro", "desc"));

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUsers(data);
      },
      (err) => {
        console.error(err);
        setMessage({ type: "error", text: "No se pudo cargar la lista de usuarios." });
      }
    );

    return () => unsub();
  }, []);

  const adminsCount = useMemo(
    () => users.filter((u) => u.rol === "admin").length,
    [users]
  );

  const normalizedSearch = search.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    let list = users;

    if (filterRol !== "todos") {
      list = list.filter((u) => u.rol === filterRol);
    }

    if (normalizedSearch) {
      list = list.filter((u) => {
        const n = (u.nombre || "").toLowerCase();
        const e = (u.email || "").toLowerCase();
        return n.includes(normalizedSearch) || e.includes(normalizedSearch);
      });
    }

    return list;
  }, [users, filterRol, normalizedSearch]);

  // ✅ CORREGIDO: tus docId NO son uid, entonces comparamos por email
  const isSelfUser = (user) =>
    auth.currentUser?.email && user?.email === auth.currentUser.email;

  const handleEdit = (user) => {
    setMessage(null);
    setEditingUser(user.id);
    setEditNombre(user.nombre || "");
    setEditRol(user.rol || "cajero");
  };

  const handleCancel = () => {
    setEditingUser(null);
    setMessage(null);
  };

  const handleSave = async (id) => {
    setMessage(null);

    const oldUser = users.find((u) => u.id === id) || null;
    const cleanNombre = editNombre.trim();

    if (cleanNombre.length < 2) {
      setMessage({ type: "error", text: "El nombre debe tener al menos 2 caracteres." });
      return;
    }

    // Evitar quitar admin al último admin
    if (oldUser?.rol === "admin" && editRol !== "admin" && adminsCount <= 1) {
      setMessage({ type: "error", text: "No puedes quitar el rol al último admin." });
      return;
    }

    // Evitar cambiar tu propio rol aquí (recomendado)
    if (isSelfUser(oldUser) && editRol !== oldUser?.rol) {
      setMessage({ type: "error", text: "No puedes cambiar tu propio rol aquí." });
      return;
    }

    try {
      setBusyId(id);

      await updateDoc(doc(db, "users", id), {
        nombre: cleanNombre,
        rol: editRol,
      });

      try {
        await logAudit({
          userId: auth.currentUser?.uid || null,
          userName: auth.currentUser?.displayName || null,
          userRole: "admin",
          action: "update",
          entityType: "user",
          entityId: id,
          entityName: cleanNombre,
          oldValues: oldUser,
          newValues: { nombre: cleanNombre, rol: editRol },
        });
      } catch (e) {
        console.error("logAudit error", e);
      }

      setEditingUser(null);
      setMessage({ type: "success", text: "Cambios guardados." });
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "No se pudo guardar el usuario." });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    setMessage(null);

    const userData = users.find((u) => u.id === id) || null;

    if (isSelfUser(userData)) {
      setMessage({ type: "error", text: "No puedes eliminar tu propio usuario." });
      return;
    }

    // Evitar borrar el último admin
    if (userData?.rol === "admin" && adminsCount <= 1) {
      setMessage({ type: "error", text: "No puedes eliminar al último admin." });
      return;
    }

    if (!window.confirm("¿Estás seguro de que quieres eliminar este usuario?")) return;

    try {
      setBusyId(id);

      // Archivar (si falla, no bloquea)
      try {
        await archiveDeletedEntity({
          entityType: "user",
          entityId: id,
          data: userData,
          deletedBy: {
            id: auth.currentUser?.uid,
            name: auth.currentUser?.displayName,
          },
        });
      } catch (e) {
        console.error("archiveDeletedEntity error", e);
      }

      await deleteDoc(doc(db, "users", id));

      // Auditoría (si falla, no bloquea)
      try {
        await logAudit({
          userId: auth.currentUser?.uid || null,
          userName: auth.currentUser?.displayName || null,
          userRole: "admin",
          action: "delete",
          entityType: "user",
          entityId: id,
          entityName: userData?.nombre || null,
        });
      } catch (e) {
        console.error("logAudit error", e);
      }

      setMessage({ type: "success", text: "Usuario eliminado." });
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "No se pudo eliminar el usuario." });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-users admin-card">
      <h3>Listado de usuarios</h3>

      <div className="admin-filters">
        <div className="admin-field">
          <label className="admin-label" htmlFor="filter-rol">
            Rol
          </label>
          <select
            id="filter-rol"
            className="admin-select"
            value={filterRol}
            onChange={(e) => setFilterRol(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="cajero">Cajero</option>
            <option value="mozo">Mozo</option>
            <option value="cocina">Cocina</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="admin-field" style={{ flex: 1, minWidth: 220 }}>
          <label className="admin-label" htmlFor="search">
            Buscar (nombre o email)
          </label>
          <input
            id="search"
            className="admin-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ej: saul@gmail.com"
          />
        </div>
      </div>

      <div className="admin-meta">
        Total: <b>{filteredUsers.length}</b> — Admins: <b>{adminsCount}</b>
      </div>

      {message && <div className={`admin-alert ${message.type}`}>{message.text}</div>}

      {filteredUsers.length === 0 ? (
        <p style={{ marginTop: 10 }}>
          No hay usuarios
          {filterRol !== "todos" ? ` con rol ${filterRol}` : ""}
          {normalizedSearch ? ` que coincidan con "${search}"` : ""}.
        </p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => {
                const isEditing = editingUser === user.id;
                const isBusy = busyId === user.id;

                const disableDelete =
                  isBusy || isSelfUser(user) || (user.rol === "admin" && adminsCount <= 1);

                return (
                  <tr key={user.id}>
                    <td>
                      {isEditing ? (
                        <input
                          className="admin-input"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                        />
                      ) : (
                        user.nombre
                      )}
                    </td>

                    <td>
                      <span title="Email solo lectura para evitar inconsistencias con Firebase Auth.">
                        {user.email}
                      </span>
                    </td>

                    <td>
                      {isEditing ? (
                        <select
                          className="admin-select"
                          value={editRol}
                          onChange={(e) => setEditRol(e.target.value)}
                          disabled={isBusy}
                        >
                          <option value="cajero">Cajero</option>
                          <option value="mozo">Mozo</option>
                          <option value="cocina">Cocina</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        user.rol
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="btn-glass btn-light"
                            onClick={() => handleSave(user.id)}
                            disabled={isBusy}
                          >
                            {isBusy ? "Guardando..." : "Guardar"}
                          </button>

                          <button
                            type="button"
                            className="btn-glass btn-dark"
                            onClick={handleCancel}
                            disabled={isBusy}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="btn-glass btn-light"
                            onClick={() => handleEdit(user)}
                            disabled={isBusy}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="btn-glass btn-danger"
                            onClick={() => handleDelete(user.id)}
                            disabled={disableDelete}
                            title={
                              isSelfUser(user)
                                ? "No puedes eliminar tu propio usuario."
                                : user.rol === "admin" && adminsCount <= 1
                                ? "No puedes eliminar al último admin."
                                : ""
                            }
                          >
                            {isBusy ? "Eliminando..." : "Eliminar"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <small style={{ display: "block", marginTop: 10, color: "#aaa" }}>
        Nota: El email se muestra solo lectura para evitar inconsistencias con Firebase Auth.
      </small>
    </div>
  );
}
