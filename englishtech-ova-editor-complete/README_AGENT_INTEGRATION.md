# EnglishTech OVA Studio • Guía de Integración y Traspaso Técnico para Agentes Antigravity

> **Para el agente de Antigravity receptor**: Este documento contiene toda la arquitectura, estructura de datos, ciclo de vida y métodos de inyección para integrar la suite **EnglishTech OVA Studio** en tu proyecto o sitio web de destino.

---

## 1. Visión General del Proyecto

**EnglishTech OVA Studio** es una aplicación web SPA (*Single-Page Application*) de autoría y visualización de **Objetos Virtuales de Aprendizaje (OVAs)** interactivos de nivel profesional.

### Capacidades Principales
1. **Lienzo de Portada Interactivo (*Drag & Drop*)**:
   - Arrastre libre con coordenadas porcentuales (`x%`, `y%`) y captura de puntero (`setPointerCapture`).
   - Inspector superior fijo contextual con tipografías Google Fonts (*Playfair Display, Inter, Montserrat, Outfit, Poppins, Merriweather, Bebas Neue, Great Vibes, Fira Code, Comic Neue*), escalador de tamaño de fuente numérico, colores, sombras predefinidas y adición de textos ilimitados.
2. **Hojas de Actividades tipo Word / Google Docs**:
   - Barra de herramientas flotante/fija (*sticky*) que acompaña el scroll vertical de la hoja en tiempo real.
   - Paginación con **múltiples hojas de trabajo** y navegación horizontal estilo carrusel.
   - Inserción de recursos educativos: Fórmulas matemáticas KaTeX, Videos (YouTube/MP4), actividades embebidas (*Genially*, *Educaplay*), tablas de cálculo dinámicas, ejercicios de completado (*Cloze*), cuestionarios y notas destacadas.
3. **Doble Modo en Tiempo Real**:
   - **`Editor OVA Studio`**: Edición completa de estructura, contenidos, portada y ajustes.
   - **`Vista Estudiante`**: Reproductor interactivo limpio, navegación fluida de diapositivas, evaluación pedagógica automática con tolerancia a comas/puntos decimales (`1,618` y `1.618`), y animación de celebración con confeti.
4. **Motor de Exportación Triple**:
   - **HTML Autónomo**: Archivo `.html` 100% independiente con el proyecto real incrustado en el DOM, que abre en modo estudiante sin requerir conexión ni almacenamiento previo.
   - **SCORM 1.2 (.zip)**: Paquete listo para importar directamente en LMS (**Moodle, Canvas, Blackboard, Chamilo**) con su archivo `imsmanifest.xml` autogenerado vía JSZip.
   - **JSON**: Respaldo e importación directa de la estructura del OVA.
5. **Tema Claro / Oscuro**:
   - Persistencia en `localStorage` y soporte reactivo en todos los componentes.

---

## 2. Estructura de Archivos del Proyecto

El proyecto está organizado en dos formatos:

### A. Archivo Autónomo Distribuible
* **`index.html`** (266 KB):
  - Archivo compilado que contiene **todo** (HTML, estilos Tailwind, dependencias CDN, scripts JS y la plantilla JSON inicial).
  - No requiere `node_modules` ni proceso de build complejo.
  - Puede ejecutarse abriéndolo directamente en cualquier navegador o sirviéndolo con cualquier servidor estático (Nginx, Apache, Python, Vercel, Netlify, etc.).

### B. Código Fuente Modular (`parts/` + `assemble.py`)
Para mantener el código mantenible y modular, los fuentes se dividen en:

| Archivo en `parts/` | Responsabilidad |
|---|---|
| `head_and_styles.html` | Meta tags, enlaces CDN (Tailwind CSS, Lucide Icons, KaTeX, Canvas Confetti, JSZip), fuentes Google Fonts y reglas CSS personalizadas (estilos de hojas de documento, scrollbars, tema oscuro/claro). |
| `navbar.html` | Barra superior: selector de modo (`Editor` / `Estudiante`), nombre del proyecto editable, indicador de autoguardado, menú de exportación (SCORM / HTML / JSON) y botón de cambio de tema. |
| `editor_ui.html` | Dock lateral izquierdo (Páginas, Recursos, Portada, Ajustes), drawer deslizable, barras de herramientas fijas (`#coverStickyToolbarContainer` para portada y `#docStickyToolbarContainer` para hojas de actividades) y contenedor del lienzo. |
| `viewer_ui.html` | Interfaz del estudiante: visor de diapositivas, barra de navegación inferior, índice de contenidos y botón de pantalla completa. |
| `modals.html` | Modales para añadir secciones, agregar bloques de contenido y ajustes del proyecto. |
| `toast_and_dialogs.html` | Sistema de notificaciones flotantes (Toasts) y diálogos de confirmación accesibles. |
| `app_core.js` | Estado global (`currentProject`, `activePageIndex`, `activeSubSlideIndex`, `currentMode`, `currentTheme`), persistencia en `localStorage`, historial (Undo/Redo) y función `initApp()`. |
| `app_editor.js` | Despachador de vistas del editor, árbol de páginas, gestión de sub-diapositivas y control del drawer lateral. |
| `app_canva_cover.js` | Motor de arrastre libre (*drag-and-drop*) con puntero (`setPointerCapture`), selección de elementos, inspector superior de fuentes/tamaños/colores/sombras y adición de textos en portada. |
| `app_blocks_editor.js` | Editor WYSIWYG de hojas de actividades estilo Google Docs, carrusel de hojas horizontales, gestión de bloques (KaTeX, Genially, Educaplay, videos, tablas interactivas, cloze, cuestionarios). |
| `app_viewer_and_interactive.js` | Motor de renderizado en modo estudiante, proyección fidedigna de la portada, validación interactiva de actividades pedagógicas y disparo de confeti. |
| `app_mutations_and_export.js` | Generador de HTML autónomo, empaquetador SCORM 1.2 (.zip) con JSZip, exportador e importador JSON. |
| `src/templates/goldenRatioOva.json` | Plantilla base del OVA ("La proporción divina") que define el esquema de datos estándar. |
| `assemble.py` | Script Python que concatena los archivos de `parts/` y la plantilla JSON en `index.html`. |

---

## 3. Modelo de Datos del Proyecto (`currentProject`)

El estado del OVA se modela como un objeto JSON estándar:

```json
{
  "id": "ova-golden-ratio-2026",
  "title": "La Proporción Divina y el Número Áureo",
  "meta": {
    "subject": "Matemáticas / Geometría Sagrada",
    "author": "EnglishTech Educational Team",
    "version": "2.4.0",
    "language": "es"
  },
  "cover": {
    "gradient": "from-slate-900 via-indigo-950 to-slate-900",
    "elements": [
      {
        "id": "cover-title",
        "type": "title",
        "text": "LA PROPORCIÓN DIVINA",
        "x": 50,
        "y": 32,
        "fontFamily": "Playfair Display",
        "fontSize": 44,
        "color": "#ffffff",
        "bold": true,
        "italic": false,
        "shadow": "shadow-lg"
      }
    ]
  },
  "pages": [
    {
      "id": "page-actividades",
      "type": "document",
      "title": "Actividades",
      "sheets": [
        {
          "id": "sheet-1",
          "title": "Hoja 1",
          "blocks": [
            {
              "id": "b-text-1",
              "type": "richText",
              "html": "<p>Contenido educativo...</p>"
            },
            {
              "id": "b-genially-1",
              "type": "genially",
              "url": "https://view.genial.ly/..."
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 4. Opciones de Inyección en el Sitio Web Destino

El agente receptor puede inyectar esta herramienta en el proyecto real usando cualquiera de estas 3 estrategias:

### Estrategia 1: Inyección como Ruta / SPA Independiente (Recomendada)
Si el sitio web destino es un portal estático, aplicación backend (Next.js, Laravel, Django, Express) o subcarpeta pública:
1. Copiar `index.html` en la carpeta pública del proyecto destino (por ejemplo `public/ova-studio/index.html`).
2. Vincular un enlace en el panel o menú principal: `<a href="/ova-studio/">Abrir OVA Studio</a>`.
3. Listo: La aplicación opera con cero dependencias externas de compilación.

### Estrategia 2: Embebido en un `<iframe>` Responsive
Si el sitio web ya tiene un Dashboard o LMS con navegación propia:
```html
<div class="w-full h-screen">
  <iframe 
    src="/path-to/englishtech-ova-editor/index.html" 
    class="w-full h-full border-0"
    allow="clipboard-read; clipboard-write; fullscreen"
    title="EnglishTech OVA Studio">
  </iframe>
</div>
```
* **Comunicación Bidireccional (`postMessage`)**:
  - Para cargar un proyecto desde la base de datos de tu sitio:
    ```javascript
    iframeWindow.postMessage({ type: 'LOAD_PROJECT', project: dbProjectData }, '*');
    ```
  - Para escuchar eventos de guardado del OVA:
    ```javascript
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'OVA_SAVED') {
        saveToYourBackendApi(e.data.project);
      }
    });
    ```

### Estrategia 3: Inyección Modular en un Proyecto React / Vue / Angular
Si el agente necesita descomponer la herramienta en componentes nativos:
1. **Estilos**: Los estilos usan Tailwind CSS v3 estándar y fuentes Google Fonts.
2. **Lógica de Portada Libre**: Extraer la lógica de coordenadas de `app_canva_cover.js`. El listener `pointerdown` vincula `setPointerCapture` para cálculo de `(clientX - rect.left) / rect.width * 100`.
3. **Editor de Hojas**: La barra Google Docs (`app_blocks_editor.js`) utiliza `document.execCommand` y APIs nativas de selección (`window.getSelection()`).
4. **Motor Interactivo**: El evaluador de `app_viewer_and_interactive.js` puede convertirse directamente en un hook o componente de vista previa.

---

## 5. Comando de Recompilación (Build Script)

Si se realizan cambios en los archivos fuente de `parts/`, basta con ejecutar:

```bash
python assemble.py
```

Esto reconstruye automáticamente `index.html` validando los scripts y la plantilla inicial.
