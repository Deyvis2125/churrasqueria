import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config'; // Importamos auth también
import { collection, query, onSnapshot, doc, updateDoc, orderBy, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; // Para detectar el usuario actual
import './main_cocina.css'; 

const Cocina = () => {
  const [pedidos, setPedidos] = useState([]);
  
  // ESTADOS DE SEGURIDAD
  const [usuario, setUsuario] = useState(null);
  const [esCocinero, setEsCocinero] = useState(false);
  const [cargandoSeguridad, setCargandoSeguridad] = useState(true);

  // 1. EFECTO DE SEGURIDAD (Verificar Rol)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (userLogueado) => {
      if (userLogueado) {
        setUsuario(userLogueado);
        
        // Consultamos a la base de datos qué rol tiene este usuario
        const docRef = doc(db, "users", userLogueado.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().rol === 'cocina') {
          setEsCocinero(true); //  Es cocinero, pase usted
        } else {
          setEsCocinero(false); // No es cocinero (o no tiene rol)
        }
      } else {
        setUsuario(null);
        setEsCocinero(false);
      }
      setCargandoSeguridad(false); // Terminamos de verificar
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. EFECTO DE DATOS (Solo se activa si es cocinero)
  useEffect(() => {
    if (!esCocinero) return; // Si no es cocinero, no gastamos datos

    const q = query(collection(db, 'pedidos'), orderBy('fecha', 'asc'));
    const unsubscribePedidos = onSnapshot(q, (snapshot) => {
      const pedidosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPedidos(pedidosData);
    });

    return () => unsubscribePedidos();
  }, [esCocinero]); // Se ejecuta cuando confirmamos que es cocinero

  // FUNCIONES DEL DASHBOARD
  const actualizarEstado = async (id, nuevoEstado) => {
    try {
      const pedidoRef = doc(db, 'pedidos', id);
      await updateDoc(pedidoRef, { estado: nuevoEstado });
    } catch (error) {
      console.error("Error actualizando pedido:", error);
    }
  };

  const renderPedido = (pedido, textoBoton, siguienteEstado, claseBoton) => (
    <div key={pedido.id} className="pedido-card">
      <div className="card-header">
        <span className="mesa-badge">Mesa {pedido.mesaNumero}</span>
        <span className="hora">
           {pedido.fecha ? new Date(pedido.fecha.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
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
      <div className="card-footer">
        <button className={`btn-accion ${claseBoton}`} onClick={() => actualizarEstado(pedido.id, siguienteEstado)}>
          {textoBoton}
        </button>
      </div>
    </div>
  );

  // ---------------- RENDERIZADO CONDICIONAL (EL FILTRO) ----------------
  
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
        <p>Tu rol actual no es "cocina".</p>
        <a href="/" className="btn-volver">Volver al Inicio</a>
      </div>
    );
  }

  // SI PASA TODAS LAS PRUEBAS, MUESTRA EL DASHBOARD
  return (
    <div className="cocina-dashboard">
      <header className="cocina-header">
        <h1>👨‍🍳 Monitor de Cocina <span className="usuario-badge">{usuario.email}</span></h1>
      </header>

      <div className="tablero">
        <div className="columna col-pendientes">
          <h2>🔔 Pendientes</h2>
          <div className="lista-pedidos">
            {pedidos.filter(p => p.estado === 'pendiente').map(p => renderPedido(p, '✅ Listo', 'listo', 'btn-naranja'))}
          </div>
        </div>
        <div className="columna col-listos">
          <h2>🍽️ Listos</h2>
          <div className="lista-pedidos">
            {pedidos.filter(p => p.estado === 'listo').map(p => renderPedido(p, '📦 Entregado', 'entregado', 'btn-verde'))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cocina;