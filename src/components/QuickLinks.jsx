import { memo } from 'react'
import { cardStyle } from './ui'

export const QuickLinks = memo(function QuickLinks({ credentials }) {
  // Show only credentials that have a URL or IP (useful for quick access)
  const links = credentials
    .filter(c => c.url || c.ip)
    .slice(0, 8)

  if (links.length === 0) return null

  const CATEGORY_ICONS = {
    website: '🌐', server: '🖥️', plesk: '⚙️', wordpress: '📝',
    database: '🗄️', email: '📧', ftp: '📂', api: '🔌', domain: '🏷️', other: '🔑',
  }

  return (
    <section style={{ marginBottom: 24 }}>
      <h3 style={{ color: '#94a3b8', marginBottom: 10, fontSize: 15 }}>⚡ Greita prieiga</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
        {links.map(c => {
          const icon = CATEGORY_ICONS[c.category] || '🔗'
          const href = c.url || (c.ip ? `http://${c.ip}${c.port ? ':' + c.port : ''}` : '#')
          return (
            <a
              key={c.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...cardStyle,
                padding: '12px 14px', marginBottom: 0, textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'border-color 0.2s, transform 0.1s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2e2e3e'; e.currentTarget.style.transform = 'none' }}
            >
              <span style={{ fontSize: 22 }}>{icon}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.label}
                </div>
                <div style={{ color: '#64748b', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.url ? new URL(c.url).hostname : c.ip}
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </section>
  )
})
