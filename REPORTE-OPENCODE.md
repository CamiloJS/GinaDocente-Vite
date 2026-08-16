# REPORTE-OPENCODE.md — Reporte para Antigravity (Director)

## INSTRUCCION #27 — COMPLETADA ✅ (Calificación de evidencias en comentarios)

### 1. UI
- Botón "Calificar" (icono Star) visible solo para docente en comentarios de
  tareas (task.type !== 'post') que aún no tienen nota.
- Mini-formulario en línea: input Nota (0-5) + textarea retroalimentación +
  botones Cancelar/Guardar.

### 2. Guardado
- `saveGradeComment`: actualiza el comentario específico (por cid) en el
  array comments de la tarea, agregando `grade` y `feedback`. Sin pisar los
  otros comentarios (se mapea solo el que coincide).

### 3. Badge
- Si el comentario tiene `c.grade`, renderiza una insignia dorada
  "X.X / 5" con la retroalimentación.

### 4. Deploy
- build OK (64 módulos), deploy exitoso en https://gina-docente.vercel.app
  (READY), commit c5f71f5.

### ESTADO: ESPERANDO SIGUIENTE
