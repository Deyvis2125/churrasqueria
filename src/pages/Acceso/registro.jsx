import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../../services/authServices.js";
import "./registro.css"; // 👈 nuevo CSS

export default function Registro() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [rol, setRol] = useState("cajero");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!nombre || !email || !password) {
      setError("Por favor completa todos los campos");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      setLoading(true);
      const res = await registerUser(email, password, nombre, rol);
      setLoading(false);

      if (res.success) {
        setSuccess("Registro exitoso. Redirigiendo...");
        setTimeout(() => navigate("/acceso"), 1200);
      } else {
        setError(res.error || "Error en el registro");
      }
    } catch (err) {
      setLoading(false);
      setError("Error inesperado");
    }
  };

  return (
    <div className="registro-wrapper">
      <div className="registro-card">
        <h2 className="registro-title">Registro de Usuario</h2>

        <form onSubmit={handleSubmit} className="registro-form">
          <div className="field">
            <label>Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre completo"
            />
          </div>

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </div>

          <div className="field">
            <label>Confirmar contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="********"
            />
          </div>

          <div className="field">
            <label>Rol</label>
            <select value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="cajero">Cajero</option>
              <option value="mozo">Mozo</option>
              <option value="cocina">Cocina</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && <div className="msg error">{error}</div>}
          {success && <div className="msg success">{success}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Registrando..." : "Registrar Usuario"}
          </button>
        </form>
      </div>
    </div>
  );
}
