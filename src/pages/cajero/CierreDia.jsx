import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import { generateBoletaPDF } from "../../services/printService";

const fmtMoney = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

function fmtFecha(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch {
    return "-";
  }
}

export default function CierreDia() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reimprimiendo, setReimprimiendo] = useState(null);

  const cajeroId = auth.currentUser?.uid;

  useEffect(() => {
    if (!cajeroId) return;

    //  Query simple sin orderBy (evita índice compuesto)
    // Ordenamos en cliente después
    const qRef = query(
      collection(db, "historial_ventas"),
      where("cajeroId", "==", cajeroId)
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        // Filtrar en cliente: solo hoy (por si los servidores tienen zonas horarias distintas)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((v) => {
            const fechaVenta = v.fechaHora?.toDate?.() || new Date(v.fechaHora);
            return fechaVenta >= today;
          })
          // Ordenar por fecha descendente (más recientes primero)
          .sort((a, b) => {
            const fechaA = a.fechaHora?.toDate?.() || new Date(a.fechaHora);
            const fechaB = b.fechaHora?.toDate?.() || new Date(b.fechaHora);
            return fechaB - fechaA;
          });

        setVentas(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error cargando cierre:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [cajeroId]);

  const totalDia = useMemo(
    () => ventas.reduce((acc, v) => acc + Number(v.total || 0), 0),
    [ventas]
  );

  const detalleMetodoPago = (payments = []) => {
    if (!Array.isArray(payments) || payments.length === 0) return "—";
    return payments
      .map((p) => `${p.method || "?"}: ${fmtMoney(p.amount || 0)}`)
      .join(" | ");
  };

  const detalleItems = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return "—";
    return items
      .map((it) => {
        const sub = it.subtotal ?? (Number(it.precio || 0) * Number(it.qty || 0));
        return `${it.plato || it.name}${it.qty ? ` x${it.qty}` : ""}: ${fmtMoney(sub)}`;
      })
      .join(" · ");
  };

  const handleReimprimir = async (venta) => {
    setReimprimiendo(venta.id);
    try {
      const blob = await generateBoletaPDF(
        {
          ...venta,
          items: venta.items || [],
          total: venta.total,
          totals: {
            subtotal: venta.total * 0.847,
            igv: venta.total * 0.153,
            grandTotal: venta.total,
          },
        },
        {
          series: venta.series || "---",
          number: venta.number || "---",
          cajeroId: venta.cajeroId,
          cajeroName: auth.currentUser?.displayName,
        }
      );

      const blobUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = `Boleta_${venta.series}_${venta.number}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobUrl);

      alert("✅ Boleta reimpresa y descargada");
    } catch (err) {
      console.error("Error reimprimiendo:", err);
      alert("❌ Error al reimprimir boleta");
    } finally {
      setReimprimiendo(null);
    }
  };

  if (loading)
    return <div className="cierre-wrap"><p>Cargando cierre del día...</p></div>;

  return (
    <div className="cierre-wrap">
      <div className="cierre-head">
        <div>
          <h2 className="cierre-title">Cierre del Día</h2>
          <p className="cierre-sub">
            Solo tus ventas de hoy. Puedes reimprimir boletas, pero no editar ni eliminar.
          </p>
        </div>

        <div className="cierre-metrics">
          <span className="cierre-pill">
            Total Vendido: <b>{fmtMoney(totalDia)}</b>
          </span>
          <span className="cierre-pill muted">
            Transacciones: <b>{ventas.length}</b>
          </span>
        </div>
      </div>

      {ventas.length === 0 ? (
        <div className="cierre-empty">
          <p>No hay ventas registradas hoy.</p>
        </div>
      ) : (
        <div className="cierre-table-wrap">
          <table className="cierre-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Serie-Nro</th>
                <th>Monto</th>
                <th>Método de Pago</th>
                <th>Detalles</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id} className="cierre-row">
                  <td className="cierre-hora">{fmtFecha(v.fechaHora)}</td>
                  <td className="cierre-serie">
                    {v.series}-{v.number}
                  </td>
                  <td className="cierre-monto">{fmtMoney(v.total)}</td>
                  <td className="cierre-pago">{detalleMetodoPago(v.payments)}</td>
                  <td className="cierre-items">{detalleItems(v.items)}</td>
                  <td className="cierre-acciones">
                    <button
                      className="cierre-btn-reimprimir"
                      onClick={() => handleReimprimir(v)}
                      disabled={reimprimiendo === v.id}
                    >
                      {reimprimiendo === v.id ? "⏳" : "🔄"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="cierre-footer">
        <p className="cierre-nota">
          <strong>Nota:</strong> Este es tu cierre del día. Solo ves tus propias ventas.
          Para editar o eliminar registros, contacta al administrador.
        </p>
      </div>
    </div>
  );
}
