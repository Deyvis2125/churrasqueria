import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { logAudit } from '../../services/auditService.js';
import { BigButton, Card } from './mozo.ui';

export default function EditarPedido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPedido = async () => {
      const ref = doc(db, 'pedidos', id);
      const snap = await getDoc(ref);
      if (snap.exists()) setPedido({ id: snap.id, ...snap.data() });
      else alert('Pedido no encontrado');
    };
    fetchPedido();
  }, [id]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'menus'), (snap) => {
      setMenus(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const items = useMemo(() => (pedido?.items || []), [pedido]);

  const changeQty = (menuId, delta) => {
    setPedido(prev => {
      if (!prev) return prev;
      const copy = { ...prev };
      copy.items = (copy.items || []).map(it => it.menuId === menuId ? { ...it, qty: (it.qty || 1) + delta } : it).filter(it => it.qty > 0);
      copy.total = (copy.items || []).reduce((a,b) => a + (Number(b.precio || b.precio || 0) * Number(b.qty || 0)), 0);
      return copy;
    });
  };

  const addMenu = (m) => {
    setPedido(prev => {
      if (!prev) return prev;
      const copy = { ...prev };
      const idx = (copy.items || []).findIndex(it => it.menuId === m.id);
      if (idx >= 0) {
        copy.items[idx] = { ...copy.items[idx], qty: copy.items[idx].qty + 1 };
      } else {
        copy.items = [...(copy.items || []), { menuId: m.id, plato: m.plato, precio: Number(m.precio || 0), qty: 1 }];
      }
      copy.total = (copy.items || []).reduce((a,b) => a + (Number(b.precio || 0) * Number(b.qty || 0)), 0);
      return copy;
    });
  };

  const guardar = async () => {
    if (!pedido) return;
    setLoading(true);
    try {
      const pedidoRef = doc(db, 'pedidos', pedido.id);
      const oldValues = { items: pedido.items, total: pedido.total };
      const newItems = (pedido.items || []).map(it => ({ plato: it.plato, precio: Number(it.precio || 0), qty: Number(it.qty || 0), menuId: it.menuId }));
      const newTotal = newItems.reduce((a,b) => a + (b.precio * b.qty), 0);

      await updateDoc(pedidoRef, { items: newItems, total: newTotal });

      try {
        await logAudit({
          userId: auth.currentUser?.uid || null,
          userName: auth.currentUser?.displayName || null,
          userRole: 'mozo',
          action: 'update',
          entityType: 'pedido',
          entityId: pedido.id,
          entityName: `Pedido Mesa ${pedido.mesaNumero}`,
          oldValues,
          newValues: { items: newItems, total: newTotal },
        });
      } catch (e) {
        console.error('logAudit error', e);
      }

      alert('Pedido actualizado');
      navigate('/mozo');
    } catch (e) {
      console.error(e);
      alert('Error guardando pedido');
    } finally {
      setLoading(false);
    }
  };

  if (!pedido) return <div style={{padding:20}}>Cargando pedido...</div>;

  return (
    <div style={{padding:20}}>
      <h2>Editar Pedido - Mesa {pedido.mesaNumero}</h2>

      <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
        <Card>
          <h3>Menú (toca para agregar)</h3>
          <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap:8}}>
            {menus.map(m => (
              <div key={m.id} style={{border:'1px solid #eee', padding:8, borderRadius:6}}>
                <div><b>{m.plato}</b></div>
                <div>S/ {m.precio}</div>
                <button onClick={() => addMenu(m)}>Agregar</button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3>Items del pedido</h3>
          {(pedido.items || []).map((it, idx) => (
            <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0'}}>
              <div>
                <b>{it.plato}</b>
                <div className="muted">S/ {Number(it.precio).toFixed(2)}</div>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:6}}>
                <button onClick={() => changeQty(it.menuId, -1)}>-</button>
                <div>{it.qty}</div>
                <button onClick={() => changeQty(it.menuId, +1)}>+</button>
              </div>
            </div>
          ))}

          <div style={{marginTop:12}}>
            <strong>Total: S/ {(pedido.total || 0).toFixed(2)}</strong>
          </div>

          <div style={{marginTop:12}}>
            <BigButton onClick={() => navigate('/mozo')} disabled={loading}>Cancelar</BigButton>
            <BigButton primary onClick={guardar} disabled={loading} style={{marginLeft:8}}>{loading ? 'Guardando...' : 'Guardar cambios'}</BigButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
