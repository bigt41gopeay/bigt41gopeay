import { STORAGE_KEYS } from './constants'

// CSV export for contacts
export function exportContactsCSV(contacts) {
  const header = ['Vardas', 'Įmonė', 'El. paštas', 'Telefonas']
  const rows = contacts.map(c =>
    [c.name, c.company, c.email, c.phone].map(v => `"${(v || '').replace(/"/g, '""')}"`)
  )
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  downloadFile(
    '\ufeff' + csv,
    `kontaktai-${new Date().toISOString().slice(0, 10)}.csv`,
    'text/csv;charset=utf-8;'
  )
}

// Full data backup as JSON
export function exportAllData() {
  const data = {}
  for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
    try {
      const raw = localStorage.getItem(storageKey)
      data[key] = raw ? JSON.parse(raw) : null
    } catch {
      data[key] = null
    }
  }
  data._exportDate = new Date().toISOString()
  data._version = '1.0'
  downloadFile(
    JSON.stringify(data, null, 2),
    `manocrm-backup-${new Date().toISOString().slice(0, 10)}.json`,
    'application/json'
  )
}

// Import data from JSON backup
export function importAllData(jsonString) {
  const data = JSON.parse(jsonString)
  if (!data._version) {
    throw new Error('Netinkamas atsarginės kopijos formatas')
  }
  const imported = {}
  for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
    if (data[key] != null) {
      localStorage.setItem(storageKey, JSON.stringify(data[key]))
      imported[key] = Array.isArray(data[key]) ? data[key].length : 1
    }
  }
  return imported
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
