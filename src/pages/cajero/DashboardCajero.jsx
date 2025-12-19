import React, { useState } from "react";
import CajeroEntregados from "./CajeroEntregados";
import HistorialVentas from "./historialventas";
import "./dashboard-cajero.css";

export default function DashboardCajero() {
  const [tab, setTab] = useState("entregados");

  return (
    <section className="cajero-root">
      <header className="cajero-header">
        <h1 className="cajero-title">Caja</h1>
        <p className="cajero-sub">
          Cobros y cierre del día. Selecciona una opción.
        </p>
      </header>

      <nav className="cajero-nav">
        <button
          className={`cajero-btn ${tab === "entregados" ? "active" : ""}`}
          onClick={() => setTab("entregados")}
        >
          🧾 Por Cobrar
        </button>

        <button
          className={`cajero-btn ${tab === "historial" ? "active" : ""}`}
          onClick={() => setTab("historial")}
        >
          📊 Cierre del día
        </button>
      </nav>

      <main className="cajero-main">
        {tab === "entregados" ? <CajeroEntregados /> : <HistorialVentas />}
      </main>
    </section>
  );
}
