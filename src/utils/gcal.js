import { GCAL_API } from './constants'

export function loadGISScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) { resolve(); return }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

async function gcalFetch(url, options) {
  const res = await fetch(url, options)
  if (res.status === 401) {
    sessionStorage.removeItem('gcal_token')
    throw new Error('Sesija pasibaigė. Prisijunkite iš naujo.')
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Google Calendar klaida (${res.status}): ${body.slice(0, 100)}`)
  }
  return res.json()
}

export async function gcalCreateEvent(token, task) {
  if (!task.deadline || !token) return null
  const start = new Date(task.deadline).toISOString()
  const end = new Date(new Date(task.deadline).getTime() + 60 * 60000).toISOString()
  return gcalFetch(`${GCAL_API}/calendars/primary/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: task.title,
      description: task.notes || '',
      start: { dateTime: start },
      end: { dateTime: end },
    }),
  })
}

export async function gcalUpdateEvent(token, eventId, updates) {
  if (!token || !eventId) return null
  return gcalFetch(`${GCAL_API}/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
}

export async function gcalListEvents(token) {
  if (!token) return { items: [] }
  const now = new Date().toISOString()
  const end = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const params = new URLSearchParams({
    timeMin: now,
    timeMax: end,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '10',
  })
  return gcalFetch(`${GCAL_API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
