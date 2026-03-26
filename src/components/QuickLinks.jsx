import { memo } from 'react'
import { BRAND } from '../utils/constants'
import { cardStyle } from './ui'

const CATEGORY_ICONS = {
  website: '🌐', server: '🖥️', plesk: '📋', wordpress: '📝',
  database: '🗄️', email: '📧', ftp: '📂', api: '🔌', domain: '🌍', other: '🔑',
}

export const QuickLinks = memo(function QuickLinks({ credentials }) {
  const links = credentials.filter(c => c.url || c.ip).slice(0, 8)
  if (links.length === 0) return null

  return (
    <section style={{ marginBottom: 26 }}>
      <h3 style={{ color: BRAND.textSecondary, marginBottom: 12, fontSize: 14, fontWeight: 600, letterSpacing: 0.3 }}>
        ⚡ Greita prieiga
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 10,
      }}>
        {links.map(c => {
          const icon = CATEGORY_ICONS[c.category] || '🔗'
          const href = c.url || (c.ip ? `http://${c.ip}${c.port ? ':' + c.port : ''}` : '#')
          return (
            <a
              key={c.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="card-interactive"
              style={{
                ...cardStyle, marginBottom: 0, textDecoration: 'none',
                padding: '14px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                borderLeft: `3px solid ${BRAND.purple}33`,
              }}
            >
              <span style={{ fontSize: 20 }}>{icon}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: BRAND.textPrimary, fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.label}
                </div>
                <div style={{ color: BRAND.textMuted, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
