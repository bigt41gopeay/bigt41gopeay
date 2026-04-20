import { useEffect, useRef, memo } from 'react'
import { STATUS_COLORS, BRAND } from '../utils/constants'

// ─── Shared Styles ───────────────────────────────────────────────────────────

export const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: BRAND.dark,
  border: `1px solid ${BRAND.darkBorder}`,
  borderRadius: 12, padding: '12px 14px',
  color: BRAND.textPrimary, fontSize: 15, outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  lineHeight: 1.5,
}

export const labelStyle = {
  color: BRAND.textSecondary, fontSize: 13, fontWeight: 500,
  display: 'block', marginBottom: 6, letterSpacing: 0.2,
}

export const formGroup = { marginBottom: 18 }

export const btnPrimary = {
  background: `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.purpleDeep})`,
  color: '#fff', border: 'none', borderRadius: 12,
  padding: '11px 22px', cursor: 'pointer', fontWeight: 600, fontSize: 15,
  transition: 'opacity 0.2s, transform 0.1s, box-shadow 0.2s',
  boxShadow: '0 2px 12px rgba(134,59,255,0.25)',
  letterSpacing: 0.3,
}

export const btnSecondary = {
  background: BRAND.darkSurface, color: BRAND.textPrimary,
  border: `1px solid ${BRAND.darkBorder}`, borderRadius: 12,
  padding: '11px 22px', cursor: 'pointer', fontWeight: 600, fontSize: 15,
  transition: 'opacity 0.2s, transform 0.1s, background 0.2s',
}

export const btnDanger = {
  background: '#ef444418', color: '#ef4444',
  border: '1px solid #ef444433',
  borderRadius: 12, padding: '8px 16px', cursor: 'pointer', fontSize: 14,
  fontWeight: 500, transition: 'opacity 0.2s, transform 0.1s',
}

export const cardStyle = {
  background: BRAND.darkCard, border: `1px solid ${BRAND.darkBorder}`,
  borderRadius: 14, padding: 18, marginBottom: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
}

// ─── Badge ───────────────────────────────────────────────────────────────────

export const Badge = memo(function Badge({ status }) {
  const color = STATUS_COLORS[status] || BRAND.textMuted
  return (
    <span
      role="status"
      style={{
        background: color + '18', color, border: `1px solid ${color}33`,
        borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 600,
        whiteSpace: 'nowrap', letterSpacing: 0.3,
      }}
    >
      {status}
    </span>
  )
})

// ─── Modal ───────────────────────────────────────────────────────────────────

export function Modal({ title, onClose, children }) {
  const closeRef = useRef(null)

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    closeRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(14,12,25,0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 16,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: BRAND.darkSurface,
        borderRadius: isMobile ? '20px 20px 0 0' : 16,
        padding: isMobile ? '12px 20px 28px' : '24px 28px',
        width: '100%',
        maxWidth: isMobile ? '100%' : 560,
        border: `1px solid ${BRAND.darkBorder}`,
        borderBottom: isMobile ? 'none' : `1px solid ${BRAND.darkBorder}`,
        maxHeight: isMobile ? '92dvh' : '85vh',
        overflowY: 'auto',
        animation: isMobile ? 'slideUp 0.3s ease-out' : 'scaleIn 0.2s ease-out',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Drag indicator on mobile */}
        {isMobile && (
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: BRAND.darkBorderLight, margin: '0 auto 16px',
          }} />
        )}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 22,
        }}>
          <h2 style={{ margin: 0, color: BRAND.textPrimary, fontSize: 19, fontWeight: 700, letterSpacing: -0.3 }}>{title}</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Uždaryti"
            style={{
              background: BRAND.darkCard, border: `1px solid ${BRAND.darkBorder}`,
              color: BRAND.textSecondary, width: 34, height: 34,
              borderRadius: 10, fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Confirm Dialog ──────────────────────────────────────────────────────────

export function ConfirmDialog({ message, onConfirm, onCancel }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onCancel])

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Patvirtinimas"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(14,12,25,0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div style={{
        background: BRAND.darkSurface, borderRadius: 18, padding: 28, maxWidth: 380, width: '100%',
        border: `1px solid ${BRAND.darkBorder}`, textAlign: 'center',
        animation: 'scaleIn 0.2s ease-out',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: BRAND.textPrimary, fontSize: 16, marginBottom: 24, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn-press" style={btnSecondary} onClick={onCancel}>Atšaukti</button>
          <button className="btn-press" style={{ ...btnPrimary, background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 2px 12px rgba(239,68,68,0.3)' }} onClick={onConfirm}>Patvirtinti</button>
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

export function EmptyState({ icon = '📭', message }) {
  return (
    <div style={{
      color: BRAND.textMuted, textAlign: 'center', padding: '48px 24px', fontSize: 15,
      background: `${BRAND.darkCard}80`, borderRadius: 16, border: `1px dashed ${BRAND.darkBorder}`,
    }}>
      <span style={{ display: 'block', fontSize: 40, marginBottom: 12 }}>{icon}</span>
      {message}
    </div>
  )
}

// ─── Section Header ──────────────────────────────────────────────────────────

export function SectionHeader({ title, children }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 18, flexWrap: 'wrap', gap: 10,
    }}>
      <h2 style={{ margin: 0, color: BRAND.textPrimary, fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>{title}</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Filter Bar ──────────────────────────────────────────────────────────────

export function FilterBar({ options, value, onChange }) {
  return (
    <div role="tablist" style={{
      display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16,
      overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      paddingBottom: 4,
    }}>
      {options.map(s => (
        <button
          key={s}
          role="tab"
          aria-selected={value === s}
          onClick={() => onChange(s)}
          className="btn-press"
          style={{
            background: value === s
              ? `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.purpleDeep})`
              : BRAND.darkCard,
            color: value === s ? '#fff' : BRAND.textSecondary,
            border: `1px solid ${value === s ? 'transparent' : BRAND.darkBorder}`,
            borderRadius: 10, padding: '7px 14px', fontSize: 13,
            cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            boxShadow: value === s ? '0 2px 8px rgba(134,59,255,0.25)' : 'none',
          }}
        >
          {s}
        </button>
      ))}
    </div>
  )
}

// ─── Search Input ────────────────────────────────────────────────────────────

export function SearchInput({ value, onChange, placeholder = 'Ieškoti...' }) {
  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <span style={{
        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
        color: BRAND.textMuted, fontSize: 16, pointerEvents: 'none',
      }}>
        🔍
      </span>
      <input
        data-role="search"
        aria-label="Paieška"
        style={{
          ...inputStyle, paddingLeft: 40, marginBottom: 0,
          background: BRAND.darkCard,
        }}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}
