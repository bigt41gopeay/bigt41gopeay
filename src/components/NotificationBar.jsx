import { useState, useEffect, memo } from 'react'

export const NotificationBar = memo(function NotificationBar({ tasks }) {
  const [dismissed, setDismissed] = useState(false)

  const now = new Date()
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const urgent = tasks.filter(t =>
    t.status !== 'baigtas' && t.deadline && new Date(t.deadline) <= in3days
  )
  const overdue = urgent.filter(t => new Date(t.deadline) < now)

  useEffect(() => {
    if (urgent.length === 0) return
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [urgent.length])

  useEffect(() => {
    const checkMorning = () => {
      const n = new Date()
      if (n.getHours() === 9 && n.getMinutes() === 0) {
        const todayTasks = tasks.filter(t => {
          if (t.status === 'baigtas' || !t.deadline) return false
          return new Date(t.deadline).toDateString() === n.toDateString()
        })
        if (todayTasks.length > 0 && Notification.permission === 'granted') {
          new Notification('ManoKRM – Dienos darbai', {
            body: `Šiandien ${todayTasks.length} darbai: ${todayTasks.map(t => t.title).join(', ')}`,
            icon: '/favicon.svg',
          })
        }
      }
    }
    const interval = setInterval(checkMorning, 60000)
    return () => clearInterval(interval)
  }, [tasks])

  if (urgent.length === 0 || dismissed) return null

  const isRed = overdue.length > 0
  return (
    <div
      role="alert"
      style={{
        background: isRed ? '#ef444422' : '#f59e0b22',
        borderBottom: `1px solid ${isRed ? '#ef444444' : '#f59e0b44'}`,
        padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
        color: isRed ? '#ef4444' : '#f59e0b',
      }}
    >
      <span>{isRed ? '🚨' : '⏰'}</span>
      <span style={{ flex: 1 }}>
        {overdue.length > 0 && <><b>{overdue.length}</b> vėluojantys darbai</>}
        {overdue.length > 0 && urgent.length - overdue.length > 0 && ' · '}
        {urgent.length - overdue.length > 0 && <><b>{urgent.length - overdue.length}</b> darbai baigiasi per 3 dienas</>}
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Atmesti pranešimą"
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  )
})
