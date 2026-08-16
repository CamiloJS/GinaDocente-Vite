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

ESTADO: LISTA PARA IMPLEMENTAR
