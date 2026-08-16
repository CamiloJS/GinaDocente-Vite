// src/components/ErrorBoundary.jsx
import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo)
    try {
      window.__ebError = (error && (error.stack || error.message || String(error))) + ' | INFO: ' + JSON.stringify(errorInfo)
    } catch (e) {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-100 dark:bg-gray-900 p-6 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#AD3333] to-[#8a2828] rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl border border-white/20">UP</div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">¡Ups! Algo salió mal.</h1>
          {window.__ebError && <pre className="max-w-2xl text-left text-xs bg-black/80 text-green-400 p-3 rounded-lg overflow-auto">{window.__ebError}</pre>}
          <p className="text-gray-600 dark:text-gray-400">Por favor recarga la página para continuar.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-6 py-3 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white font-bold shadow-md transition-all"
          >
            Recargar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
