import { useState } from "react";
import "./main.css";

// Si ya tienes imágenes en /public, puedes usarlas así:
const mesaImg = "/mesa.png"; // pon tu imagen en: public/mesa.png

const mesas = [1, 2, 3, 4, 5, 6, 7, 8];

const menu = [
  { id: 1, nombre: "Hamburguesa", precio: 18 },
  { id: 2, nombre: "Pizza", precio: 25 },
  { id: 3, nombre: "Pollo a la brasa", precio: 30 },
  { id: 4, nombre: "Gaseosa", precio: 6 },
];

const Mozo = () => {
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [pedido, setPedido] = useState([]);

  const agregarAlPedido = (item) => {
    setPedido((prev) => [...prev, item]);
  };

  const total = pedido.reduce((acc, item) => acc + item.precio, 0);

  return (
    <section className="mozo-view">
      <header className="mozo-header">
        <h1>Área del Mozo</h1>
        <p>Selecciona una mesa para tomar el pedido</p>
      </header>

      <main className="contenido">
        {/* Mesas */}
        <div className="mesas-section">
          <h2>Mesas disponibles</h2>

          <div className="mesas-grid">
            {mesas.map((n) => (
              <button
                key={n}
<<<<<<< HEAD
                className={mesa ${mesaSeleccionada === n ? "mesa-activa" : ""}}
                onClick={() => setMesaSeleccionada(n)}
              >
                <img className="mesa-img" src={mesaImg} alt={Mesa ${n}} />
=======
                className={`mesa ${mesaSeleccionada === n ? "mesa-activa" : ""}`}
                onClick={() => setMesaSeleccionada(n)}
              >
                <img className="mesa-img" src={mesaImg} alt={`Mesa ${n}`} />
>>>>>>> c8e07a0c95841eb1cc8de9f1f6281b8fe26a4af0
                <span className="mesa-numero">Mesa {n}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Menú (solo si hay mesa seleccionada) */}
        {mesaSeleccionada && (
          <aside className="menu-panel">
            <div className="menu-header">
              <h2>Menú - Mesa {mesaSeleccionada}</h2>
              <button className="btn-cerrar" onClick={() => { setMesaSeleccionada(null); setPedido([]); }}>
                Cerrar
              </button>
            </div>

            <div className="menu-lista">
              {menu.map((item) => (
                <div key={item.id} className="menu-item">
                  <div>
                    <strong>{item.nombre}</strong>
                    <div className="precio">S/ {item.precio}</div>
                  </div>
                  <button className="btn-agregar" onClick={() => agregarAlPedido(item)}>
                    Agregar
                  </button>
                </div>
              ))}
            </div>

            <div className="pedido">
              <h3>Pedido</h3>
              {pedido.length === 0 ? (
                <p className="muted">Aún no agregaste productos.</p>
              ) : (
                <>
                  <ul className="pedido-lista">
                    {pedido.map((p, idx) => (
                      <li key={idx}>{p.nombre} — S/ {p.precio}</li>
                    ))}
                  </ul>
                  <div className="total">Total: <strong>S/ {total}</strong></div>
                </>
              )}
            </div>
          </aside>
        )}
      </main>
    </section>
  );
};

export default Mozo;
