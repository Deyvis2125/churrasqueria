import React, { useState } from 'react';
import { registerUser } from '../../services/authServices.js';

export default function AdminUsers() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('cajero');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!nombre || !email || !password) {
      setMessage({ type: 'error', text: 'Completa todos los campos' });
      return;
    }
    try {
      setLoading(true);
      const res = await registerUser(email, password, nombre, rol);
      setLoading(false);
      if (res.success) {
        setMessage({ type: 'success', text: 'Usuario registrado correctamente' });
        setNombre(''); setEmail(''); setPassword(''); setRol('cajero');
      } else {
        setMessage({ type: 'error', text: res.error || 'Error en registro' });
      }
    } catch (err) {
      setLoading(false);
      setMessage({ type: 'error', text: err.message || 'Error inesperado' });
    }
  };

  return (
    <div>
      <h2>Registro de Usuarios</h2>
      <form onSubmit={handleSubmit} style={{maxWidth:480}}>
        <div style={{marginBottom:8}}>
          <label>Nombre</label>
          <input value={nombre} onChange={(e)=>setNombre(e.target.value)} />
        </div>
        <div style={{marginBottom:8}}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        </div>
        <div style={{marginBottom:8}}>
          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>
        <div style={{marginBottom:12}}>
          <label>Rol</label>
          <select value={rol} onChange={(e)=>setRol(e.target.value)}>
            <option value="cajero">Cajero</option>
            <option value="mozo">Mozo</option>
            <option value="cocina">Cocina</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {message && <div style={{color: message.type === 'error' ? 'crimson' : 'green', marginBottom:8}}>{message.text}</div>}

        <button type="submit" disabled={loading} style={{padding:'8px 12px'}}>{loading ? 'Registrando...' : 'Registrar usuario'}</button>
      </form>
    </div>
  );
}
