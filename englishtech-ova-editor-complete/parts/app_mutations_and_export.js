// Page/Block Mutations, Canva Actions and Import/Export Logic
function selectPage(idx) {
  activePageIndex = idx;
  activeSubSlideIndex = 0;
  renderEditor();
  if (typeof closeDrawerMobile === 'function' && window.innerWidth <= 1024) {
    closeDrawerMobile();
  }
}

function selectSubSlide(sIdx) {
  activeSubSlideIndex = sIdx;
  renderEditor();
}

function updateCurrentPageTitle(val) {
  const page = currentProject.pages[activePageIndex];
  if (page) {
    page.title = val;
    saveProjectState();
    renderPageTreeList();
  }
}

function promptNewPage() {
  showCustomPrompt(
    'Nueva Sección',
    'Ingresa el nombre para esta nueva sección del OVA:',
    'Nueva Sección',
    (title) => {
      const newPage = {
        id: 'page-' + Date.now(),
        title: title,
        type: 'content',
        icon: 'FileText',
        subSlides: [
          {
            id: 'slide-' + Date.now(),
            title: '1. Introducción',
            blocks: [
              {
                id: 'blk-' + Date.now(),
                type: 'text',
                content: 'Escribe aquí el contenido de esta sección...'
              }
            ]
          }
        ]
      };

      currentProject.pages.push(newPage);
      activePageIndex = currentProject.pages.length - 1;
      activeSubSlideIndex = 0;
      saveProjectState();
      renderEditor();
      showToast(`Sección "${title}" creada`);
    }
  );
}

function deletePage(idx) {
  if (currentProject.pages.length <= 1) {
    showToast('El OVA debe tener al menos una sección.', 'error');
    return;
  }
  const title = currentProject.pages[idx].title;
  showCustomConfirm(
    `¿Eliminar "${title}"?`,
    'Se eliminarán todos los bloques y diapositivas de esta sección.',
    () => {
      currentProject.pages.splice(idx, 1);
      if (activePageIndex >= currentProject.pages.length) {
        activePageIndex = currentProject.pages.length - 1;
      }
      activeSubSlideIndex = 0;
      saveProjectState();
      renderEditor();
      showToast('Sección eliminada');
    }
  );
}

function movePage(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= currentProject.pages.length) return;
  const temp = currentProject.pages[idx];
  currentProject.pages[idx] = currentProject.pages[target];
  currentProject.pages[target] = temp;
  activePageIndex = target;
  saveProjectState();
  renderEditor();
}

function addNewSubSlide() {
  const page = currentProject.pages[activePageIndex];
  if (!page.subSlides) page.subSlides = [];
  const slideNum = page.subSlides.length + 1;
  const newSlide = {
    id: 'slide-' + Date.now(),
    title: `${slideNum}. Sub-página`,
    blocks: [
      {
        id: 'blk-' + Date.now(),
        type: 'text',
        content: 'Escribe aquí el contenido de esta sub-página...'
      }
    ]
  };
  page.subSlides.push(newSlide);
  activeSubSlideIndex = page.subSlides.length - 1;
  saveProjectState();
  renderEditor();
  showToast('Sub-página añadida');
}

function deleteSubSlide(sIdx) {
  const page = currentProject.pages[activePageIndex];
  if (!page.subSlides || page.subSlides.length <= 1) {
    showToast('La sección debe tener al menos una sub-página.', 'error');
    return;
  }
  showCustomConfirm(
    '¿Eliminar sub-página?',
    'Se eliminarán todos los bloques de esta sub-página.',
    () => {
      page.subSlides.splice(sIdx, 1);
      if (activeSubSlideIndex >= page.subSlides.length) {
        activeSubSlideIndex = page.subSlides.length - 1;
      }
      saveProjectState();
      renderEditor();
      showToast('Sub-página eliminada');
    }
  );
}

function addNewBlock(type) {
  const page = currentProject.pages[activePageIndex];
  if (!page.subSlides || page.subSlides.length === 0) {
    page.subSlides = [{ id: 'slide-' + Date.now(), title: 'Página 1', blocks: [] }];
    activeSubSlideIndex = 0;
  }
  const slide = page.subSlides[activeSubSlideIndex];
  if (!slide.blocks) slide.blocks = [];

  let newBlock = {
    id: 'blk-' + Date.now(),
    type: type,
    title: '',
    content: ''
  };

  if (type === 'text') {
    newBlock.content = 'Escribe aquí la explicación formativa...';
  } else if (type === 'math') {
    newBlock.content = 'Observa la siguiente formulación matemática:';
    newBlock.metadata = { latex: '\\Phi = \\frac{1+\\sqrt{5}}{2}' };
  } else if (type === 'video') {
    newBlock.title = 'Video Explicativo';
    newBlock.metadata = { videoUrl: 'https://www.youtube.com/embed/dfQ0sjk_r08' };
  } else if (type === 'callout') {
    newBlock.title = 'Nota Importante';
    newBlock.content = 'Este concepto es fundamental para la comprensión de las propiedades numéricas.';
    newBlock.metadata = { calloutType: 'info' };
  } else if (type === 'interactive_table') {
    newBlock.title = 'Actividad Práctica de Cálculo';
    newBlock.content = 'Calcula los valores faltantes:';
    newBlock.metadata = {
      tableHeaders: ['Etapa / Mes', 'Valor'],
      tableRows: [
        { cells: [{ value: 'Paso 1' }, { value: '1', isInput: false }] },
        { cells: [{ value: 'Paso 2' }, { value: '', isInput: true, expectedAnswer: '2' }] },
        { cells: [{ value: 'Paso 3' }, { value: '', isInput: true, expectedAnswer: '3' }] }
      ]
    };
  } else if (type === 'quiz_multiple') {
    newBlock.title = 'Evaluación Formativa';
    newBlock.metadata = {
      questions: [
        {
          id: 'q-' + Date.now(),
          title: 'Pregunta 1',
          question: '¿Cuál de las siguientes afirmaciones es correcta?',
          options: [
            { id: 'o1', text: 'Opción A (Respuesta correcta)', isCorrect: true },
            { id: 'o2', text: 'Opción B', isCorrect: false }
          ],
          feedbackGood: '¡Excelente! Respuesta acertada.',
          feedbackBad: 'Incorrecto. Revisa los conceptos explicados en la sección.'
        }
      ]
    };
  } else if (type === 'cloze_fill') {
    newBlock.title = 'Actividad de Completar';
    newBlock.content = 'Completa el siguiente texto:';
    newBlock.metadata = {
      clozeText: 'El número áureo es un número {irracional} con valor aproximado de {1.618}.',
      wordBank: ['irracional', '1.618']
    };
  } else if (type === 'accordion') {
    newBlock.title = 'Pasos de Deducción';
    newBlock.metadata = {
      accordionItems: [
        { title: 'Paso 1: Planteamiento', content: 'Definición inicial de las variables.' },
        { title: 'Paso 2: Resolución', content: 'Desarrollo algebraico paso a paso.' }
      ]
    };
  } else if (type === 'objectives_list') {
    newBlock.title = 'Objetivos de la Sección';
    newBlock.metadata = {
      mainGoal: 'Comprender los conceptos fundamentales abordados.',
      skills: ['Identificar patrones.', 'Aplicar fórmulas en problemas reales.']
    };
  } else if (type === 'genially') {
    newBlock.title = 'Actividad en Genially';
    newBlock.content = 'Explora la presentación interactiva:';
    newBlock.metadata = {
      url: 'https://view.genial.ly/65e9b897e68fa70014b2eb6e'
    };
  } else if (type === 'educaplay') {
    newBlock.title = 'Juego Didáctico en Educaplay';
    newBlock.content = 'Supera el desafío interactivo:';
    newBlock.metadata = {
      url: 'https://es.educaplay.com/juego/1052601-los_numeros_reales.html'
    };
  } else if (type === 'divider') {
    newBlock.title = 'Separador';
    newBlock.metadata = {};
  } else if (type === 'credits_team') {
    newBlock.title = 'Créditos del Recurso';
    newBlock.metadata = {
      creditColumns: [
        { category: 'Autores', members: [{ name: 'Docente Autor', role: 'Diseñador de Contenido' }] }
      ]
    };
  }

  slide.blocks.push(newBlock);
  const newIndex = slide.blocks.length - 1;
  saveProjectState();
  renderEditor();
  showToast(`Elemento "${getBlockTitle(type)}" añadido`);
  if (typeof closeDrawerMobile === 'function' && window.innerWidth <= 1024) {
    closeDrawerMobile();
  }

  // Smooth scroll to the newly created block with an eye-catching highlight
  setTimeout(() => {
    const card = document.getElementById('blockCard_' + newIndex);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('ring-2', 'ring-brand-500', 'shadow-2xl', 'shadow-brand-500/30');
      setTimeout(() => {
        card.classList.remove('ring-2', 'ring-brand-500', 'shadow-2xl', 'shadow-brand-500/30');
      }, 1600);
    }
  }, 80);
}

function promptDeleteBlock(bIdx) {
  showCustomConfirm(
    '¿Eliminar este bloque?',
    'Se eliminará este contenido de la diapositiva actual.',
    () => {
      const page = currentProject.pages[activePageIndex];
      const slide = page.subSlides[activeSubSlideIndex];
      slide.blocks.splice(bIdx, 1);
      saveProjectState();
      renderEditor();
      showToast('Bloque eliminado');
    }
  );
}

function moveBlock(bIdx, dir) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  const target = bIdx + dir;
  if (target < 0 || target >= slide.blocks.length) return;
  const temp = slide.blocks[bIdx];
  slide.blocks[bIdx] = slide.blocks[target];
  slide.blocks[target] = temp;
  saveProjectState();
  renderEditor();
}


// Import & Export
function exportProjectJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentProject, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  const slug = (currentProject.title || 'ova').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
  downloadAnchor.setAttribute("download", `${slug}-ova-project.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Proyecto JSON exportado');
}

function importProjectJson(e) {
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.pages || !Array.isArray(parsed.pages)) {
          throw new Error('Estructura de OVA no válida');
        }
        currentProject = parsed;
        activePageIndex = 0;
        activeSubSlideIndex = 0;
        saveProjectState();
        renderApp();
        showToast('Proyecto cargado exitosamente');
      } catch (err) {
        showToast('Archivo JSON no válido para OVA', 'error');
      }
    };
    reader.readAsText(file);
  };

  if (e && e.target && e.target.files && e.target.files.length > 0) {
    handleFile(e.target.files[0]);
    e.target.value = '';
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (evt) => {
    handleFile(evt.target.files[0]);
  };
  input.click();
}

function resetToDefaultTemplate() {
  showCustomConfirm(
    '¿Restablecer plantilla inicial?',
    'Se perderán los cambios actuales y se cargará el OVA completo del Número de Oro de la Universidad del Valle.',
    () => {
      localStorage.removeItem('englishTech_ova_project');
      currentProject = JSON.parse(JSON.stringify(window.DEFAULT_GOLDEN_RATIO_OVA));
      activePageIndex = 0;
      activeSubSlideIndex = 0;
      saveProjectState();
      renderApp();
      showToast('Plantilla del Número de Oro restaurada');
    }
  );
}

function generateStandaloneHtmlContent() {
  const cloneDoc = document.documentElement.cloneNode(true);

  // 1. Inject currentProject directly into the initial template so it loads everywhere with zero dependencies
  const script = cloneDoc.querySelector('#appInitScript');
  if (script) {
    script.innerHTML = script.innerHTML.replace(
      /window\.DEFAULT_GOLDEN_RATIO_OVA\s*=\s*[\s\S]*?;\s*\n/,
      `window.DEFAULT_GOLDEN_RATIO_OVA = ${JSON.stringify(currentProject)};\n`
    );
  }

  let htmlString = "<!DOCTYPE html>\n" + cloneDoc.outerHTML;

  // 2. Set default mode in the standalone HTML to 'viewer' and lock edit with PIN
  htmlString = htmlString.replace(/let\s+appMode\s*=\s*['"]editor['"]/, "let appMode = 'viewer'");
  htmlString = htmlString.replace(/let\s+isEditUnlocked\s*=\s*true;/, "let isEditUnlocked = false;");

  // 3. Prevent localStorage collision on viewer computers
  htmlString = htmlString.replace(
    "const saved = localStorage.getItem('englishTech_ova_project');",
    "const saved = null; /* Standalone OVA package */"
  );

  return htmlString;
}

function downloadStandaloneHtml() {
  showToast('Preparando paquete interactivo descargable...', 'info');
  setTimeout(async () => {
    try {
      let htmlString = generateStandaloneHtmlContent();

      // Inline tailwind.min.css into standalone HTML for 100% offline & portable self-containment
      try {
        let cssText = '';
        const r1 = await fetch('./tailwind.min.css').catch(() => null);
        if (r1 && r1.ok) {
          cssText = await r1.text();
        } else {
          const r2 = await fetch('/ova-studio/tailwind.min.css').catch(() => null);
          if (r2 && r2.ok) cssText = await r2.text();
        }
        if (cssText) {
          htmlString = htmlString.replace('</head>', `  <style id="standalone-inlined-tailwind">\n${cssText}\n  </style>\n</head>`);
        }
      } catch (cssErr) {}

      const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const slug = (currentProject.title || 'ova').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
      a.download = `${slug}-ova-interactivo.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('¡Paquete OVA descargado con éxito!');
    } catch (err) {
      console.error('Error al generar HTML autónomo:', err);
      showToast('Error al generar archivo HTML', 'error');
    }
  }, 400);
}

function exportScormZip() {
  if (typeof JSZip === 'undefined') {
    showToast('Generador ZIP no disponible', 'error');
    return;
  }
  showToast('Empaquetando contenido en formato SCORM 1.2...', 'info');

  setTimeout(async () => {
    try {
      const zip = new JSZip();
      const htmlContent = generateStandaloneHtmlContent();
      zip.file("index.html", htmlContent);

      // Bundle tailwind.min.css into SCORM package for 100% offline & LMS resilience
      try {
        let cssText = '';
        const r1 = await fetch('./tailwind.min.css').catch(() => null);
        if (r1 && r1.ok) {
          cssText = await r1.text();
        } else {
          const r2 = await fetch('/ova-studio/tailwind.min.css').catch(() => null);
          if (r2 && r2.ok) cssText = await r2.text();
        }
        if (cssText) {
          zip.file("tailwind.min.css", cssText);
        }
      } catch (cssErr) {}

      const titleEsc = (currentProject.title || 'Objeto Virtual de Aprendizaje').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const ident = 'ENG_OVA_' + Date.now();

      const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${ident}" version="1.2"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG_1">
    <organization identifier="ORG_1">
      <title>${titleEsc}</title>
      <item identifier="ITEM_1" identifierref="RES_1">
        <title>${titleEsc}</title>
        <adlcp:masteryscore>80</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;

      zip.file("imsmanifest.xml", manifestXml);

      zip.generateAsync({ type: "blob" }).then((content) => {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        const slug = (currentProject.title || 'ova').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
        a.download = `${slug}-scorm12.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast('¡Paquete SCORM 1.2 (.zip) descargado con éxito!');
      });
    } catch (err) {
      console.error('Error generando SCORM:', err);
      showToast('Error al empaquetar SCORM', 'error');
    }
  }, 400);
}

// Integration Modal Functions
function openIntegrateModal() {
  const modal = document.getElementById('modalIntegrate');
  if (modal) {
    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }
}

function closeIntegrateModal() {
  const modal = document.getElementById('modalIntegrate');
  if (modal) modal.classList.add('hidden');
}

function copySnippetCode() {
  const snippet = `import { OvaViewer } from '@/components/OvaViewer';\nimport goldenRatioData from '@/templates/goldenRatioOva.json';\n\nexport default function ModuloOva() {\n  return (\n    <div className="min-h-screen bg-slate-950">\n      <OvaViewer data={goldenRatioData} />\n    </div>\n  );\n}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(snippet).then(() => {
      showToast('¡Snippet React copiado al portapapeles!');
      const btnText = document.getElementById('btnCopySnippetText');
      if (btnText) {
        btnText.innerText = '¡Copiado!';
        setTimeout(() => { btnText.innerText = 'Copiar Snippet React'; }, 2000);
      }
    }).catch(() => {
      showToast('Snippet preparado en modal', 'info');
    });
  } else {
    showToast('Selecciona el texto del recuadro para copiarlo', 'info');
  }
}

function loadTemplateOva() {
  resetToDefaultTemplate();
}

