import React, { useState } from 'react';

// Estilos (puedes crear un archivo CSS para este componente)
import './Metodos_pagos.css';

/**
 * Componente para gestionar los métodos de pago de un pedido.
 * Props:
 *  - monto: El monto total a pagar.
 *  - onPagoConfirmado: Función que se ejecuta cuando el pago se confirma.
 *  - onCancelar: Función para cerrar o volver atrás. 
 */
const MetodosPagos = ({ monto, onPagoConfirmado, onCancelar }) => {
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [tipoComprobante, setTipoComprobante] = useState('Boleta');
  const [documentoCliente, setDocumentoCliente] = useState('');

  const handleConfirmarPago = () => {
    // Validaciones básicas
    if (tipoComprobante === 'Factura' && !documentoCliente.trim()) {
      alert('Por favor, ingrese el número de RUC para la factura.');
      return;
    }

    const datosPago = {
      monto,
      metodoPago,
      tipoComprobante,
      documentoCliente,
      fecha: new Date(),
    };

    console.log('Datos del pago a procesar:', datosPago);
    // Aquí iría la lógica para guardar en Firebase y liberar la mesa.
    // Luego, se llama a la función onPagoConfirmado.
    onPagoConfirmado(datosPago);
  };

  return (
    <div className="pago-modal-overlay">
      <div className="pago-modal-content">
        <h2>Confirmar Pago</h2>
        <h3 className="monto-a-pagar">Total: S/ {monto.toFixed(2)}</h3>

        {/* --- Métodos de Pago --- */}
        <fieldset>
          <legend>Método de Pago</legend>
          <div>
            <button
              onClick={() => setMetodoPago('Efectivo')}
              className={metodoPago === 'Efectivo' ? 'selected' : ''}
            >
              Efectivo
            </button>
            <button
              onClick={() => setMetodoPago('QR')}
              className={metodoPago === 'QR' ? 'selected' : ''}
            >
              QR (Yape/Plin)
            </button>
            <button
              onClick={() => setMetodoPago('Tarjeta')}
              className={metodoPago === 'Tarjeta' ? 'selected' : ''}
            >
              Tarjeta
            </button>
          </div>
        </fieldset>

        {/* --- Tipo de Comprobante --- */}
        <fieldset>
          <legend>Tipo de Comprobante</legend>
          <div>
            <label>
              <input
                type="radio"
                name="comprobante"
                value="Boleta"
                checked={tipoComprobante === 'Boleta'}
                onChange={(e) => setTipoComprobante(e.target.value)}
              />
              Boleta
            </label>
            <label>
              <input
                type="radio"
                name="comprobante"
                value="Factura"
                checked={tipoComprobante === 'Factura'}
                onChange={(e) => setTipoComprobante(e.target.value)}
              />
              Factura
            </label>
          </div>
        </fieldset>

        {/* --- Documento para Factura --- */}
        {tipoComprobante === 'Factura' && (
          <fieldset>
            <legend>Documento del Cliente</legend>
            <input
              type="text"
              value={documentoCliente}
              onChange={(e) => setDocumentoCliente(e.target.value)}
              placeholder="Ingrese RUC"
              maxLength="11"
            />
          </fieldset>
        )}

        {/* --- Acciones --- */}
        <div className="pago-acciones">
          <button onClick={handleConfirmarPago} className="confirmar">
            Confirmar Pago
          </button>
          <button onClick={onCancelar} className="cancelar">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetodosPagos;
