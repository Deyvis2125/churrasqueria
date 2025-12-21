import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { cobrarPedidoYGuardarHistorial, markComprobantePrinted } from "../../services/historial-ventas";
import { generateBoletaPDF } from "../../services/printService";
import BoletaModal from "./BoletaModal"; // 1. Importar el nuevo modal

const money = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

export default function CajeroEntregados() {
  const [pedidos, setPedidos] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [pedidoACobrar, setPedidoACobrar] = useState(null);

  useEffect(() => {
    const qRef = query(collection(db, "pedidos"), orderBy("createdAt", "asc"));
    return onSnapshot(qRef, (snap) => {
      setPedidos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const entregados = useMemo(
    () => pedidos.filter((p) => p.estado === "entregado"),
    [pedidos]
  );

  const iniciarCobro = (p) => {
    setPedidoACobrar(p);
    setShowModal(true);
  };

  const handlePagoConfirmado = async (datosPago, reservationId = null) => {
    if (!pedidoACobrar) return;

    try {
      setLoadingId(pedidoACobrar.id);
      setShowModal(false);

      const cajeroId = auth.currentUser?.uid || null;
      const res = await cobrarPedidoYGuardarHistorial(pedidoACobrar.id, cajeroId, datosPago, reservationId);

      // Generar PDF y descargar localmente
      try {
        const blob = await generateBoletaPDF(datosPago, { 
          series: res.series, 
          number: res.number, 
          cajeroId: cajeroId, 
          cajeroName: auth.currentUser?.displayName 
        });

        // Descargar PDF localmente de inmediato (desde blob)
        const blobUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = `Boleta_${res.series || 'B001'}_${res.number || ''}.pdf`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(blobUrl);
        console.log('✅ PDF descargado localmente');

        // Marcar impreso (sin subir a Storage por ahora para evitar CORS)
        try {
          await markComprobantePrinted(res.historialId, cajeroId);
          console.log('✅ Historial marcado como impreso');
        } catch (markError) {
          console.warn('Advertencia al marcar impreso:', markError);
        }
      } catch (pdfError) {
        console.error('Error generando PDF:', pdfError);
      }

      alert("✅ Cobrado: guardado en historial, mesa liberada y boleta descargada.");
    } catch (e) {
      console.error(e);
      alert("❌ " + (e.message || "No se pudo cobrar"));
    } finally {
      setLoadingId(null);
      setPedidoACobrar(null);
    }
  };

  const handleCancelarPago = () => {
    setShowModal(false);
    setPedidoACobrar(null);
  };

  return (
    <div>
      <h2>Pedidos ENTREGADOS (para cobrar)</h2>
      <p style={{ opacity: 0.8 }}>
        Al cobrar se guarda en <b>historial_ventas</b> y se libera la mesa.
      </p>

      {/* 2. Renderizado del nuevo modal */}
      {showModal && pedidoACobrar && (
        <BoletaModal
          pedido={pedidoACobrar} // 3. Pasar el objeto de pedido completo
          onCancelar={handleCancelarPago}
          onPagoConfirmado={handlePagoConfirmado}
        />
      )}

      {entregados.length === 0 ? (
        <p style={{ opacity: 0.8 }}>No hay pedidos entregados.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {entregados.map((p) => (
            <div
              key={p.id}
              style={{
                border: "1px solid rgba(255,255,255,.14)",
                borderRadius: 18,
                padding: 14,
                background: "rgba(0,0,0,.25)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>Mesa {p.mesaNumero}</h3>
                  <div style={{ opacity: 0.8 }}>Estado: <b>{p.estado}</b></div>
                </div>
                <div style={{ fontSize: 18 }}>
                  Total: <b>{money(p.total)}</b>
                </div>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {(p.items || []).map((it, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{it.plato} x{it.qty}</span>
                    <b>{money(it.subtotal ?? it.precio)}</b>
                  </div>
                ))}
              </div>

              <button
                onClick={() => iniciarCobro(p)}
                disabled={loadingId === p.id}
                style={{
                  marginTop: 12,
                  width: "100%",
                  padding: "16px 18px",
                  fontSize: 18,
                  fontWeight: 900,
                  borderRadius: 16,
                  cursor: "pointer",
                }}
              >
                {loadingId === p.id ? "Procesando..." : "💳 COBRAR"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
