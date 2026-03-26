import { useState, useEffect, useMemo, memo } from 'react'
import { formatDateLT, formatCurrency } from '../utils/helpers'
import { gcalListEvents } from '../utils/gcal'
import { BRAND } from '../utils/constants'
import { Badge, cardStyle } from './ui'
import { QuickLinks } from './QuickLinks'

export const Dashboard = memo(function Dashboard({ contacts, projects, tasks, communications, invoices, credentials, leads, gcalToken }) {
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

  const statCard = (label, value, colorClass, color) => (
    <div className={`stat-${colorClass}`} style={{
      background: BRAND.darkCard, border: `1px solid ${BRAND.darkBorder}`,
      borderRadius: 16, padding: '18px 16px', flex: '1 1 140px', minWidth: 120,
      textAlign: 'center', transition: 'transform 0.15s ease',
    }}>
      <div style={{ fontSize: 30, fontWeight: 800, color, letterSpacing: -1, lineHeight: 1.1 }}>{value}</div>
      <div style={{ color: BRAND.textSecondary, fontSize: 12, marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  )

  return (
    <div>
      <h2 style={{ color: BRAND.textPrimary, marginBottom: 22, fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
        Apžvalga
      </h2>

      {/* Quick Links */}
      {credentials && <QuickLinks credentials={credentials} />}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
        {statCard('Kontaktai', contacts.length, 'purple', BRAND.purple)}
        {statCard('Aktyvūs projektai', stats.activeProjects, 'cyan', BRAND.cyan)}
        {statCard('Laukiantys darbai', stats.pendingTasks, 'amber', '#f59e0b')}
        {statCard('Vėluojantys', stats.overdueTasks.length, 'red', '#ef4444')}
        {leads && leads.filter(l => !['laimeta', 'prarasta'].includes(l.stage)).length > 0 &&
          statCard('Pipeline', leads.filter(l => !['laimeta', 'prarasta'].includes(l.stage)).length, 'purple', BRAND.purpleMuted)}
        {stats.totalUnpaid > 0 && statCard('Neapmokėta', formatCurrency(stats.totalUnpaid), 'orange', '#f97316')}
      </div>

      {/* Overdue tasks */}
      {stats.overdueTasks.length > 0 && (
        <section style={{ marginBottom: 26 }}>
          <h3 style={{ color: '#ef4444', marginBottom: 12, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
              boxShadow: '0 0 8px rgba(239,68,68,0.5)', display: 'inline-block',
            }} />
            Vėluojantys darbai
          </h3>
          {stats.overdueTasks.map(t => (
            <div key={t.id} className="card-interactive" style={{
              ...cardStyle, borderLeft: `3px solid #ef4444`, padding: '14px 16px',
            }}>
              <div style={{ fontWeight: 600, color: BRAND.textPrimary, fontSize: 15 }}>{t.title}</div>
              <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4, fontWeight: 500 }}>{formatDateLT(t.deadline)}</div>
            </div>
          ))}
        </section>
      )}

      {/* Unpaid invoices */}
      {stats.unpaidInvoices.length > 0 && (
        <section style={{ marginBottom: 26 }}>
          <h3 style={{ color: '#f97316', marginBottom: 12, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#f97316',
              boxShadow: '0 0 8px rgba(249,115,22,0.5)', display: 'inline-block',
            }} />
            Neapmokėtos sąskaitos
          </h3>
          {stats.unpaidInvoices.map(inv => {
            const contact = getContact(inv.contactId)
            return (
              <div key={inv.id} className="card-interactive" style={{
                ...cardStyle, borderLeft: '3px solid #f97316', padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: BRAND.textPrimary, fontSize: 15 }}>{inv.number}</span>
                  <span style={{ color: '#f97316', fontWeight: 800, fontSize: 15 }}>{formatCurrency(inv.total)}</span>
                </div>
                {contact && <div style={{ color: BRAND.textSecondary, fontSize: 13, marginTop: 2 }}>{contact.name}</div>}
              </div>
            )
          })}
        </section>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Upcoming tasks */}
        <section style={{ flex: 1, minWidth: 260 }}>
          <h3 style={{ color: BRAND.textSecondary, marginBottom: 12, fontSize: 16, fontWeight: 700 }}>Artimiausi darbai</h3>
          {stats.upcomingTasks.length === 0 && <p style={{ color: BRAND.textMuted, fontSize: 14 }}>Nėra artimų darbų</p>}
          {stats.upcomingTasks.map(t => {
            const project = getProject(t.projectId)
            return (
              <div key={t.id} className="card-interactive" style={{ ...cardStyle, padding: '14px 16px' }}>
                <div style={{ fontWeight: 600, color: BRAND.textPrimary, fontSize: 15 }}>{t.title}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {project && <span style={{ color: BRAND.purple, fontSize: 12, fontWeight: 500 }}>📁 {project.name}</span>}
                  <span style={{ color: BRAND.textSecondary, fontSize: 12 }}>{formatDateLT(t.deadline)}</span>
                </div>
              </div>
            )
          })}
        </section>

        {/* Recent communications */}
        <section style={{ flex: 1, minWidth: 260 }}>
          <h3 style={{ color: BRAND.textSecondary, marginBottom: 12, fontSize: 16, fontWeight: 700 }}>Paskutinės komunikacijos</h3>
          {stats.recentComms.length === 0 && <p style={{ color: BRAND.textMuted, fontSize: 14 }}>Nėra komunikacijų</p>}
          {stats.recentComms.map(c => {
            const contact = getContact(c.contactId)
            const project = getProject(c.projectId)
            return (
              <div key={c.id} className="card-interactive" style={{ ...cardStyle, padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge status={c.type} />
                  <span style={{ color: BRAND.textPrimary, fontSize: 14, fontWeight: 600 }}>{contact?.name}</span>
                </div>
                {c.subject && <div style={{ color: BRAND.textSecondary, fontSize: 13, marginTop: 4 }}>{c.subject}</div>}
                {project && <div style={{ color: BRAND.purple, fontSize: 12, marginTop: 2 }}>📁 {project.name}</div>}
                <div style={{ color: BRAND.textMuted, fontSize: 12, marginTop: 2 }}>{formatDateLT(c.date)}</div>
              </div>
            )
          })}
        </section>
      </div>

      {/* Google Calendar events */}
      {gcalToken && (
        <section style={{ marginTop: 26 }}>
          <h3 style={{ color: BRAND.textSecondary, marginBottom: 12, fontSize: 16, fontWeight: 700 }}>
            📅 Google Calendar – artimiausi įvykiai
          </h3>
          {gcalLoading && <p style={{ color: BRAND.textMuted, fontSize: 14 }}>Kraunama...</p>}
          {!gcalLoading && gcalEvents.length === 0 && <p style={{ color: BRAND.textMuted, fontSize: 14 }}>Nėra artimų įvykių</p>}
          {gcalEvents.map(ev => (
            <div key={ev.id} className="card-interactive" style={{
              ...cardStyle, padding: '14px 16px', borderLeft: `3px solid ${BRAND.cyan}`,
            }}>
              <div style={{ fontWeight: 600, color: BRAND.textPrimary, fontSize: 15 }}>{ev.summary}</div>
              <div style={{ color: BRAND.cyan, fontSize: 12, marginTop: 4 }}>
                {ev.start?.dateTime ? formatDateLT(ev.start.dateTime) : ev.start?.date}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
})
