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
          minHeight: '100vh', background: '#08060d', color: '#f0ecf6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: 20,
        }}>
          <div style={{
            background: '#1a1625', border: '1px solid #ef444433', borderRadius: 18,
            padding: 36, maxWidth: 480, textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            <div style={{ fontSize: 52, marginBottom: 18 }}>⚠️</div>
            <h2 style={{ margin: '0 0 12px', color: '#ef4444', fontSize: 20, fontWeight: 700 }}>Kažkas nutiko ne taip</h2>
            <p style={{ color: '#a99fc4', fontSize: 15, marginBottom: 20, lineHeight: 1.5 }}>
              Įvyko nenumatyta klaida. Jūsų duomenys yra saugūs naršyklėje.
            </p>
            <p style={{ color: '#6e6287', fontSize: 12, fontFamily: 'monospace', marginBottom: 24, wordBreak: 'break-all' }}>
              {this.state.error?.message}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="btn-press"
              style={{
                background: 'linear-gradient(135deg, #863bff, #7e14ff)',
                color: '#fff', border: 'none', borderRadius: 12,
                padding: '12px 28px', cursor: 'pointer', fontWeight: 700, fontSize: 15,
                boxShadow: '0 4px 16px rgba(134,59,255,0.3)',
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
