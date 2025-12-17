import React from "react";

export function BigTabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`tab-btn ${active ? "active" : ""}`}
      type="button"
    >
      {children}
    </button>
  );
}

export function BigButton({ primary = false, disabled = false, onClick, children }) {
  return (
    <button
      className={`big-btn ${primary ? "primary" : ""}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function Card({ children }) {
  return <div className="card">{children}</div>;
}

export function Pill({ children }) {
  return <span className="pill">{children}</span>;
}
