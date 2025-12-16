import React, { useState } from 'react';

export default function AdminSales() {
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [sales, setSales] = useState([]);

  const addSale = (e) => {
    e.preventDefault();
    if (!item || !amount) return;
    setSales(prev => [...prev, { id: Date.now(), item, amount: parseFloat(amount), date: new Date().toLocaleString() }]);
    setItem(''); setAmount('');
  };

  return (
    <div>
      <h2>Ventas</h2>
      <form onSubmit={addSale} style={{maxWidth:480}}>
        <div style={{marginBottom:8}}>
          <label>Producto</label>
          <input value={item} onChange={(e)=>setItem(e.target.value)} style={{width:'100%', padding:8}} />
        </div>
        <div style={{marginBottom:8}}>
          <label>Monto</label>
          <input value={amount} onChange={(e)=>setAmount(e.target.value)} style={{width:'100%', padding:8}} />
        </div>
        <button type="submit" style={{padding:'8px 12px'}}>Registrar venta</button>
      </form>

      <ul style={{marginTop:12}}>
        {sales.map(s => (
          <li key={s.id} style={{marginBottom:6}}>
            {s.date} — {s.item} — ${s.amount.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}
