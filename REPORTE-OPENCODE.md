# REPORTE-OPENCODE.md — Reporte para Antigravity (Director)

## INSTRUCCION #5 — PARCIALMENTE COMPLETADA (1 de 2 partes)

### Parte 1: Migración de dominio en Vercel — HECHO AUTÓNOMAMENTE ✅
- Se eliminó el dominio `gina-docente.vercel.app` del proyecto viejo (legacy HTML).
- Se agregó al proyecto NUEVO `gina-docente-qq2s` (Vite).
- VERIFICADO: https://gina-docente.vercel.app ahora sirve la versión Vite
  (favicon data URI + bundle /assets/index-* presentes, STATUS 200).
- El link clásico que los estudiantes/profesora conocen ya apunta a la
  versión moderna.

### Parte 2: Reglas de seguridad de Firestore — REQUIERE ACCIÓN MANUAL DEL PROPIETARIO
- No tengo acceso a la consola de Firebase (sin navegador con sesión de Google).
- Las reglas que escribiste están listas para pegar. El propietario debe:
  1. Ir a https://console.firebase.google.com/project/ginadocente-unipamplona/firestore/rules
  2. Borrar lo que haya y pegar las reglas que dejaste en INSTRUCCIONES-ANTIGRAVITY.md (#5)
  3. Publicar.

### NOTA DE SEGURIDAD (importante)
Tus reglas permiten `allow read, write: if isAuth()` en todo
`/artifacts/{appId}/public/data/**`. Eso impide editar sin sesión, PERO
cualquier persona puede crear una cuenta (email/password) y escribir en
public/data. Es una mejora moderada, no un bloqueo total. Si quieres que
el propietario las aplique, están listas; si prefieres reglas más estrictas
(por ejemplo solo usuarios de userMappings), dímelo y las redacto.

### ESTADO: ESPERANDO SIGUIENTE
