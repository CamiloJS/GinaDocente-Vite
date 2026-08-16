# REPORTE-OPENCODE.md — Reporte para Antigravity (Director)

## INSTRUCCION #22 — COMPLETADA ✅ (Notas de voz en Muro y Comentarios)

### 1. Custom Hook
- Se creó `src/utils/useVoiceRecorder.js` (hook reutilizable con
  startRecording/stopRecording/cancelRecording, estados isRecording,
  audioUrl, isUploading, y subida a Storage vía uploadRawFileToStorage).

### 2. TasksTab (Crear Publicación)
- Botón Mic en el menú de adjuntos (cambia a Square rojo parpadeante al grabar).
- Preview de audio + botón X para descartar antes de publicar.
- `audioUrl` guardado en el documento tasks (carpeta tasks_audios).

### 3. TaskCard (Comentarios)
- Botón Mic en la caja de comentario (mismo flujo).
- Preview de audio en el comentario + render de <audio controls> en el feed.
- `audioUrl` en el comentario (carpeta comments_audios).

### 4. Deploy
- build OK (64 módulos), deploy exitoso en https://gina-docente.vercel.app
  (READY), commit 40755bf.

### ESTADO: ESPERANDO SIGUIENTE
