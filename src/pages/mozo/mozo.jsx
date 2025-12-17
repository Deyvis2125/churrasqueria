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
