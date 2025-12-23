import React, { useEffect, useMemo, useState } from "react";
import { registerUser } from "../../services/authServices.js";
import AdminUsersList from "./admin-users-list.jsx";
import "./admin-users.css";

export default function AdminUsers() {
  const [view, setView] = useState("crear"); // crear | listar

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("cajero");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const emailRegex = useMemo(() => /^\S+@\S+\.\S+$/, []);

  // limpiar mensaje al cambiar de tab
  useEffect(() => {
    setMessage(null);
  }, [view]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    const cleanNombre = nombre.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanNombre || !cleanEmail || !password) {
      setMessage({ type: "error", text: "Completa todos los campos." });
      return;
    }

    if (!emailRegex.test(cleanEmail)) {
      setMessage({ type: "error", text: "Email no válido." });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: "error", text: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }

    try {
      setLoading(true);
      const res = await registerUser(cleanEmail, password, cleanNombre, rol);

      if (res?.success) {
        setMessage({ type: "success", text: "Usuario registrado correctamente." });
        setNombre("");
        setEmail("");
        setPassword("");
        setRol("cajero");

        // ir directo al listado (opcional)
        setView("listar");
      } else {
        setMessage({ type: "error", text: res?.error || "Error al registrar." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err?.message || "Error inesperado." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-users">
      <h2>Usuarios</h2>

      {/* ===== TABS ===== */}
      <div className="admin-tabs">
        <button
          type="button"
          className={`btn-glass btn-dark ${view === "crear" ? "active" : ""}`}
          onClick={() => setView("crear")}
        >
          Registrar usuario
        </button>

        <button
          type="button"
          className={`btn-glass btn-dark ${view === "listar" ? "active" : ""}`}
          onClick={() => setView("listar")}
        >
          Lista de usuarios
        </button>
      </div>

      {/* ===== REGISTRO ===== */}
      {view === "crear" && (
        <div className="admin-card">
          <h3>Registro de usuarios</h3>

          <form onSubmit={handleSubmit} className="admin-form">
            <div className="admin-field">
              <label className="admin-label">Nombre</label>
              <input
                className="admin-input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label">Email</label>
              <input
                className="admin-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@empresa.com"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label">Contraseña</label>
              <input
                className="admin-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label">Rol</label>
              <select
                className="admin-select"
                value={rol}
                onChange={(e) => setRol(e.target.value)}
              >
                <option value="cajero">Cajero</option>
                <option value="mozo">Mozo</option>
                <option value="cocina">Cocina</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {message && (
              <div className={`admin-alert ${message.type}`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-glass btn-dark"
            >
              {loading ? "Registrando..." : "Registrar usuario"}
            </button>
          </form>
        </div>
      )}

      {/* ===== LISTADO ===== */}
      {view === "listar" && <AdminUsersList />}
    </div>
  );
}
