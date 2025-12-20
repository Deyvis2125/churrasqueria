import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config.js'

/**
 * Crea un backup simple de las colecciones especificadas y lo guarda en `backups`.
 * Opciones: { createdBy, collections }
 */
export async function createBackup({ createdBy = null, collections = ['menus', 'pedidos', 'mesas', 'users'] } = {}) {
  try {
    const data = {}

    for (const colName of collections) {
      const snap = await getDocs(collection(db, colName))
      data[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    }

    const docRef = await addDoc(collection(db, 'backups'), {
      createdBy: createdBy || null,
      createdAt: serverTimestamp(),
      collections: Object.keys(data),
      data,
    })

    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('createBackup error', error)
    return { success: false, error }
  }
}

export default { createBackup }
