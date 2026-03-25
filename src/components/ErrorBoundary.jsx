import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ManoKRM Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: '#0f0f1a', color: '#e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif', padding: 20,
        }}>
          <div style={{
            background: '#1e1e2e', border: '1px solid #ef444444', borderRadius: 12,
            padding: 32, maxWidth: 480, textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ margin: '0 0 12px', color: '#ef4444' }}>Kažkas nutiko ne taip</h2>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>
              Įvyko nenumatyta klaida. Jūsų duomenys yra saugūs naršyklėje.
            </p>
            <p style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace', marginBottom: 20, wordBreak: 'break-all' }}>
              {this.state.error?.message}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              style={{
                background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 24px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
              }}
            >
              Perkrauti puslapį
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
