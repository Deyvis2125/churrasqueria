
import { useState } from "react";
import MozoMesas from "./mozo-mesas";
import PedidoModal from "./pedido-modal";
import { auth } from "../../firebase/config";

export default function Mozo() {
  const [mesaActiva, setMesaActiva] = useState(null);
  const [mostrarPedido, setMostrarPedido] = useState(false);

  const mozoId = auth.currentUser?.uid;

  return (
    <section>
      <h1>Área del Mozo</h1>

      <MozoMesas onSeleccionarMesa={(mesa) => {
        setMesaActiva(mesa);
        setMostrarPedido(true);
      }} />

      {mostrarPedido && mesaActiva && (
        <PedidoModal
          mesa={mesaActiva}
          mozoId={mozoId}
          onClose={() => {
            setMostrarPedido(false);
            setMesaActiva(null);
          }}
        />
      )}
    </section>
  );
}

import React, { useState } from "react";
import "./mozo.css";
import MozoCrearPedido from "./MozoCrearPedido";
import MozoPedidosActivos from "./MozoPedidosActivos";
import { BigTabButton } from "./mozo.ui";

export default function Mozo() {
  const [view, setView] = useState("crear"); // crear | pedidos

  return (
    <section className="mozo-root">
      <header className="mozo-top">
        <img className="mozo-logo" src="/imagen/logyn.webp" alt="Logo" />
        <div className="mozo-title">
          <h1>Área del Mozo</h1>
          <p>Rápido y simple: toma pedidos y actualiza estados.</p>
        </div>
      </header>

      <nav className="mozo-nav">
        <BigTabButton active={view === "crear"} onClick={() => setView("crear")}>
          🍽️ Crear Pedido
        </BigTabButton>

        <BigTabButton active={view === "pedidos"} onClick={() => setView("pedidos")}>
          📋 Pedidos Activos
        </BigTabButton>
      </nav>

      <main className="mozo-main">
        {view === "crear" ? <MozoCrearPedido /> : <MozoPedidosActivos />}
      </main>
    </section>
  );
}


