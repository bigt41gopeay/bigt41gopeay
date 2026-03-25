import { useState, useEffect, useMemo, memo } from 'react'
import { formatDateLT, formatCurrency } from '../utils/helpers'
import { gcalListEvents } from '../utils/gcal'
import { Badge, cardStyle } from './ui'

export const Dashboard = memo(function Dashboard({ contacts, projects, tasks, communications, invoices, gcalToken }) {
  const [gcalEvents, setGcalEvents] = useState([])
  const [gcalLoading, setGcalLoading] = useState(false)

  useEffect(() => {
    if (!gcalToken) return
    setGcalLoading(true)
    gcalListEvents(gcalToken)
      .then(data => setGcalEvents(data.items || []))
      .catch(() => {})
      .finally(() => setGcalLoading(false))
  }, [gcalToken])

  const stats = useMemo(() => {
    const now = new Date()
    const activeProjects = projects.filter(p => p.status === 'vykdomas').length
    const pendingTasks = tasks.filter(t => t.status !== 'baigtas').length
    const overdueTasks = tasks.filter(t => t.deadline && t.status !== 'baigtas' && new Date(t.deadline) < now)
    const upcomingTasks = tasks
      .filter(t => t.deadline && t.status !== 'baigtas' && new Date(t.deadline) >= now)
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 5)
    const recentComms = [...communications].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
    const unpaidInvoices = (invoices || [])
      .filter(i => i.status === 'išsiųsta' || i.status === 'vėluoja')
    const totalUnpaid = unpaidInvoices.reduce((s, i) => s + (i.total || 0), 0)
    return { activeProjects, pendingTasks, overdueTasks, upcomingTasks, recentComms, unpaidInvoices, totalUnpaid }
  }, [projects, tasks, communications, invoices])

  const getContact = id => contacts.find(c => c.id === id)
  const getProject = id => projects.find(p => p.id === id)

  const statCard = (label, value, color = '#6366f1') => (
    <div style={{
      background: '#1e1e2e', border: `1px solid ${color}44`, borderRadius: 10,
      padding: 16, flex: '1 1 120px', minWidth: 100, textAlign: 'center',
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  )

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', marginBottom: 20 }}>Apžvalga</h2>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {statCard('Kontaktai', contacts.length, '#6366f1')}
        {statCard('Aktyvūs projektai', stats.activeProjects, '#3b82f6')}
        {statCard('Laukiantys darbai', stats.pendingTasks, '#f59e0b')}
        {statCard('Vėluojantys', stats.overdueTasks.length, '#ef4444')}
        {stats.totalUnpaid > 0 && statCard('Neapmokėta', formatCurrency(stats.totalUnpaid), '#f97316')}
      </div>

      {/* Overdue tasks */}
      {stats.overdueTasks.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#ef4444', marginBottom: 10, fontSize: 15 }}>⚠ Vėluojantys darbai</h3>
          {stats.overdueTasks.map(t => (
            <div key={t.id} style={{ ...cardStyle, borderLeft: '3px solid #ef4444', padding: 12 }}>
              <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{t.title}</div>
              <div style={{ color: '#ef4444', fontSize: 12 }}>{formatDateLT(t.deadline)}</div>
            </div>
          ))}
        </section>
      )}

      {/* Unpaid invoices */}
      {stats.unpaidInvoices.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#f97316', marginBottom: 10, fontSize: 15 }}>💰 Neapmokėtos sąskaitos</h3>
          {stats.unpaidInvoices.map(inv => {
            const contact = getContact(inv.contactId)
            return (
              <div key={inv.id} style={{ ...cardStyle, borderLeft: '3px solid #f97316', padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{inv.number}</span>
                  <span style={{ color: '#f97316', fontWeight: 700, fontSize: 14 }}>{formatCurrency(inv.total)}</span>
                </div>
                {contact && <div style={{ color: '#94a3b8', fontSize: 12 }}>{contact.name}</div>}
              </div>
            )
          })}
        </section>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Upcoming tasks */}
        <section style={{ flex: 1, minWidth: 260 }}>
          <h3 style={{ color: '#94a3b8', marginBottom: 10, fontSize: 15 }}>Artimiausi darbai</h3>
          {stats.upcomingTasks.length === 0 && <p style={{ color: '#64748b', fontSize: 13 }}>Nėra artimų darbų</p>}
          {stats.upcomingTasks.map(t => {
            const project = getProject(t.projectId)
            return (
              <div key={t.id} style={{ ...cardStyle, padding: 12 }}>
                <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{t.title}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  {project && <span style={{ color: '#6366f1', fontSize: 11 }}>📁 {project.name}</span>}
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{formatDateLT(t.deadline)}</span>
                </div>
              </div>
            )
          })}
        </section>

        {/* Recent communications */}
        <section style={{ flex: 1, minWidth: 260 }}>
          <h3 style={{ color: '#94a3b8', marginBottom: 10, fontSize: 15 }}>Paskutinės komunikacijos</h3>
          {stats.recentComms.length === 0 && <p style={{ color: '#64748b', fontSize: 13 }}>Nėra komunikacijų</p>}
          {stats.recentComms.map(c => {
            const contact = getContact(c.contactId)
            const project = getProject(c.projectId)
            return (
              <div key={c.id} style={{ ...cardStyle, padding: 12 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge status={c.type} />
                  <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{contact?.name}</span>
                </div>
                {c.subject && <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{c.subject}</div>}
                {project && <div style={{ color: '#6366f1', fontSize: 11 }}>📁 {project.name}</div>}
                <div style={{ color: '#64748b', fontSize: 11 }}>{formatDateLT(c.date)}</div>
              </div>
            )
          })}
        </section>
      </div>

      {/* Google Calendar events */}
      {gcalToken && (
        <section style={{ marginTop: 24 }}>
          <h3 style={{ color: '#94a3b8', marginBottom: 10, fontSize: 15 }}>📅 Google Calendar – artimiausi įvykiai</h3>
          {gcalLoading && <p style={{ color: '#64748b', fontSize: 13 }}>Kraunama...</p>}
          {!gcalLoading && gcalEvents.length === 0 && <p style={{ color: '#64748b', fontSize: 13 }}>Nėra artimų įvykių</p>}
          {gcalEvents.map(ev => (
            <div key={ev.id} style={{ ...cardStyle, padding: 12, borderLeft: '3px solid #4285f4' }}>
              <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{ev.summary}</div>
              <div style={{ color: '#4285f4', fontSize: 11, marginTop: 2 }}>
                {ev.start?.dateTime ? formatDateLT(ev.start.dateTime) : ev.start?.date}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
})
