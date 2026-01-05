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

  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const emailRegex = useMemo(() => /^\S+@\S+\.\S+$/, []);

  const cleanNombre = nombre.trim();
  const cleanEmail = email.trim().toLowerCase();

  const nombreOk = cleanNombre.length >= 2;
  const emailOk = emailRegex.test(cleanEmail);
  const passOk = password.length >= 6;

  const canSubmit = nombreOk && emailOk && passOk && !loading;

  // limpia mensajes al cambiar de tab
  useEffect(() => {
    setMessage(null);
    // opcional: limpiar password por seguridad al cambiar vista
    setPassword("");
    setShowPass(false);
  }, [view]);

  function mapRegisterError(errText) {
    const t = (errText || "").toLowerCase();

    // Mapeos típicos (depende de cómo registerUser retorne el error)
    if (t.includes("email-already") || t.includes("already") || t.includes("ya está registrado")) {
      return "Ese correo ya está registrado.";
    }
    if (t.includes("weak-password") || t.includes("contraseña") && t.includes("débil")) {
      return "La contraseña es muy débil. Usa al menos 6 caracteres.";
    }
    if (t.includes("invalid-email") || t.includes("email no válido")) {
      return "El email no es válido.";
    }
    if (t.includes("permission") || t.includes("permis")) {
      return "No tienes permisos para registrar usuarios.";
    }
    return errText || "Error al registrar.";
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setMessage(null);

    // Validación final (por si alguien fuerza submit)
    if (!cleanNombre || !cleanEmail || !password) {
      setMessage({ type: "error", text: "Completa todos los campos." });
      return;
    }
    if (!emailOk) {
      setMessage({ type: "error", text: "Email no válido." });
      return;
    }
    if (!passOk) {
      setMessage({
        type: "error",
        text: "La contraseña debe tener al menos 6 caracteres.",
      });
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
        setShowPass(false);

        // ir directo al listado
        setView("listar");
      } else {
        setMessage({
          type: "error",
          text: mapRegisterError(res?.error),
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: mapRegisterError(err?.message || "Error inesperado."),
      });
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
          disabled={loading}
        >
          Registrar usuario
        </button>

        <button
          type="button"
          className={`btn-glass btn-dark ${view === "listar" ? "active" : ""}`}
          onClick={() => setView("listar")}
          disabled={loading}
        >
          Lista de usuarios
        </button>
      </div>

      {/* ===== REGISTRO ===== */}
      {view === "crear" && (
        <div className="admin-card">
          <h3>Registro de usuarios</h3>

          <form onSubmit={handleSubmit} className="admin-form" noValidate>
            <div className="admin-field">
              <label className="admin-label" htmlFor="nombre">
                Nombre
              </label>
              <input
                id="nombre"
                className="admin-input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan Pérez"
                autoComplete="name"
              />
              {!nombreOk && cleanNombre.length > 0 && (
                <small style={{ color: "#f3b" }}>Mínimo 2 caracteres.</small>
              )}
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="admin-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@empresa.com"
                autoComplete="email"
              />
              {!emailOk && cleanEmail.length > 0 && (
                <small style={{ color: "#f3b" }}>Formato de email inválido.</small>
              )}
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="password">
                Contraseña
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  id="password"
                  className="admin-input"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-glass btn-light"
                  onClick={() => setShowPass((v) => !v)}
                  disabled={loading}
                  title={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              {!passOk && password.length > 0 && (
                <small style={{ color: "#f3b" }}>Mínimo 6 caracteres.</small>
              )}
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="rol">
                Rol
              </label>
              <select
                id="rol"
                className="admin-select"
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                disabled={loading}
              >
                <option value="cajero">Cajero</option>
                <option value="mozo">Mozo</option>
                <option value="cocina">Cocina</option>
                <option value="admin">Admin</option>
              </select>
              <small style={{ color: "#aaa" }}>
                Tip: asigna “admin” solo si es necesario.
              </small>
            </div>

            {message && (
              <div className={`admin-alert ${message.type}`} role="alert">
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-glass btn-dark"
              title={!canSubmit ? "Completa los campos correctamente" : "Registrar"}
            >
              {loading ? "Registrando..." : "Registrar usuario"}
            </button>

            <small style={{ display: "block", marginTop: 10, color: "#aaa" }}>
              Nota: si al crear usuarios el admin se “desloguea”, eso viene de cómo
              está implementado <code>registerUser</code> (Firebase Auth) y se corrige
              en el servicio/backend.
            </small>
          </form>
        </div>
      )}

      {/* ===== LISTADO ===== */}
      {view === "listar" && <AdminUsersList />}
    </div>
  );
}
