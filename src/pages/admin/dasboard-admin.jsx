import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminUsers from "./admin-users-list.jsx";
import AdminMenus from "./admin-menus.jsx";
import AdminSales from "./admin-sales.jsx";
import AdminMesas from "./admin-mesas.jsx";
import AdminMenusList from "./admin-ver-menu.jsx"; 
import AdminLogs from "./logs.jsx"
import "./dashboard-admin.css";
import UserCard from "../../components/UserCard";
export default function DashboardAdmin() {
  const [tab, setTab] = useState("usuarios");
  const [subTab, setSubTab] = useState("crear");
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Admin Panel</h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p className="dashboard-welcome">
          Panel de administración del restaurante. Selecciona una opción para
          gestionar el sistema.
        </p>
        <UserCard />
      </div>

      <nav className="dashboard-nav">
        <button className="nav-button" onClick={() => setTab("usuarios")}>
          Registrar Usuario
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

        <button className="nav-button" onClick={() => setTab("logs")}>
          Logs
        </button>
      </nav>

      <section className="dashboard-content">
        {tab === "usuarios" && <AdminUsers />}

        {tab === "menus" && (
          <div>
            <nav className="dashboard-nav">
              <button
                className="nav-button"
                onClick={() => setSubTab("crear")}
              >
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
        {tab === "logs" && <AdminLogs />}
      </section>
    </div>
  );
}
