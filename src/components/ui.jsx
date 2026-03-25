import { useEffect, useRef, memo } from 'react'
import { STATUS_COLORS } from '../utils/constants'

// ─── Shared Styles ───────────────────────────────────────────────────────────

export const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: '#0f0f1a',
  border: '1px solid #2e2e3e', borderRadius: 8, padding: '10px 12px',
  color: '#e2e8f0', fontSize: 14, outline: 'none',
  transition: 'border-color 0.2s',
}
export const labelStyle = { color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }
export const formGroup = { marginBottom: 16 }
export const btnPrimary = {
  background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
  padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
  transition: 'opacity 0.2s',
}
export const btnSecondary = {
  background: '#2e2e3e', color: '#e2e8f0', border: 'none', borderRadius: 8,
  padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
  transition: 'opacity 0.2s',
}
export const btnDanger = {
  background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444',
  borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
}
export const cardStyle = {
  background: '#1e1e2e', border: '1px solid #2e2e3e', borderRadius: 10,
  padding: 16, marginBottom: 12,
}

// ─── Badge ───────────────────────────────────────────────────────────────────

export const Badge = memo(function Badge({ status }) {
  const color = STATUS_COLORS[status] || '#6b7280'
  return (
    <span
      role="status"
      style={{
        background: color + '22', color, border: `1px solid ${color}44`,
        borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
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
    // Trap focus — focus close button on open
    closeRef.current?.focus()
    // Prevent body scroll
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed', inset: 0, background: '#000a',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#1e1e2e', borderRadius: 12, padding: 24, width: '100%', maxWidth: 560,
        border: '1px solid #2e2e3e', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: 18 }}>{title}</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Uždaryti"
            style={{
              background: 'none', border: 'none', color: '#94a3b8',
              fontSize: 22, cursor: 'pointer', lineHeight: 1,
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
        position: 'fixed', inset: 0, background: '#000a',
        zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: '#1e1e2e', borderRadius: 12, padding: 24, maxWidth: 400,
        border: '1px solid #2e2e3e', textAlign: 'center',
      }}>
        <p style={{ color: '#e2e8f0', fontSize: 15, marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button style={btnSecondary} onClick={onCancel}>Atšaukti</button>
          <button style={{ ...btnPrimary, background: '#ef4444' }} onClick={onConfirm}>Patvirtinti</button>
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

export function EmptyState({ icon = '📭', message }) {
  return (
    <p style={{ color: '#64748b', textAlign: 'center', padding: 32, fontSize: 14 }}>
      <span style={{ display: 'block', fontSize: 32, marginBottom: 8 }}>{icon}</span>
      {message}
    </p>
  )
}

// ─── Section Header ──────────────────────────────────────────────────────────

export function SectionHeader({ title, children }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 16, flexWrap: 'wrap', gap: 8,
    }}>
      <h2 style={{ margin: 0, color: '#e2e8f0' }}>{title}</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Filter Bar ──────────────────────────────────────────────────────────────

export function FilterBar({ options, value, onChange }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
      {options.map(s => (
        <button
          key={s}
          role="tab"
          aria-selected={value === s}
          onClick={() => onChange(s)}
          style={{
            ...btnSecondary, padding: '5px 12px', fontSize: 13,
            background: value === s ? '#6366f1' : '#2e2e3e',
            color: value === s ? '#fff' : '#94a3b8',
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
    <input
      data-role="search"
      aria-label="Paieška"
      style={{ ...inputStyle, marginBottom: 16 }}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}
