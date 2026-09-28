# RESCATE Y UNIFICACION (28/09/2026) - opencode

## Que paso (causa raiz)
- En el PC nuevo, Antigravity clono el repo de GitHub, que estaba **congelado desde el 20/08/2026**.
- "Recupero" el despliegue del 21/08 (proyecto Vercel `englishtech`) y lo volvio a subir, reemplazando la pagina.
- Resultado: `englishtech.vercel.app` quedo con una version vieja (sin OVA Studio, sin ruleta, sin busqueda global, etc.).
- La version buena (compilada el **08/09/2026**, con TODO) seguia viva en el proyecto `gina-docente-qq2s`.

## Que se hizo
1. Se descargo el **codigo fuente completo** de la version buena desde Vercel (despliegue `dpl_AKoxFufG2qFjsRJYzsHogxUCjs87`, proyecto `gina-docente-qq2s`).
2. Se aplicaron encima los 4 commits nuevos de Antigravity:
   - `feat: agregar publicaciones tipo encuesta con seleccion simple y multiple`
   - `feat: desglose de preguntas y respuestas de evaluaciones, feedback docente y reporte excel avanzado`
   - `fix: comprehensive stability and runtime bug fixes across components and App`
   - `fix(ui): style offline contact names in gray and suppress duplicate/top video embeds on posts`
   Resolviendo los conflictos a mano (union de ambas versiones, sin perder funcionalidad).
3. Se compilo (`npm run build`, moderno + legacy) y se verifico en local y en vivo.
4. Se desplego la version unificada en los **dos proyectos** de Vercel.

## URLs activas (las tres con la MISMA version unificada)
- https://englishtech.vercel.app  (principal)
- https://gina-docente.vercel.app
- https://gina-docente-qq2s.vercel.app

## Proyectos Vercel (team `gina-docente`)
- `englishtech` -> `prj_roOkRrAGo2pgIvYUnxrvV1HhGDmz` -> dominio englishtech.vercel.app
- `gina-docente-qq2s` -> `prj_IIBJ7zet81xzoSXtWfbCq7w7mwvk` -> dominios gina-docente.vercel.app y gina-docente-qq2s.vercel.app
- `habitflow` y `gina-docente` (legacy, HTML monolitico) son otros proyectos, no tocar.

## Firebase
- Proyecto: `ginadocente-unipamplona` (compartido por todas las versiones -> los datos NUNCA estuvieron en riesgo).
- Revisar en Firebase Console > Authentication > Settings > Authorized domains que esten:
  `englishtech.vercel.app`, `gina-docente.vercel.app`, `gina-docente-qq2s.vercel.app`.

## PENDIENTE IMPORTANTE (hacer cuanto antes)
1. **Subir este codigo a GitHub** (`CamiloJS/GinaDocente-Vite`, rama `main`). El repo no tiene nada posterior al 20/08: esa desincronizacion fue la causa del desastre.
2. **Conectar Vercel a GitHub** (proyecto `englishtech`: Settings > Git) para que cada push despliegue solo, y ningun agente vuelva a clonar codigo viejo.
3. Copia de seguridad del codigo fuente crudo descargado de Vercel: carpeta `_recuperacion/gina_docente_08sep` (fuera de este repo).


---

# REPORTE-OPENCODE.md — Log de trabajo del proyecto

## TRANSICIÓN A AUTONOMÍA TOTAL (16/08/2026) — opencode se despide
El usuario decidió que Antigravity trabaje 100% solo, sin depender de opencode.

## TRABAJO REALIZADO (16/08/2026) — ANTIGRAVITY AUTÓNOMO

### 1. Fix: Pantalla "¡Ups! Algo salió mal" (ErrorBoundary)
- **Problema:** Si un chunk lazy fallaba (ej. versión vieja guardada en memoria tras un deploy), arrojaba un error que caía en el ErrorBoundary de React.
- **Solución:** En `App.jsx`, se agregó el wrapper `lazyWithRetry(importPath)`. Este intercepta la falla en la carga dinámica y, si falla, recarga la página por fuerza bruta para obtener los últimos assets antes de crashear.
- **Limpieza:** Se quitó el `<pre>` de diagnóstico en `ErrorBoundary.jsx`.

### 2. INSTRUCCION #30 — Lector de Voz Nativo (Text-to-Speech)
- Añadida utilidad `speakText(text)` en `helpers.js` usando `window.speechSynthesis`.
- Añadidos botones `Volume2` en las burbujas de los mensajes del Chat (Profesor y Estudiante).
- Añadido botón `Volume2` flotante en el header de la descripción de cada tarjeta en el Muro (`TaskCard.jsx`).
- Deploy exitoso y commit `d0599dc`.

### 3. INSTRUCCION #31 — Traducción en un clic (Diccionario / Gemini)
- Añadido el icono `Languages` a `src/components/Icons.jsx`.
- Implementada la función de traducción al español con Gemini en `App.jsx` y `TaskCard.jsx`.
- Añadidos botones flotantes de traducción en los mensajes del chat y descripciones del muro.
- Mostrado resultado de la traducción de forma amigable.

### 4. Bugs Silenciosos Arreglados
- **Service Worker en DEV:** Se añadió la validación `import.meta.env.PROD` en `main.jsx` para evitar que intente registrar el Service Worker en entorno local (lo cual lanzaba un `SecurityError`).
- **ErrorBoundary Local Logging:** Se eliminó la petición a `http://localhost:4000/log` en `ErrorBoundary.jsx` para evitar el error de red (`ERR_CONNECTION_REFUSED`) cuando la app está en producción en Vercel.

### ESTADO: EN ESPERA DE NUEVAS INSTRUCCIONES
### Historial del bucle (instrucciones #1-#29 completadas y desplegadas)
1. Lazy loading (TasksTab, GifPickerModal)
2. /api/filter + checkBadWordsAsync
3. Dominio gina-docente.vercel.app → proyecto Vite
4. PWA (manifest, vite-plugin-pwa, sw.js)
5. Títulos dinámicos + toasts offline/online
6. ErrorBoundary
7. Open Graph / Twitter meta
8. EmptyState
9. ScrollToTop
10. SkeletonCard + tasksLoading
11. Persistencia offline
12. Buscador del muro
13. Paginación (loadMore)
14. LinkifyText + embeds de YouTube
15. Confetti
16. Botones Copiar
17. Notas de voz (useVoiceRecorder)
18. timeAgo
19. Textareas resize-y
20. Notificaciones web nativas
21. Calificación docente de evidencias (nota + feedback + badge)
22. Markdown básico (negritas/cursivas)
23. Posts fijados (isPinned)
(Fix) Recarga automática SW en controllerchange (bug "¡Ups!")

### ESTADO: EN MANOS DE ANTIGRAVITY (modo autónomo)
