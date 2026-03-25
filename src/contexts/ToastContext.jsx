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

  // Make toast callable: toast.success(), toast.error(), etc.
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
  success: { bg: '#22c55e22', border: '#22c55e44', color: '#22c55e', icon: '✅' },
  error: { bg: '#ef444422', border: '#ef444444', color: '#ef4444', icon: '❌' },
  warning: { bg: '#f59e0b22', border: '#f59e0b44', color: '#f59e0b', icon: '⚠️' },
  info: { bg: '#3b82f622', border: '#3b82f644', color: '#3b82f6', icon: 'ℹ️' },
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380,
      }}
    >
      {toasts.map(t => {
        const c = TOAST_COLORS[t.type] || TOAST_COLORS.info
        return (
          <div key={t.id} style={{
            background: '#1e1e2e', border: `1px solid ${c.border}`,
            borderLeft: `4px solid ${c.color}`, borderRadius: 8,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
            animation: 'slideIn 0.25s ease-out',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            <span>{c.icon}</span>
            <span style={{ color: '#e2e8f0', fontSize: 13, flex: 1 }}>{t.message}</span>
            <button
              onClick={() => onRemove(t.id)}
              aria-label="Uždaryti pranešimą"
              style={{
                background: 'none', border: 'none', color: '#64748b',
                cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0,
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
