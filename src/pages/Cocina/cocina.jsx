import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, query, onSnapshot, doc, getDoc, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import './main_cocina.css';

const Cocina = () => {
  const [pedidos, setPedidos] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [esCocinero, setEsCocinero] = useState(false);
  const [cargandoSeguridad, setCargandoSeguridad] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (userLogueado) => {
      if (userLogueado) {
        setUsuario(userLogueado);
        const docRef = doc(db, "users", userLogueado.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().rol === 'cocina') {
          setEsCocinero(true);
        } else {
          setEsCocinero(false);
        }
      } else {
        setUsuario(null);
        setEsCocinero(false);
      }
      setCargandoSeguridad(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!esCocinero) return;

    // La consulta ahora se enfoca solo en los pedidos pendientes
    const q = query(collection(db, 'pedidos'), orderBy('createdAt', 'asc'));
    const unsubscribePedidos = onSnapshot(q, (snapshot) => {
      const pedidosData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.estado === 'pendiente'); // Filtramos aquí
      setPedidos(pedidosData);
    });

    return () => unsubscribePedidos();
  }, [esCocinero]);

  // renderPedido ya no necesita botones ni acciones
  const renderPedido = (pedido) => (
    <div key={pedido.id} className="pedido-card">
      <div className="card-header">
        <span className="mesa-badge">Mesa {pedido.mesaNumero}</span>
        <span className="hora">
           {pedido.createdAt ? new Date(pedido.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
        </span>
      </div>
      <div className="card-body">
        <ul>
          {pedido.items && pedido.items.map((item, index) => (
            <li key={index}><strong>{item.qty}x</strong> {item.plato || item.nombre}</li>
          ))}
        </ul>
        {pedido.nota && <p className="nota">📝 {pedido.nota}</p>}
      </div>
    </div>
  );

  if (cargandoSeguridad) {
    return <div className="pantalla-carga">🔄 Verificando credenciales...</div>;
  }

  if (!usuario) {
    return (
      <div className="pantalla-error">
        <h1>🔒 Acceso Restringido</h1>
        <p>Debes iniciar sesión para ver esta página.</p>
        <a href="/" className="btn-volver">Ir al Login</a>
      </div>
    );
  }

  if (!esCocinero) {
    return (
      <div className="pantalla-error">
        <h1>⛔ Acceso Denegado</h1>
        <p>Tu usuario <strong>{usuario.email}</strong> no tiene permisos de Cocina.</p>
        <a href="/" className="btn-volver">Volver al Inicio</a>
      </div>
    );
  }

  return (
    <div className="cocina-dashboard">
      <header className="cocina-header">
        <h1>👨‍🍳 Monitor de Cocina <span className="usuario-badge">{usuario.email}</span></h1>
      </header>

      <div className="tablero-solo">
        <div className="columna col-pendientes">
          <h2>🔔 Pedidos Pendientes</h2>
          <div className="lista-pedidos">
            {pedidos.length > 0 ? (
              pedidos.map(p => renderPedido(p))
            ) : (
              <p className="sin-pedidos">No hay pedidos pendientes por ahora.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cocina;