import React, { useState } from 'react';

export default function AdminMenus() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [items, setItems] = useState([]);

  const addItem = (e) => {
    e.preventDefault();
    if (!name || !price) return;
    setItems(prev => [...prev, { id: Date.now(), name, price: parseFloat(price) }]);
    setName(''); setPrice('');
  };

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  return (
    <div>
      <h2>Gestión de Menús</h2>
      <form onSubmit={addItem} style={{maxWidth:480}}>
        <div style={{marginBottom:8}}>
          <label>Nombre del plato</label>
          <input value={name} onChange={(e)=>setName(e.target.value)} style={{width:'100%', padding:8}} />
        </div>
        <div style={{marginBottom:8}}>
          <label>Precio</label>
          <input value={price} onChange={(e)=>setPrice(e.target.value)} style={{width:'100%', padding:8}} />
        </div>
        <button type="submit" style={{padding:'8px 12px'}}>Agregar</button>
      </form>

      <ul style={{marginTop:12}}>
        {items.map(item => (
          <li key={item.id} style={{marginBottom:6}}>
            {item.name} - ${item.price.toFixed(2)} <button onClick={()=>removeItem(item.id)} style={{marginLeft:8}}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
