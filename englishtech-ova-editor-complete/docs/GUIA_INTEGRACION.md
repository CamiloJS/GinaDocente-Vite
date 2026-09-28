# Guía de Integración y Uso: EnglishTech OVA Studio & Mini Canva

Esta solución te permite crear, editar y visualizar **Objetos Virtuales de Aprendizaje (OVAs)** interactivos con una experiencia visual moderna tipo **mini Canva**, clonando y modernizando completamente la estructura y funcionalidades del OVA de la Universidad del Valle / CIER Sur (*"El número de oro: entre lo divino y lo humano"*), respetando al 100% la estética de **[EnglishTech](https://englishtech.vercel.app/)**.

---

## 1. Estructura de Archivos Creados

Ubicación del proyecto:
`C:\Users\Equipo\.gemini\antigravity\scratch\englishtech-ova-editor\`

```
englishtech-ova-editor/
├── index.html                   # Aplicación completa Editor + Visualizador (¡Listo para abrir con doble clic!)
├── assemble.py                  # Script de ensamblaje modular
├── parts/                       # Módulos desacoplados de UI y lógica JavaScript
├── src/
│   ├── types.ts                 # Definiciones de TypeScript para el modelo de datos OVA
│   ├── templates/
│   │   └── goldenRatioOva.json  # OVA pre-cargado con las 9 páginas del CIER Sur clonadas y modernizadas
│   └── components/
│       ├── OvaViewer.tsx        # Componente React para visualizar el OVA en EnglishTech
│       └── OvaEditor.tsx        # Componente React para el editor
└── docs/
    └── GUIA_INTEGRACION.md      # Este manual de integración
```

---

## 2. Cómo Probar el Editor Inmediatamente

Puedes probar la aplicación de dos maneras muy sencillas:

### Opción A: Abrir directamente el archivo HTML
1. Abre el explorador de Windows y navega a `C:\Users\Equipo\.gemini\antigravity\scratch\englishtech-ova-editor\`.
2. Haz **doble clic en `index.html`**.
3. Se abrirá inmediatamente en tu navegador (Google Chrome, Edge, Firefox, etc.) sin necesidad de instalar dependencias ni levantar servidores.

### Opción B: Ejecutar un servidor local rápido con Python
Abre una terminal y ejecuta:
```bash
cd C:\Users\Equipo\.gemini\antigravity\scratch\englishtech-ova-editor
python -m http.server 3000
```
Luego entra a `http://localhost:3000` en tu navegador.

---

## 3. Características y Mejoras Implementadas

### A. Diseñador de Portadas Tipo "Mini Canva"
- **Lienzo en Vivo**: Vista previa fotorrealista de la portada con aspecto 16:9 de alta definición.
- **Fondos Preestablecidos y Personalizados**: Selección con un solo clic de fondos temáticos (Geometría, Matemáticas, Arte Da Vinci, Naturaleza Fibonacci) o enlace de imagen propia.
- **Control de Oscurecimiento**: Deslizador de opacidad de 0% a 100% para asegurar contraste perfecto del texto.
- **Insignias y Tipografía**: Edición en tiempo real del título, subtítulo, insignia institucional ("Universidad de Pamplona"), autor y botón interactivo.
- **Descarga de Banner en PNG**: Genera automáticamente la portada en resolución 1280x720 para posters o redes sociales usando Canvas HTML5 nativo.

### B. Árbol Jerárquico de Secciones y Sub-Páginas
- Clonación exacta de las 9 secciones del CIER Sur:
  1. **Inicio**: Portada interactiva Canva.
  2. **Objetivos de aprendizaje**: Caja destacada con meta principal y lista de competencias.
  3. **La proporción divina**: Sub-páginas con historia (Fibonacci, Pacioli, Kepler), poesía y video de YouTube.
  4. **La sucesión de Fibonacci**: Video, experimento mental de conejos, **tabla interactiva de cálculo**, ley de recurrencia y cocientes.
  5. **El número de oro**: Acordeón interactivo de deducción de Euclides, preguntas analíticas de ecuación cuadrática y actividad de completar texto.
  6. **Prueba**: Evaluación formativa con preguntas de verdadero/falso sobre conjuntos numéricos y problemas geométricos.
  7. **Conclusión**: Síntesis conceptual, homogeneización de ideas y videos de profundización.
  8. **Créditos**: Roster a 3 columnas (Directivas, Autores y Equipo Tecnológico).
  9. **Derechos de autor**: Licencia Creative Commons 4.0 Internacional con matriz de permisos (*Ver, Editar, Imprimir, Copiar, Descargar*).
- Permite **crear nuevas secciones**, renombrarlas, moverlas arriba/abajo, eliminarlas y añadir sub-páginas internas ilimitadas.

### C. Motores Interactivos de Aprendizaje
- **Tabla Interactiva de Cálculo (Fibonacci)**: Los estudiantes escriben números en las casillas vacías (ej. 1, 3, 13, 34) y al pulsar «Comprobar Respuestas» reciben feedback visual instantáneo (verde/rojo) y conteo de aciertos.
- **Cuestionarios de Opción Múltiple**: Validación inmediata con tarjetas de retroalimentación explicativa detallada.
- **Completar Texto con Banco de Palabras**: Actividad cloze con detección automática de palabras clave entre llaves `{palabra}`.
- **Fórmulas Matemáticas KaTeX**: Renderizado nítido de fórmulas matemáticas complejas ($\Phi = \frac{1+\sqrt{5}}{2}$) con barra de herramientas para insertar símbolos rápidos.
- **Acordeones Desplegables**: Para deducciones paso a paso.

---

## 4. Cómo Integrar en tu Proyecto de EnglishTech (`englishtech.vercel.app`)

EnglishTech está construida con **Vite + React + Tailwind CSS**. Tienes dos métodos de integración recomendados:

### Método 1: Integración con Componente React Nativo (Recomendado)

1. **Copiar archivos al proyecto EnglishTech**:
   Copia los siguientes archivos a tu carpeta `src/`:
   - `src/types.ts` -> a tu proyecto `src/types/ova.ts`
   - `src/components/OvaViewer.tsx` -> a tu proyecto `src/components/OvaViewer.tsx`
   - `src/templates/goldenRatioOva.json` -> a tu proyecto `src/data/goldenRatioOva.json`

2. **Crear la vista o ruta en tu app**:
   En tu router o página donde quieras mostrar el OVA (por ejemplo `src/pages/ModuloOva.tsx`):
   ```tsx
   import React from 'react';
   import { OvaViewer } from '@/components/OvaViewer';
   import goldenRatioData from '@/data/goldenRatioOva.json';

   export const ModuloOvaPage: React.FC = () => {
     return (
       <div className="min-h-screen bg-[#0f172a] text-slate-100">
         <OvaViewer 
           data={goldenRatioData} 
           onComplete={() => alert('¡Felicidades por completar el OVA!')}
         />
       </div>
     );
   };
   ```

### Método 2: Integración como Módulo HTML Autónomo (Cero Configuración)

1. En el editor, haz clic en el botón **«Descargar OVA»**.
2. Guarda el archivo descargado como `index.html` dentro de la carpeta `public/ova/` de tu repositorio de EnglishTech:
   ```
   englishtech/
   └── public/
       └── ova/
           └── index.html  <-- Aquí colocas el archivo
   ```
3. Ahora puedes incrustarlo en cualquier página de tu plataforma usando un `<iframe>` o navegando a `/ova/index.html`:
   ```tsx
   <iframe 
     src="/ova/index.html" 
     className="w-full h-screen border-0 rounded-2xl" 
     title="Objeto Virtual de Aprendizaje"
   />
   ```

---

## 5. Exportación e Importación de Proyectos

- **Exportar JSON**: Puedes guardar cualquier OVA que edites haciendo clic en `Proyecto > Exportar JSON`. Se descargará un archivo `.json` con todos los textos, imágenes, videos y preguntas.
- **Importar JSON**: Puedes retomar la edición de cualquier OVA en el futuro haciendo clic en `Proyecto > Importar JSON`.
- **Plantilla CIER Sur**: Siempre puedes volver a cargar la versión original de "El número de oro" haciendo clic en el botón `Plantilla CIER`.

---

## 6. Respeto al Sistema de Diseño de EnglishTech

- **Color de Acento Institucional**: `#AD3333` (Rojo Carmesí Universidad de Pamplona).
- **Modo Oscuro**: Fondo `slate-950` / `slate-900` (`#0f172a`, `#1e293b`), bordes sutiles `slate-800` (`#334155`).
- **Modo Claro**: Soporte completo con persistencia en `localStorage.getItem('englishTech_theme')`.
- **Bordes y Sombras**: Tarjetas redondeadas `rounded-2xl` y `rounded-3xl` con sombras suaves y desenfoque `backdrop-blur`.
