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

  // ✅ Mensajes amigables (sin Firebase)
  const getNiceAuthMessage = (errText = "") => {
    const t = (errText || "").toLowerCase();

    if (t.includes("invalid-credential") || t.includes("wrong-password") || t.includes("user-not-found")) {
      return "Credenciales incorrectas. Intente nuevamente.";
    }
    if (t.includes("too-many-requests")) {
      return "Demasiados intentos. Espere un momento e intente nuevamente.";
    }
    if (t.includes("network-request-failed") || t.includes("network")) {
      return "Sin conexión. Revise su internet e intente nuevamente.";
    }
    if (t.includes("invalid-email")) {
      return "El correo no es válido. Revíselo e intente nuevamente.";
    }

    return "No pudimos iniciar sesión. Revise sus datos e intente nuevamente.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await loginUser(email, password);
      setLoading(false);

      if (!res.success) {
        // ✅ NO mostrar res.error crudo (Firebase). Lo convertimos a humano:
        setMessage({ type: "error", text: getNiceAuthMessage(res.error) });
        return;
      }

      setMessage({ type: "success", text: "Ingreso exitoso" });
      console.log("Usuario autenticado:", res.user, "rol:", res.role);

      const role = (res.role || "").toString().trim().toLowerCase();

      switch (role) {
        case "admin":
        case "administrador":
          navigate("/admin");
          break;
        case "mozo":
          navigate("/mozo");
          break;
        case "cocina":
          navigate("/cocina");
          break;
        case "cajero":
          navigate("/cajero");
          break;
        default:
          setMessage({ type: "error", text: "Su usuario no tiene un rol válido. Contacte al administrador." });
          break;
      }
    } catch (err) {
      setLoading(false);
      // ✅ NO mostrar err.message crudo (Firebase). Lo convertimos a humano:
      setMessage({ type: "error", text: getNiceAuthMessage(err?.message) });
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

          {message && <div className={`access-message ${message.type}`}>{message.text}</div>}
        </form>
      </div>
    </div>
  );
}
