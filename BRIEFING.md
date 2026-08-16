BRIEFING MAESTRO DEL PROYECTO ENGLISH TECH (PARA GEMINI VIA ANTIGRAVITY)
=======================================================================
Versión 2.0 — Actualizado con todo el contexto histórico de la sesión de mantenimiento.

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

HISTORIA RECIENTE (IMPORTANTE PARA NO ROMPER NADA)
--------------------------------------------------
1. La página era un HTML monolítico (React + Babel standalone + Tailwind CDN)
   alojado en https://gina-docente.vercel.app (repo CamiloJS/GinaDocente).
   ESA PÁGINA ES LEGACY: no tocarla, no desplegarla, no usarla como referencia
   de código. Sigue viva pero NO se mantiene.

2. El proyecto fue migrado a Vite en fases (scaffolding, fundamentos,
   componentes, App principal) y vive en la carpeta gina-vite del workspace.

3. El proyecto Vite se despliega en Vercel como "gina-docente-qq2s":
   - URL: https://gina-docente-qq2s.vercel.app
   - Vínculo local: carpeta gina-vite/.vercel/project.json
     (projectName: gina-docente-qq2s, orgId team_R80R2pnLTWwJJGXiKboCeWYN)
   - Cuenta Vercel: edwincamilojaimes1-2302 (CLI logueado)
   - Comando de deploy: vercel deploy --prod DESDE la carpeta gina-vite

4. Firebase: proyecto "ginadocente-unipamplona". Las credenciales del cliente
   están en src/firebase/config.js (son públicas por diseño, es un web app).

5. Repositorio GitHub: CamiloJS/GinaDocente-Vite (rama main). Credenciales:
   gh CLI logueado como CamiloJS. Comandos git normales funcionan.

ESTRUCTURA DEL PROYECTO (gina-vite)
------------------------------------
- src/App.jsx: componente principal (login, pestañas, chat, bots, evaluaciones,
  perfil, directorio, buzón, syllabus, repasos). Es el archivo más grande.
- src/components/TaskCard.jsx: tarjeta del muro (reacciones, comentarios,
  edición, adjuntos).
- src/components/TasksTab.jsx: pestaña Muro de Clase (formulario de publicación).
- src/components/GifPickerModal.jsx: buscador de GIFs (USA API DE GIPHY, key
  pública kwprszfXeLxqBuRcVDtNkhliq9jDpB5e — NO CAMBIAR, Tenor está muerto).
- src/components/Icons.jsx: todos los iconos SVG (exportados).
- src/firebase/config.js: inicialización Firebase + re-exports.
- src/utils/helpers.js: constantes (TEACHER_NAME, FALLBACK_MAP, BAD_WORDS,
  gradientes, emojis) y funciones (compressImage, containsBadWords,
  uploadImageToStorage, uploadRawFileToStorage, formatChatDate, formatTime).
- src/utils/styles.js: glassCard, glassInput, redButton, outlineButton.
- src/utils/hooks.js: useClickOutside.
- api/gemini.js: Serverless Function de Vercel (proxy a la API de Gemini).
- index.html: entrada (favicon con data URI incrustado).
- tailwind.config.js: darkMode 'class', content apunta a ./index.html y ./src.
- public/: favicon.ico, icono.png, favicon-32.png.

FIREBASE (proyecto: ginadocente-unipamplona)
---------------------------------------------
Ruta base de datos: artifacts/unipamplona-english-app/public/data/...
Colecciones principales:
- tasks: publicaciones/tareas del muro (campos: type 'task'|'post', title,
  description, authorName, targetGroupId, dueDate, dueTime, allowLate,
  createdAt, comments, reactions)
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
1. NO modificar la lógica de negocio sin explicarlo. Los cambios de diseño a
   estilo corporativo (sólido, minimalista, con dark:) son bienvenidos.
2. Todo debe seguir 100% GRATUITO: Vercel Hobby + Firebase Spark. No agregar
   servicios de pago ni funcionalidades que requieran plan pago.
3. No guardar contraseñas en localStorage. Nunca.
4. Modo oscuro: usar clases dark: de Tailwind. La clase 'dark' se aplica en
   <html> por el useEffect de isDarkMode (document.documentElement.classList).
   NO volver a la clase custom 'dark-mode' (obsoleta).
5. GIFs: la API de Tenor está MUERTA (descontinuada). El buscador usa Giphy
   con la key pública en GifPickerModal.jsx. No cambiarla a Tenor.
6. Antes de desplegar: correr npm run build y verificar que compile sin errores.
7. Los commits deben ser descriptivos en español.
8. NO exponer ni mover la GEMINI_API_KEY al código cliente: vive en Vercel
   como variable de entorno (api/gemini.js la lee con process.env).
9. El favicon usa data URI incrustado en index.html (no quitar).
10. Desplegar SIEMPRE con: vercel deploy --prod desde la carpeta gina-vite.
    NUNCA desde otra carpeta (crearía un proyecto Vercel nuevo por error).

ALCANCE DE TUS HERRAMIENTAS (IMPORTANTE)
----------------------------------------
- Tienes acceso a terminal y archivos del workspace: puedes editar código,
  correr npm/node/python/git/vercel, y hacer push/deploy.
- NO tienes navegador con sesión: no puedes entrar a la consola de Firebase,
  ni al panel de Vercel, ni a Google Cloud. Solo puedes usar las credenciales
  del CLI (git/gh/vercel) y el código de la app.
- Para verificar datos de Firebase puedes usar el código de la app o REST
  público, pero con cuidado de no corromper datos.

ESTADO ACTUAL (bugs ya resueltos en sesiones anteriores)
--------------------------------------------------------
- Página en blanco por TDZ (movido el useEffect de auto-update tras los states)
- Contraseñas eliminadas de localStorage
- Modo oscuro con darkMode:'class' + overrides .dark .text-* en los <style> de App
- Favicon con data URI (aparece en la pestaña)
- GIFs migrados de Tenor (muerto) a Giphy (key pública)
- Botón enviar chat permitía solo texto/imagen: ahora también documento
- Entradas fantasma (doc 'teacher' sin email) filtradas del Directorio y chat
- Tabs móviles corporativas (sin naranja viejo)
- Botones "Crear" evaluaciones y "Ver Resultados" sólidos con dark
- Guard anti doble-envío de evaluaciones (submittingEvalRef)
- Syllabus: campo material opcional + await + mensajes de éxito/error
- Hash inválido al cerrar chat desde perfil
- Limpieza visual total: glassmorphism → sólido (bg-white dark:bg-gray-900,
  bordes gray-200/gray-700, sin blurs gigantes, sin halos, sin animaciones
  excesivas: se eliminaron bot-idle-animated, chat-btn-animated, spin-glow,
  text-glow-green, pulse-unread, etc.)

PENDIENTES CONOCIDOS (si te piden trabajar en ellos)
----------------------------------------------------
- El dominio principal gina-docente.vercel.app (legacy) sigue apuntando al
  HTML viejo. Migrarlo al proyecto Vite es decisión del usuario (requiere
  mover dominio en Vercel).
- Reglas de seguridad de Firestore: revisar si son laxas (los clientes pueden
  leer todo). No cambiar sin avisar al usuario.
- Filtro de malas palabras sigue en cliente (BAD_WORDS en helpers.js).
- Rendimiento: hay React.memo en TaskCard/TasksTab; se puede ampliar a otras
  listas (mensajes del chat, evaluaciones).
- El chat "Mensajes" está prácticamente vacío para la profe (no hay
  estudiantes); no es un bug.

TU ROL
------
Eres el desarrollador encargado de mantener y mejorar este proyecto.
Trabaja SIEMPRE sobre el workspace gina-vite. Cuando termines cambios:
1) npm run build (debe compilar)
2) git commit con mensaje descriptivo en español
3) git push origin main
4) Si el usuario lo pide o es un cambio completo: vercel deploy --prod
   (desde gina-vite)
Ante dudas, pregunta al usuario en español simple antes de hacer cambios
destructivos. Nunca borres datos de Firebase sin confirmación.
