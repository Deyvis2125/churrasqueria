import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";

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

export default function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ Traer SOLO pedidos cancelados (pagados)
    const qRef = query(
      collection(db, "pedidos"),
      where("estado", "==", "cancelado"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVentas(data);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, []);

  const totalDia = useMemo(
    () => ventas.reduce((acc, v) => acc + Number(v.total || 0), 0),
    [ventas]
  );

  const detalleTexto = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return "-";
    return items
      .map((it) => {
        const sub = it.subtotal ?? (Number(it.precio || 0) * Number(it.qty || 0));
        return `${it.plato}${it.qty ? ` x${it.qty}` : ""} — ${fmtMoney(sub)}`;
      })
      .join(" · ");
  };

  return (
    <div className="hist-wrap">
      <div className="hist-head">
        <div>
          <h2 className="hist-title">Historial de Ventas</h2>
          <p className="hist-sub">Pagos registrados (pedidos cancelados).</p>
        </div>

        <div className="hist-metrics">
          <span className="hist-pill">
            Total: <b>{fmtMoney(totalDia)}</b>
          </span>
          <span className="hist-pill muted">
            Registros: <b>{ventas.length}</b>
          </span>
        </div>
      </div>

      {loading ? (
        <p className="muted">Cargando historial...</p>
      ) : ventas.length === 0 ? (
        <p className="muted">No hay pedidos cancelados todavía.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Mesa</th>
                <th>Detalle</th>
                <th className="cell-right">Total</th>
              </tr>
            </thead>

            <tbody>
              {ventas.map((v) => (
                <tr key={v.id}>
                  <td>{fmtFecha(v.createdAt)}</td>
                  <td>
                    <span className="badge">Mesa {v.mesaNumero ?? "-"}</span>
                  </td>
                  <td className="cell-detail">{detalleTexto(v.items)}</td>
                  <td className="cell-right">
                    <span className="money">{fmtMoney(v.total)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
