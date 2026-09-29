# RONDA 2 - OPTIMIZACION Y CORRECCIONES (29/09/2026) - opencode

## Blindaje (para no repetir el bug que tumbo la pagina)
- **Chequeo automatico antes de cada build**: `scripts/check.mjs` (variables indefinidas, importaciones rotas, marcas de conflicto). Corre en `prebuild`; si falla, **NO se publica**. Probado metiendo el bug de `embedVideos` a proposito.
- **Prueba de render**: `npm run smoke` y abrir http://127.0.0.1:5199/scripts/smoke/index.html (renderiza muro/encuestas/comentarios falsos y avisa de errores).

## Velocidad (medido)
- **Carga inicial: 619 KB -> 371 KB comprimidos (-40%)**. `xlsx`, `pdfjs-dist` y `pptxgenjs` ahora son cargas diferidas (solo al exportar/importar).
- **Frases del banner (237 KB)**: solo se descargan para la docente y despues de montar. TasksTab 322 KB -> 124 KB.
- **Build "legacy" eliminado** (-52% de dist, build 1m -> 8s). El target moderno es es2018 (Chrome/Edge 63+, Safari 12+).
- **Iconos**: icono.png 1207 KB -> 123 KB; icon-512 242 -> 121 KB; icon-192 35 -> 18 KB.
- **Chat**: se cargan solo los ultimos 300 mensajes (antes, todo el historial).

## Correcciones
- **Votos de encuesta**: transaccion de Firestore (antes se podia perder un voto si dos votaban a la vez).
- **HTML valido**: los `<p>` que envolvian `LinkifyText` (que dibuja `<div>` con videos) ahora son `<div>` (7 sitios). Se elimino el aviso de React.
- **Listeners con manejo de error**: chat, lista de chats, alertas y llamadas entrantes ya no fallan en silencio.
- Se elimino `scripts/apply_patches.mjs` (solo servia para el build legacy).

## Seguridad aplicada
- `/api/gemini` exige **sesion valida** (token de Firebase verificado contra Google) y limita a 60 peticiones / 5 min por usuario. Verificado en vivo: 401 sin token.
- `.vercelignore` + `.gitignore` excluyen la llave de servicio de Firebase (`functions/serviceAccountKey.json`).

## Pendiente (decisiones del usuario)
- Reglas de Firestore (cerrar escrituras anonimas / proteger notas). **El usuario pidio dejarlo por ahora.**
- Contrasena maestra `DANTE12345` (hoy visible en el bundle publico). **Decidida "dejarla por ahora".**
- Revocar la llave de servicio de Google (estuvo en despliegues de Vercel).
- Conectar Vercel <-> GitHub (necesita autorizar la app de Vercel en GitHub).
- Paginacion con "cargar mas" en el chat (hoy se cortan en 300 sin boton).

---

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
