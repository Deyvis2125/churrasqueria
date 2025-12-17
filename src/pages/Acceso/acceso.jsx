import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../../services/authServices';
import "./acceso.css";

export default function Acceso() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        setMessage({
          type: 'error',
          text: res.error || 'Error al iniciar sesión',
        });
        return;
      }

      console.log('Usuario autenticado:', res.user.uid);
      console.log('ROL RAW:', `"${res.role}"`);

      const role = (res.role || '')
        .toString()
        .trim()
        .toLowerCase();

      console.log('ROL LIMPIO:', `"${role}"`);

      if (role === 'admin' || role === 'administrador') {
        navigate('/admin', { replace: true });
        return;
      }

      if (role === 'mozo') {
        navigate('/mozo', { replace: true });
        return;
      }

      if (role === 'cajero') {
        navigate('/cajero', { replace: true });
        return;
      }

      setMessage({
        type: 'error',
        text: `Rol no reconocido: ${res.role}`,
      });

    } catch (err) {
      setLoading(false);
      setMessage({
        type: 'error',
        text: err.message || 'Error inesperado',
      });
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: 360,
          padding: 24,
          border: '1px solid #eee',
          borderRadius: 8,
        }}
      >
        <h2 style={{ marginBottom: 12 }}>Ingresar</h2>

        <label style={{ display: 'block', marginBottom: 8 }}>Correo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 8, marginBottom: 12 }}
        />

        <label style={{ display: 'block', marginBottom: 8 }}>Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: 8, marginBottom: 16 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 10 }}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>

        {message && (
          <div
            style={{
              marginTop: 12,
              color: message.type === 'error' ? '#a00' : '#0a0',
            }}
          >
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}
