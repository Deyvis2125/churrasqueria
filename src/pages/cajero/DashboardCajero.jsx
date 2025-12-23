import React, { useState } from "react";
import CajeroEntregados from "./CajeroEntregados";
import CierreDia from "./CierreDia";
import "./dashboard-cajero.css";
import UserCard from "../../components/UserCard";
export default function DashboardCajero() {
  const [tab, setTab] = useState("entregados");

  return (
    <section className="cajero-root">
      <header className="cajero-header">
        <h1 className="cajero-title">Caja</h1>
        <p className="cajero-sub">
          Cobros y cierre del día. Selecciona una opción.
        </p>
         <UserCard />
      </header>

      <nav className="cajero-nav">
        <button
          className={`cajero-btn ${tab === "entregados" ? "active" : ""}`}
          onClick={() => setTab("entregados")}
        >
          🧾 Por Cobrar
        </button>

        <button
          className={`cajero-btn ${tab === "cierre" ? "active" : ""}`}
          onClick={() => setTab("cierre")}
        >
          📊 Cierre del día
        </button>
      </nav>

      <main className="cajero-main">
        {tab === "entregados" ? <CajeroEntregados /> : <CierreDia />}
      </main>
    </section>
  );
}
