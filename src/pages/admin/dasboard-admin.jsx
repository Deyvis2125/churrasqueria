import React, { useState } from 'react';
import AdminUsers from './admin-users.jsx';
import AdminMenus from './admin-menus.jsx';
import AdminSales from './admin-sales.jsx';
import './dashboard-admin.css';

export default function DashboardAdmin() {
	const [tab, setTab] = useState('usuarios');

	return (
		<div className="dashboard-container">
			<h1 className="dashboard-title">Dashboard Admin</h1>
			<p className="dashboard-welcome">Bienvenido, eres administrador. Aquí van las herramientas de administración.</p>

			<nav className="dashboard-nav">
				<button className="nav-button" onClick={()=>setTab('usuarios')}>Usuarios</button>
				<button className="nav-button" onClick={()=>setTab('menus')}>Menús</button>
				<button className="nav-button" onClick={()=>setTab('ventas')}>Ventas</button>
			</nav>

			<section className="dashboard-content">
				{tab === 'usuarios' && <AdminUsers />}
				{tab === 'menus' && <AdminMenus />}
				{tab === 'ventas' && <AdminSales />}
			</section>
		</div>
	);
}

