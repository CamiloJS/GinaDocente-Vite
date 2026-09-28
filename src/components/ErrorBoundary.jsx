// src/components/ErrorBoundary.jsx
import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('=== ErrorBoundary ===')
    console.error('Error:', error?.stack || error)
    console.error('Info:', errorInfo?.componentStack)
    try {
      window.__ebError = (error && (error.stack || error.message || String(error)))
    } catch (e) {}
  }

  getTheme() {
    try {
      const cls = document.documentElement.classList
      if (cls.contains('theme-lights-out') || cls.contains('dark')) return 'dark'
      if (cls.contains('theme-dim')) return 'dim'
    } catch (e) {}
    return 'light'
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || String(this.state.error) || ''
      const theme = this.getTheme()
      const isDark = theme !== 'light'
      const bg = isDark ? '#0f1419' : '#f3f4f6'
      const textColor = isDark ? '#e7e9ea' : '#111'
      const mutedColor = isDark ? '#71767b' : '#666'
      const btnBg = isDark ? '#374151' : '#374151'

      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          background: bg, padding: 24, textAlign: 'center', fontFamily: 'sans-serif'
        }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg,#AD3333,#8a2828)',
            borderRadius: 16, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 28
          }}>!</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: textColor, margin: 0 }}>Algo salió mal</h1>
          {msg && (
            <details style={{ maxWidth: '90vw', width: 400 }}>
              <summary style={{ cursor: 'pointer', color: mutedColor, fontSize: 12, marginBottom: 8 }}>
                Ver detalles técnicos
              </summary>
              <pre style={{
                background: '#1e1e1e', color: '#f97171', padding: '10px 16px',
                borderRadius: 10, fontSize: 11, textAlign: 'left',
                maxWidth: '90vw', overflowX: 'auto', whiteSpace: 'pre-wrap',
                wordBreak: 'break-word', maxHeight: 180, overflowY: 'auto', margin: 0
              }}>{msg}</pre>
            </details>
          )}
          <p style={{ color: mutedColor, fontSize: 13, maxWidth: 400, margin: 0 }}>
            No te preocupes, puedes intentar recargar la página.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              onClick={() => {
                sessionStorage.clear()
                window.location.href = window.location.origin + '/?r=' + Date.now()
              }}
              style={{
                padding: '12px 24px', borderRadius: 12, background: '#AD3333',
                color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 14
              }}
            >
              Recargar página
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '12px 24px', borderRadius: 12, background: btnBg,
                color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 14
              }}
            >
              Intentar continuar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
