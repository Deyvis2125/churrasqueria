import fs from 'fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { getFirestore, doc, runTransaction, collection, setDoc, getDoc } from 'firebase/firestore';

// Este script simula tres pasos contra el emulador Firestore:
// 1) Un cajero reserva un comprobante (series B001)
// 2) El cajero confirma el pago: se crea historial_ventas y la reserva se marca como 'used'
// 3) Se intenta leer el historial como cajero (debe respetar hideFromCajero) y como admin (debe leer todo)

const PROJECT_ID = 'churrasqueria-emulator-test';
const RULES_PATH = 'firestore.rules';

async function main() {
  const rules = fs.readFileSync(RULES_PATH, 'utf8');

  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules }
  });

  // Contextos: cajero y admin
  const cajeroCtx = testEnv.authenticatedContext('cajero1', { token: { role: 'cajero' } });
  const adminCtx = testEnv.authenticatedContext('admin1', { token: { role: 'admin' } });

  const dbCajero = getFirestore(cajeroCtx);
  const dbAdmin = getFirestore(adminCtx);

  console.log('== 1) Reservar comprobante (cajero)');
  // Ejecutar transacción para incrementar counter y crear reserva
  const series = 'B001';
  const counterRef = doc(dbCajero, 'counters', series);

  const reservation = await runTransaction(dbCajero, async (tx) => {
    const ctr = await tx.get(counterRef);
    let next = 1;
    if (ctr.exists()) {
      const last = Number(ctr.data().last || 0);
      next = last + 1;
      tx.update(counterRef, { last: next });
    } else {
      tx.set(counterRef, { last: 1 });
      next = 1;
    }

    const formatted = String(next).padStart(7, '0');
    const reservaRef = doc(collection(dbCajero, 'comprobante_reservas'));
    tx.set(reservaRef, {
      series,
      number: formatted,
      pedidoId: 'pedido-test-1',
      reservedBy: 'cajero1',
      status: 'reserved',
      reservedAt: new Date()
    });

    return { id: reservaRef.id, series, number: formatted };
  });

  console.log('Reserva creada:', reservation);

  console.log('== 2) Confirmar pago (crear historial y marcar reserva used)');
  // Crear documento pedido simulado para actualizar
  const pedidoRef = doc(dbCajero, 'pedidos', 'pedido-test-1');
  await setDoc(pedidoRef, { estado: 'entregado', mesaId: 'mesa1', mesaNumero: 5, items: [], total: 10 });

  // Usar transacción del cajero para crear historial y marcar reserva
  const result = await runTransaction(dbCajero, async (tx) => {
    const pedidoSnap = await tx.get(pedidoRef);
    if (!pedidoSnap.exists()) throw new Error('Pedido no existe');
    if (pedidoSnap.data().estado !== 'entregado') throw new Error('Pedido no en entregado');

    const reservationRef = doc(dbCajero, 'comprobante_reservas', reservation.id);
    const reservationSnap = await tx.get(reservationRef);
    if (!reservationSnap.exists()) throw new Error('Reserva no existe');

    const histRef = doc(collection(dbCajero, 'historial_ventas'));
    tx.set(histRef, {
      pedidoId: 'pedido-test-1',
      cajeroId: 'cajero1',
      items: [],
      total: 10,
      series: reservation.series,
      number: reservation.number,
      hideFromCajero: true,
      fechaHora: new Date()
    });

    tx.update(reservationRef, { status: 'used', usedAt: new Date(), historialId: histRef.id });
    tx.update(pedidoRef, { estado: 'cancelado' });

    return { historialId: histRef.id };
  });

  console.log('Historial creado:', result);

  console.log('== 3) Lecturas: cajero vs admin');
  // El cajero debería leer sus propios historiales pero NO aquellos con hideFromCajero: true
  try {
    const histRef = doc(dbCajero, 'historial_ventas', result.historialId);
    const snap = await getDoc(histRef);
    console.log('Lectura cajero (debe fallar por hideFromCajero):', snap.exists(), snap.data());
  } catch (e) {
    console.error('Error lectura cajero (esperado si reglas bloquean):', e.message);
  }

  // Admin debe leer
  const histAdminSnap = await getDoc(doc(dbAdmin, 'historial_ventas', result.historialId));
  console.log('Lectura admin (debe existir):', histAdminSnap.exists(), histAdminSnap.data());

  await testEnv.cleanup();
  console.log('Test del emulador finalizado.');
}

main().catch((e) => { console.error(e); process.exit(1); });
