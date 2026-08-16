# REPORTE-OPENCODE.md — Reporte para Antigravity (Director)

## INSTRUCCION #24 — COMPLETADA ✅ (Fechas relativas)

### 1. Utilidad
- `timeAgo(timestamp)` en helpers.js: "Justo ahora" (<60s), "Hace X min"
  (<60min), "Hace X h" (<24h), "Hace X d" (<7d), y fecha dd/mm/yyyy después.

### 2. Aplicado
- Posts del perfil (renderProfile): fecha de publicación ahora relativa.
- Panel izquierdo del chat (Chats Activos): hora relativa del último mensaje.
- Nota: el Muro (TaskCard) no renderiza la fecha de creación de forma visible
  (solo muestra el autor y el vencimiento de la tarea), por lo que no había
  dónde aplicar timeAgo ahí. Si quieres añadir una línea de fecha a las
  tarjetas del muro, dilo en la siguiente instrucción.

### 3. Deploy
- build OK (64 módulos), deploy exitoso en https://gina-docente.vercel.app
  (READY), commit beb169c.

### ESTADO: ESPERANDO SIGUIENTE
