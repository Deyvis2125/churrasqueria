import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../../services/authServices";
import "./acceso.css";

export default function Acceso() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await loginUser(email, password);
      setLoading(false);

      if (!res.success) {
        setMessage({ type: 'error', text: res.error || 'Error al iniciar sesión' });
      } else {
        setMessage({ type: 'success', text: 'Ingreso exitoso' });
        console.log('Usuario autenticado:', res.user, 'rol:', res.role);
        const role = (res.role || '').toString().toLowerCase();
        if (role === 'admin' || role === 'administrador') {
          navigate('/admin');
          return;
        }
        if (role === 'mozo') {
          navigate('/mozo');
          return;
        }
        if (role === 'cocina') {
          navigate('/cocina');
          return;
        }
        setMessage({
          type: "error",
          text: res.error || "Error al iniciar sesión",
        });
        return;
      }

      const role = (res.role || "").toString().trim().toLowerCase();

      if (role === "admin" || role === "administrador") return navigate("/admin");
      if (role === "mozo") return navigate("/mozo");
      if (role === "cajero") return navigate("/cajero");

      setMessage({ type: "error", text: `Rol no reconocido: ${res.role}` });
    } catch (err) {
      setLoading(false);
      setMessage({ type: "error", text: err.message || "Error inesperado" });
    }
  };

  return (
    <div className="access-layout">
      <div className="access-container">
        <h1 className="access-title">Churrasquería</h1>
        <p className="access-subtitle">Acceso al sistema</p>

        <form className="access-form" onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label>Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@gmail.com"
              required
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
            />
          </div>

          <button className="access-btn" type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          {message && (
            <div className={`access-message ${message.type}`}>
              {message.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
