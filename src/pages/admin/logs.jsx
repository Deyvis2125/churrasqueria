import React, { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, getDoc, doc } from 'firebase/firestore'
import { db, auth } from '../../firebase/config'
import { createBackup } from '../../services/backupService.js'
import './dashboard-admin.css'
import { format } from 'date-fns'

export default function AdminLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, async (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Resolver nombres faltantes
      const missingIds = [...new Set(arr.filter(l => !l.userName && l.userId).map(l => l.userId))]
      const nameMap = {}
      if (missingIds.length) {
        await Promise.all(missingIds.map(async (uid) => {
          try {
            const uDoc = await getDoc(doc(db, 'users', uid))
            if (uDoc.exists()) {
              const ud = uDoc.data()
              nameMap[uid] = ud.nombre || ud.email || null
            }
          } catch (e) {
            // ignore
          }
        }))
      }

      const augmented = arr.map(l => ({
        ...l,
        displayUser: l.userName || l.userEmail || nameMap[l.userId] || l.userId || '—'
      }))

      setLogs(augmented)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const handleBackup = async () => {
    try {
      const res = await createBackup({ createdBy: { id: auth.currentUser?.uid, name: auth.currentUser?.displayName } })
      if (res.success) alert('Backup creado: ' + res.id)
      else alert('Error creando backup')
    } catch (e) {
      console.error(e)
      alert('Error creando backup')
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Audit Logs</h2>
        <div>
          <button onClick={handleBackup} style={{ marginRight: 8 }}>Crear Backup</button>
        </div>
      </div>

      {loading ? (
        <p className="muted">Cargando logs...</p>
      ) : logs.length === 0 ? (
        <p className="muted">No hay registros de auditoría.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="logs-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.createdAt?.toDate ? format(l.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : '—'}</td>
                  <td>{l.displayUser}</td>
                  <td>{l.userRole || '—'}</td>
                  <td>{l.action}</td>
                  <td>{l.entityType} {l.entityName ? `— ${l.entityName}` : ''}</td>
                  <td style={{ maxWidth: 420, whiteSpace: 'pre-wrap' }}>
                    <details>
                      <summary>Ver</summary>
                      <div>
                        <strong>Old:</strong>
                        <pre style={{ fontSize: 12 }}>{JSON.stringify(l.oldValues || {}, null, 2)}</pre>
                        <strong>New:</strong>
                        <pre style={{ fontSize: 12 }}>{JSON.stringify(l.newValues || {}, null, 2)}</pre>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
