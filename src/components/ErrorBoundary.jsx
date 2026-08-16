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
    console.error('Error capturado por ErrorBoundary:', error, errorInfo)
    try {
      window.__ebError = (error && (error.stack || error.message || String(error))) + ' | INFO: ' + JSON.stringify(errorInfo)
    } catch (e) {}
  }

  handleCleanReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        for (const reg of regs) {
          await reg.unregister()
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        for (const key of keys) {
          await caches.delete(key)
        }
      }
    } catch (e) {}
    window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-100 dark:bg-gray-900 p-6 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#AD3333] to-[#8a2828] rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl border border-white/20">UP</div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">¡Ups! Algo salió mal.</h1>

          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            Se ha detectado una nueva versión de la aplicación. Haz clic abajo para actualizar y continuar.
          </p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={this.handleCleanReload}
              className="px-6 py-3 rounded-xl bg-[#AD3333] hover:bg-[#8a2828] text-white font-bold shadow-md transition-all active:scale-95"
            >
              Actualizar y recargar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
