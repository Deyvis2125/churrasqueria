import React, { useState } from "react";
import AdminUsers from "./admin-users.jsx";
import AdminMenus from "./admin-menus.jsx";
import AdminSales from "./admin-sales.jsx";
import AdminMesas from "./admin-mesas.jsx";
import AdminUsersList from "./admin-users-list.jsx";
import AdminMenusList from "./admin-ver-menu.jsx";
import "./dashboard-admin.css";

export default function DashboardAdmin() {
  const [tab, setTab] = useState("usuarios");
  const [subTab, setSubTab] = useState("crear");

  return (
    <div className="dashboard-container">
      {/* 🔥 TÍTULO CAMBIADO */}
      <h1 className="dashboard-title">Admin Panel</h1>

      {/* 🔥 SUBTÍTULO MÁS PROFESIONAL */}
      <p className="dashboard-welcome">
        Panel de administración del restaurante. Selecciona una opción para
        gestionar el sistema.
      </p>

      <nav className="dashboard-nav">
        <button className="nav-button" onClick={() => setTab("usuarios")}>
          Registrar Usuario
        </button>

        <button className="nav-button" onClick={() => setTab("listado-usuarios")}>
          Listado Usuarios
        </button>

        <button className="nav-button" onClick={() => setTab("menus")}>
          Menús
        </button>

        <button className="nav-button" onClick={() => setTab("ventas")}>
          Ventas
        </button>

        <button className="nav-button" onClick={() => setTab("mesas")}>
          Mesas
        </button>
      </nav>

      <section className="dashboard-content">
        {tab === "usuarios" && <AdminUsers />}
        {tab === "listado-usuarios" && <AdminUsersList />}
        {tab === "menus" && (
          <div>
            <nav className="dashboard-nav">
              <button className="nav-button" onClick={() => setSubTab("crear")}>
                Crear Menú
              </button>
              <button className="nav-button" onClick={() => setSubTab("ver")}>
                Ver Menús
              </button>
            </nav>
            {subTab === "crear" && <AdminMenus />}
            {subTab === "ver" && <AdminMenusList />}
          </div>
        )}
        {tab === "ventas" && <AdminSales />}
        {tab === "mesas" && <AdminMesas />}
      </section>
    </div>
  );
}

