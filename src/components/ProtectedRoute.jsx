import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth } from '../firebase/config.js';

/**
 * Componente que protege rutas verificando autenticación y rol
 * @param {Object} props - { children, allowedRoles, userRole }
 */
export function ProtectedRoute({ children, allowedRoles = [], userRole = null }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Mostrar loading mientras se verifica autenticación
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <p>Cargando...</p>
      </div>
    );
  }

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/acceso" replace />;
  }

  // Verificar rol si se especificaron roles permitidos
  if (allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/acceso" replace />;
  }

  return children;
}

export default ProtectedRoute;
