import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../../services/authServices.js';

export default function Registro() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [rol, setRol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!nombre || !email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      setLoading(true);
      const res = await registerUser(email, password, nombre, rol);
      console.debug('registerUser response:', res);
      setLoading(false);
      if (res.success) {
        setSuccess('Registro exitoso. Redirigiendo a acceso...');
        setTimeout(() => navigate('/acceso'), 1200);
      } else {
        setError(res.code ? `${res.code} - ${res.error}` : res.error || 'Error en el registro');
        console.error('Registro fallido:', res);
      }
    } catch (err) {
      setLoading(false);
      console.error('Excepción en registro:', err);
      setError((err && (err.code || err.message)) ? `${err.code || ''} ${err.message || ''}` : 'Error inesperado');
    }
  };

  return (
    <div style={{maxWidth:480, margin:'2rem auto', padding:20, border:'1px solid #ddd', borderRadius:8}}>
      <h2 style={{marginBottom:12}}>Registro</h2>

      <form onSubmit={handleSubmit}>
        <div style={{marginBottom:8}}>
          <label>Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            style={{width:'100%', padding:8, boxSizing:'border-box'}}
          />
        </div>

        <div style={{marginBottom:8}}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@ejemplo.com"
            style={{width:'100%', padding:8, boxSizing:'border-box'}}
          />
        </div>

        <div style={{marginBottom:8}}>
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="*******"
            style={{width:'100%', padding:8, boxSizing:'border-box'}}
          />
        </div>

        <div style={{marginBottom:8}}>
          <label>Confirmar contraseña</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repite la contraseña"
            style={{width:'100%', padding:8, boxSizing:'border-box'}}
          />
        </div>

        <div style={{marginBottom:12}}>
          <label>Rol</label>
          <select value={rol} onChange={(e) => setRol(e.target.value)} style={{width:'100%', padding:8}}>
            <option value="cajero">Cajero</option>
            <option value="mozo">Mozo</option>
            <option value="cocina">Cocina</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {error && <div style={{color:'crimson', marginBottom:8}}>{error}</div>}
        {success && <div style={{color:'green', marginBottom:8}}>{success}</div>}

        <button type="submit" disabled={loading} style={{padding:'8px 12px'}}>
          {loading ? 'Registrando...' : 'Registrar'}
        </button>
      </form>
    </div>
  );
}
