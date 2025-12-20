import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config.js'

/**
 * Registra una entrada en la colección `auditLogs`.
 * entry: { userId, userName, userEmail, userRole, action, entityType, entityId, entityName, oldValues, newValues, metadata }
 */
export async function logAudit(entry) {
  try {
    const docRef = await addDoc(collection(db, 'auditLogs'), {
      userId: entry.userId || null,
      userName: entry.userName || null,
      userEmail: entry.userEmail || null,
      userRole: entry.userRole || null,
      action: entry.action || 'unknown',
      entityType: entry.entityType || null,
      entityId: entry.entityId || null,
      entityName: entry.entityName || null,
      oldValues: entry.oldValues || null,
      newValues: entry.newValues || null,
      metadata: entry.metadata || null,
      createdAt: serverTimestamp(),
    })

    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('logAudit error', error)
    return { success: false, error }
  }
}

/**
 * Archiva una entidad eliminada en `deletedEntities`.
 * No elimina el documento original automáticamente — permite recuperar si es necesario.
 */
export async function archiveDeletedEntity({ entityType, entityId, data, deletedBy, reason = null }) {
  try {
    const docRef = await addDoc(collection(db, 'deletedEntities'), {
      entityType,
      entityId: entityId || null,
      data: data || null,
      deletedBy: deletedBy || null,
      reason: reason || null,
      deletedAt: serverTimestamp(),
    })

    // También registrar en auditLog
    await logAudit({
      userId: deletedBy?.id || deletedBy || null,
      userName: deletedBy?.name || null,
      action: 'delete',
      entityType,
      entityId,
      oldValues: data || null,
    })

    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('archiveDeletedEntity error', error)
    return { success: false, error }
  }
}

export default { logAudit, archiveDeletedEntity }
