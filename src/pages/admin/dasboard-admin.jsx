import React, { useState } from 'react';
import AdminUsers from './admin-users.jsx';
import AdminMenus from './admin-menus.jsx';
import AdminSales from './admin-sales.jsx';

export default function DashboardAdmin() {
	const [tab, setTab] = useState('usuarios');

	return (
		<div style={{maxWidth:1000, margin:'2rem auto', padding:20}}>
			<h1>Dashboard Admin</h1>
			<p>Bienvenido, eres administrador. Aquí van las herramientas de administración.</p>

			<nav style={{marginTop:16, marginBottom:16}}>
				<button onClick={()=>setTab('usuarios')} style={{marginRight:8}}>Usuarios</button>
				<button onClick={()=>setTab('menus')} style={{marginRight:8}}>Menús</button>
				<button onClick={()=>setTab('ventas')}>Ventas</button>
			</nav>

			<section style={{marginTop:12}}>
				{tab === 'usuarios' && <AdminUsers />}
				{tab === 'menus' && <AdminMenus />}
				{tab === 'ventas' && <AdminSales />}
			</section>
		</div>
	);
}

