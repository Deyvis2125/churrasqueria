import React, { useState, useMemo } from 'react';
import './BoletaModal.css';
import { findClienteByDocument, createOrUpdateCliente } from '../../services/clienteService';

const money = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

const BoletaModal = ({ pedido, onPagoConfirmado, onCancelar }) => {
  const [tipoComprobante, setTipoComprobante] = useState('Boleta');
  
  // Datos del cliente
  const [dni, setDni] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [direccion, setDireccion] = useState('');
  
  const [isFetching, setIsFetching] = useState(false);
  const [clienteEncontrado, setClienteEncontrado] = useState(false);

  // Múltiples métodos de pago
  const [pagos, setPagos] = useState([]);
  const [metodoPagoActual, setMetodoPagoActual] = useState('CASH');
  const [montoActual, setMontoActual] = useState('');
  
  // Detalles específicos por método
  const [detallesCash, setDetallesCash] = useState({ received: '', change: '' });
  const [detallesYape, setDetallesYape] = useState({ operationCode: '', phone: '' });
  const [detallesCard, setDetallesCard] = useState({ cardType: 'VISA', reference: '', terminalId: 'POS-01' });

  const { total, items } = pedido;

  const { subtotal, igv } = useMemo(() => {
    const sub = total / 1.18;
    const impuesto = total - sub;
    return { subtotal: sub, igv: impuesto };
  }, [total]);

  // Calcular monto pendiente
  const montoPagado = useMemo(() => {
    return pagos.reduce((sum, p) => sum + p.amount, 0);
  }, [pagos]);

  const montoPendiente = useMemo(() => {
    return Math.max(0, total - montoPagado);
  }, [total, montoPagado]);

  // Validaciones
  const validateDNI = (dni) => {
    return /^\d{8}$/.test(dni) && dni[0] !== '0'; // 8 dígitos y no empieza con 0
  };

  const validateNombreCliente = (nombre) => {
    return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre) && nombre.trim().length > 0;
  };

  const validateRUC = (ruc) => {
    return /^\d{11}$/.test(ruc) && (ruc.startsWith('10') || ruc.startsWith('20'));
  };

  // Buscar cliente por documento
  const handleDocumentLookup = async (documento, tipo) => {
    if (tipo === 'DNI' && !validateDNI(documento)) {
      alert('Por favor, ingrese un DNI válido (8 dígitos, no puede empezar con 0).');
      return;
    }

    if (tipo === 'RUC' && !validateRUC(documento)) {
      alert('Por favor, ingrese un RUC válido (11 dígitos, debe empezar con 10 o 20).');
      return;
    }

    setIsFetching(true);
    setClienteEncontrado(false);
    
    const cliente = await findClienteByDocument(documento);
    
    if (cliente) {
      if (tipo === 'DNI') {
        setNombreCliente(cliente.nombreCompleto || '');
      } else {
        setRazonSocial(cliente.razonSocial || '');
        setDireccion(cliente.direccion || '');
      }
      setClienteEncontrado(true);
    } else {
      if (tipo === 'DNI') setNombreCliente('');
      if (tipo === 'RUC') {
        setRazonSocial('');
        setDireccion('');
      }
    }

    setIsFetching(false);
  };

  // Agregar pago
  const handleAgregarPago = () => {
    if (!montoActual || parseFloat(montoActual) <= 0) {
      alert('Ingrese un monto válido.');
      return;
    }

    const monto = parseFloat(montoActual);

    if (monto > montoPendiente) {
      alert(`El monto no puede exceder S/ ${montoPendiente.toFixed(2)}`);
      return;
    }

    let nuevoDetalle;

    if (metodoPagoActual === 'CASH') {
      if (!detallesCash.received || parseFloat(detallesCash.received) < monto) {
        alert('Ingrese el monto recibido correctamente.');
        return;
      }
      nuevoDetalle = {
        received: parseFloat(detallesCash.received),
        change: parseFloat(detallesCash.received) - monto
      };
    } else if (metodoPagoActual === 'YAPE') {
      if (!detallesYape.operationCode) {
        alert('Ingrese la referencia/operación de Yape.');
        return;
      }
      nuevoDetalle = {
        operationCode: detallesYape.operationCode,
        phone: detallesYape.phone || ''
      };
    } else if (metodoPagoActual === 'CARD') {
      if (!detallesCard.reference) {
        alert('Ingrese la referencia/lote de la tarjeta.');
        return;
      }
      nuevoDetalle = {
        cardType: detallesCard.cardType,
        reference: detallesCard.reference,
        terminalId: detallesCard.terminalId
      };
    }

    const nuevoPago = {
      method: metodoPagoActual,
      amount: monto,
      details: nuevoDetalle
    };

    setPagos([...pagos, nuevoPago]);

    // Resetear campos
    setMontoActual('');
    setDetallesCash({ received: '', change: '' });
    setDetallesYape({ operationCode: '', phone: '' });
    setDetallesCard({ cardType: 'VISA', reference: '', terminalId: 'POS-01' });
  };

  // Eliminar pago
  const handleEliminarPago = (idx) => {
    setPagos(pagos.filter((_, i) => i !== idx));
  };

  // Confirmar
  const handleConfirmar = async () => {
    // Validar datos del cliente
    if (tipoComprobante === 'Boleta') {
      if (!validateDNI(dni)) {
        alert('DNI inválido. Debe tener 8 dígitos y no puede empezar con 0.');
        return;
      }
      if (!validateNombreCliente(nombreCliente)) {
        alert('Nombre inválido. Solo se permiten letras y espacios.');
        return;
      }
    } else if (tipoComprobante === 'Factura') {
      if (!validateRUC(ruc)) {
        alert('RUC inválido. Debe tener 11 dígitos y empezar con 10 o 20.');
        return;
      }
      if (!razonSocial || razonSocial.trim().length === 0) {
        alert('Razón Social es requerida para factura.');
        return;
      }
      if (!direccion || direccion.trim().length === 0) {
        alert('Dirección es requerida para factura.');
        return;
      }
    }

    // Validar pagos
    if (pagos.length === 0) {
      alert('Debe agregar al menos un método de pago.');
      return;
    }

    if (Math.abs(montoPagado - total) > 0.01) {
      alert(`El monto total de pagos (S/ ${montoPagado.toFixed(2)}) debe ser igual al total (S/ ${total.toFixed(2)})`);
      return;
    }

    // Guardar cliente si es nuevo
    if (!clienteEncontrado) {
      try {
        const datosCliente = tipoComprobante === 'Boleta' 
          ? { nombreCompleto: nombreCliente }
          : { razonSocial: razonSocial, direccion: direccion };
        
        const documento = tipoComprobante === 'Boleta' ? dni : ruc;
        await createOrUpdateCliente(documento, datosCliente);
      } catch (error) {
        console.error("No se pudo guardar el cliente:", error);
        alert("Hubo un error al guardar los datos del cliente. Intente de nuevo.");
        return;
      }
    }

    // Construir datos finales de pago
    const datosPago = {
      tipoComprobante,
      cliente: {
        nombre: tipoComprobante === 'Boleta' ? nombreCliente : razonSocial,
        docNumber: tipoComprobante === 'Boleta' ? dni : ruc,
        docType: tipoComprobante === 'Boleta' ? 'DNI' : 'RUC',
        address: tipoComprobante === 'Factura' ? direccion : null
      },
      items,
      totals: {
        subtotal: parseFloat(subtotal.toFixed(2)),
        igv: parseFloat(igv.toFixed(2)),
        grandTotal: total
      },
      payments: pagos,
      mesaNumero: pedido.mesaNumero,
      fecha: new Date()
    };

    onPagoConfirmado(datosPago);
  };

  return (
    <div className="boleta-modal-overlay">
      <div className="boleta-modal-content">
        
        {/* Encabezado profesional */}
        <header className="boleta-header-pro">
          <div className="header-line">{'─'.repeat(60)}</div>
          <h1 className="titulo-principal">CHURRASQUERÍA "ESTRELLA"</h1>
          <p>RUC: 20601234567</p>
          <p>AV. ALAMEDA - PUERTO MALDONADO</p>
          <p>Telf: 916884949</p>
          <div className="header-line">{'─'.repeat(60)}</div>
        </header>

        {/* Tipo de comprobante y datos del cliente */}
        <section className="seccion-comprobante">
          <div className="header-comprobante">
            {tipoComprobante === 'Boleta' ? (
              <h2>BOLETA DE VENTA ELECTRÓNICA</h2>
            ) : (
              <h2>FACTURA ELECTRÓNICA</h2>
            )}
          </div>
          <div className="header-line">{'─'.repeat(60)}</div>

          {/* Series y número */}
          <div className="serie-numero">
            <span>Serie: B001 - Nro: 0004589</span>
          </div>
          <div className="header-line">{'─'.repeat(60)}</div>

          {/* Datos cliente */}
          <div className="cliente-datos-section">
            <div className="dato-fila">
              <span className="etiqueta">FECHA DE EMISIÓN</span>
              <span className="valor">{new Date().toLocaleString('es-PE')}</span>
            </div>
            <div className="dato-fila">
              <span className="etiqueta">CAJERO</span>
              <span className="valor">USUARIO</span>
            </div>

            <div className="tipo-comprobante-select">
              <label>
                <input type="radio" name="comprobante" value="Boleta" 
                  checked={tipoComprobante === 'Boleta'} 
                  onChange={(e) => {
                    setTipoComprobante(e.target.value);
                    setRuc('');
                    setRazonSocial('');
                    setDireccion('');
                  }} 
                />
                Boleta
              </label>
              <label>
                <input type="radio" name="comprobante" value="Factura" 
                  checked={tipoComprobante === 'Factura'} 
                  onChange={(e) => {
                    setTipoComprobante(e.target.value);
                    setDni('');
                    setNombreCliente('');
                  }} 
                />
                Factura
              </label>
            </div>

            {/* Datos específicos por tipo */}
            {tipoComprobante === 'Boleta' ? (
              <>
                <div className="input-grupo">
                  <input 
                    type="text" 
                    value={dni} 
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))} 
                    placeholder="Ej: 12345678"
                    maxLength="8"
                  />
                  <button onClick={() => handleDocumentLookup(dni, 'DNI')} disabled={isFetching}>
                    Buscar
                  </button>
                </div>
                <input 
                  type="text" 
                  value={nombreCliente} 
                  onChange={(e) => setNombreCliente(e.target.value)} 
                  placeholder="Nombre completo"
                  readOnly={clienteEncontrado}
                />
                <div className="dato-fila">
                  <span className="etiqueta">DNI/RUC</span>
                  <span className="valor">{dni || '-'}</span>
                </div>
                <div className="dato-fila">
                  <span className="etiqueta">CLIENTE</span>
                  <span className="valor">{nombreCliente || '-'}</span>
                </div>
                <div className="dato-fila">
                  <span className="etiqueta">DIRECCIÓN</span>
                  <span className="valor">-</span>
                </div>
              </>
            ) : (
              <>
                <div className="input-grupo">
                  <input 
                    type="text" 
                    value={ruc} 
                    onChange={(e) => setRuc(e.target.value.replace(/\D/g, '').slice(0, 11))} 
                    placeholder="Ej: 20601234567"
                    maxLength="11"
                  />
                  <button onClick={() => handleDocumentLookup(ruc, 'RUC')} disabled={isFetching}>
                    Buscar
                  </button>
                </div>
                <input 
                  type="text" 
                  value={razonSocial} 
                  onChange={(e) => setRazonSocial(e.target.value)} 
                  placeholder="Razón Social"
                  readOnly={clienteEncontrado}
                />
                <input 
                  type="text" 
                  value={direccion} 
                  onChange={(e) => setDireccion(e.target.value)} 
                  placeholder="Dirección"
                />
                <div className="dato-fila">
                  <span className="etiqueta">RUC</span>
                  <span className="valor">{ruc || '-'}</span>
                </div>
                <div className="dato-fila">
                  <span className="etiqueta">CLIENTE</span>
                  <span className="valor">{razonSocial || '-'}</span>
                </div>
                <div className="dato-fila">
                  <span className="etiqueta">DIRECCIÓN</span>
                  <span className="valor">{direccion || '-'}</span>
                </div>
              </>
            )}
          </div>

          <div className="header-line">{'─'.repeat(60)}</div>
        </section>

        {/* Detalles de items */}
        <section className="boleta-items-pro">
          <div className="items-header">
            <span className="col-cant">CANT.</span>
            <span className="col-desc">DESCRIPCIÓN</span>
            <span className="col-precio">P.UNIT</span>
            <span className="col-importe">IMPORTE</span>
          </div>
          <div className="header-line">{'─'.repeat(60)}</div>
          <div className="items-body">
            {items.map((it, idx) => (
              <div key={idx} className="item-row">
                <span className="col-cant">{it.qty}</span>
                <span className="col-desc">{it.plato}</span>
                <span className="col-precio">{money(it.precio)}</span>
                <span className="col-importe">{money(it.subtotal ?? it.precio * it.qty)}</span>
              </div>
            ))}
          </div>
          <div className="header-line">{'─'.repeat(60)}</div>
        </section>

        {/* Totales */}
        <section className="boleta-totales-pro">
          <div className="total-row">
            <span>OP. GRAVADA</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="total-row">
            <span>I.G.V. (18%)</span>
            <span>{money(igv)}</span>
          </div>
          <div className="total-row total-grande">
            <span>IMPORTE TOTAL</span>
            <span>{money(total)}</span>
          </div>
          <div className="header-line">{'─'.repeat(60)}</div>
        </section>

        {/* Métodos de pago */}
        <section className="boleta-pagos-pro">
          <h3>{'>'}{'>'}{'>'}FORMAS DE PAGO{'<'}{'<'}{'<'}</h3>
          <div className="header-line">{'─'.repeat(60)}</div>

          {/* Lista de pagos agregados */}
          {pagos.length > 0 && (
            <div className="pagos-listado">
              {pagos.map((pago, idx) => (
                <div key={idx} className="pago-item">
                  <div className="pago-header">
                    {idx + 1}. {pago.method === 'CASH' ? 'EFECTIVO' : pago.method === 'YAPE' ? 'BILLETERA DIGITAL (YAPE)' : 'TARJETA DE CRÉDITO (' + pago.details.cardType + ')'}
                  </div>
                  <div className="pago-detalle">
                    {pago.method === 'CASH' && (
                      <>
                        <span>Recibido: {money(pago.details.received)}</span>
                        <span>Vuelto: {money(pago.details.change)}</span>
                      </>
                    )}
                    {pago.method === 'YAPE' && (
                      <>
                        <span>Monto: {money(pago.amount)}</span>
                        <span>Ref/Operación: {pago.details.operationCode}</span>
                      </>
                    )}
                    {pago.method === 'CARD' && (
                      <>
                        <span>Monto: {money(pago.amount)}</span>
                        <span>Ref/Lote: {pago.details.reference}</span>
                      </>
                    )}
                  </div>
                  <button className="btn-eliminar" onClick={() => handleEliminarPago(idx)}>✕</button>
                </div>
              ))}
              <div className="header-line">{'─'.repeat(60)}</div>
            </div>
          )}

          {/* Agregar nuevo pago */}
          {montoPendiente > 0 && (
            <div className="pago-nuevo">
              <h4>Agregar Pago</h4>

              <div className="metodo-select">
                {['CASH', 'YAPE', 'CARD'].map(metodo => (
                  <button 
                    key={metodo} 
                    className={`metodo-btn ${metodoPagoActual === metodo ? 'activo' : ''}`}
                    onClick={() => setMetodoPagoActual(metodo)}
                  >
                    {metodo === 'CASH' ? 'Efectivo' : metodo === 'YAPE' ? 'Yape' : 'Tarjeta'}
                  </button>
                ))}
              </div>

              <div className="monto-input">
                <input 
                  type="number" 
                  value={montoActual}
                  onChange={(e) => setMontoActual(e.target.value)}
                  placeholder={`Monto (máx: ${montoPendiente.toFixed(2)})`}
                  step="0.01"
                  min="0"
                />
              </div>

              {metodoPagoActual === 'CASH' && (
                <div className="detalles-metodo">
                  <input 
                    type="number" 
                    value={detallesCash.received}
                    onChange={(e) => {
                      const received = parseFloat(e.target.value) || 0;
                      const change = Math.max(0, received - parseFloat(montoActual || 0));
                      setDetallesCash({ received: received.toString(), change: change.toString() });
                    }}
                    placeholder="Monto recibido"
                    step="0.01"
                    min="0"
                  />
                  <input 
                    type="number" 
                    value={detallesCash.change}
                    readOnly
                    placeholder="Vuelto"
                  />
                </div>
              )}

              {metodoPagoActual === 'YAPE' && (
                <div className="detalles-metodo">
                  <input 
                    type="text" 
                    value={detallesYape.operationCode}
                    onChange={(e) => setDetallesYape({...detallesYape, operationCode: e.target.value})}
                    placeholder="Ref/Operación"
                  />
                  <input 
                    type="text" 
                    value={detallesYape.phone}
                    onChange={(e) => setDetallesYape({...detallesYape, phone: e.target.value})}
                    placeholder="Teléfono (opcional)"
                  />
                </div>
              )}

              {metodoPagoActual === 'CARD' && (
                <div className="detalles-metodo">
                  <select 
                    value={detallesCard.cardType}
                    onChange={(e) => setDetallesCard({...detallesCard, cardType: e.target.value})}
                  >
                    <option>VISA</option>
                    <option>MASTERCARD</option>
                    <option>AMEX</option>
                  </select>
                  <input 
                    type="text" 
                    value={detallesCard.reference}
                    onChange={(e) => setDetallesCard({...detallesCard, reference: e.target.value})}
                    placeholder="Ref/Lote"
                  />
                </div>
              )}

              <button className="btn-agregar-pago" onClick={handleAgregarPago}>
                Agregar Pago
              </button>
            </div>
          )}

          {montoPendiente === 0 && (
            <div className="pago-completo">✓ Pago completo</div>
          )}
        </section>

        {/* Pie de página */}
        <footer className="boleta-footer-pro">
          <div className="header-line">{'─'.repeat(60)}</div>
          <p className="texto-pago">SON: {convertirNumeroALetras(Math.round(total))}</p>
          <div className="header-line">{'─'.repeat(60)}</div>
          <p className="texto-representacion">Representación Impresa de la Boleta</p>
          <p className="texto-representacion">de Venta Electrónica Autorizada.</p>
          <div className="header-line">{'─'.repeat(60)}</div>
          <p className="texto-gracias">Gracias por su preferencia !!!</p>
          <div className="header-line">{'─'.repeat(60)}</div>
        </footer>

        {/* Acciones */}
        <footer className="boleta-acciones-pro">
          <button onClick={onCancelar} className="cancelar-btn">Cancelar</button>
          <button 
            onClick={handleConfirmar} 
            className="confirmar-btn"
            disabled={isFetching || montoPendiente > 0}
          >
            Confirmar Pago
          </button>
        </footer>

      </div>
    </div>
  );
};

// Función auxiliar para convertir números a letras
const convertirNumeroALetras = (num) => {
  const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenasMultiples = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  
  const converter = (n) => {
    if (n < 10) return unidades[n];
    if (n < 20) return decenas[n - 10];
    if (n < 100) {
      const dec = Math.floor(n / 10);
      const unit = n % 10;
      return decenasMultiples[dec] + (unit ? ' Y ' + unidades[unit] : '');
    }
    if (n < 1000) {
      const cen = Math.floor(n / 100);
      const remainder = n % 100;
      return centenas[cen] + (remainder ? ' ' + converter(remainder) : '');
    }
    if (n < 1000000) {
      const miles = Math.floor(n / 1000);
      const remainder = n % 1000;
      return (miles === 1 ? 'MIL' : converter(miles) + ' MIL') + (remainder ? ' ' + converter(remainder) : '');
    }
  };

  return converter(num) + ' CON 00/100 SOLES';
};

export default BoletaModal;

