
import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { Card } from "../pages/mozo/mozo.ui";

export default function UserCard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      window.location.href = "/acceso";
    } catch (e) {
      console.error("Logout error", e);
      alert("Error al cerrar sesión");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontSize: 14 }}>{user.displayName || user.email || 'Usuario'}</strong>
          <span className="muted" style={{ fontSize: 12 }}>{user.email || ''}</span>
        </div>
        <button className="big-btn" style={{ padding: '8px 10px' }} onClick={handleLogout} disabled={loading}>
          {loading ? 'Saliendo...' : 'Cerrar sesión'}
        </button>
      </div>
    </Card>
  );
}
