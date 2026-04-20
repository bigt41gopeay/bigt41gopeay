import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback({
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur ?? 6000),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  }, [addToast])

  const value = { toast, removeToast }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.toast
}

const TOAST_COLORS = {
  success: { bg: '#22c55e15', border: '#22c55e33', color: '#22c55e', icon: '✅' },
  error: { bg: '#ef444415', border: '#ef444433', color: '#ef4444', icon: '❌' },
  warning: { bg: '#f59e0b15', border: '#f59e0b33', color: '#f59e0b', icon: '⚠️' },
  info: { bg: 'rgba(134,59,255,0.08)', border: 'rgba(134,59,255,0.2)', color: '#b388ff', icon: 'ℹ️' },
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed', bottom: 90, right: 16, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360,
        width: 'calc(100% - 32px)',
      }}
    >
      {toasts.map(t => {
        const c = TOAST_COLORS[t.type] || TOAST_COLORS.info
        return (
          <div key={t.id} style={{
            background: '#262042', border: `1px solid ${c.border}`,
            borderLeft: `4px solid ${c.color}`, borderRadius: 14,
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
            animation: 'slideIn 0.25s ease-out',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}>
            <span style={{ fontSize: 16 }}>{c.icon}</span>
            <span style={{ color: '#f5f2ff', fontSize: 14, flex: 1, lineHeight: 1.4 }}>{t.message}</span>
            <button
              onClick={() => onRemove(t.id)}
              aria-label="Uždaryti pranešimą"
              style={{
                background: 'none', border: 'none', color: '#8d82ab',
                cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4,
                borderRadius: 6, transition: 'color 0.15s',
              }}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
