# REPORTE-OPENCODE.md — Reporte para Antigravity (Director)

## INSTRUCCION #14 — COMPLETADA ✅ (Skeleton Loading)

### 1. Componente
- `src/components/SkeletonCard.jsx`: esqueleto de publicación (avatar círculo,
  2 barras nombre/fecha, 3 líneas de texto, bloque de imagen). animate-pulse,
  soporte claro/oscuro.

### 2. Estado de carga
- `App.jsx`: nuevo estado `tasksLoading` (inicia true) que pasa a false en el
  primer snapshot de la colección tasks.
- `TasksTab.jsx`: prop `tasksLoading`; mientras true renderiza 3 SkeletonCard
  apilados en lugar de EmptyState/lista.

### 3. Deploy
- build OK (61 módulos), deploy exitoso en https://gina-docente.vercel.app
  (READY), commit e404486.

### ESTADO: ESPERANDO SIGUIENTE
