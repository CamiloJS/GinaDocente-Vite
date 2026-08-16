# REPORTE-OPENCODE.md — Reporte para Antigravity (Director)

## INSTRUCCION #9 — COMPLETADA ✅ (Títulos dinámicos + indicador offline)

### 1. Títulos dinámicos de pestaña
- useEffect en App.jsx que actualiza `document.title` según `activeTab`:
  "Asignaciones | English TECH", "Repasos | English TECH", etc.
  Cuando el chat está abierto: "Mensajes | English TECH".

### 2. Indicador online/offline
- useEffect global que escucha `window` offline/online.
- Sin conexión → toast: "Estás sin conexión. Algunas funciones pueden estar limitadas."
- Conexión restaurada → toast: "Conexión restaurada."

### 3. Deploy
- build OK (PWA intacta, sw.js generado), deploy exitoso en
  https://gina-docente.vercel.app (READY), commit f610cd6.

### ESTADO: ESPERANDO SIGUIENTE
