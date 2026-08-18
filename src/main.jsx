import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// Desregistrar cualquier Service Worker antiguo y limpiar Storage Cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister())
  }).catch(() => {})
}
if ('caches' in window) {
  caches.keys().then(keys => {
    keys.forEach(key => caches.delete(key))
  }).catch(() => {})
}

// Manejar automáticamente errores de carga de módulos o chunks tras nuevos despliegues
const forceFreshReload = () => {
  window.location.replace(window.location.pathname + '?_reload=' + Date.now() + window.location.hash);
};

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  forceFreshReload();
});

window.addEventListener('error', (event) => {
  if (
    event?.message && (
      event.message.includes('dynamically imported module') ||
      event.message.includes('Loading chunk') ||
      event.message.includes('Loading CSS chunk') ||
      event.message.includes('Failed to fetch dynamically imported module')
    )
  ) {
    forceFreshReload();
  }
});

// Comprobación de versión ultra-rápida al iniciar la app
(async () => {
  try {
    const res = await fetch('/version.json?_t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.version && typeof __APP_BUILD_TIME__ !== 'undefined') {
        if (Number(data.version) !== Number(__APP_BUILD_TIME__)) {
          // El navegador tiene una versión en caché diferente a la desplegada en el servidor
          window.location.replace(window.location.pathname + '?_v=' + data.version + '&_ts=' + Date.now() + window.location.hash);
        }
      }
    }
  } catch (err) {}
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
