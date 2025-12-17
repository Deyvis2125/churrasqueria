import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

export default function AdminUsersList() {
  const [users, setUsers] = useState([]);
  const [filterRol, setFilterRol] = useState('todos');
  const [editingUser, setEditingUser] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRol, setEditRol] = useState('');

  useEffect(() => {
    const ref = collection(db, "users");
    const qRef = query(ref, orderBy("fechaRegistro", "desc"));

    const unsub = onSnapshot(qRef, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(data);
    });

    return () => unsub();
  }, []);

  const filteredUsers = filterRol === 'todos' ? users : users.filter(u => u.rol === filterRol);

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      await deleteDoc(doc(db, "users", id));
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user.id);
    setEditNombre(user.nombre);
    setEditEmail(user.email);
    setEditRol(user.rol);
  };

  const handleSave = async (id) => {
    await updateDoc(doc(db, "users", id), {
      nombre: editNombre,
      email: editEmail,
      rol: editRol
    });
    setEditingUser(null);
  };

  const handleCancel = () => {
    setEditingUser(null);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Listado de Usuarios</h2>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="filter-rol" style={{ marginRight: 8 }}>Filtrar por rol:</label>
        <select
          id="filter-rol"
          value={filterRol}
          onChange={(e) => setFilterRol(e.target.value)}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        >
          <option value="todos">Todos</option>
          <option value="cajero">Cajero</option>
          <option value="mozo">Mozo</option>
          <option value="cocina">Cocina</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {filteredUsers.length === 0 ? (
        <p>No hay usuarios registrados{filterRol !== 'todos' ? ` con rol ${filterRol}` : ''}.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: 8 }}>Nombre</th>
              <th style={{ border: "1px solid #ddd", padding: 8 }}>Email</th>
              <th style={{ border: "1px solid #ddd", padding: 8 }}>Rol</th>
              <th style={{ border: "1px solid #ddd", padding: 8 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td style={{ border: "1px solid #ddd", padding: 8 }}>
                  {editingUser === user.id ? (
                    <input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      style={{ width: '100%', padding: 4 }}
                    />
                  ) : (
                    user.nombre
                  )}
                </td>
                <td style={{ border: "1px solid #ddd", padding: 8 }}>
                  {editingUser === user.id ? (
                    <input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      style={{ width: '100%', padding: 4 }}
                    />
                  ) : (
                    user.email
                  )}
                </td>
                <td style={{ border: "1px solid #ddd", padding: 8 }}>
                  {editingUser === user.id ? (
                    <select
                      value={editRol}
                      onChange={(e) => setEditRol(e.target.value)}
                      style={{ width: '100%', padding: 4 }}
                    >
                      <option value="cliente">Cliente</option>
                      <option value="cajero">Cajero</option>
                      <option value="mozo">Mozo</option>
                      <option value="cocina">Cocina</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    user.rol
                  )}
                </td>
                <td style={{ border: "1px solid #ddd", padding: 8 }}>
                  {editingUser === user.id ? (
                    <>
                      <button onClick={() => handleSave(user.id)} style={{ marginRight: 8 }}>Guardar</button>
                      <button onClick={handleCancel}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(user)} style={{ marginRight: 8 }}>Editar</button>
                      <button onClick={() => handleDelete(user.id)}>Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}