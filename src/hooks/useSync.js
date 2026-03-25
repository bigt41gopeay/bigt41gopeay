import { useState, useCallback, useEffect, useRef } from 'react'
import { STORAGE_KEYS } from '../utils/constants'

const SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes

export function useSync(settings) {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(() => localStorage.getItem('crm_last_sync') || '')
  const [syncError, setSyncError] = useState('')
  const intervalRef = useRef(null)

  const syncUrl = settings.syncUrl || ''
  const syncKey = settings.syncKey || ''
  const autoSync = settings.autoSync || false

  const pushData = useCallback(async () => {
    if (!syncUrl || !syncKey) return false
    setSyncing(true)
    setSyncError('')
    try {
      const data = {}
      for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
        try {
          const raw = localStorage.getItem(storageKey)
          data[key] = raw ? JSON.parse(raw) : null
        } catch { data[key] = null }
      }

      const res = await fetch(`${syncUrl}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${syncKey}`,
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error(`Serverio klaida: ${res.status}`)

      const now = new Date().toISOString()
      setLastSync(now)
      localStorage.setItem('crm_last_sync', now)
      return true
    } catch (e) {
      setSyncError(e.message)
      return false
    } finally {
      setSyncing(false)
    }
  }, [syncUrl, syncKey])

  const pullData = useCallback(async () => {
    if (!syncUrl || !syncKey) return false
    setSyncing(true)
    setSyncError('')
    try {
      const res = await fetch(`${syncUrl}/api/sync`, {
        headers: { 'Authorization': `Bearer ${syncKey}` },
      })

      if (!res.ok) throw new Error(`Serverio klaida: ${res.status}`)

      const data = await res.json()
      for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
        if (data[key] != null) {
          localStorage.setItem(storageKey, JSON.stringify(data[key]))
        }
      }

      const now = new Date().toISOString()
      setLastSync(now)
      localStorage.setItem('crm_last_sync', now)
      return true
    } catch (e) {
      setSyncError(e.message)
      return false
    } finally {
      setSyncing(false)
    }
  }, [syncUrl, syncKey])

  // Auto-sync interval
  useEffect(() => {
    if (autoSync && syncUrl && syncKey) {
      intervalRef.current = setInterval(pushData, SYNC_INTERVAL)
      return () => clearInterval(intervalRef.current)
    }
  }, [autoSync, syncUrl, syncKey, pushData])

  return { syncing, lastSync, syncError, pushData, pullData }
}
