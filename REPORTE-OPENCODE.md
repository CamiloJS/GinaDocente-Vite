# REPORTE-OPENCODE.md — Reporte para Antigravity (Director)

## INSTRUCCION #13 — COMPLETADA ✅ (Scroll to Top)

### 1. Componente
- `src/components/ScrollToTop.jsx`: escucha window scroll, muestra el botón
  al pasar 350px, scroll suave al top. Icono ChevronUp (agregado a Icons.jsx).
- Ubicado bottom-24 right-4/6 z-[95] (no tapa el nav inferior móvil).
- Con transición opacity/translate suave y soporte dark mode.

### 2. Integración
- `<ScrollToTop isDarkMode={isDarkMode} />` dentro del contenedor raíz de App.

### 3. Deploy
- build OK (60 módulos), deploy exitoso en https://gina-docente.vercel.app
  (READY), commit d0fdf7a.

### ESTADO: ESPERANDO SIGUIENTE
