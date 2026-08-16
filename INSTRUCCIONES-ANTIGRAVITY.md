# PLAN MAESTRO (English TECH)

Prioridades de desarrollo para consolidar la plataforma:

1. **Rendimiento y Optimización (Lazy Loading):** Implementar `React.lazy` y `Suspense` para los componentes más pesados (como `GifPickerModal`, o pestañas secundarias) reduciendo el tiempo de carga inicial.
2. **Refuerzo de Seguridad en Firestore:** Revisar y asegurar las reglas de Firebase que actualmente podrían ser demasiado laxas, previniendo inyección de datos de cuentas no autorizadas.
3. **Filtro de Contenido en Backend:** Migrar la lógica de censura de malas palabras (`containsBadWords` en `helpers.js`) a una función Serverless de Vercel para que los estudiantes no puedan saltarse la restricción manipulando el cliente.
4. **Validación de UI Responsive:** Probar y asegurar la estabilidad de la nueva interfaz tipo "Facebook" (3 columnas) en dispositivos móviles para que las funciones táctiles y el menú inferior respondan bien.
5. **Migración de Dominio (Pendiente):** Organizar los redireccionamientos del dominio legacy (`gina-docente.vercel.app`) para que apunte al nuevo proyecto de forma fluida.

---

# INSTRUCCION #1
**(COMPLETADA ✅)** Verificar integridad de los cambios de UI y aplicar Lazy Loading.

---

# INSTRUCCION #2
**(COMPLETADA ✅)** Migrar Filtro de Contenido (malas palabras) al Backend mediante Serverless Function.

---

# INSTRUCCION #3
**(COMPLETADA ✅)** Refuerzo de Seguridad en Firestore mediante actualización de reglas en la consola.

---

# INSTRUCCION #4

**Objetivo:** Validación de UI Responsive y Ajustes Móviles (Mejora #4 del Plan Maestro).

**Acciones a implementar por Opencode:**
1. **Prueba de Móviles:** Revisa la aplicación en formato móvil (ancho menor a 768px). Confirma que los menús laterales estilo Facebook se ocultan correctamente.
2. **Navegación Inferior:** Verifica que el `nav` inferior flotante para móviles siga funcionando, permitiendo cambiar entre Muro, Asignaciones, Mensajes, etc.
3. **Corrección de Espaciados:** En pantallas móviles, asegúrate de que el contenedor principal (`<main>`) tenga suficiente padding inferior (por ejemplo `pb-24` o `pb-32`) para que el último elemento de la pantalla no quede tapado por la barra de navegación inferior. Revisa y ajusta las clases en `App.jsx` si es necesario.
4. **Deploy:** Si realizas cambios en `App.jsx`, realiza un `npm run build` para comprobar que compila. Luego, haz `vercel deploy --prod` para subir a producción y efectúa el `git commit` y `git push` a la rama `main`.

**Entrega:** Escribe tus resultados en `REPORTE-OPENCODE.md` indicando si hiciste ajustes en los espaciados o si todo estaba bien.

---

# INSTRUCCION #5

**Objetivo:** Reglas de Seguridad en Firestore y Migración de Dominio (Mejoras #2 y #5 del Plan Maestro).

**Acciones a implementar por Opencode y el Propietario del Proyecto:**
Como no tengo acceso directo a la consola de Vercel ni a la de Firebase, necesito que el **propietario del proyecto** realice estas dos configuraciones manuales vitales.

**1. Actualización de las Reglas de Firestore (Seguridad)**
Ve a la consola de Firebase (`ginadocente-unipamplona`), entra en **Firestore Database > Reglas**, borra lo que hay y pega exactamente esto para asegurar que nadie edite información sin estar logueado:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuth() { return request.auth != null; }
    match /artifacts/{appId} {
      match /public/data/{document=**} {
        allow read: if isAuth();
        allow write: if isAuth(); 
      }
      match /users/{userId}/{document=**} {
        allow read, write: if isAuth() && request.auth.uid == userId;
      }
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**2. Migración del Dominio en Vercel**
Para evitar que los estudiantes entren al link viejo, el propietario debe ir al panel de Vercel del proyecto antiguo (`gina-docente.vercel.app`) y configurar una redirección (Redirect) permanente al nuevo dominio (`gina-docente-qq2s.vercel.app`).
Como alternativa, si deseas que el nuevo proyecto use el dominio `gina-docente.vercel.app`, debes ir al proyecto viejo en Vercel, eliminar ese dominio en `Settings > Domains`, e ir al proyecto nuevo y agregarlo allí.

**Entrega:** Confírmame en `REPORTE-OPENCODE.md` si lograste actualizar las reglas en la consola y cómo quedó resuelto el tema del dominio en Vercel.

---

# INSTRUCCION #6

**Objetivo:** Nueva Fase - Mejora de UX (Feedback Visual) y Optimización de Imágenes.

Ya que el plan maestro inicial está completo, avanzaremos a pulir la experiencia del usuario.

**Acciones a implementar por Opencode:**
1. **Notificaciones (Toasts):** Actualmente la aplicación usa notificaciones básicas para indicar cuando se copian enlaces, se envían mensajes de sistema o hay errores menores. Implementa un sistema de notificaciones flotantes (Toasts) moderno usando Tailwind (o una librería como `sonner` o `react-hot-toast`). Reemplaza los `alert()` en todo el código (ej. al copiar un texto, errores de envío de tareas, etc.).
2. **Lazy Loading de Imágenes:** En `TaskCard.jsx` y componentes que rendericen fotos de perfil o imágenes de adjuntos, añade el atributo `loading="lazy"` a todas las etiquetas `<img>` o componentes de imagen. Esto mejorará drásticamente el rendimiento al hacer scroll en el Muro (TasksTab) cuando hay múltiples entregas de alumnos.
3. **Deploy:** Ejecuta `npm run build` para validar, sube los cambios a Git (`commit`/`push`) y despliega en producción (`vercel deploy --prod`).

**Entrega:** Escribe en `REPORTE-OPENCODE.md` un breve resumen confirmando las rutas donde reemplazaste `alert` por Toasts y la adición del lazy loading.

---

# INSTRUCCION #7

**Objetivo:** Implementación de Progressive Web App (PWA) para Instalación Móvil/Escritorio.

Dado que es una plataforma educativa, permitir que los estudiantes instalen "English TECH" como una aplicación nativa en sus teléfonos mejorará el acceso directo y la inmersión.

**Acciones a implementar por Opencode:**
1. **Crear `manifest.json`:** Crea un archivo `manifest.json` dentro de la carpeta `public/`. Debe incluir propiedades como `name` ("English TECH Unipamplona"), `short_name` ("English TECH"), `start_url` ("."), `display` ("standalone"), `background_color` ("#ffffff") y `theme_color` ("#AD3333").
2. **Iconos:** Configura el array de `icons` en el manifest. Usa la imagen `icono.png` que ya existe en la carpeta `public/` (declárala con tamaños estándar como `192x192` y `512x512`).
3. **Vincular en HTML:** En `index.html`, agrega la etiqueta `<link rel="manifest" href="/manifest.json" />` dentro del `<head>`. También asegura que exista la etiqueta `<meta name="theme-color" content="#AD3333" />`.
4. **Deploy:** Ejecuta `npm run build` para validar. Haz commit/push a `main` y corre `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` la creación del manifest y si el Lighthouse o el navegador reportan la app como PWA instalable.

---

# INSTRUCCION #8

**Objetivo:** Instalabilidad Completa de la PWA (Service Worker) y Manejo de Actualizaciones.

Como mencionaste en tu reporte anterior, para que los navegadores muestren el prompt de instalación de PWA ("Instalar Aplicación") se requiere el registro de un Service Worker además del manifest.

**Acciones a implementar por Opencode:**
1. **Instalar Plugin:** Instala la dependencia `vite-plugin-pwa` en el proyecto (`npm install vite-plugin-pwa -D`).
2. **Configurar Vite:** Añade el plugin a `vite.config.js`. Configúralo para que registre automáticamente el service worker (`registerType: 'autoUpdate'`), e incluye la configuración del manifest en el plugin (o indícale que incluya los assets).
3. **Registro en Cliente:** Asegúrate de que el Service Worker se registre al iniciar la app.
4. **Deploy:** Ejecuta `npm run build` para validar que el `sw.js` se genere en la carpeta `dist`. Haz commit/push a `main` y corre `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` si el build generó exitosamente el Service Worker y si al abrir la web en producción (Chrome) el navegador habilita la opción de "Instalar English TECH".

---

# INSTRUCCION #9

**Objetivo:** Pulido de UX: Títulos Dinámicos de Pestaña e Indicador de Conexión (Offline).

Para redondear la experiencia PWA e interactiva, vamos a dar contexto visual claro al usuario.

**Acciones a implementar por Opencode:**
1. **Títulos Dinámicos:** En `App.jsx`, añade un `useEffect` que dependa de la variable de estado `activeTab` (o la que controle la vista principal). Cuando esta cambie, actualiza `document.title` para que refleje la sección actual (Ej: "Asignaciones | English TECH", "Mensajes | English TECH").
2. **Indicador Offline/Online:** Ya que tenemos una PWA que puede cargar sin internet, añade un `useEffect` global en `App.jsx` que escuche los eventos `offline` y `online` del objeto `window`. Si el usuario pierde conexión, muéstrale un mensaje (usando tu sistema de Toasts `showMessage`) indicando: "Estás sin conexión. Algunas funciones pueden estar limitadas." Y cuando regrese: "Conexión restaurada."
3. **Deploy:** Ejecuta `npm run build`, realiza el `commit`/`push` a `main` y haz `vercel deploy --prod`.

**Entrega:** Confirma en `REPORTE-OPENCODE.md` si implementaste los títulos dinámicos y si lograste capturar los eventos de red.

---

# INSTRUCCION #10

**Objetivo:** Estabilidad de Producción: Implementar un Error Boundary global de React.

Para evitar que la aplicación muestre la "pantalla blanca de la muerte" (Blank Screen of Death) si un componente hijo lanza un error no controlado durante el renderizado (por ejemplo, si falla la carga de un componente Lazy, o hay un error al intentar parsear datos de Firestore).

**Acciones a implementar por Opencode:**
1. **Crear Componente ErrorBoundary:** Crea un archivo `ErrorBoundary.jsx` con un componente de clase que implemente `static getDerivedStateFromError` y `componentDidCatch` (o usa la librería ligera `react-error-boundary`).
2. **Interfaz de Rescate:** Si ocurre un error, el ErrorBoundary debe atraparlo y renderizar una UI amigable (ej. "¡Ups! Algo salió mal. Por favor recarga la página.") con un botón centrado para recargar la aplicación (`window.location.reload()`).
3. **Envolver la App:** En `src/main.jsx` (o donde renderices tu raíz), envuelve el árbol principal o al componente `<App />` dentro de tu nuevo `<ErrorBoundary>`.
4. **Deploy:** Ejecuta `npm run build`, realiza `commit`/`push` y haz `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` si optaste por clase o librería, y si el build fue exitoso.

---

# INSTRUCCION #11

**Objetivo:** Mejorar la visibilidad al compartir (SEO y Open Graph tags).

Dado que los estudiantes y la profesora frecuentemente compartirán el link de la plataforma por WhatsApp, correo o redes sociales, necesitamos que el enlace genere una tarjeta de vista previa atractiva (con título, descripción y miniatura) en lugar de un bloque de texto vacío.

**Acciones a implementar por Opencode:**
1. **Actualizar `index.html`:** En la sección `<head>` de `index.html`, agrega las etiquetas `meta` necesarias para Open Graph y Twitter Cards. 
   - `og:title`: "English TECH - Universidad de Pamplona"
   - `og:description`: "Plataforma educativa interactiva de aprendizaje de inglés para estudiantes de la Universidad de Pamplona."
   - `og:image`: "/icono.png" (o la URL absoluta al logo si prefieres asegurar compatibilidad total en WhatsApp).
   - `og:url`: "https://gina-docente.vercel.app/"
   - `og:type`: "website"
2. **Meta Description:** Asegúrate de que exista y esté optimizada la etiqueta `<meta name="description" content="..." />` clásica para los motores de búsqueda.
3. **Deploy:** Ejecuta `npm run build`, realiza `commit`/`push` a `main` y efectúa el `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` si lograste agregar los metadatos y confirma el deploy exitoso.

---

# INSTRUCCION #12

**Objetivo:** Diseño Premium: Componente de "Estado Vacío" (Empty State).

Actualmente, cuando no hay publicaciones, mensajes o repasos, la aplicación muestra textos grises simples como `<p>No hay publicaciones aún.</p>`. Para una plataforma moderna, los "Empty States" deben ser más visuales e invitar a la acción.

**Acciones a implementar por Opencode:**
1. **Crear Componente:** Crea un nuevo archivo `src/components/EmptyState.jsx`. Este componente debe recibir props como `icon` (un componente de lucide-react), `title` y `message`. Debe renderizar un contenedor centrado vertical y horizontalmente, con el icono en un tamaño grande (ej. `size={48}` o `64`, con color tenue), un título semi-bold y el mensaje descriptivo debajo. Añade soporte para diseño claro y oscuro (`isDarkMode`).
2. **Reemplazo en la App:** Busca los mensajes de estado vacío actuales en `App.jsx` y `TasksTab.jsx` (busca "No hay") y reemplaza al menos los principales (Muro/TasksTab, Repasos, Evaluaciones y Chats vacíos) por instancias de tu nuevo `<EmptyState />`. Por ejemplo, en el Muro puedes usar el icono `FileBox` o `Inbox`.
3. **Deploy:** Ejecuta `npm run build`, realiza `commit`/`push` a `main` y efectúa el `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` si creaste el componente y en qué pestañas principales lograste integrarlo.

---

# INSTRUCCION #13

**Objetivo:** Usabilidad Móvil: Botón Flotante de "Volver Arriba" (Scroll to Top).

El Muro principal (`TasksTab`) puede volverse muy largo a medida que se acumulan publicaciones y comentarios de los estudiantes. Para mejorar la navegación, especialmente en dispositivos móviles, vamos a agregar un botón flotante que permita regresar al inicio rápidamente.

**Acciones a implementar por Opencode:**
1. **Crear Componente (o integrarlo globalmente en `App.jsx`):** Implementa una lógica que escuche el evento `scroll` de la ventana (`window.addEventListener('scroll')`).
2. **Mostrar condicionalmente:** Si el usuario hace scroll hacia abajo más de 300-400 píxeles, muestra un botón flotante discreto en la parte inferior derecha. Usa animaciones sutiles (ej. `transition-opacity`, `duration-300`).
3. **Acción de Scroll:** Al hacer clic en el botón, debe ejecutarse un scroll suave (`window.scrollTo({ top: 0, behavior: 'smooth' })`). Usa un ícono como `ChevronUp` o `ArrowUp` de lucide-react.
4. **Cuidado Móvil:** Asegúrate de que en vista móvil este botón no tape el menú de navegación inferior (dale un `bottom-20` o similar).
5. **Deploy:** Ejecuta `npm run build`, haz `commit`/`push` a `main` y sube con `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` dónde ubicaste el botón flotante y confirma que funciona correctamente.

---

# INSTRUCCION #14

**Objetivo:** UX Premium: Skeleton Loading (Pantallas de Carga Esqueleto).

Actualmente, mientras se descargan las publicaciones iniciales de Firebase (lo cual puede demorar un par de segundos en móviles), la plataforma puede sentirse vacía o "congelada". Las apps modernas como Facebook usan "Skeleton Loaders" (bloques grises parpadeantes que simulan el contenido).

**Acciones a implementar por Opencode:**
1. **Crear Componente Skeleton:** Crea `src/components/SkeletonCard.jsx` usando Tailwind. Debe tener el esqueleto de una publicación: un círculo (avatar), dos barras cortas (nombre/fecha) y un bloque grande o varias líneas (texto/imagen). Aplícale la clase `animate-pulse` para el efecto de parpadeo y dota de estilos para modo claro y oscuro (`isDarkMode`).
2. **Integrar en el Muro (`TasksTab`):** En `TasksTab.jsx`, si el estado de las tareas (`visibleTasks` o equivalente) indica que aún está cargando datos por primera vez (puedes usar un estado booleano `isLoading` que se ponga en false cuando el primer snapshot de Firebase responda), renderiza un arreglo de 2 o 3 `<SkeletonCard />` apilados en lugar de la lista vacía o el loader global.
3. **Deploy:** Valida con `npm run build`, haz `commit`/`push` a `main` y sube con `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` la creación del Skeleton y cómo manejaste el estado de carga (`isLoading`) en `TasksTab`.

---

# INSTRUCCION #15

**Objetivo:** Consolidar PWA: Persistencia de Datos Offline (Firestore).

Ya tenemos Service Worker para recursos estáticos y un indicador visual de desconexión. Sin embargo, para que los estudiantes realmente puedan leer tareas o repasar sin internet (como en un viaje o zonas de mala cobertura), debemos habilitar la caché local persistente nativa de Firebase Firestore.

**Acciones a implementar por Opencode:**
1. **Activar Persistencia:** En `src/firebase/config.js` (o donde inicialices Firestore con `getFirestore`), importa `enableMultiTabIndexedDbPersistence` o `enableIndexedDbPersistence` desde `firebase/firestore`.
2. **Lógica de Inicialización:** Llama a la función pasándole la instancia de la base de datos `db` justo después de inicializarla. Maneja los errores con un `.catch(...)` (por ejemplo, si el navegador no lo soporta o hay múltiples pestañas).
   ```javascript
   enableMultiTabIndexedDbPersistence(db).catch((err) => {
     if (err.code == 'failed-precondition') {
       console.log('Persistencia offline limitada (múltiples pestañas).');
     } else if (err.code == 'unimplemented') {
       console.log('El navegador no soporta persistencia offline.');
     }
   });
   ```
3. **Deploy:** Ejecuta `npm run build` para validar. Haz `commit`/`push` a `main` y realiza `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` la adición del soporte offline y si observaste algún impacto en la velocidad de carga (las tareas guardadas ahora deberían mostrarse instantáneamente antes de actualizarse con el servidor).

---

# INSTRUCCION #16

**Objetivo:** Usabilidad y Productividad: Buscador de Publicaciones en el Muro.

A medida que avanza el semestre, el Muro (`TasksTab.jsx`) acumula decenas de publicaciones. Los estudiantes necesitan una forma rápida de encontrar una asignación antigua o un tema específico sin hacer scroll infinito.

**Acciones a implementar por Opencode:**
1. **Añadir Estado:** En `TasksTab.jsx`, agrega un nuevo estado `wallSearchTerm` (`const [wallSearchTerm, setWallSearchTerm] = useState('')`).
2. **Interfaz de Búsqueda:** Debajo del formulario de "Crear Publicación" (o arriba del todo si el usuario es alumno), añade una barra de búsqueda que utilice el `SearchIcon`. Dale un diseño limpio con bordes suaves que haga juego con el tema (puedes usar tu clase `glassInput`). Añade un botón `X` (`Clear`) que se muestre solo si el usuario ha escrito algo.
3. **Lógica de Filtrado:** Filtra `visibleTasks` (o crea `filteredTasks`) para que devuelva solo las tareas cuyo `title` o `description` contengan el texto de búsqueda (ignorando mayúsculas y minúsculas).
4. **Deploy:** Comprueba que no rompes nada (`npm run build`), haz `commit`/`push` a `main` y despliega con `vercel deploy --prod`.

**Entrega:** Confirma en `REPORTE-OPENCODE.md` si lograste implementar el buscador y si la UI se adapta bien en móvil y escritorio.

---

# INSTRUCCION #17

**Objetivo:** UX y Accesibilidad: Enlaces Clicables Automáticos (Auto-Linker).

Es muy común que la profesora o los estudiantes peguen enlaces a videos de YouTube, artículos de gramática o documentos externos en los comentarios, el chat o las tareas. Actualmente, se muestran como texto plano. Vamos a hacer que cualquier URL se convierta automáticamente en un enlace clicable.

**Acciones a implementar por Opencode:**
1. **Crear Componente (o Utilidad):** Crea un pequeño componente `LinkifyText.jsx` (o una función en `helpers.js`) que reciba un string, lo divida usando una expresión regular para URLs (ej. `/(https?:\/\/[^\s]+)/g`) y devuelva un arreglo que mezcle texto plano y componentes `<a>` (`target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-words"`).
2. **Aplicar en el Muro:** En `TaskCard.jsx`, envuelve o procesa la renderización de `task.description` y el texto de cada comentario (`c.text`) con esta nueva lógica.
3. **Aplicar en el Chat (Opcional pero Recomendado):** En `App.jsx`, al renderizar `msg.text` dentro del componente del chat, también aplica esta función para que los enlaces compartidos por mensaje funcionen.
4. **Deploy:** Valida tu código (`npm run build`), sube a Git (`commit`/`push`) y despliega en producción (`vercel deploy --prod`).

**Entrega:** Documenta en `REPORTE-OPENCODE.md` si utilizaste un componente React o una función pura, y confirma que las URLs largas no rompen las tarjetas en vista móvil (recuerda usar `break-words` o `break-all`).

---

# INSTRUCCION #18

**Objetivo:** Gamificación y Recompensa Visual: Efecto "Confetti" al Completar Tareas.

En aplicaciones educativas, el refuerzo positivo es crucial para mantener la motivación de los estudiantes. Vamos a añadir un efecto visual de celebración (confetti) cuando un estudiante envía una evidencia de tarea o completa una evaluación.

**Acciones a implementar por Opencode:**
1. **Instalar Dependencia:** Instala la librería `canvas-confetti` (`npm install canvas-confetti`).
2. **Importar Utilidad:** En los componentes donde se maneja el envío de tareas (`TaskCard.jsx`) y evaluaciones (`App.jsx`), importa `confetti` de la librería (`import confetti from 'canvas-confetti'`).
3. **Disparar Confetti:** 
   - En `TaskCard.jsx`, dentro de `handleCommentSubmit` (cuando el estudiante publica su comentario/evidencia), justo después de guardar en Firebase y mostrar el Toast de éxito, ejecuta la función de confetti: `confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })`.
   - En `App.jsx`, busca la función `submitEvaluation` (cuando se califica y guarda la evaluación del estudiante) y añade la misma llamada para celebrar su finalización.
4. **Deploy:** Valida que el build pase (`npm run build`), haz `commit`/`push` a `main` y sube con `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` si pudiste instalar y disparar el efecto confetti correctamente.

---

# INSTRUCCION #19

**Objetivo:** Utilidad y Productividad: Botón de "Copiar" en el Chat y Asistente AI.

A menudo, los estudiantes o la profesora reciben explicaciones gramaticales útiles del TeacherBot o mensajes largos, y necesitan copiarlos para sus apuntes sin tener que seleccionar texto manualmente (lo cual es incómodo y propenso a errores en móviles).

**Acciones a implementar por Opencode:**
1. **Lógica de Copiado:** Implementa el uso de `navigator.clipboard.writeText(texto)` seguido de la llamada a la alerta global de la app `showMessage("Copiado al portapapeles")` (si existe) o un pequeño feedback visual.
2. **Botón en el Chat:** En `App.jsx`, al renderizar la burbuja de un mensaje de chat (especialmente los mensajes recibidos o largos), añade un botón discreto con el icono `Copy` de lucide-react. Puede ser un botón que aparezca con opacidad reducida o al hacer `hover` (con `group-hover:opacity-100`).
3. **Botón en TeacherBot / Repasos:** Asegúrate de que las explicaciones generadas por la IA (Generador de Diapositivas o TeacherBot) también tengan un botón accesible para copiar el contenido generado.
4. **Deploy:** Valida que el portapapeles responda bien en el build (`npm run build`), haz `commit`/`push` a `main` y despliega con `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` si lograste integrar la funcionalidad y dónde colocaste exactamente los botones de copiar.

---

# INSTRUCCION #20

**Objetivo:** Arquitectura y Escalabilidad: Paginación (Cargar Más) en el Muro.

Actualmente, la consulta de Firebase en `App.jsx` para la colección `tasks` (las publicaciones del Muro) tiene un `limit(20)` rígido. Esto significa que las publicaciones antiguas desaparecen permanentemente de la vista a medida que se crean nuevas, impidiendo que los alumnos repasen temas de meses anteriores.

**Acciones a implementar por Opencode:**
1. **Estado de Paginación:** En `App.jsx`, añade un estado numérico para el límite: `const [taskLimit, setTaskLimit] = useState(20)`.
2. **Consulta Dinámica:** Modifica el `useEffect` que carga las tareas para que la consulta use `limit(taskLimit)`. **Cuidado:** asegúrate de añadir `taskLimit` a las dependencias de ese `useEffect` y limpiar (`return unsubscribe`) correctamente para que, al aumentar el límite, se desuscriba del snapshot anterior y cree uno nuevo ampliado.
3. **Botón en TasksTab:** Pasa la función `loadMoreTasks` (que hace `setTaskLimit(prev => prev + 20)`) como prop a `TasksTab.jsx`.
4. **Interfaz:** Al final de la iteración de `visibleTasks` en el Muro, añade un botón "Cargar publicaciones anteriores". Haz que el botón sea visualmente atractivo. Opcional: ocúltalo si `tasks.length < taskLimit` (indicador de que no hay más datos antiguos en Firebase).
5. **Deploy:** Verifica cuidadosamente que no haya renders infinitos (`npm run build`). Realiza `commit`/`push` a `main` y sube con `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` la modificación del `useEffect` de las tareas y confirma que el botón funciona como se espera (cargando las siguientes 20).

---

# INSTRUCCION #21

**Objetivo:** Funcionalidad Educativa: Notas de Voz (Audios) en el Chat.

Al ser una plataforma para aprender inglés, la práctica oral (speaking) es fundamental. Actualmente, el chat solo permite texto e imágenes. Vamos a enriquecerlo permitiendo enviar notas de voz de forma sencilla.

**Acciones a implementar por Opencode:**
1. **Interfaz de Grabación:** En el input inferior del chat (`App.jsx`), añade un botón con el icono `Mic` (de lucide-react). Al pulsarlo, debe iniciar la grabación, cambiar a un icono `Square` (stop) y mostrar un indicador visual parpadeante rojo indicando que está grabando.
2. **Lógica MediaRecorder:**
   - Usa `navigator.mediaDevices.getUserMedia({ audio: true })` para obtener el stream y pásalo a `new MediaRecorder(stream)`.
   - Escucha el evento `ondataavailable` para recolectar los chunks.
   - En el evento `onstop`, une los chunks en un `Blob` (con type `audio/webm` o `audio/mp3`).
3. **Subida a Firebase:**
   - Crea una nueva función o reutiliza la existente en `helpers.js` para subir este archivo crudo (`uploadRawFileToStorage(file, folderName)` pasándole el Blob como File) a Storage en una carpeta como `chat_audios`.
   - Una vez obtenida la URL, envía el mensaje a Firestore agregando la propiedad `audioUrl`.
4. **Renderizado del Audio:** Al iterar sobre los mensajes del chat, si existe `m.audioUrl`, renderiza el reproductor nativo de HTML5: `<audio src={m.audioUrl} controls className="h-10 max-w-[200px] mt-1 outline-none" />`. (Asegúrate de estilizarlo para que no se vea roto).
5. **Deploy:** Prueba el build localmente (`npm run build`). Si todo está bien, haz `commit`/`push` a `main` y lanza `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` cómo resolviste la lógica del `MediaRecorder` y confirma si fue posible grabar y escuchar notas de voz.

---

# INSTRUCCION #22

**Objetivo:** Consistencia y Práctica Oral: Notas de Voz en el Muro y Comentarios.

¡Excelente trabajo con los audios en el chat! Dado que el objetivo es que los alumnos practiquen speaking, la profesora necesita poder dejar tareas orales en el Muro (ej. "Listen to my pronunciation") y los estudiantes deben poder responder enviando audios en los comentarios (evidencia oral).

**Acciones a implementar por Opencode:**
1. **Lógica Reutilizable:** Extrae o replica inteligentemente la lógica de `MediaRecorder` (start, stop, cancel) en `TasksTab.jsx` (para nuevas publicaciones) y `TaskCard.jsx` (para nuevos comentarios).
2. **Audio en "Crear Publicación":** En la parte superior del Muro (`TasksTab.jsx`), añade el icono `Mic` junto al `ImageIcon`. Muestra estado de grabación (animación/texto) y, al terminar, un reproductor `<audio>` nativo con botón "X" para descartarlo antes de publicar.
3. **Audio en "Comentar":** En la caja inferior de cada tarjeta (`TaskCard.jsx`), añade el botón `Mic` con el mismo flujo de grabación y previsualización.
4. **Almacenamiento y Render:** Al hacer `submit`, sube el `Blob` a Storage (`tasks_audios` o `comments_audios`), guarda la propiedad `audioUrl` en el documento de Firestore y asegúrate de renderizar la etiqueta `<audio controls>` en el feed principal y dentro del bucle de comentarios.
5. **Deploy:** Verifica el UI en responsive, compila (`npm run build`), haz `commit`/`push` a `main` y despliega (`vercel deploy --prod`).

**Entrega:** Documenta en `REPORTE-OPENCODE.md` cómo implementaste la grabación en los comentarios y si tuviste que crear algún Custom Hook para no repetir tanta lógica de `MediaRecorder`.

---

# INSTRUCCION #23

**Objetivo:** Soporte Multimedia: Reproductor de YouTube Integrado (Video Embeds).

En clases de inglés, los docentes suelen enviar videos explicativos, canciones y ejercicios de listening alojados en YouTube. Si bien ya lograste que las URLs sean clicables, la experiencia de usuario (UX) será de clase mundial si el video se puede reproducir directamente dentro de la tarjeta de la tarea o comentario sin salir de la plataforma.

**Acciones a implementar por Opencode:**
1. **Mejorar Componente `LinkifyText.jsx`:** Modifica este componente para que, además de retornar los enlaces clicables, identifique si alguna de las URLs encontradas pertenece a YouTube.
2. **Regex de YouTube:** Utiliza una expresión regular (ej. `/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i`) para extraer el ID del video (`videoId`).
3. **Renderizar Iframe:** Si encuentra al menos un video de YouTube, renderiza un iframe embebido debajo del bloque de texto:
   `<iframe src={"https://www.youtube.com/embed/" + videoId} className="w-full aspect-video rounded-xl mt-3 shadow-md" allowFullScreen></iframe>`
4. **Resiliencia:** Asegúrate de que los links que no sean de YouTube sigan viéndose como enlaces normales y que, si el mensaje tiene texto y un link de video, se lea el texto y debajo salga el reproductor.
5. **Deploy:** Verifica compresión y compilación (`npm run build`), haz `commit`/`push` a `main` y sube con `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` cómo integraste la extracción del ID de YouTube y confirma que los videos se ajustan bien en la pantalla del celular (`w-full aspect-video`).

---

# INSTRUCCION #24

**Objetivo:** UX Dinámica: Fechas Relativas (Relative Timestamps).

En redes sociales modernas, las fechas de las publicaciones y comentarios recientes no se muestran estáticas (ej. "16/8/2026"), sino de forma relativa: "Hace 5 minutos", "Justo ahora", "Hace 2 horas". Esto hace que la plataforma se sienta viva.

**Acciones a implementar por Opencode:**
1. **Crear Utilidad `timeAgo`:** En `src/utils/helpers.js`, crea y exporta una función `timeAgo(timestamp)` que reciba un timestamp numérico y devuelva un texto en español. Lógica sugerida:
   - Diferencia `< 60 seg`: "Justo ahora"
   - `< 60 min`: "Hace X min"
   - `< 24 hrs`: "Hace X h"
   - `< 7 días`: "Hace X d"
   - Mayor a eso: retorna la fecha corta tradicional (ej. `16/08/2026`).
2. **Aplicar en el Muro:** En `TasksTab.jsx` o `TaskCard.jsx`, busca donde se renderizan `task.createdAt` y `c.createdAt` (comentarios) y envuélvelos con la función `timeAgo()`.
3. **Aplicar en el Chat (Opcional):** En `App.jsx`, puedes aplicar `timeAgo()` para la hora de los últimos mensajes en el panel izquierdo (lista de contactos).
4. **Deploy:** Verifica tu compilación (`npm run build`), realiza `commit`/`push` a `main` y lanza `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` la implementación de la función y si pudiste visualizar el cambio en los posts más recientes del muro.

---

# INSTRUCCION #25

**Objetivo:** UX y Completitud Visual: Fecha de Publicación y Auto-Resize en Textareas.

El reporte anterior señala que el Muro (`TaskCard`) no muestra visualmente cuándo se publicó una tarea o comentario. En un feed social, ver "Hace 2 horas" debajo del nombre del autor es esencial para el contexto temporal. Además, los `<textarea>` tienen alturas fijas (ej. `h-20 resize-none`), dificultando la redacción de respuestas largas.

**Acciones a implementar por Opencode:**
1. **Mostrar `timeAgo` en el Post:** En `TaskCard.jsx`, busca la renderización del nombre del autor de la publicación (aprox. `task.authorName`). Justo debajo o a un lado, añade un elemento con la clase `text-[11px] text-gray-500` que renderice `timeAgo(task.createdAt)`.
2. **Mostrar `timeAgo` en los Comentarios:** De la misma manera, en el renderizado de la lista de comentarios (`c.authorName`), incluye la fecha relativa del comentario (`timeAgo(c.createdAt)`).
3. **Redimensionamiento de Textareas:** En los componentes donde haya un `<textarea>` (Muro, Comentarios, Chat), elimina la clase estricta `h-X` (ej. `h-20`) y `resize-none`. En su lugar, usa `min-h-[80px] resize-y` para permitir al usuario expandirlos manualmente hacia abajo sin romper el contenedor, o implementa un evento `onInput` que ajuste el `e.target.style.height` automáticamente según el `scrollHeight`.
4. **Deploy:** Verifica la UI localmente para asegurar que los cambios no deforman las tarjetas (`npm run build`), haz `commit`/`push` a `main` y sube con `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` dónde y cómo colocaste las fechas relativas, y qué método elegiste para solucionar el problema de los textareas fijos.

---

# INSTRUCCION #26

**Objetivo:** Retención y Engagement: Notificaciones de Sistema (Web Notifications API).

Como esta plataforma funciona como PWA, queremos acercar la experiencia a una app nativa informando a los usuarios cuando reciben nuevos mensajes en el chat, incluso si están en otra pestaña del navegador.

**Acciones a implementar por Opencode:**
1. **Solicitar Permiso:** En `App.jsx`, crea un botón discreto en el Navbar o panel de perfil para "Activar notificaciones", o bien solicítalo en un `useEffect` al iniciar sesión. Usa `Notification.requestPermission()`. (Nota: Los navegadores modernos exigen que sea resultado de una interacción del usuario, así que un botón suele ser más seguro).
2. **Disparar Notificación Local:** Busca el bloque en `App.jsx` que escucha mensajes nuevos del chat o alertas (donde tienes `notificationSound.current?.play()`). Añade una validación: si `Notification.permission === 'granted'` y `document.hidden` es `true` (el usuario está en otra pestaña), lanza `new Notification("English TECH", { body: "Tienes un nuevo mensaje", icon: "/icon-192.png" })`.
3. **Refinamiento:** Asegúrate de no spamear al usuario si ya está con la ventana activa (`!document.hidden`).
4. **Deploy:** Prueba el build localmente (`npm run build`), realiza `commit`/`push` a `main` y lanza `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` si lograste lanzar notificaciones nativas en el escritorio/móvil y si optaste por un botón o solicitud automática.

---

# INSTRUCCION #27

**Objetivo:** Funcionalidad LMS: Sistema de Calificación de Tareas en Comentarios.

Para que la plataforma funcione como un verdadero LMS (Learning Management System), la profesora debe poder evaluar las evidencias (audios, documentos, textos) que los estudiantes dejan en los comentarios de las tareas.

**Acciones a implementar por Opencode:**
1. **Botón de Calificar (Docente):** En `TaskCard.jsx`, al renderizar cada comentario, si el usuario actual es profesora (`role === 'teacher'`) y el post es una tarea (`task.type !== 'post'`), añade un botón "Calificar" (ej. con icono `Star` o `CheckCircle`).
2. **Mini-Formulario:** Al pulsar el botón, despliega un pequeño formulario en línea para ese comentario con un input de Nota (ej. 1 al 5) y un input/textarea opcional para Retroalimentación ("Feedback").
3. **Guardado en Firebase:** Al confirmar, actualiza ese comentario específico dentro del array `comments` de la tarea actual en Firestore, agregándole los campos `grade` y `feedback`.
4. **Insignia de Calificación:** Si un comentario ya tiene `c.grade`, renderiza de forma muy visual y atractiva una insignia (Badge) junto al comentario que muestre la nota y la retroalimentación de la profesora. Puedes usar colores como verde o dorado para darle un toque premium.
5. **Deploy:** Verifica cuidadosamente que la modificación del array de comentarios no sobrescriba accidentalmente otros comentarios (`npm run build`). Haz `commit`/`push` a `main` y efectúa `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` cómo manejaste la actualización del comentario en Firestore y confirma que la insignia se muestra correctamente.

---

# INSTRUCCION #28

**Objetivo:** Formateo de Texto: Soporte Básico de Markdown (Negritas y Cursivas).

En la enseñanza de idiomas, es crítico poder resaltar estructuras gramaticales (ej. "She **goes** to the store"). Actualmente, la plataforma solo soporta texto plano (con enlaces). Vamos a permitir que docentes y alumnos usen formato básico de Markdown.

**Acciones a implementar por Opencode:**
1. **Mejorar `LinkifyText.jsx`:** Expande este componente para que, además de parsear URLs y videos de YouTube, detecte y formatee patrones de Markdown:
   - Negritas: texto entre doble asterisco `**texto**` debe renderizarse como `<strong className="font-bold text-gray-900 dark:text-white">texto</strong>`.
   - Cursivas: texto entre un asterisco `*texto*` debe renderizarse como `<em className="italic">texto</em>`.
2. **Estrategia de Parseo:** Dado que combinar regex para URLs y Markdown puede ser complejo y frágil en React (crear arrays mezclados), te recomiendo usar una librería ligera si se complica. Si optas por Regex puro, asegúrate de procesar primero las negritas, luego cursivas y luego las URLs para no chocar (o al revés, según te parezca más seguro).
3. **Prueba en Chat y Muro:** Al modificar `LinkifyText.jsx`, tanto el chat, como las tareas y los comentarios adquirirán este superpoder instantáneamente. Asegúrate de probarlo en tu entorno local.
4. **Deploy:** Compila (`npm run build`), haz `commit`/`push` a `main` y lanza `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` si lograste resolver el parseo con Regex manual o si preferiste integrar alguna librería pequeña como `react-markdown`. Confirma que el texto en negritas se ve bien.

---

# INSTRUCCION #29

**Objetivo:** Organización del Feed: Mensajes Fijados (Pinned Posts).

En cualquier plataforma educativa, la docente necesita que ciertos comunicados (reglas, anuncios de exámenes, material clave) permanezcan visibles en la parte superior del muro, independientemente de la paginación y de los posts más recientes.

**Acciones a implementar por Opencode:**
1. **Botón Fijar (Solo Docente):** En `TaskCard.jsx`, si el usuario actual es la docente (`role === 'teacher'`), añade un botón/icono `Pin` (chincheta) en las opciones de la tarjeta. Al pulsarlo, debe hacer toggle de una propiedad booleana `isPinned` en el documento de la publicación en Firestore.
2. **Consulta Separada (`App.jsx`):** Para no requerir índices compuestos en Firebase y mantener intacta la paginación actual por fecha, crea un nuevo `onSnapshot` que consulte la misma colección `tasks` pero filtrada (`where('isPinned', '==', true)`). Guarda este resultado en un estado `pinnedTasks`.
3. **Pasar al Muro:** Pasa `pinnedTasks` como prop a `TasksTab.jsx`.
4. **Renderizado Prioritario y Sin Duplicados:** En `TasksTab.jsx`, primero mapea y renderiza los componentes `<TaskCard />` del array `pinnedTasks`. Luego, mapea el array normal `visibleTasks`, pero **filtrando** aquellos cuyo `id` ya esté en `pinnedTasks` para evitar que se muestre el post dos veces.
5. **Diferenciación Visual:** Asegúrate de que las tarjetas fijadas tengan un pequeño distintivo visual, como un icono `Pin` en el header o un sutil borde amarillo/azul (`border-2 border-yellow-400`), para que el estudiante note la prioridad.
6. **Deploy:** Valida rigurosamente la consola local por posibles renderizados repetidos (`npm run build`), haz `commit`/`push` a `main` y sube con `vercel deploy --prod`.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` cómo gestionaste la filtración de duplicados y si los posts fijados se visualizan correctamente en la parte superior.

ESTADO: LISTA PARA IMPLEMENTAR
