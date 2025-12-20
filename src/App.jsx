import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthProvider, AuthContext } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Acceso from './pages/Acceso/acceso.jsx'
import Registro from './pages/Acceso/registro.jsx'
import DashboardAdmin from './pages/admin/dasboard-admin.jsx'
import AdminLogs from './pages/admin/logs.jsx'
import Mozo from './pages/mozo/mozo.jsx'
import EditarPedido from './pages/mozo/EditarPedido.jsx'
import AdminMesas from './pages/admin/admin-mesas.jsx'
import DashboardCajero from './pages/cajero/DashboardCajero.jsx'
import Cocina from './pages/Cocina/cocina.jsx'

function AppRoutes() {
  const { userRole, loading } = useContext(AuthContext)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/acceso" replace />} />
      <Route path="/acceso" element={<Acceso />} />
      <Route path="/registro" element={<Registro />} />
      
      {/* Rutas protegidas por rol */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRoles={['admin']} userRole={userRole}>
            <DashboardAdmin />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/mesas" 
        element={
          <ProtectedRoute allowedRoles={['admin']} userRole={userRole}>
            <AdminMesas />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/logs" 
        element={
          <ProtectedRoute allowedRoles={['admin']} userRole={userRole}>
            <AdminLogs />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/mozo" 
        element={
          <ProtectedRoute allowedRoles={['mozo']} userRole={userRole}>
            <Mozo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/mozo/editar-pedido/:id"
        element={
          <ProtectedRoute allowedRoles={['mozo']} userRole={userRole}>
            <EditarPedido />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/cajero" 
        element={
          <ProtectedRoute allowedRoles={['cajero']} userRole={userRole}>
            <DashboardCajero />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/cocina" 
        element={
          <ProtectedRoute allowedRoles={['cocina']} userRole={userRole}>
            <Cocina />
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App;
