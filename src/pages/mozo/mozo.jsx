const Mozo = () => {
  return (
    <section className="mozo-view">
      
      <header className="mozo-header">
        <h1>Área del Mozo</h1>
        <p>Selecciona una mesa para tomar el pedido</p>
      </header>

      <main className="mesas-section">
        <h2>Mesas disponibles</h2>

        <div className="mesas-grid">
          <button className="mesa">
            <span className="mesa-numero">Mesa 1</span>
          </button>

          <button className="mesa">
            <span className="mesa-numero">Mesa 2</span>
          </button>

          <button className="mesa">
            <span className="mesa-numero">Mesa 3</span>
          </button>

          <button className="mesa">
            <span className="mesa-numero">Mesa 4</span>
          </button>

          <button className="mesa">
            <span className="mesa-numero">Mesa 5</span>
          </button>

          <button className="mesa">
            <span className="mesa-numero">Mesa 6</span>
          </button>

          <button className="mesa">
            <span className="mesa-numero">Mesa 7</span>
          </button>

          <button className="mesa">
            <span className="mesa-numero">Mesa 8</span>
          </button>
        </div>
      </main>

    </section>
  );
};

export default Mozo;
