import { useState, useEffect, useMemo, memo } from 'react'
import { formatDateLT, formatCurrency } from '../utils/helpers'
import { gcalListEvents } from '../utils/gcal'
import { BRAND } from '../utils/constants'
import { Badge, cardStyle } from './ui'
import { QuickLinks } from './QuickLinks'

export const Dashboard = memo(function Dashboard({ contacts, projects, tasks, communications, invoices, credentials, leads, gcalToken, onNavigate }) {
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
    const pipelineCount = leads ? leads.filter(l => !['laimeta', 'prarasta'].includes(l.stage)).length : 0
    return { activeProjects, pendingTasks, overdueTasks, upcomingTasks, recentComms, unpaidInvoices, totalUnpaid, pipelineCount }
  }, [projects, tasks, communications, invoices, leads])

  const getContact = id => contacts.find(c => c.id === id)
  const getProject = id => projects.find(p => p.id === id)

  const statCard = (label, value, colorClass, color, onClick) => (
    <div
      className={`stat-${colorClass}`}
      onClick={onClick}
      style={{
        background: BRAND.darkCard, border: `1px solid ${BRAND.darkBorder}`,
        borderRadius: 16, padding: '18px 14px', flex: '1 1 130px', minWidth: 110,
        textAlign: 'center', transition: 'transform 0.15s ease',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: -1, lineHeight: 1.1 }}>{value}</div>
      <div style={{ color: BRAND.textSecondary, fontSize: 11, marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  )

  const widgetHeader = (title, count, onClick) => (
    <div className="dashboard-widget-header">
      <span>{title}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {count > 0 && (
          <span style={{
            background: `${BRAND.purple}18`, color: BRAND.purple,
            borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 700,
          }}>
            {count}
          </span>
        )}
        {onClick && (
          <button
            onClick={onClick}
            className="btn-press"
            style={{
              background: 'none', border: `1px solid ${BRAND.darkBorder}`,
              color: BRAND.textMuted, borderRadius: 8, padding: '4px 10px',
              fontSize: 11, cursor: 'pointer', fontWeight: 600,
            }}
          >
            Peržiūrėti →
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div>
      {/* Quick Links */}
      {credentials && <QuickLinks credentials={credentials} />}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
        {statCard('Kontaktai', contacts.length, 'purple', BRAND.purple, onNavigate ? () => onNavigate('contacts') : undefined)}
        {statCard('Aktyvūs projektai', stats.activeProjects, 'cyan', BRAND.cyan, onNavigate ? () => onNavigate('projects') : undefined)}
        {statCard('Laukia darbai', stats.pendingTasks, 'amber', '#f59e0b', onNavigate ? () => onNavigate('tasks') : undefined)}
        {statCard('Vėluoja', stats.overdueTasks.length, 'red', '#ef4444')}
        {stats.pipelineCount > 0 && statCard('Pipeline', stats.pipelineCount, 'purple', BRAND.purpleMuted, onNavigate ? () => onNavigate('leads') : undefined)}
        {stats.totalUnpaid > 0 && statCard('Neapmokėta', formatCurrency(stats.totalUnpaid), 'orange', '#f97316', onNavigate ? () => onNavigate('invoices') : undefined)}
      </div>

      {/* Widget grid */}
      <div className="dashboard-grid">

        {/* Overdue tasks widget */}
        {stats.overdueTasks.length > 0 && (
          <div className="dashboard-widget full-width">
            {widgetHeader('🚨 Vėluojantys darbai', stats.overdueTasks.length, onNavigate ? () => onNavigate('tasks') : undefined)}
            <div className="dashboard-widget-body">
              {stats.overdueTasks.map(t => (
                <div key={t.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: `1px solid ${BRAND.darkBorder}22`,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: BRAND.textPrimary, fontSize: 14 }}>{t.title}</div>
                    {getProject(t.projectId) && (
                      <div style={{ color: BRAND.purple, fontSize: 12, marginTop: 2 }}>📁 {getProject(t.projectId).name}</div>
                    )}
                  </div>
                  <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 12 }}>
                    {formatDateLT(t.deadline)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unpaid invoices widget */}
        {stats.unpaidInvoices.length > 0 && (
          <div className="dashboard-widget">
            {widgetHeader('💰 Neapmokėtos', stats.unpaidInvoices.length, onNavigate ? () => onNavigate('invoices') : undefined)}
            <div className="dashboard-widget-body">
              {stats.unpaidInvoices.map(inv => {
                const contact = getContact(inv.contactId)
                return (
                  <div key={inv.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: `1px solid ${BRAND.darkBorder}22`,
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: BRAND.textPrimary, fontSize: 14 }}>{inv.number}</div>
                      {contact && <div style={{ color: BRAND.textSecondary, fontSize: 12 }}>{contact.name}</div>}
                    </div>
                    <span style={{ color: '#f97316', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap' }}>
                      {formatCurrency(inv.total)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Upcoming tasks widget */}
        <div className="dashboard-widget">
          {widgetHeader('📋 Artimiausi darbai', stats.upcomingTasks.length, onNavigate ? () => onNavigate('tasks') : undefined)}
          <div className="dashboard-widget-body">
            {stats.upcomingTasks.length === 0 && (
              <p style={{ color: BRAND.textMuted, fontSize: 13, textAlign: 'center', padding: 16 }}>Nėra artimų darbų</p>
            )}
            {stats.upcomingTasks.map(t => {
              const project = getProject(t.projectId)
              return (
                <div key={t.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: `1px solid ${BRAND.darkBorder}22`,
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, color: BRAND.textPrimary, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    {project && <div style={{ color: BRAND.purple, fontSize: 12, marginTop: 2 }}>📁 {project.name}</div>}
                  </div>
                  <span style={{ color: BRAND.textSecondary, fontSize: 12, whiteSpace: 'nowrap', marginLeft: 12 }}>
                    {formatDateLT(t.deadline)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent communications widget */}
        <div className="dashboard-widget">
          {widgetHeader('💬 Komunikacijos', stats.recentComms.length, onNavigate ? () => onNavigate('communications') : undefined)}
          <div className="dashboard-widget-body">
            {stats.recentComms.length === 0 && (
              <p style={{ color: BRAND.textMuted, fontSize: 13, textAlign: 'center', padding: 16 }}>Nėra komunikacijų</p>
            )}
            {stats.recentComms.map(c => {
              const contact = getContact(c.contactId)
              const project = getProject(c.projectId)
              return (
                <div key={c.id} style={{
                  padding: '10px 0', borderBottom: `1px solid ${BRAND.darkBorder}22`,
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge status={c.type} />
                    <span style={{ color: BRAND.textPrimary, fontSize: 13, fontWeight: 600 }}>{contact?.name}</span>
                    <span style={{ color: BRAND.textMuted, fontSize: 11, marginLeft: 'auto' }}>{formatDateLT(c.date)}</span>
                  </div>
                  {c.subject && <div style={{ color: BRAND.textSecondary, fontSize: 12, marginTop: 4 }}>{c.subject}</div>}
                  {project && <div style={{ color: BRAND.purple, fontSize: 11, marginTop: 2 }}>📁 {project.name}</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Google Calendar events widget */}
        {gcalToken && (
          <div className="dashboard-widget">
            {widgetHeader('📅 Google Calendar', gcalEvents.length)}
            <div className="dashboard-widget-body">
              {gcalLoading && <p style={{ color: BRAND.textMuted, fontSize: 13, textAlign: 'center', padding: 16 }}>Kraunama...</p>}
              {!gcalLoading && gcalEvents.length === 0 && <p style={{ color: BRAND.textMuted, fontSize: 13, textAlign: 'center', padding: 16 }}>Nėra artimų įvykių</p>}
              {gcalEvents.map(ev => (
                <div key={ev.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: `1px solid ${BRAND.darkBorder}22`,
                }}>
                  <div style={{ fontWeight: 600, color: BRAND.textPrimary, fontSize: 14 }}>{ev.summary}</div>
                  <span style={{ color: BRAND.cyan, fontSize: 12, whiteSpace: 'nowrap', marginLeft: 12 }}>
                    {ev.start?.dateTime ? formatDateLT(ev.start.dateTime) : ev.start?.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
