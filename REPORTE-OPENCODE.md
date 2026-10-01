# FASES 4 Y 5: LISTENING, DICTADO Y SPEAKING (29/09/2026) - opencode

## Fase 4 - Comprension auditiva y Dictado
- **Listening (`type: 'listening'`)**: audio + enunciado + opciones (se califica como seleccion multiple). El estudiante escucha el audio en el examen y marca.
- **Dictado (`type: 'dictation'`)**: audio + respuesta escrita; se califica con la tolerancia normal (mayusculas/tildes/espacios) y admite variantes.
- **Editor**: nuevo componente reutilizable **`src/components/AudioQuestionEditor.jsx`** con dos opciones:
  - **Grabar audio** con el microfono (usa `useVoiceRecorder`, sube a Storage en `eval_audios`).
  - **Subir archivo** (MP3, WAV, M4A, etc. via `uploadRawFileToStorage`).
  - Vista previa con reproductor y botones "Cambiar" / "Quitar audio".
- El audio es **obligatorio** para guardar una pregunta de listening/dictado (validacion al guardar).

## Fase 5 - Speaking (respuesta grabada)
- **`type: 'speaking'`**: el estudiante **graba su voz** respondiendo (mismo grabador, se sube a Storage) y puede volver a grabar.
- La respuesta queda guardada en `answers[qIndex]` como URL del audio.
- **Calificacion manual**: el motor excluye estas preguntas del calculo automatico (`tienePreguntasManuales`), y en la vista "Ver respuestas" la docente **escucha el audio** y ve el aviso "Calificación manual" (la nota se ajusta con el lápiz de la tabla de notas).

## Reportes
- Excel: listening usa las opciones; dictado se compara como texto; speaking se marca como `[AUDIO] Respuesta grabada (calificacion manual)`.
- Vista "Ver respuestas": badge azul "Calificación manual" + reproductor del audio del estudiante.

## Pruebas
- `scripts/test-scoring.mjs`: +7 casos de listening (con/sin opciones), dictado (exacto, tolerante, incorrecto) y speaking manual. Total ~52.
- `scripts/test-ai-eval.mjs`: ~49 casos del generador de IA.
- `scripts/smoke/render.jsx` incluye el editor de audio (render verificado en navegador, 0 errores).
- Nota: la IA no genera listening/dictado/speaking (no puede crear el audio): esas se agregan a mano con el grabador o subiendo un archivo.

## Estado de las 5 fases pedidas
| Fase | Estado |
|---|---|
| 1. Puntaje por pregunta, variantes y tolerancia, varias correctas | Publicada |
| 2. Verdadero/Falso y Ordenar la oracion | Publicada |
| 3. Relacionar columnas (con puntaje parcial) | Publicada |
| 4. Listening y Dictado (audio) | Publicada |
| 5. Speaking (respuesta grabada, calificacion manual) | Publicada |
| 11. Puntaje por pregunta | Publicada (fase 1) |

---

# SISTEMA DE EVALUACIONES: NUEVOS TIPOS Y CALIFICACION (29/09/2026) - opencode

## Publicado (fases 1 a 3)

### Fase 1 - mejoras a lo que ya existia
- **Puntaje por pregunta**: `q.points` (por defecto 1). La nota se calcula sobre el total de puntos.
- **Respuestas escritas con variantes**: `q.acceptedAnswers` (lista) ademas de `correctAnswer`.
- **Tolerancia**: se ignoran mayusculas, tildes y espacios de mas (`normalizarRespuesta`).
- **Varias respuestas correctas**: el motor y la UI del estudiante ya lo soportaban; ahora el generador de IA tambien puede producirlas (casilla "Permitir varias respuestas correctas").
- El motor se extrajo a **`src/utils/evalScoring.js`** y se probo con **`scripts/test-scoring.mjs`**.

### Fase 2 - tipos nuevos
- **Verdadero/Falso**: se guarda como `multiple` con 2 opciones ("Verdadero"/"Falso"). Boton dedicado en el editor; la IA lo genera con `type: "truefalse"`.
- **Ordenar la oracion**: `type: 'order'` con `words` (orden correcto). Al estudiante se le muestran desordenadas (`src/utils/palabras.js`, orden estable y sin dejar la frase ya ordenada). Califica automaticamente comparando la secuencia.

### Fase 3 - relacionar columnas
- **`type: 'match'`** con `pairs: [{left, right}]` (3 a 6 parejas, derechas distintas).
- El estudiante elige con un selector por elemento; **puntaje parcial** por pareja correcta.

### Generador con IA (actualizado)
- Presets de mezcla: **Variada** (multiple + verdadero/falso + escrita + ordenar + relacionar en examenes largos), Mitad y mitad, Solo multiple, Solo escrita y **Personalizado** (cantidades por tipo, con validacion de que la suma cuadre).
- Genera los 4 tipos de texto y pide `acceptedAnswers` para las escritas.
- Valida: cantidad exacta, sin repetidas, formatos correctos, y **reintenta una vez** con un prompt correctivo si algo falla.

### Reportes
- La vista **"Ver respuestas"** y la **exportacion a Excel** muestran correctamente los tipos nuevos (orden correcto, parejas, puntaje, etc.).

### Pruebas automaticas (corren antes de cada build)
- `scripts/test-ai-eval.mjs` (~49 casos): prompt, parseo, reparaciones, presets, tipos nuevos, reintento.
- `scripts/test-scoring.mjs` (~45 casos): multiple, varias correctas, escritas con variantes y tolerancia, puntaje, ordenar, relacionar con parcial, speaking manual, casos borde y utilidad de desordenar.
- `scripts/check.mjs`: variables indefinidas, importaciones rotas, conflictos y escapes en texto JSX.

## Pendiente (fases 4 y 5)
- **Fase 4**: Comprension auditiva (listening) y **Dictado**. Requiere: subir o grabar un audio por pregunta (se reutiliza `useVoiceRecorder` + Storage) y el reproductor en el examen.
- **Fase 5**: **Speaking** (respuesta grabada). El estudiante graba su voz, se sube a Storage y la docente la escucha y califica en la vista de respuestas (calificacion manual; ya existe `tienePreguntasManuales` en el motor).

---

# NUEVA FUNCION: GENERADOR DE EVALUACIONES CON IA (29/09/2026) - opencode

## Que hace
- Boton **"Generar con IA"** dentro de la creacion de evaluaciones (al lado de "Preguntas (x/20)").
- La docente escribe el **tema/instrucciones**, el **numero exacto de preguntas** (1 a 20), la **dificultad** (facil/media/alta), el **idioma** (espanol / ingles / frances / bilingue) y el **tipo**:
  - Mitad y mitad (automatico)
  - Solo seleccion multiple
  - Solo respuesta escrita
  - Personalizado (cantidades exactas de cada tipo)
- Idiomas disponibles: espanol, ingles, frances y dos modos bilingues (ingles+espanol, frances+espanol).
- La IA genera **preguntas + respuestas** (seleccion multiple con la correcta marcada, y escritas con la respuesta esperada).
- Antes de usarlas se muestra una **vista previa** con las respuestas correctas resaltadas y avisos si algo quedo dudoso.
- Al aceptar: **"Reemplazar las actuales"** o **"Agregar al final"** (respetando el maximo de 20 preguntas).

## Como esta hecho (para mantenimiento)
- `src/utils/aiEvalGenerator.js` (logica pura, sin interfaz):
  - `construirPrompt()` arma el prompt con las reglas estrictas (JSON puro, cantidad exacta, 3-4 opciones, una sola correcta, sin repetir, sin numerar).
  - `parsearEvaluacion()` limpia bloques de codigo, repara comas finales y comillas tipograficas, valida/normaliza cada pregunta, elimina repetidas, deduce la opcion correcta si la IA solo trae `correctAnswer`, y reporta problemas.
  - `generarPreguntasConIA()` pide a la IA y, si la respuesta no cumple, **reintenta una vez** con un prompt correctivo.
- `src/components/AiEvalGeneratorModal.jsx`: la interfaz (modal con formulario, estado de carga, vista previa e insercion).
- `callGemini(prompt, timeoutMs)` ahora acepta timeout (el generador usa 150 s).

## Pruebas (corren solas antes de cada build)
- `npm run test` -> 17 casos del generador (prompt, parseo, reparaciones, reintento).
- `scripts/smoke/ai-eval.html` -> prueba de la interfaz con IA simulada (sin gastar cuota).
- `npm run check` ejecuta ambas + el chequeo de variables indefinidas/importaciones.

## Pendiente sugerido
- Si la docente quiere, se puede agregar: banco de preguntas reutilizable, copiar una pregunta ya generada, o revision automatica de la clave de respuestas.

---

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

## Retroalimentacion con IA automatica en las evaluaciones (30-sep-2026)

- Explicacion con IA de cada respuesta (correcta, incorrecta o parcial) en las evaluaciones vencidas.
- Es AUTOMATICA (sin boton), SIEMPRE en espanol, y cubre TODOS los tipos: multiple, listening, escrita,
  dictado, ordenar, relacionar (con parcial) y speaking (explica que debia incluir + ejemplo).
- Solo se genera despues del deadline: en la pantalla y en la logica (aiFeedback.js se niega antes).
- Se guarda en la nota (feedbackIA) para no gastar IA dos veces; la docente la ve en 'Ver respuestas'.
- Componente propio src/components/FeedbackIAEvaluacion.jsx (hooks validos) + src/utils/aiFeedback.js.
- Pruebas: scripts/test-feedback.mjs (51 casos). Verificado con la IA real: 7/7 tipos explicados.
- El estudiante NO debe saber que hay IA detras: textos, emojis y mensajes de consola neutralizados;
  el prompt prohibe delatarse ("nunca menciones que eres una IA") y limpiarMencionIA() borra cualquier
  mencion que se escape. Verificado con la IA real: 0 menciones en 4 explicaciones.

## Arreglos en las publicaciones (01-oct-2026)

- BUG reportado: al poner color a un texto con enlaces salian las etiquetas crudas
  ([color=#ef4444]https://...[/color]). Causa: LinkifyText partia el texto por URLs antes de procesar
  el formato. Ahora los enlaces son un patron mas del parser: el color (y negrita, subrayado, tachado,
  resaltado) envuelve correctamente a los enlaces y el enlace hereda el color elegido.
- La URL ya no se come el cierre [/color] ni la puntuacion final (punto, coma, parentesis).
- Las publicaciones largas ahora se muestran recortadas con boton "Ver más" / "Ver menos"
  (desvanecido suave); aplica al muro/tareas (TaskCard) y a las publicaciones del perfil.
- Los titulos de las publicaciones tambien respetan color y enlaces (sin etiquetas crudas).
- Pruebas: scripts/test-formato.mjs (+10) y verificacion visual en navegador
  (scripts/smoke/posts.html): 8/8 enlaces con el color correcto (rgb(239,68,68) y rgb(16,185,129)),
  0 etiquetas crudas, "Ver más" expande y encoje. 202 pruebas en total.

## Simulacro de evaluación antes de publicar (01-oct-2026)

- Nuevo boton "Ver simulacro" en el formulario de evaluacion (junto a "Guardar evaluación"):
  muestra la evaluacion EXACTAMENTE como la vera el estudiante, sin publicar ni guardar nada.
- Componente nuevo src/components/SimulacroEvaluacion.jsx (portal a pantalla completa, estilo fiel al examen):
  banner de simulacro, encabezado con cronometro (30:00), aviso anti-trampas, y los 8 tipos de pregunta
  interactivos: multiple, verdadero/falso, listening (audio), escrita, ordenar, relacionar (selects),
  dictado (audio) y speaking (boton de grabar deshabilitado). El boton "Enviar evaluación" sale desactivado.
- Interruptor "Mostrar respuestas correctas" (solo en el simulacro): marca en verde las opciones correctas,
  el orden correcto, las parejas correctas y la respuesta esperada, y muestra el puntaje total.
- BUG ARREGLADO en el examen real: el bloque de preguntas "Relacionar" mostraba el editor de parejas
  (con "Agregar pareja") dentro del examen del estudiante, dejando inalcanzable el selector de respuestas.
  Ahora el estudiante ve el selector correcto (esto lo habria detectado el simulacro).
- Verificado en navegador: 8/8 tipos se dibujan, 7/8 respondidas al interactuar, 0 errores de consola,
  toggle de correctas con 3 aciertos marcados y puntaje total 8.

## Narración de publicaciones mejorada (01-oct-2026)

- Nuevo modulo src/utils/narracion.js: limpieza profunda (no lee enlaces, ni numeros de lista "1.",
  ni vinetas, ni etiquetas [color=...], ni **markdown**, ni emojis, ni decimales "1.5").
- Detecta el idioma de cada parte y narra por fragmentos con la voz correcta de cada uno
  (espanol, ingles, frances...). La IA prepara la separacion (prompt oculto, con cache); si falla,
  un detector local hace el mismo trabajo: la narracion nunca se queda sin funcionar.
- Voz SIEMPRE de mujer y de la mejor calidad disponible: puntua voces Natural/Neural/Premium/Online/Google,
  suma nombres femeninos por idioma y descarta masculinas y roboticas (eSpeak). Verificado:
  eligio "Microsoft Dalia Online (Natural)" para espanol y "Microsoft Aria Online (Natural)" para ingles.
- El boton queda visualmente igual (mismo icono y estilo; solo cambia al icono de detener mientras narra).
  Nada de la IA es visible para los usuarios.
- Bug detectado por la prueba en navegador: si el navegador rechaza una voz, la narracion se rompia;
  ahora la asignacion de voz esta protegida y sigue con el idioma correcto.
- Pruebas: scripts/test-narracion.mjs (42 casos) + verificacion en navegador
  (scripts/smoke/narracion.html) con speechSynthesis simulado: cadena es-MX -> en-US, detener() corta,
  0 errores de consola. 284 pruebas en total.

### Mejoras de narracion (ronda 2, mismo dia)

- El idioma se decide AHORA frase por frase (no por el bloque completo que devuelve la IA):
  refinarSegmentos() vuelve a partir cualquier bloque, asi una publicacion 95% en espanol con frases
  en ingles/frances las lee con su voz dedicada y continua en el idioma original.
- Voz de calidad: si el equipo solo tiene voces roboticas (p. ej. Microsoft Raul/Sabina) o no tiene voz
  del idioma, la narracion usa una VOZ NEURONAL EN LA NUBE por idioma (translate_tts), con respaldo en
  /api/voz (nuestro servidor) y ultimo respaldo la voz del equipo. Verificado en el equipo real:
  fragmentos [es,en,es] -> audios tl=es, tl=en, tl=es.
- Pitch neutro (1.0) y ritmo 1.0 en voces neurales para que suenen con intencion y no roboticas.
- Pruebas: 52 casos de narracion (312 en total).
