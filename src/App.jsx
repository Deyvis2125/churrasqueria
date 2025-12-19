import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Acceso from './pages/Acceso/acceso.jsx'
import Registro from './pages/Acceso/registro.jsx'
import DashboardAdmin from './pages/admin/dasboard-admin.jsx'
import Mozo from './pages/mozo/mozo.jsx'
import AdminMesas from './pages/admin/admin-mesas.jsx'
import DashboardCajero from './pages/cajero/DashboardCajero.jsx'
import Cocina from './pages/Cocina/cocina.jsx'
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/acceso" replace />} />
        <Route path="/acceso" element={<Acceso />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/admin" element={<DashboardAdmin />} />
        <Route path="/mozo" element={<Mozo />} />
        <Route path="/cajero" element={<DashboardCajero />} />
        <Route path="/cocina" element={<Cocina />} />
        <Route path="/admin/mesas" element={<AdminMesas />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
