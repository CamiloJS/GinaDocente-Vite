BRIEFING MAESTRO DEL PROYECTO ENGLISH TECH (PARA GEMINI VIA ANTIGRAVITY)
=======================================================================
Versión 3.0 — Actualizado al 16/08/2026 con TODO el estado hasta el último
commit (ad8e81a). Este documento es LA fuente de contexto. Léelo completo
antes de tocar nada.

CONTEXTO GENERAL
----------------
"English TECH" es una plataforma educativa web para la profesora Gina
Marcela Quintana Delgado (Universidad de Pamplona). El usuario final
actual es SOLO la profesora (los estudiantes fueron eliminados de la
base de datos, pero ella puede crear nuevos desde la pestaña Directorio).

TECNOLOGIAS
-----------
- Vite 5 + React 18 (JSX modular) + Tailwind CSS 3 (darkMode: 'class')
- Firebase 10 (Auth con email/password, Firestore con persistentLocalCache, Storage)
- Vercel (Serverless Function /api/gemini) + GitHub (repo: CamiloJS/GinaDocente-Vite)
- La IA interna (bot de Gina, traducciones, generador de repasos, "Potenciar",
  "Corregir") usa el endpoint /api/gemini (modelo gemini-2.5-flash-lite) con la
  variable de entorno GEMINI_API_KEY configurada en Vercel.
- PWA activa: vite-plugin-pwa, registerType 'autoUpdate', sw.js genera la
  precache. El registro del SW es MANUAL en src/main.jsx (injectRegister: false).

ENTORNO DE TRABAJO (RUTAS Y CREDENCIALES — CRITICO)
---------------------------------------------------
- Proyecto Vite: C:\Users\Equipo\OneDrive\Documentos\Default Project\gina-vite
- Git: usa git.exe en "C:\Program Files\Git\cmd\git.exe". Repo
  CamiloJS/GinaDocente-Vite, rama main. Config local: user.name CamiloJS,
  user.email edwincamilojaimes1@gmail.com, credential.helper manager.
- gh CLI: C:\Users\Equipo\AppData\Local\Microsoft\WinGet\Packages\
  GitHub.cli_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\gh.exe
  (logueado como CamiloJS, token con scopes gist/read:org/repo → puede push).
- Vercel CLI: disponible con el PATH %APPDATA%\npm (vercel.cmd). Logueado como
  edwincamilojaimes1-2302. Proyecto: gina-docente-qq2s
  (orgId team_R80R2pnLTWwJJGXiKboCeWYN, prj_IIBJ7zet81xzoSXtWfbCq7w7mwvk).
- Node/npm: npm.cmd en "C:\Program Files\nodejs\npm.cmd" (PowerShell bloquea
  npm.ps1; SIEMPRE usa npm.cmd). Node en "C:\Program Files\nodejs\node.exe".
- PowerShell es el shell. NO usar && (usar ';' y $? o comandos separados).
  Para comandos largos usa python con scripts temporales si es más fácil.
- Antigravity (tú): agy.exe en C:\Users\Equipo\AppData\Local\agy\bin\agy.exe.
  La conversación persistente del bucle es 13396f54-3ed3-45fd-a3ed-50c738c0bf59.
  Usas --model gemini-3.1-pro-high --dangerously-skip-permissions con
  --add-dir "...gina-vite". Modo --print para prompts únicos; -i interactivo
  NO renderiza bien en ventanas PowerShell automáticas (úsalo solo en la
  terminal real del usuario).

HISTORIA RECIENTE (IMPORTANTE PARA NO ROMPER NADA)
--------------------------------------------------
1. La página era un HTML monolítico (React + Babel standalone + Tailwind CDN)
   alojado en https://gina-docente.vercel.app (repo CamiloJS/GinaDocente).
   ESA PÁGINA ES LEGACY: no tocarla, no desplegarla, no usarla como referencia
   de código. El dominio gina-docente.vercel.app YA fue recolocado y ahora
   sirve el build Vite del proyecto nuevo (decisión tomada, ya hecho).

2. El proyecto Vite se despliega en Vercel como "gina-docente-qq2s":
   - URLs: https://gina-docente.vercel.app (alias principal) y
     https://gina-docente-qq2s.vercel.app
   - Vínculo local: carpeta gina-vite/.vercel/project.json
   - Comando de deploy: vercel deploy --prod DESDE la carpeta gina-vite

3. Firebase: proyecto "ginadocente-unipamplona". Credenciales del cliente en
   src/firebase/config.js (públicas por diseño). Ruta base:
   artifacts/unipamplona-english-app/public/data/...

4. Repositorio GitHub: CamiloJS/GinaDocente-Vite (rama main). gh CLI logueado.

5. BUCLE AUTÓNOMO DE MEJORAS (Antigravity = director, opencode = implementador):
   Antigravity escribe instrucciones en INSTRUCCIONES-ANTIGRAVITY.md con
   "ESTADO: LISTA PARA IMPLEMENTAR" al final. El implementador las ejecuta,
   hace build + deploy + commit/push, y reporta en REPORTE-OPENCODE.md con
   "ESTADO: ESPERANDO SIGUIENTE". Antigravity responde con el siguiente número.
   Se completaron las instrucciones #1 a #29 (detalle en REPORTE-OPENCODE.md).
   Desde ahora, Antigravity trabaja 100% SOLO (ver sección "TU ROL" abajo).

ESTRUCTURA DEL PROYECTO (gina-vite)
-----------------------------------
- src/App.jsx: componente principal (login, pestañas, chat, bots, evaluaciones,
  perfil, directorio, buzón, syllabus, repasos). Es el archivo más grande.
- src/main.jsx: entry point + registro MANUAL del Service Worker con recarga
  automática en 'controllerchange' (importante para el bug de la pantalla
  "¡Ups!"). NO volver a injectRegister:'auto'.
- src/components/TaskCard.jsx: tarjeta del muro (reacciones, comentarios,
  edición, adjuntos, calificación docente #27, posts fijados #29).
- src/components/TasksTab.jsx: pestaña Muro de Clase (formulario de publicación,
  paginación, buscador, render de fijados primero).
- src/components/GifPickerModal.jsx: buscador de GIFs (USA API DE GIPHY, key
  pública kwprszfXeLxqBuRcVDtNkhliq9jDpB5e — NO CAMBIAR, Tenor está muerto).
- src/components/Icons.jsx: todos los iconos SVG (exportados). Ya incluye:
  Star (calificación #27), Pin (#29), Volume2 (#30, recién añadido).
- src/components/LinkifyText.jsx: parsea URLs, embeds de YouTube y Markdown
  básico (**negritas**, *cursivas*) (#28).
- src/components/ErrorBoundary.jsx: pantalla "¡Ups! Algo salió mal". ÚLTIMO
  CAMBIO: ahora guarda window.__ebError con el stack trace y lo muestra en un
  <pre> verde en pantalla (DIAGNÓSTICO TEMPORAL del bug activo, ver más abajo).
- src/firebase/config.js: inicialización Firebase + re-exports (incluye where).
- src/utils/helpers.js: constantes (TEACHER_NAME, FALLBACK_MAP, BAD_WORDS,
  gradientes, emojis) y funciones (compressImage, containsBadWords,
  uploadImageToStorage, uploadRawFileToStorage, formatChatDate, formatTime,
  timeAgo, checkBadWordsAsync).
- src/utils/styles.js: glassCard, glassInput, redButton, outlineButton.
- src/utils/hooks.js: useClickOutside.
- src/utils/useVoiceRecorder.js: hook de notas de voz reutilizable (#23).
- api/gemini.js: Serverless Function de Vercel (proxy a la API de Gemini).
- api/filter.js: serverless de verificación de malas palabras (#2).
- vite.config.js: VitePWA (registerType autoUpdate, injectRegister false),
  proxy /api/gemini → https://gina-docente.vercel.app, build chunked.
- public/: favicon.ico, icono.png, icon-192.png, icon-512.png.

BUG ACTIVO #1 — PANTALLA "¡UPS! ALGO SALIÓ MAL" (PRIORIDAD MÁXIMA)
-----------------------------------------------------------------
- Síntoma: en producción (https://gina-docente.vercel.app o
  gina-docente-qq2s.vercel.app) a veces aparece la pantalla roja del
  ErrorBoundary "¡Ups! Algo salió mal". Ocurre especialmente mientras hay
  deploys frecuentes (el usuario la vio durante las sesiones de trabajo).
- Análisis hecho: los chunks lazy (TasksTab, GifPickerModal) usan hashes. Con
  PWA autoUpdate + precache, si el usuario tiene la pestaña abierta durante un
  deploy, el SW nuevo sirve chunks nuevos pero el JS viejo en memoria pide el
  chunk viejo (ya borrado) → import() falla → ErrorBoundary. Se aplicó fix:
  registro manual del SW con recarga automática en 'controllerchange'
  (main.jsx). El ErrorBoundary ahora muestra el stack trace en pantalla para
  diagnóstico (window.__ebError). AÚN HAY QUE CONFIRMAR en runtime real si el
  fix es suficiente o si existe OTRA causa (p. ej. un error de render en
  App.jsx). Verificar con la app abierta y hacer varios deploys, o inspeccionar
  el stack trace que ahora muestra la pantalla roja.
- Para reproducir: abrir la app en Edge/Chrome y, con la pestaña abierta,
  desplegar una versión nueva, o simplemente navegar por todas las pestañas
  (chat, muro, repasos, evaluaciones, perfil, directorio, buzón, syllabus).
- Si el stack trace aparece, corregir el error de raíz y eliminar el <pre>
  de diagnóstico del ErrorBoundary cuando esté resuelto.

TRABAJO PENDIENTE / EN CURSO
----------------------------
- INSTRUCCION #30 (TTS / lector de voz): estaba en curso. Ya se añadió el
  icono Volume2 en Icons.jsx. Falta: crear función speakText(text) en App.jsx
  o helpers.js (window.speechSynthesis.cancel(); new SpeechSynthesisUtterance;
  utterance.lang='en-US'; speak), añadir botón Volume2 junto a los botones de
  copiar del chat (en App.jsx hay dos: uno para mensajes del bot ~línea 2848,
  otro para mensajes del usuario ~línea 3402), y opcionalmente en TaskCard.jsx
  para leer instrucciones de tareas. La INSTRUCCION #30 completa está escrita
  en INSTRUCCIONES-ANTIGRAVITY.md (líneas ~495-510).
- Las instrucciones siguientes (#31+) las escribe Antigravity según su criterio.

FIREBASE (proyecto: ginadocente-unipamplona)
---------------------------------------------
Ruta base de datos: artifacts/unipamplona-english-app/public/data/...
Colecciones principales:
- tasks: publicaciones/tareas del muro (campos: type 'task'|'post', title,
  description, authorName, targetGroupId, dueDate, dueTime, allowLate,
  createdAt, comments, reactions, isPinned [#29])
- reviews: repasos generados con IA (topic, slides)
- syllabus: contenidos programáticos (week, topic, material)
- evaluations: evaluaciones (title, description, dueDate, dueTime, timeLimit,
  questions: [{type:'multiple'|'text', text, options:[{text,isCorrect}], correctAnswer}])
- grades: notas (evaluationId, studentId, studentName, score 0-5, answers, submittedAt)
- userMappings: usuarios. El doc 'teacher' es el perfil de la profe (puede tener
  profilePicUrl, customLabel). Los estudiantes tienen fullName, email, role.
  IMPORTANTE: los documentos de usuario SIN email son basura/fantasma (ej. el
  doc 'teacher' no tiene email pero es legítimo para el perfil). Filtrar por
  data?.email al listar estudiantes.
- academicGroups: materias/grupos académicos (name, members[])
- chatGroups: grupos de chat (name, members[])
- chats/{chatId}/messages: mensajes (text, imageUrl, fileUrl, fileName, author,
  authorId, uid, status 'sent'|'read', readAt, replyTo, reactions, createdAt)
- lastMessages: preview del último mensaje por chat
- presence: estado online (isOnline, status online|away|busy|offline, lastPing,
  lastSeen, currentChatId)
- typing: indicadores de escritura por chat
- chatAlerts: notificaciones de mensajes no leídos
- settings/bot: infoList del bot de estudiantes
- settings/teacherBot: infoList del bot de la profesora
- users/{uid}/chatbot/history: historial del bot de estudiantes
- users/{uid}/preferences/chat: preferencias de chat (gradient, pattern)

AUTENTICACION
-------------
- Cuentas email/password de Firebase Auth.
- La profe entra con usuario 'ginadocente' (email ginamarcelaquintana19@gmail.com).
  Está en FALLBACK_MAP (helpers.js).
- Los estudiantes que se creen en Directorio usan createUserWithEmailAndPassword
  con la secondaryApp/secondaryAuth (config.js) y se guardan en userMappings.
- Las contraseñas NO se guardan en localStorage (medida de seguridad aplicada).
  El "Vuelve a acceder" solo pre-rellena el nombre de usuario.

REGLAS ABSOLUTAS (NO ROMPER)
----------------------------
1. NO modificar la lógica de negocio sin explicarlo en el reporte. Los cambios
   de diseño a estilo corporativo (sólido, minimalista, con dark:) son bienvenidos.
2. Todo debe seguir 100% GRATUITO: Vercel Hobby + Firebase Spark. No agregar
   servicios de pago ni funcionalidades que requieran plan pago.
3. No guardar contraseñas en localStorage. Nunca.
4. Modo oscuro: usar clases dark: de Tailwind. La clase 'dark' se aplica en
   <html> por el useEffect de isDarkMode. NO volver a la clase custom 'dark-mode'.
5. GIFs: la API de Tenor está MUERTA. El buscador usa Giphy con la key pública
   en GifPickerModal.jsx. No cambiarla a Tenor.
6. Antes de desplegar: correr npm.cmd run build y verificar que compile sin
   errores. En PowerShell usa la ruta completa npm.cmd.
7. Los commits deben ser descriptivos en español.
8. NO exponer ni mover la GEMINI_API_KEY al código cliente: vive en Vercel
   como variable de entorno (api/gemini.js la lee con process.env).
9. El favicon usa data URI incrustado en index.html (no quitar).
10. Desplegar SIEMPRE con: vercel deploy --prod desde la carpeta gina-vite.
    NUNCA desde otra carpeta (crearía un proyecto Vercel nuevo por error).
11. No borrar datos de Firebase sin confirmación explícita del usuario.
12. Mantener el patrón de notificaciones nativas (#26) y recarga de SW (#fix):
    main.jsx registra el SW manualmente; NO quitar.
13. Los chunks lazy (React.lazy) deben seguir existiendo para rendimiento; si
    causan el bug de chunks viejos, la solución es la recarga en controllerchange
    (ya aplicada), no cargar todo inline.

FLUJO DE TRABAJO AUTÓNOMO (DESDE AHORA, SIN opencode)
-----------------------------------------------------
Antigravity trabaja 100% solo. Ciclo completo por mejora/bug:
1. Decide la mejora/bug a resolver (puede seguir numerando INSTRUCCIONES en
   INSTRUCCIONES-ANTIGRAVITY.md para llevar el historial, o trabajar directo).
2. Implementa los cambios en el código dentro de gina-vite.
3. Verifica con: "C:\Program Files\nodejs\npm.cmd" run build
4. Despliega con: vercel deploy --prod (desde gina-vite; el CLI está logueado)
5. Commit + push: git add -A; git commit -m "mensaje en español"; git push origin main
6. Actualiza REPORTE-OPENCODE.md (o un log propio) con lo hecho.
7. Verifica el resultado en la URL de producción cuando sea posible.
8. Prioridad #1: resolver el bug de la pantalla "¡Ups!" (ver sección de bug) y
   terminar la INSTRUCCION #30 (TTS). Después, continuar mejorando.
9. Si algo requiere interacción del usuario (clic, cuenta, decisión), detente y
   avísale en español simple escribiendo en un archivo NOTAS-PARA-USUARIO.md en
   gina-vite o respondiendo claro en la conversación.
10. Tienes permiso total para instalar dependencias (npm install ...) y crear
    herramientas auxiliares si las necesitas, siempre que mantengas la regla #2.

ALCANCE DE TUS HERRAMIENTAS
---------------------------
- Tienes acceso a terminal y archivos del workspace: puedes editar código,
  correr npm/node/python/git/vercel, y hacer push/deploy.
- NO tienes navegador con sesión: no puedes entrar a la consola de Firebase,
  ni al panel de Vercel, ni a Google Cloud. Solo puedes usar las credenciales
  del CLI (git/gh/vercel) y el código de la app.
- Para verificar datos de Firebase puedes usar el código de la app o REST
  público, pero con cuidado de no corromper datos.

LOGROS ACUMULADOS (resumen de instrucciones #1-#29)
---------------------------------------------------
1. Lazy loading de TasksTab y GifPickerModal.
2. Backend de filtro de malas palabras (/api/filter + checkBadWordsAsync con
   fallback local).
3. Dominio gina-docente.vercel.app recolocado al proyecto Vite.
4. PWA (manifest, vite-plugin-pwa, sw.js).
5. Títulos dinámicos por pestaña + toasts offline/online.
6. ErrorBoundary ("¡Ups!").
7. Open Graph / Twitter meta tags.
8. EmptyState en muro/repasos/evaluaciones/chat.
9. ScrollToTop.
10. SkeletonCard + tasksLoading.
11. Persistencia offline (persistentLocalCache ya activa, +log).
12. Buscador del muro (wallSearchTerm/filteredTasks).
13. Paginación del muro (taskLimit/loadMoreTasks).
14. LinkifyText + embeds de YouTube.
15. Confetti (canvas-confetti).
16. Botones Copiar (handleCopy).
17. Notas de voz (useVoiceRecorder; chat + muro + comentarios).
18. timeAgo (fechas relativas).
19. Textareas resize-y.
20. Notificaciones web nativas (botón Activar + envío cuando document.hidden).
21. Calificación docente de evidencias en comentarios (nota 0-5 + feedback +
    badge dorado).
22. Markdown básico (**negritas**, *cursivas*) en LinkifyText.
23. Posts fijados (isPinned, consulta separada, sin duplicados, borde dorado).
(Fix) Recarga automática de SW en controllerchange para el bug "¡Ups!".

TU ROL
------
Eres el desarrollador y director del proyecto, con autonomía total. Trabaja
SIEMPRE sobre el workspace gina-vite. No dependas de nadie más: implementa,
compila, despliega, commitea, empuja y verifica por ti mismo. Mantén el
historial en INSTRUCCIONES-ANTIGRAVITY.md y REPORTE-OPENCODE.md. Ante dudas,
pregunta al usuario en español simple antes de cambios destructivos. Nunca
borres datos de Firebase sin confirmación.