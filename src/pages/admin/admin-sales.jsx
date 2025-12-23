import React, { useEffect, useMemo, useState } from "react";
import "./dashboard-admin.css";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { getUserName } from "../../services/authServices";

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

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfNDaysAgo(n) {
  const x = startOfDay(new Date());
  x.setDate(x.getDate() - (n - 1));
  return x;
}
function startOfMonth() {
  const x = startOfDay(new Date());
  x.setDate(1);
  return x;
}

export default function AdminSales() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState({});

  const [range, setRange] = useState("all"); // all | today | 7d | month

  useEffect(() => {
    setLoading(true);

    const base = [
      collection(db, "historial_ventas"),
      orderBy("fechaHora", "desc"),
      limit(800),
    ];

    let qRef;
    if (range === "today") {
      qRef = query(...base, where("fechaHora", ">=", startOfDay()));
    } else if (range === "7d") {
      qRef = query(...base, where("fechaHora", ">=", startOfNDaysAgo(7)));
    } else if (range === "month") {
      qRef = query(...base, where("fechaHora", ">=", startOfMonth()));
    } else {
      qRef = query(...base);
    }

    const unsub = onSnapshot(
      qRef,
      async (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVentas(data);

        // Obtener nombres de cajeros únicos
        const uniqueCajeroIds = [...new Set(data.map(v => v.cajeroId).filter(id => id))];
        if (uniqueCajeroIds.length > 0) {
          const promises = uniqueCajeroIds.map(id => getUserName(id));
          const names = await Promise.all(promises);
          const namesMap = {};
          uniqueCajeroIds.forEach((id, index) => {
            namesMap[id] = names[index];
          });
          setUserNames(namesMap);
        }

        setLoading(false);
      },
      (err) => {
        console.error("Error cargando ventas admin:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [range]);

  const totalMostrado = useMemo(
    () => ventas.reduce((acc, v) => acc + Number(v.total || 0), 0),
    [ventas]
  );

  const detalleMetodoPago = (payments = []) => {
    if (!Array.isArray(payments) || payments.length === 0) return "—";
    return (
      <>
        {payments.map((p, i) => (
          <div key={i} className="detalle-linea">
            <span className="detalle-nombre">{p.method || "?"}</span>
            <span className="detalle-precio">{fmtMoney(p.amount || 0)}</span>
          </div>
        ))}
      </>
    );
  };

  const detalleItems = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return "—";
    return (
      <>
        {items.map((it, i) => {
          const sub =
            it.subtotal ?? (Number(it.precio || 0) * Number(it.qty || 0));
          return (
            <div key={i} className="detalle-linea">
              <span className="detalle-nombre">
                {it.plato || it.name}
                {it.qty ? ` x${it.qty}` : ""}
              </span>
              <span className="detalle-precio">{fmtMoney(sub)}</span>
            </div>
          );
        })}
      </>
    );
  };

  const pillClass = (key) => `hist-pill ${range === key ? "active" : "muted"}`;

  return (
    <div className="hist-wrap">
      <div className="hist-head">
        <div>
          <h2 className="hist-title">Admin · Ventas</h2>
          <p className="hist-sub">Historial completo (más recientes primero).</p>
        </div>

        <div className="hist-metrics">
          <span className="hist-pill">
            Total: <b>{fmtMoney(totalMostrado)}</b>
          </span>
          <span className="hist-pill muted">
            Registros: <b>{ventas.length}</b>
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="hist-filters">
        <button className={pillClass("all")} onClick={() => setRange("all")}>
          Todo
        </button>
        <button className={pillClass("today")} onClick={() => setRange("today")}>
          Hoy
        </button>
        <button className={pillClass("7d")} onClick={() => setRange("7d")}>
          Últimos 7 días
        </button>
        <button className={pillClass("month")} onClick={() => setRange("month")}>
          Este mes
        </button>
      </div>

      {loading ? (
        <p className="muted">Cargando ventas...</p>
      ) : ventas.length === 0 ? (
        <p className="muted">No hay ventas para este filtro.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Cajero</th>
                <th>Mesa</th>
                <th>Serie-Nro</th>
                <th>Método</th>
                <th>Detalle</th>
                <th className="cell-right">Total</th>
              </tr>
            </thead>

            <tbody>
              {ventas.map((v) => (
                <tr key={v.id}>
                  <td>{fmtFecha(v.fechaHora)}</td>
                  <td>{userNames[v.cajeroId] || v.cajeroId || "—"}</td>
                  <td>Mesa {v.mesaNumero ?? "—"}</td>
                  <td>{(v.series || "—") + "-" + (v.number || "—")}</td>
                  <td className="cell-detail">{detalleMetodoPago(v.payments)}</td>
                  <td className="cell-detail">{detalleItems(v.items)}</td>
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
