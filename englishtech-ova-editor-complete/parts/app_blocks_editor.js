// Canva-Style Block Editor Rendering & Intuitive Interactions
function parseYouTubeEmbed(url) {
  if (!url) return '';
  url = url.trim();
  if (url.includes('/embed/')) return url;
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return 'https://www.youtube.com/embed/' + shortMatch[1];
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return 'https://www.youtube.com/embed/' + watchMatch[1];
  const shortsMatch = url.match(/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) return 'https://www.youtube.com/embed/' + shortsMatch[1];
  return url;
}

function parseGeniallyEmbed(url) {
  if (!url) return '';
  url = url.trim();
  const iframeMatch = url.match(/src=["']([^"']+)["']/);
  if (iframeMatch) url = iframeMatch[1];
  const match = url.match(/view\.genial\.ly\/([a-zA-Z0-9_-]+)(\/[a-zA-Z0-9_-]+)?/);
  if (match) {
    return 'https://' + match[0];
  }
  if (url.includes('genial.ly')) {
    return url.startsWith('http') ? url : 'https://' + url;
  }
  return url;
}

function parseEducaplayEmbed(url) {
  if (!url) return '';
  url = url.trim();
  const iframeMatch = url.match(/src=["']([^"']+)["']/);
  if (iframeMatch) url = iframeMatch[1];
  const idMatch = url.match(/(?:game|recursos-educativos|juego)\/(\d+)/);
  if (idMatch) {
    return 'https://es.educaplay.com/juego/' + idMatch[1] + '-recurso.html';
  }
  if (url.includes('educaplay.com')) {
    return url.startsWith('http') ? url : 'https://' + url;
  }
  return url;
}

function renderSubSlideBlocksEditor(isCover = false) {
  const page = currentProject.pages[activePageIndex];
  if (!page) return '';
  if (!page.subSlides || page.subSlides.length === 0) {
    page.subSlides = [{ id: 'slide-' + Date.now(), title: 'Página 1', blocks: [] }];
    activeSubSlideIndex = 0;
  }
  if (activeSubSlideIndex >= page.subSlides.length) {
    activeSubSlideIndex = page.subSlides.length - 1;
  }
  const slide = page.subSlides[activeSubSlideIndex];
  if (!slide.blocks) slide.blocks = [];

  let blocksHtml = '';
  if (slide.blocks.length === 0) {
    blocksHtml = `
      <div class="text-center py-12 border-2 border-dashed border-slate-800 rounded-3xl p-8 space-y-3 bg-slate-900/30">
        <div class="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto border border-brand-500/20">
          <i data-lucide="plus" class="w-6 h-6"></i>
        </div>
        <div>
          <h4 class="text-sm font-bold text-white">${isCover ? 'Sin bloques adicionales en la Portada' : 'Esta diapositiva está vacía'}</h4>
          <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Haz clic en cualquier elemento interactivo del panel izquierdo (Añadir) para agregarlo aquí.</p>
        </div>
        <button onclick="switchDockTab('elements')" class="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition shadow-md shadow-brand-500/20 flex items-center gap-2 mx-auto">
          <i data-lucide="plus-circle" class="w-4 h-4"></i>
          <span>Añadir Elemento</span>
        </button>
      </div>
    `;
  } else {
    blocksHtml = slide.blocks.map((block, bIdx) => renderBlockCard(block, bIdx)).join('');
  }

  return `
    <div class="max-w-4xl mx-auto space-y-6 select-text">
      ${!isCover ? `
      <!-- Sub-Slide Title Header -->
      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-4">
        <div class="flex items-center gap-2.5 flex-1 min-w-0">
          <span class="text-xs font-bold text-brand-400 shrink-0">Paso ${activeSubSlideIndex + 1}:</span>
          <input 
            type="text" 
            value="${slide.title || ''}" 
            oninput="updateSubSlideTitle(this.value)" 
            class="text-xs sm:text-sm font-bold bg-transparent border-b border-transparent hover:border-slate-700 focus:border-brand-500 text-white focus:outline-none w-full px-1 transition" 
            placeholder="Título de esta diapositiva o paso..." 
          />
        </div>
        <button onclick="switchDockTab('elements')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition shrink-0">
          <i data-lucide="plus" class="w-3.5 h-3.5 text-brand-400"></i>
          <span>Añadir Bloque</span>
        </button>
      </div>
      ` : ''}

      <!-- Blocks Stream -->
      <div class="space-y-5" id="blocksStreamContainer">
        ${blocksHtml}
      </div>
    </div>
  `;
}

function renderBlockCard(block, bIdx) {
  const icon = getBlockIcon(block.type);
  const title = getBlockTitle(block.type);

  return `
    <div id="blockCard_${bIdx}" data-block-id="${block.id}" class="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-xl space-y-4 group relative transition duration-200">
      <!-- Floating Action Bar on Hover (Canva style) -->
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div class="flex items-center gap-2.5">
          <span class="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold">
            ${bIdx + 1}
          </span>
          <div class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
            <i data-lucide="${icon}" class="w-4 h-4 text-brand-400"></i>
            <span>${title}</span>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <button onclick="moveBlock(${bIdx}, -1)" title="Mover arriba" ${bIdx === 0 ? 'disabled' : ''} class="p-1.5 rounded-lg transition ${bIdx === 0 ? 'opacity-20 cursor-not-allowed text-slate-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}">
            <i data-lucide="chevron-up" class="w-4 h-4"></i>
          </button>
          <button onclick="moveBlock(${bIdx}, 1)" title="Mover abajo" ${bIdx === currentProject.pages[activePageIndex].subSlides[activeSubSlideIndex].blocks.length - 1 ? 'disabled' : ''} class="p-1.5 rounded-lg transition ${bIdx === currentProject.pages[activePageIndex].subSlides[activeSubSlideIndex].blocks.length - 1 ? 'opacity-20 cursor-not-allowed text-slate-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}">
            <i data-lucide="chevron-down" class="w-4 h-4"></i>
          </button>
          <button onclick="promptDeleteBlock(${bIdx})" title="Eliminar bloque" class="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg ml-1 transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <!-- Specific Editor Body based on block.type -->
      <div>
        ${renderBlockSpecificEditor(block, bIdx)}
      </div>
    </div>
  `;
}

function getBlockIcon(type) {
  const map = {
    text: 'type',
    math: 'function-square',
    video: 'video',
    genially: 'sparkles',
    educaplay: 'gamepad-2',
    divider: 'minus',
    callout: 'info',
    interactive_table: 'table',
    quiz_multiple: 'check-square',
    cloze_fill: 'edit-3',
    accordion: 'list-collapse',
    objectives_list: 'target',
    credits_team: 'users',
    license_matrix: 'shield-check'
  };
  return map[type] || 'file-text';
}

function getBlockTitle(type) {
  const map = {
    text: 'Texto o Párrafo',
    math: 'Fórmula Matemática (KaTeX)',
    video: 'Video de YouTube',
    genially: 'Actividad en Genially',
    educaplay: 'Juego en Educaplay',
    divider: 'Línea Divisoria',
    callout: 'Caja Destacada / Énfasis',
    interactive_table: 'Tabla Interactiva de Cálculo',
    quiz_multiple: 'Cuestionario de Opción Múltiple',
    cloze_fill: 'Completar Espacios con Palabras',
    accordion: 'Deducción en Pasos / Acordeón',
    objectives_list: 'Objetivos de Aprendizaje',
    credits_team: 'Créditos del Proyecto',
    license_matrix: 'Licenciamiento y Derechos'
  };
  return map[type] || 'Bloque de Contenido';
}

function renderBlockSpecificEditor(block, bIdx) {
  if (block.type === 'text') {
    return `
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-slate-400">Párrafo o Explicación Pedagógica:</label>
          <span class="text-[10px] text-slate-500">Soporta saltos de línea y formato limpio</span>
        </div>
        <textarea 
          rows="4" 
          oninput="updateBlockContent(${bIdx}, this.value)" 
          class="w-full text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-200 focus:border-brand-500 focus:outline-none custom-scrollbar font-normal leading-relaxed transition" 
          placeholder="Escribe el texto explicativo aquí..."
        >${block.content || ''}</textarea>
      </div>
    `;
  }

  if (block.type === 'math') {
    const latex = block.metadata?.latex || '\\Phi = \\frac{1 + \\sqrt{5}}{2}';
    return `
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Descripción / Enunciado (opcional):</label>
          <input 
            type="text" 
            value="${(block.content || '').replace(/"/g, '&quot;')}" 
            oninput="updateBlockContent(${bIdx}, this.value)" 
            class="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-brand-500 focus:outline-none" 
            placeholder="Ej: Observa la relación áurea:" 
          />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <label class="text-xs font-semibold text-slate-300">Expresión LaTeX:</label>
          <div class="flex flex-wrap items-center gap-1.5">
            <button onclick="insertMathSnippet(${bIdx}, '\\\\Phi')" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 font-mono border border-slate-700 transition" title="Insertar Phi">Φ</button>
            <button onclick="insertMathSnippet(${bIdx}, '\\\\frac{a}{b}')" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 font-mono border border-slate-700 transition" title="Insertar Fracción">a/b</button>
            <button onclick="insertMathSnippet(${bIdx}, '\\\\sqrt{x}')" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 font-mono border border-slate-700 transition" title="Insertar Raíz">√x</button>
            <button onclick="insertMathSnippet(${bIdx}, 'x^2')" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 font-mono border border-slate-700 transition" title="Insertar Exponente">x²</button>
            <button onclick="insertMathSnippet(${bIdx}, '\\\\lim_{n \\\\to \\\\infty}')" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 font-mono border border-slate-700 transition" title="Insertar Límite">lim</button>
            <button onclick="insertMathSnippet(${bIdx}, '\\\\approx 1.618')" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 font-mono border border-slate-700 transition">≈ 1.618</button>
          </div>
        </div>
        <input 
          id="mathInput_${bIdx}" 
          type="text" 
          value="${latex.replace(/"/g, '&quot;')}" 
          oninput="updateBlockMeta(${bIdx}, 'latex', this.value); updateKaTeXPreview(${bIdx}, this.value)" 
          class="w-full text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl p-3 text-amber-300 font-mono focus:border-brand-500 focus:outline-none" 
        />
        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-center">
          <div class="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">Renderizado en Tiempo Real</div>
          <div id="katexPreview_${bIdx}" class="text-xl text-white font-medium min-h-[36px] flex items-center justify-center">
            $$${latex}$$
          </div>
        </div>
      </div>
    `;
  }

  if (block.type === 'video') {
    const rawUrl = block.metadata?.videoUrl || 'https://www.youtube.com/embed/GTxtz6RIrj8';
    const embedUrl = parseYouTubeEmbed(rawUrl);
    return `
      <div class="space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Título del Video:</label>
            <input 
              type="text" 
              value="${(block.title || '').replace(/"/g, '&quot;')}" 
              oninput="updateBlockTitle(${bIdx}, this.value)" 
              class="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-brand-500 focus:outline-none" 
              placeholder="Ej: El número de oro en la naturaleza" 
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">URL de YouTube (Watch, Shorts o Embed):</label>
            <input 
              type="text" 
              value="${rawUrl.replace(/"/g, '&quot;')}" 
              onchange="updateVideoUrl(${bIdx}, this.value)" 
              class="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-brand-500 focus:outline-none" 
              placeholder="https://www.youtube.com/watch?v=..." 
            />
          </div>
        </div>
        <div class="aspect-video max-w-xl mx-auto rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-lg">
          <iframe src="${embedUrl}" class="w-full h-full" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
        </div>
      </div>
    `;
  }

  if (block.type === 'genially') {
    const rawUrl = block.metadata?.url || 'https://view.genial.ly/65e9b897e68fa70014b2eb6e';
    const embedUrl = parseGeniallyEmbed(rawUrl);
    return `
      <div class="space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Título de la Actividad Genially:</label>
            <input 
              type="text" 
              value="${(block.title || '').replace(/"/g, '&quot;')}" 
              oninput="updateBlockTitle(${bIdx}, this.value)" 
              class="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-brand-500 focus:outline-none" 
              placeholder="Ej: Exploración interactiva de proporciones" 
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Enlace o iframe de Genially:</label>
            <input 
              type="text" 
              value="${rawUrl.replace(/"/g, '&quot;')}" 
              onchange="updateGeniallyUrl(${bIdx}, this.value)" 
              class="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-brand-500 focus:outline-none font-mono text-[11px]" 
              placeholder="https://view.genial.ly/..." 
            />
          </div>
        </div>
        <div class="aspect-video max-w-2xl mx-auto rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-lg relative">
          <iframe src="${embedUrl}" class="w-full h-full border-0" allowfullscreen="true" allow="fullscreen"></iframe>
        </div>
      </div>
    `;
  }

  if (block.type === 'educaplay') {
    const rawUrl = block.metadata?.url || 'https://es.educaplay.com/juego/1052601-los_numeros_reales.html';
    const embedUrl = parseEducaplayEmbed(rawUrl);
    return `
      <div class="space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Título del Juego Educaplay:</label>
            <input 
              type="text" 
              value="${(block.title || '').replace(/"/g, '&quot;')}" 
              oninput="updateBlockTitle(${bIdx}, this.value)" 
              class="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-brand-500 focus:outline-none" 
              placeholder="Ej: Crucigrama de conceptos matemáticos" 
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Enlace o iframe de Educaplay:</label>
            <input 
              type="text" 
              value="${rawUrl.replace(/"/g, '&quot;')}" 
              onchange="updateEducaplayUrl(${bIdx}, this.value)" 
              class="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-brand-500 focus:outline-none font-mono text-[11px]" 
              placeholder="https://es.educaplay.com/recursos-educativos/..." 
            />
          </div>
        </div>
        <div class="h-[500px] max-w-2xl mx-auto rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-lg relative">
          <iframe src="${embedUrl}" class="w-full h-full border-0" allowfullscreen="true" allow="fullscreen"></iframe>
        </div>
      </div>
    `;
  }

  if (block.type === 'divider') {
    return `
      <div class="py-2">
        <hr class="border-t-2 border-dashed border-slate-700/60 my-2" />
        <div class="text-center text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Separador de Sección</div>
      </div>
    `;
  }

  if (block.type === 'callout') {
    const type = block.metadata?.calloutType || 'info';
    return `
      <div class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Tipo de Nota:</label>
            <select onchange="updateBlockMeta(${bIdx}, 'calloutType', this.value); renderEditor();" class="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500">
              <option value="tip" ${type === 'tip' ? 'selected' : ''}>Verde (Consejo Pedagógico)</option>
              <option value="info" ${type === 'info' ? 'selected' : ''}>Azul (Teoría / Información)</option>
              <option value="warning" ${type === 'warning' ? 'selected' : ''}>Ámbar (Advertencia)</option>
              <option value="success" ${type === 'success' ? 'selected' : ''}>Carmesí EnglishTech (Síntesis)</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold text-slate-400 mb-1">Título de la Caja:</label>
            <input 
              type="text" 
              value="${(block.title || '').replace(/"/g, '&quot;')}" 
              oninput="updateBlockTitle(${bIdx}, this.value)" 
              class="w-full text-xs font-bold bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-100 focus:border-brand-500 focus:outline-none" 
              placeholder="Ej: ¡Atención a este detalle!" 
            />
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Mensaje Destacado:</label>
          <textarea 
            rows="3" 
            oninput="updateBlockContent(${bIdx}, this.value)" 
            class="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-brand-500 focus:outline-none custom-scrollbar" 
            placeholder="Escribe el mensaje..."
          >${block.content || ''}</textarea>
        </div>
      </div>
    `;
  }

  if (block.type === 'interactive_table') {
    const meta = block.metadata || { tableHeaders: ['Paso / Mes', 'Valor'], tableRows: [] };
    if (!meta.tableHeaders) meta.tableHeaders = ['Paso / Mes', 'Valor'];
    if (!meta.tableRows) meta.tableRows = [];

    return `
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Título de la Actividad:</label>
            <input 
              type="text" 
              value="${(block.title || '').replace(/"/g, '&quot;')}" 
              oninput="updateBlockTitle(${bIdx}, this.value)" 
              class="w-full text-xs font-bold bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-brand-500 focus:outline-none" 
              placeholder="Ej: Tabla de Sucesión de Fibonacci" 
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Instrucciones para el estudiante:</label>
            <input 
              type="text" 
              value="${(block.content || '').replace(/"/g, '&quot;')}" 
              oninput="updateBlockContent(${bIdx}, this.value)" 
              class="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:border-brand-500 focus:outline-none" 
              placeholder="Ej: Calcula el número de parejas en cada mes..." 
            />
          </div>
        </div>

        <!-- Table Structure Editor -->
        <div class="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/60 p-3 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-slate-300">Filas y Respuestas Esperadas:</span>
            <button onclick="addTableRow(${bIdx})" class="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition shadow-sm">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Añadir Fila</span>
            </button>
          </div>

          <table class="w-full text-xs min-w-[340px]">
            <thead>
              <tr class="text-slate-400 border-b border-slate-800 text-left">
                <th class="p-2 w-1/3">
                  <input type="text" value="${(meta.tableHeaders[0] || 'Etiqueta').replace(/"/g, '&quot;')}" oninput="updateTableHeader(${bIdx}, 0, this.value)" class="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 w-full focus:outline-none focus:border-brand-500" />
                </th>
                <th class="p-2 w-1/2">
                  <input type="text" value="${(meta.tableHeaders[1] || 'Respuesta').replace(/"/g, '&quot;')}" oninput="updateTableHeader(${bIdx}, 1, this.value)" class="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 w-full focus:outline-none focus:border-brand-500" />
                </th>
                <th class="p-2 text-right w-16">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              ${meta.tableRows.map((row, rIdx) => {
                const cell0 = row.cells?.[0] || { value: '' };
                const cell1 = row.cells?.[1] || { value: '', isInput: false, expectedAnswer: '' };
                return `
                  <tr>
                    <td class="p-2">
                      <input 
                        type="text" 
                        value="${(cell0.value || '').replace(/"/g, '&quot;')}" 
                        oninput="updateTableCellValue(${bIdx}, ${rIdx}, 0, this.value)" 
                        class="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 w-full focus:outline-none focus:border-brand-500" 
                        placeholder="Ej: Mes ${rIdx + 1}" 
                      />
                    </td>
                    <td class="p-2">
                      <div class="flex items-center gap-2">
                        <label class="flex items-center gap-1.5 cursor-pointer shrink-0 text-slate-400 hover:text-slate-200">
                          <input 
                            type="checkbox" 
                            ${cell1.isInput ? 'checked' : ''} 
                            onchange="toggleTableCellInput(${bIdx}, ${rIdx})" 
                            class="rounded accent-brand-500"
                          />
                          <span class="text-[11px] font-semibold">${cell1.isInput ? 'Rellenable:' : 'Fijo:'}</span>
                        </label>
                        ${cell1.isInput ? `
                          <input 
                            type="text" 
                            value="${(cell1.expectedAnswer || '').replace(/"/g, '&quot;')}" 
                            oninput="updateTableCellExpected(${bIdx}, ${rIdx}, this.value)" 
                            class="bg-slate-900 border border-brand-500/40 rounded-lg px-2 py-1 text-brand-300 font-mono w-full focus:outline-none focus:border-brand-500" 
                            placeholder="Valor esperado (ej: 8)" 
                          />
                        ` : `
                          <input 
                            type="text" 
                            value="${(cell1.value || '').replace(/"/g, '&quot;')}" 
                            oninput="updateTableCellValue(${bIdx}, ${rIdx}, 1, this.value)" 
                            class="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 font-mono w-full focus:outline-none focus:border-brand-500" 
                            placeholder="Texto fijo (ej: 1)" 
                          />
                        `}
                      </div>
                    </td>
                    <td class="p-2 text-right">
                      <button onclick="deleteTableRow(${bIdx}, ${rIdx})" class="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition" title="Eliminar fila">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  if (block.type === 'quiz_multiple') {
    const meta = block.metadata || { questions: [] };
    if (!meta.questions) meta.questions = [];

    return `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Título de la Evaluación:</label>
          <input 
            type="text" 
            value="${(block.title || '').replace(/"/g, '&quot;')}" 
            oninput="updateBlockTitle(${bIdx}, this.value)" 
            class="w-full text-xs font-bold bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-brand-500 focus:outline-none" 
            placeholder="Ej: Cuestionario de Comprensión" 
          />
        </div>

        <div class="space-y-4">
          ${meta.questions.map((q, qIdx) => `
            <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3 relative group/q">
              <div class="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <span class="text-xs font-bold text-brand-400">Pregunta ${qIdx + 1}</span>
                <button onclick="deleteQuizQuestion(${bIdx}, ${qIdx})" class="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition" title="Eliminar pregunta">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-slate-400 mb-1">Enunciado de la Pregunta:</label>
                <input 
                  type="text" 
                  value="${(q.question || '').replace(/"/g, '&quot;')}" 
                  oninput="updateQuizQuestionText(${bIdx}, ${qIdx}, this.value)" 
                  class="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-medium focus:border-brand-500 focus:outline-none" 
                  placeholder="¿Cuál es la fórmula del número áureo?" 
                />
              </div>

              <!-- Options -->
              <div class="space-y-2 pt-1">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-semibold text-slate-400">Opciones (marca la opción correcta):</span>
                  <button onclick="addQuizOption(${bIdx}, ${qIdx})" class="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition">
                    <i data-lucide="plus" class="w-3 h-3"></i>
                    <span>Añadir Opción</span>
                  </button>
                </div>

                <div class="space-y-1.5">
                  ${(q.options || []).map((opt, oIdx) => `
                    <div class="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="quiz_correct_${bIdx}_${qIdx}" 
                        ${opt.isCorrect ? 'checked' : ''} 
                        onchange="setQuizOptionCorrect(${bIdx}, ${qIdx}, ${oIdx})" 
                        class="accent-brand-500 shrink-0 cursor-pointer" 
                        title="Marcar como respuesta correcta"
                      />
                      <input 
                        type="text" 
                        value="${(opt.text || '').replace(/"/g, '&quot;')}" 
                        oninput="updateQuizOptionText(${bIdx}, ${qIdx}, ${oIdx}, this.value)" 
                        class="flex-1 text-xs bg-slate-900 border ${opt.isCorrect ? 'border-emerald-500/50 text-emerald-300 font-semibold' : 'border-slate-800 text-slate-300'} rounded-xl px-2.5 py-1.5 focus:border-brand-500 focus:outline-none" 
                        placeholder="Texto de la opción..." 
                      />
                      <button onclick="deleteQuizOption(${bIdx}, ${qIdx}, ${oIdx})" class="p-1 text-slate-600 hover:text-rose-400 rounded transition" title="Eliminar opción">
                        <i data-lucide="x" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Feedback -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/60">
                <div>
                  <label class="block text-[10px] uppercase font-bold text-emerald-400 mb-0.5">Feedback al acertar:</label>
                  <input 
                    type="text" 
                    value="${(q.feedbackGood || '').replace(/"/g, '&quot;')}" 
                    oninput="updateQuizFeedback(${bIdx}, ${qIdx}, 'feedbackGood', this.value)" 
                    class="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-300 focus:border-brand-500 focus:outline-none" 
                    placeholder="¡Excelente! Respuesta acertada." 
                  />
                </div>
                <div>
                  <label class="block text-[10px] uppercase font-bold text-rose-400 mb-0.5">Feedback al fallar:</label>
                  <input 
                    type="text" 
                    value="${(q.feedbackBad || '').replace(/"/g, '&quot;')}" 
                    oninput="updateQuizFeedback(${bIdx}, ${qIdx}, 'feedbackBad', this.value)" 
                    class="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-300 focus:border-brand-500 focus:outline-none" 
                    placeholder="Incorrecto. Revisa el contenido previo." 
                  />
                </div>
              </div>
            </div>
          `).join('')}

          <button onclick="addQuizQuestion(${bIdx})" class="w-full py-2.5 rounded-2xl bg-slate-950 border border-dashed border-slate-800 hover:border-brand-500 text-slate-400 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5">
            <i data-lucide="plus" class="w-4 h-4 text-brand-400"></i>
            <span>Añadir Pregunta al Cuestionario</span>
          </button>
        </div>
      </div>
    `;
  }

  if (block.type === 'cloze_fill') {
    const meta = block.metadata || { clozeText: '', wordBank: [] };
    return `
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Título de la Actividad:</label>
          <input 
            type="text" 
            value="${(block.title || '').replace(/"/g, '&quot;')}" 
            oninput="updateBlockTitle(${bIdx}, this.value)" 
            class="w-full text-xs font-bold bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-brand-500 focus:outline-none" 
            placeholder="Ej: Completa los espacios vacíos" 
          />
        </div>
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs font-semibold text-slate-300">Texto con llaves {palabra_correcta}:</label>
            <span class="text-[10px] text-brand-400">Ejemplo: La proporción áurea es {1.618}</span>
          </div>
          <textarea 
            rows="3" 
            oninput="updateClozeText(${bIdx}, this.value)" 
            class="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono focus:border-brand-500 focus:outline-none"
          >${meta.clozeText || ''}</textarea>
        </div>
        <div class="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
          <i data-lucide="tag" class="w-3.5 h-3.5 text-brand-400"></i>
          <span>Palabras del banco detectadas automáticamente:</span>
          <div class="flex flex-wrap gap-1.5" id="clozeBank_${bIdx}">
            ${(meta.wordBank || []).map(w => `<span class="px-2 py-0.5 rounded-lg bg-slate-800 text-xs text-brand-300 font-mono border border-slate-700">${w}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  if (block.type === 'accordion') {
    const items = block.metadata?.accordionItems || [];
    return `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Título del Acordeón:</label>
          <input 
            type="text" 
            value="${(block.title || '').replace(/"/g, '&quot;')}" 
            oninput="updateBlockTitle(${bIdx}, this.value)" 
            class="w-full text-xs font-bold bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-brand-500 focus:outline-none" 
            placeholder="Ej: Deducción Geométrica de Euclides" 
          />
        </div>

        <div class="space-y-3">
          ${items.map((item, itemIdx) => `
            <div class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[11px] font-bold text-brand-400">Paso ${itemIdx + 1}</span>
                <button onclick="deleteAccordionItem(${bIdx}, ${itemIdx})" class="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition" title="Eliminar paso">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
              <input 
                type="text" 
                value="${(item.title || '').replace(/"/g, '&quot;')}" 
                oninput="updateAccordionItem(${bIdx}, ${itemIdx}, 'title', this.value)" 
                class="w-full text-xs font-bold bg-slate-900 border border-slate-800 rounded-xl p-2 text-white focus:border-brand-500 focus:outline-none" 
                placeholder="Título del paso..." 
              />
              <textarea 
                rows="2" 
                oninput="updateAccordionItem(${bIdx}, ${itemIdx}, 'content', this.value)" 
                class="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl p-2 text-slate-300 focus:border-brand-500 focus:outline-none custom-scrollbar" 
                placeholder="Explicación del paso..."
              >${item.content || ''}</textarea>
            </div>
          `).join('')}

          <button onclick="addAccordionItem(${bIdx})" class="w-full py-2 rounded-xl bg-slate-950 border border-dashed border-slate-800 hover:border-brand-500 text-slate-400 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5">
            <i data-lucide="plus" class="w-4 h-4 text-brand-400"></i>
            <span>Añadir Nuevo Paso al Acordeón</span>
          </button>
        </div>
      </div>
    `;
  }

  if (block.type === 'objectives_list') {
    const meta = block.metadata || { mainGoal: '', skills: [] };
    if (!meta.skills) meta.skills = [];
    return `
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Propósito Principal:</label>
          <textarea 
            rows="2" 
            oninput="updateBlockMeta(${bIdx}, 'mainGoal', this.value)" 
            class="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-brand-500 focus:outline-none" 
            placeholder="Meta global de aprendizaje..."
          >${meta.mainGoal || ''}</textarea>
        </div>
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-slate-400">Competencias Específicas:</label>
            <button onclick="addObjectiveSkill(${bIdx})" class="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1">
              <i data-lucide="plus" class="w-3 h-3"></i>
              <span>Añadir Habilidad</span>
            </button>
          </div>
          <div class="space-y-2">
            ${meta.skills.map((skill, sIdx) => `
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 text-[10px] font-bold flex items-center justify-center shrink-0">✓</span>
                <input 
                  type="text" 
                  value="${skill.replace(/"/g, '&quot;')}" 
                  oninput="updateObjectiveSkill(${bIdx}, ${sIdx}, this.value)" 
                  class="flex-1 text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-brand-500 focus:outline-none" 
                  placeholder="Descripción de la competencia..." 
                />
                <button onclick="deleteObjectiveSkill(${bIdx}, ${sIdx})" class="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  if (block.type === 'credits_team') {
    const meta = block.metadata || { creditColumns: [] };
    return `
      <div class="space-y-3">
        <p class="text-xs text-slate-400">Estructura de créditos institucionales del equipo pedagógico y tecnológico.</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          ${(meta.creditColumns || []).map((col, colIdx) => `
            <div class="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <input 
                type="text" 
                value="${col.category}" 
                oninput="updateCreditCategory(${bIdx}, ${colIdx}, this.value)" 
                class="w-full text-xs font-bold text-brand-400 bg-transparent border-b border-slate-800 pb-1 focus:outline-none" 
              />
              <div class="space-y-2">
                ${(col.members || []).map((m, mIdx) => `
                  <div class="text-[11px] space-y-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800/80 relative">
                    <button onclick="deleteCreditMember(${bIdx}, ${colIdx}, ${mIdx})" class="absolute top-1 right-1 text-slate-600 hover:text-rose-400 p-0.5">
                      <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                    <input type="text" value="${m.name}" oninput="updateCreditMember(${bIdx}, ${colIdx}, ${mIdx}, 'name', this.value)" class="w-full bg-transparent text-slate-200 font-semibold focus:outline-none" placeholder="Nombre" />
                    <input type="text" value="${m.role}" oninput="updateCreditMember(${bIdx}, ${colIdx}, ${mIdx}, 'role', this.value)" class="w-full bg-transparent text-slate-400 text-[10px] focus:outline-none" placeholder="Rol / Cargo" />
                  </div>
                `).join('')}
                <button onclick="addCreditMember(${bIdx}, ${colIdx})" class="w-full py-1 text-[10px] font-semibold text-slate-400 hover:text-white bg-slate-900 rounded-lg transition">
                  + Miembro
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `<div class="text-xs text-slate-500">Bloque configurable en modo visual.</div>`;
}

// Block Mutation Handlers
function updateSubSlideTitle(val) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide) {
    slide.title = val;
    saveProjectState();
    renderSubSlidesTabs();
  }
}

function updateBlockTitle(bIdx, val) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx]) {
    slide.blocks[bIdx].title = val;
    saveProjectState();
  }
}

function updateBlockContent(bIdx, val) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx]) {
    slide.blocks[bIdx].content = val;
    saveProjectState();
  }
}

function updateBlockMeta(bIdx, key, val) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx]) {
    if (!slide.blocks[bIdx].metadata) slide.blocks[bIdx].metadata = {};
    slide.blocks[bIdx].metadata[key] = val;
    saveProjectState();
  }
}

function updateVideoUrl(bIdx, rawUrl) {
  const embed = parseYouTubeEmbed(rawUrl);
  updateBlockMeta(bIdx, 'videoUrl', embed);
  renderEditor();
  showToast('Video actualizado');
}

function insertMathSnippet(bIdx, snippet) {
  const input = document.getElementById('mathInput_' + bIdx);
  if (input) {
    input.value += ' ' + snippet;
    updateBlockMeta(bIdx, 'latex', input.value);
    updateKaTeXPreview(bIdx, input.value);
  }
}

function updateKaTeXPreview(bIdx, val) {
  const preview = document.getElementById('katexPreview_' + bIdx);
  if (preview && window.katex) {
    try {
      katex.render(val, preview, { throwOnError: false, displayMode: true });
    } catch (e) {
      preview.innerText = val;
    }
  }
}

function renderAllKaTeX() {
  setTimeout(() => {
    if (window.renderMathInElement) {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    }
  }, 100);
}

// Table Handlers
function updateTableHeader(bIdx, colIdx, val) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx]) {
    if (!slide.blocks[bIdx].metadata) slide.blocks[bIdx].metadata = {};
    if (!slide.blocks[bIdx].metadata.tableHeaders) slide.blocks[bIdx].metadata.tableHeaders = [];
    slide.blocks[bIdx].metadata.tableHeaders[colIdx] = val;
    saveProjectState();
  }
}

function addTableRow(bIdx) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx]) {
    const meta = slide.blocks[bIdx].metadata || {};
    if (!meta.tableRows) meta.tableRows = [];
    const num = meta.tableRows.length + 1;
    meta.tableRows.push({
      cells: [
        { value: 'Paso ' + num },
        { value: '', isInput: true, expectedAnswer: '' + num }
      ]
    });
    slide.blocks[bIdx].metadata = meta;
    saveProjectState();
    renderEditor();
    showToast('Fila añadida');
  }
}

function deleteTableRow(bIdx, rIdx) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.tableRows) {
    slide.blocks[bIdx].metadata.tableRows.splice(rIdx, 1);
    saveProjectState();
    renderEditor();
    showToast('Fila eliminada');
  }
}

function updateTableCellValue(bIdx, rIdx, cIdx, val) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.tableRows) {
    const row = slide.blocks[bIdx].metadata.tableRows[rIdx];
    if (row && row.cells && row.cells[cIdx]) {
      row.cells[cIdx].value = val;
      saveProjectState();
    }
  }
}

function updateTableCellExpected(bIdx, rIdx, val) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.tableRows) {
    const row = slide.blocks[bIdx].metadata.tableRows[rIdx];
    if (row && row.cells && row.cells[1]) {
      row.cells[1].expectedAnswer = val;
      saveProjectState();
    }
  }
}

function toggleTableCellInput(bIdx, rIdx) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.tableRows) {
    const row = slide.blocks[bIdx].metadata.tableRows[rIdx];
    if (row && row.cells && row.cells[1]) {
      row.cells[1].isInput = !row.cells[1].isInput;
      saveProjectState();
      renderEditor();
    }
  }
}

// Quiz Handlers
function addQuizQuestion(bIdx) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx]) {
    const meta = slide.blocks[bIdx].metadata || {};
    if (!meta.questions) meta.questions = [];
    meta.questions.push({
      id: 'q-' + Date.now(),
      title: 'Pregunta ' + (meta.questions.length + 1),
      question: '¿Escribe aquí la nueva pregunta?',
      options: [
        { id: 'o1', text: 'Opción 1', isCorrect: true },
        { id: 'o2', text: 'Opción 2', isCorrect: false }
      ],
      feedbackGood: '¡Excelente! Respuesta acertada.',
      feedbackBad: 'Incorrecto. Revisa el contenido previo.'
    });
    slide.blocks[bIdx].metadata = meta;
    saveProjectState();
    renderEditor();
    showToast('Pregunta añadida');
  }
}

function deleteQuizQuestion(bIdx, qIdx) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.questions) {
    slide.blocks[bIdx].metadata.questions.splice(qIdx, 1);
    saveProjectState();
    renderEditor();
    showToast('Pregunta eliminada');
  }
}

function updateQuizQuestionText(bIdx, qIdx, val) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.questions) {
    slide.blocks[bIdx].metadata.questions[qIdx].question = val;
    saveProjectState();
  }
}

function updateQuizFeedback(bIdx, qIdx, field, val) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.questions) {
    slide.blocks[bIdx].metadata.questions[qIdx][field] = val;
    saveProjectState();
  }
}

function addQuizOption(bIdx, qIdx) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.questions) {
    const q = slide.blocks[bIdx].metadata.questions[qIdx];
    if (q) {
      if (!q.options) q.options = [];
      q.options.push({
        id: 'o-' + Date.now(),
        text: 'Opción ' + (q.options.length + 1),
        isCorrect: false
      });
      saveProjectState();
      renderEditor();
    }
  }
}

function deleteQuizOption(bIdx, qIdx, oIdx) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.questions) {
    const q = slide.blocks[bIdx].metadata.questions[qIdx];
    if (q && q.options && q.options.length > 1) {
      q.options.splice(oIdx, 1);
      saveProjectState();
      renderEditor();
    } else {
      showToast('Debe haber al menos una opción.', 'error');
    }
  }
}

function setQuizOptionCorrect(bIdx, qIdx, oIdx) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.questions) {
    const q = slide.blocks[bIdx].metadata.questions[qIdx];
    if (q && q.options) {
      q.options.forEach((opt, idx) => {
        opt.isCorrect = (idx === oIdx);
      });
      saveProjectState();
      renderEditor();
    }
  }
}

function updateQuizOptionText(bIdx, qIdx, oIdx, val) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.questions) {
    const q = slide.blocks[bIdx].metadata.questions[qIdx];
    if (q && q.options && q.options[oIdx]) {
      q.options[oIdx].text = val;
      saveProjectState();
    }
  }
}

// Cloze Handlers
function updateClozeText(bIdx, val) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx]) {
    if (!slide.blocks[bIdx].metadata) slide.blocks[bIdx].metadata = {};
    slide.blocks[bIdx].metadata.clozeText = val;
    // Extract words in braces {word}
    const matches = val.match(/\{([^}]+)\}/g) || [];
    const words = matches.map(m => m.replace(/[{}]/g, '').trim()).filter(Boolean);
    slide.blocks[bIdx].metadata.wordBank = words;
    saveProjectState();
    
    // Update live tag badges
    const bankEl = document.getElementById('clozeBank_' + bIdx);
    if (bankEl) {
      bankEl.innerHTML = words.map(w => '<span class="px-2 py-0.5 rounded-lg bg-slate-800 text-xs text-brand-300 font-mono border border-slate-700">' + w + '</span>').join('');
    }
  }
}

// Accordion Handlers
function addAccordionItem(bIdx) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx]) {
    const meta = slide.blocks[bIdx].metadata || {};
    if (!meta.accordionItems) meta.accordionItems = [];
    const stepNum = meta.accordionItems.length + 1;
    meta.accordionItems.push({
      title: 'Paso ' + stepNum + ': Nuevo Concepto',
      content: 'Explicación detallada de este paso deductivo...'
    });
    slide.blocks[bIdx].metadata = meta;
    saveProjectState();
    renderEditor();
    showToast('Paso añadido al acordeón');
  }
}

function deleteAccordionItem(bIdx, itemIdx) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.accordionItems) {
    slide.blocks[bIdx].metadata.accordionItems.splice(itemIdx, 1);
    saveProjectState();
    renderEditor();
    showToast('Paso eliminado');
  }
}

function updateAccordionItem(bIdx, itemIdx, field, val) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.accordionItems) {
    const item = slide.blocks[bIdx].metadata.accordionItems[itemIdx];
    if (item) {
      item[field] = val;
      saveProjectState();
    }
  }
}

// Objectives Handlers
function addObjectiveSkill(bIdx) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx]) {
    const meta = slide.blocks[bIdx].metadata || {};
    if (!meta.skills) meta.skills = [];
    meta.skills.push('Nueva competencia específica o habilidad esperada');
    slide.blocks[bIdx].metadata = meta;
    saveProjectState();
    renderEditor();
  }
}

function deleteObjectiveSkill(bIdx, sIdx) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.skills) {
    slide.blocks[bIdx].metadata.skills.splice(sIdx, 1);
    saveProjectState();
    renderEditor();
  }
}

function updateObjectiveSkill(bIdx, sIdx, val) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.skills) {
    slide.blocks[bIdx].metadata.skills[sIdx] = val;
    saveProjectState();
  }
}

// Credits Handlers
function updateCreditCategory(bIdx, colIdx, val) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.creditColumns) {
    slide.blocks[bIdx].metadata.creditColumns[colIdx].category = val;
    saveProjectState();
  }
}

function updateCreditMember(bIdx, colIdx, mIdx, field, val) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.creditColumns) {
    const m = slide.blocks[bIdx].metadata.creditColumns[colIdx]?.members?.[mIdx];
    if (m) {
      m[field] = val;
      saveProjectState();
    }
  }
}

function addCreditMember(bIdx, colIdx) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.creditColumns) {
    const col = slide.blocks[bIdx].metadata.creditColumns[colIdx];
    if (col) {
      if (!col.members) col.members = [];
      col.members.push({ name: 'Nuevo Integrante', role: 'Colaborador' });
      saveProjectState();
      renderEditor();
    }
  }
}

function deleteCreditMember(bIdx, colIdx, mIdx) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx] && slide.blocks[bIdx].metadata?.creditColumns) {
    const col = slide.blocks[bIdx].metadata.creditColumns[colIdx];
    if (col && col.members) {
      col.members.splice(mIdx, 1);
      saveProjectState();
      renderEditor();
    }
  }
}

// Genially and Educaplay URL Handlers
function updateGeniallyUrl(bIdx, url) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx]) {
    if (!slide.blocks[bIdx].metadata) slide.blocks[bIdx].metadata = {};
    slide.blocks[bIdx].metadata.url = url;
    saveProjectState();
    renderEditor();
    showToast('Enlace de Genially actualizado');
  }
}

function updateEducaplayUrl(bIdx, url) {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks[bIdx]) {
    if (!slide.blocks[bIdx].metadata) slide.blocks[bIdx].metadata = {};
    slide.blocks[bIdx].metadata.url = url;
    saveProjectState();
    renderEditor();
    showToast('Enlace de Educaplay actualizado');
  }
}

// =========================================================
// Word / Canva Docs "Hoja en Blanco" Rich Text & Activity Editor
// =========================================================
let docSaveTimeout = null;

function debouncedDocSave(bIdx, html) {
  clearTimeout(docSaveTimeout);
  docSaveTimeout = setTimeout(() => {
    updateBlockContentHtml(bIdx, html);
  }, 400);
}

function updateBlockContentHtml(bIdx, html) {
  const page = currentProject.pages[activePageIndex];
  if (!page || !page.subSlides) return;
  const slide = page.subSlides[activeSubSlideIndex];
  if (slide && slide.blocks && slide.blocks[bIdx]) {
    slide.blocks[bIdx].content = html;
    saveProjectState();
  }
}

function applyDocFont(fontName) {
  document.execCommand('fontName', false, fontName);
  saveActiveDocText();
}

function applyDocFormat(tag) {
  document.execCommand('formatBlock', false, tag);
  saveActiveDocText();
}

function applyDocStyle(cmd) {
  document.execCommand(cmd, false, null);
  saveActiveDocText();
}

function applyDocColor(colorHex) {
  document.execCommand('foreColor', false, colorHex);
  saveActiveDocText();
}

function applyDocHighlight(colorHex) {
  document.execCommand('hiliteColor', false, colorHex);
  saveActiveDocText();
}

let currentDocFontSize = 14;

function changeDocFontSize(delta) {
  currentDocFontSize = Math.max(10, Math.min(48, currentDocFontSize + delta * 2));
  const label = document.getElementById('docFontSizeLabel');
  if (label) label.innerText = currentDocFontSize;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    const span = document.createElement('span');
    span.style.fontSize = currentDocFontSize + 'px';
    const range = sel.getRangeAt(0);
    const content = range.extractContents();
    span.appendChild(content);
    range.insertNode(span);
    saveActiveDocText();
  }
}

function applyDocAlignment(align) {
  document.execCommand(align, false, null);
  saveActiveDocText();
}

function saveActiveDocText() {
  const activeEl = document.activeElement;
  if (activeEl && activeEl.classList.contains('doc-editable-text')) {
    const id = activeEl.id;
    const bIdx = parseInt(id.replace('docText_', ''));
    if (!isNaN(bIdx)) {
      updateBlockContentHtml(bIdx, activeEl.innerHTML);
    }
  }
}

function insertDocResource(type) {
  addNewBlock(type);
}

function insertDocParagraph() {
  const page = currentProject.pages[activePageIndex];
  const slide = page.subSlides[activeSubSlideIndex];
  if (!slide.blocks) slide.blocks = [];
  slide.blocks.push({
    id: 'blk-' + Date.now(),
    type: 'text',
    title: '',
    content: '<p>Nuevo párrafo de contenido...</p>'
  });
  saveProjectState();
  renderEditor();
  showToast('Nuevo párrafo añadido a la hoja');
}

function renderDocumentSheetEditor() {
  const page = currentProject.pages[activePageIndex];
  if (!page) return '';
  if (!page.subSlides || page.subSlides.length === 0) {
    page.subSlides = [{ id: 'slide-' + Date.now(), title: 'Hoja de Actividades', blocks: [] }];
    activeSubSlideIndex = 0;
  }
  if (activeSubSlideIndex >= page.subSlides.length) {
    activeSubSlideIndex = page.subSlides.length - 1;
  }
  const slide = page.subSlides[activeSubSlideIndex];
  if (!slide.blocks) slide.blocks = [];

  // If completely empty, seed with initial editable paragraph
  if (slide.blocks.length === 0) {
    slide.blocks.push({
      id: 'blk-' + Date.now(),
      type: 'text',
      content: '<h1 class="font-playfair text-2xl font-bold text-brand-600 dark:text-brand-400 mb-2">Título de la Actividad</h1><p class="font-inter text-base text-slate-700 dark:text-slate-300">Haz clic aquí para escribir las instrucciones o contenido de esta actividad...</p>'
    });
    saveProjectState();
  }

  // Render elements within the sheet
  let docElementsHtml = slide.blocks.map((block, bIdx) => {
    if (block.type === 'text') {
      return `
        <div class="group relative my-3">
          <div 
            id="docText_${bIdx}" 
            contenteditable="true" 
            onblur="updateBlockContentHtml(${bIdx}, this.innerHTML)" 
            oninput="debouncedDocSave(${bIdx}, this.innerHTML)"
            class="doc-editable-text min-h-[44px] p-3 rounded-xl focus:outline-none transition leading-relaxed text-base text-slate-800 dark:text-slate-100" 
            placeholder="Escribe aquí tu texto, instrucciones o explicaciones...">
            ${block.content || '<p>Escribe aquí...</p>'}
          </div>
          <div class="absolute right-2 -top-3.5 hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-xl p-1 z-10 transition">
            <button onclick="moveBlock(${bIdx}, -1)" title="Subir párrafo" ${bIdx === 0 ? 'disabled' : ''} class="p-1 rounded-lg transition ${bIdx === 0 ? 'opacity-20 cursor-not-allowed text-slate-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'}">
              <i data-lucide="chevron-up" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="moveBlock(${bIdx}, 1)" title="Bajar párrafo" ${bIdx === slide.blocks.length - 1 ? 'disabled' : ''} class="p-1 rounded-lg transition ${bIdx === slide.blocks.length - 1 ? 'opacity-20 cursor-not-allowed text-slate-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'}">
              <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="promptDeleteBlock(${bIdx})" title="Eliminar párrafo" class="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-lg transition">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
    }

    if (block.type === 'divider') {
      return `
        <div class="group relative my-6 py-2">
          <hr class="border-t-2 border-dashed border-slate-300 dark:border-slate-700 my-2" />
          <div class="absolute right-2 -top-2 hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-xl p-1 z-10">
            <button onclick="promptDeleteBlock(${bIdx})" class="p-1 text-slate-400 hover:text-rose-500 rounded-lg"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
          </div>
        </div>
      `;
    }

    // Embedded resources: Genially, Educaplay, Video, Table, Quiz, KaTeX, Callout
    const icon = getBlockIcon(block.type);
    const title = getBlockTitle(block.type);
    const badgeColors = {
      genially: 'bg-pink-500/10 text-pink-500 border border-pink-500/20',
      educaplay: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
      video: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
      math: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
      callout: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
      interactive_table: 'bg-teal-500/10 text-teal-500 border border-teal-500/20',
      quiz_multiple: 'bg-purple-500/10 text-purple-500 border border-purple-500/20',
      cloze_fill: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20',
      accordion: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
      objectives_list: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
      credits_team: 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
    };
    const bColor = badgeColors[block.type] || 'bg-slate-500/10 text-slate-500 border border-slate-500/20';

    return `
      <div id="blockCard_${bIdx}" class="doc-embed-card my-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 p-5 sm:p-6 shadow-sm hover:shadow-md transition duration-200 space-y-4">
        <!-- Resource Header bar -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 select-none">
          <div class="flex items-center gap-2 min-w-0">
            <span class="px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${bColor}">
              <i data-lucide="${icon}" class="w-3.5 h-3.5 shrink-0"></i>
              <span>${title}</span>
            </span>
            <span class="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-xs sm:max-w-md">
              ${block.title ? block.title : (block.content ? block.content.slice(0, 45) + '...' : 'Elemento Incrustado')}
            </span>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <button onclick="moveBlock(${bIdx}, -1)" title="Subir recurso" ${bIdx === 0 ? 'disabled' : ''} class="p-1.5 rounded-lg transition ${bIdx === 0 ? 'opacity-20 cursor-not-allowed text-slate-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'}">
              <i data-lucide="chevron-up" class="w-4 h-4"></i>
            </button>
            <button onclick="moveBlock(${bIdx}, 1)" title="Bajar recurso" ${bIdx === slide.blocks.length - 1 ? 'disabled' : ''} class="p-1.5 rounded-lg transition ${bIdx === slide.blocks.length - 1 ? 'opacity-20 cursor-not-allowed text-slate-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'}">
              <i data-lucide="chevron-down" class="w-4 h-4"></i>
            </button>
            <button onclick="promptDeleteBlock(${bIdx})" title="Eliminar de la hoja" class="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-lg ml-1 transition">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Resource Body -->
        <div>
          ${renderBlockSpecificEditor(block, bIdx)}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="max-w-5xl mx-auto space-y-3 sm:space-y-4 select-text">
      <!-- The Pristine Document Sheet (Hoja de Papel en Blanco) -->
      <div id="documentSheet" class="document-sheet max-w-4xl mx-auto p-3 sm:p-6 md:p-12 my-1 sm:my-2 relative transition-all min-h-[380px] sm:min-h-[600px] md:min-h-[800px]">
        ${docElementsHtml}

        <!-- Bottom Sheet Actions & Pagination Bar -->
        <div class="mt-8 sm:mt-10 pt-4 sm:pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 select-none">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 font-semibold">Hoja ${activeSubSlideIndex + 1} de ${page.subSlides.length}</span>
            ${page.subSlides.length > 1 ? `
              <button onclick="selectSubSlide(${Math.max(0, activeSubSlideIndex - 1)})" ${activeSubSlideIndex === 0 ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg text-xs font-bold transition ${activeSubSlideIndex === 0 ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}" title="Hoja anterior">◀ Anterior</button>
              <button onclick="selectSubSlide(${Math.min(page.subSlides.length - 1, activeSubSlideIndex + 1)})" ${activeSubSlideIndex === page.subSlides.length - 1 ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg text-xs font-bold transition ${activeSubSlideIndex === page.subSlides.length - 1 ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}" title="Hoja siguiente">Siguiente ▶</button>
            ` : ''}
          </div>

          <div class="flex items-center gap-2">
            <button onclick="insertDocParagraph()" class="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition">
              <i data-lucide="type" class="w-3.5 h-3.5 text-brand-500"></i>
              <span>+ Párrafo</span>
            </button>
            <button onclick="insertNewWorksheet()" class="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5 sm:gap-2 shadow-md shadow-brand-500/20 transition hover:scale-105">
              <i data-lucide="file-plus-2" class="w-4 h-4"></i>
              <span>+ Insertar Hoja</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDocumentToolbarHtml() {
  const page = currentProject?.pages?.[activePageIndex];
  const slide = page?.subSlides?.[activeSubSlideIndex] || {};
  const totalSheets = page?.subSlides?.length || 1;
  const currentSheetNum = activeSubSlideIndex + 1;

  return `
    <div class="space-y-1.5 select-none">
      <!-- Row 1: Formatting Toolbar (Word / Google Docs / Canva Docs) -->
      <div class="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5 flex-nowrap w-full" style="touch-action: pan-x;">
        <div class="flex items-center gap-1.5 shrink-0">
          <!-- Undo / Redo (Google Docs style) -->
          <div class="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700/80 shrink-0">
            <button onmousedown="event.preventDefault();" onclick="document.execCommand('undo'); saveActiveDocText();" class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Deshacer (Ctrl+Z)">
              <i data-lucide="undo" class="w-3.5 h-3.5"></i>
            </button>
            <button onmousedown="event.preventDefault();" onclick="document.execCommand('redo'); saveActiveDocText();" class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Rehacer (Ctrl+Y)">
              <i data-lucide="redo" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <div class="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0"></div>

          <!-- Font Picker -->
          <div class="flex items-center gap-1 shrink-0">
            <i data-lucide="type" class="w-3.5 h-3.5 text-brand-500 shrink-0"></i>
            <select onchange="applyDocFont(this.value)" class="h-8 px-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 cursor-pointer shadow-sm shrink-0" title="Tipo de Letra">
              <option value="Inter">Inter (Sans)</option>
              <option value="Merriweather">Merriweather (Serif)</option>
              <option value="Playfair Display">Playfair (Elegante)</option>
              <option value="Fira Code">Fira Code (Mono)</option>
              <option value="Comic Neue">Comic (Didáctica)</option>
            </select>
          </div>

          <!-- Format / Heading -->
          <select onchange="applyDocFormat(this.value)" class="h-8 px-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 cursor-pointer shadow-sm shrink-0" title="Tamaño / Estilo de Encabezado">
            <option value="p">Párrafo Normal</option>
            <option value="h1">Título 1 (H1)</option>
            <option value="h2">Título 2 (H2)</option>
            <option value="h3">Título 3 (H3)</option>
          </select>

          <!-- Font Size Controls (- 14 +) -->
          <div class="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-0.5 shadow-sm shrink-0" title="Tamaño de Fuente">
            <button onmousedown="event.preventDefault();" onclick="changeDocFontSize(-1)" class="w-6 h-7 rounded-lg flex items-center justify-center text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Reducir tamaño">-</button>
            <span id="docFontSizeLabel" class="w-6 text-center text-xs font-bold text-slate-800 dark:text-slate-100 select-none">14</span>
            <button onmousedown="event.preventDefault();" onclick="changeDocFontSize(1)" class="w-6 h-7 rounded-lg flex items-center justify-center text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Aumentar tamaño">+</button>
          </div>

          <div class="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0"></div>

          <!-- Quick Format Buttons: B, I, U -->
          <button onmousedown="event.preventDefault();" onclick="applyDocStyle('bold')" class="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 transition shadow-xs shrink-0" title="Negrita (Ctrl+B)">
            <strong>B</strong>
          </button>
          <button onmousedown="event.preventDefault();" onclick="applyDocStyle('italic')" class="w-8 h-8 rounded-xl flex items-center justify-center italic font-serif text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 transition shadow-xs shrink-0" title="Cursiva (Ctrl+I)">
            <em>I</em>
          </button>
          <button onmousedown="event.preventDefault();" onclick="applyDocStyle('underline')" class="w-8 h-8 rounded-xl flex items-center justify-center underline text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 transition shadow-xs shrink-0" title="Subrayado (Ctrl+U)">
            <u>U</u>
          </button>

          <div class="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0"></div>

          <!-- Color Palette -->
          <div class="flex items-center gap-1 px-1 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shrink-0" title="Color del Texto">
            <span class="text-[10px] font-bold text-slate-400 pl-1">A</span>
            <button onmousedown="event.preventDefault();" onclick="applyDocColor('#AD3333')" class="w-4 h-4 rounded-full bg-[#AD3333] hover:scale-125 transition shadow-sm" title="Rojo Carmesí EnglishTech"></button>
            <button onmousedown="event.preventDefault();" onclick="applyDocColor('#2563eb')" class="w-4 h-4 rounded-full bg-blue-600 hover:scale-125 transition shadow-sm" title="Azul"></button>
            <button onmousedown="event.preventDefault();" onclick="applyDocColor('#059669')" class="w-4 h-4 rounded-full bg-emerald-600 hover:scale-125 transition shadow-sm" title="Verde"></button>
            <button onmousedown="event.preventDefault();" onclick="applyDocColor('#d97706')" class="w-4 h-4 rounded-full bg-amber-600 hover:scale-125 transition shadow-sm" title="Ámbar"></button>
            <button onmousedown="event.preventDefault();" onclick="applyDocColor('#7c3aed')" class="w-4 h-4 rounded-full bg-purple-600 hover:scale-125 transition shadow-sm" title="Púrpura"></button>
            <button onmousedown="event.preventDefault();" onclick="applyDocColor('#0f172a')" class="w-4 h-4 rounded-full bg-slate-900 border border-slate-400 hover:scale-125 transition shadow-sm" title="Pizarra"></button>
            <input type="color" onchange="applyDocColor(this.value)" class="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0 ml-0.5" title="Selector de Color Personalizado" />
          </div>

          <!-- Text Highlight -->
          <div class="flex items-center gap-1 px-1.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shrink-0" title="Resaltador">
            <i data-lucide="highlighter" class="w-3.5 h-3.5 text-amber-500"></i>
            <button onmousedown="event.preventDefault();" onclick="applyDocHighlight('#fef08a')" class="w-4 h-4 rounded bg-yellow-200 hover:scale-125 transition border border-yellow-300" title="Resaltar Amarillo"></button>
            <button onmousedown="event.preventDefault();" onclick="applyDocHighlight('#bbf7d0')" class="w-4 h-4 rounded bg-green-200 hover:scale-125 transition border border-green-300" title="Resaltar Verde Menta"></button>
            <button onmousedown="event.preventDefault();" onclick="applyDocHighlight('#bae6fd')" class="w-4 h-4 rounded bg-sky-200 hover:scale-125 transition border border-sky-300" title="Resaltar Celeste"></button>
            <button onmousedown="event.preventDefault();" onclick="applyDocHighlight('transparent')" class="w-4 h-4 rounded bg-transparent hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-400 text-[9px] flex items-center justify-center font-bold text-slate-500" title="Quitar Resaltado">✕</button>
          </div>

          <div class="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0"></div>

          <!-- Alignment & Lists -->
          <button onmousedown="event.preventDefault();" onclick="applyDocStyle('insertUnorderedList')" class="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shrink-0" title="Viñetas">
            <i data-lucide="list" class="w-4 h-4"></i>
          </button>
          <button onmousedown="event.preventDefault();" onclick="applyDocStyle('insertOrderedList')" class="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shrink-0" title="Lista Numerada">
            <i data-lucide="list-ordered" class="w-4 h-4"></i>
          </button>
          <button onmousedown="event.preventDefault();" onclick="applyDocAlignment('justifyLeft')" class="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shrink-0" title="Alinear Izquierda">
            <i data-lucide="align-left" class="w-4 h-4"></i>
          </button>
          <button onmousedown="event.preventDefault();" onclick="applyDocAlignment('justifyCenter')" class="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shrink-0" title="Centrar">
            <i data-lucide="align-center" class="w-4 h-4"></i>
          </button>
          <button onmousedown="event.preventDefault();" onclick="applyDocAlignment('justifyRight')" class="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shrink-0" title="Alinear Derecha">
            <i data-lucide="align-right" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold shadow-xs shrink-0">
            <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
            <span>Hoja ${currentSheetNum} de ${totalSheets}</span>
          </span>
          <button onclick="insertNewWorksheet()" class="px-3 py-1 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-brand-500/20 transition hover:scale-105 shrink-0">
            <i data-lucide="file-plus-2" class="w-3.5 h-3.5"></i>
            <span>+ Insertar Hoja</span>
          </button>
        </div>
      </div>

      <!-- Row 2: Resource Inserter Bar -->
      <div class="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80 dark:border-slate-800/80 overflow-x-auto no-scrollbar py-0.5 flex-nowrap w-full" style="touch-action: pan-x;">
        <div class="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
          <i data-lucide="plus-circle" class="w-3.5 h-3.5 text-brand-500"></i>
          <span>Insertar en esta hoja:</span>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <button onclick="insertDocResource('genially')" class="px-2.5 py-1 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-600 dark:text-pink-400 text-xs font-bold flex items-center gap-1.5 transition shadow-xs shrink-0" title="Incrustar actividad o presentación de Genially">
            <i data-lucide="sparkles" class="w-3.5 h-3.5 text-pink-500"></i>
            <span>Genially</span>
          </button>
          <button onclick="insertDocResource('educaplay')" class="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition shadow-xs shrink-0" title="Incrustar juego o actividad de Educaplay">
            <i data-lucide="gamepad-2" class="w-3.5 h-3.5 text-emerald-500"></i>
            <span>Educaplay</span>
          </button>
          <button onclick="insertDocResource('video')" class="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs shrink-0">
            <i data-lucide="video" class="w-3.5 h-3.5 text-rose-500"></i>
            <span>Video</span>
          </button>
          <button onclick="insertDocResource('math')" class="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs shrink-0">
            <i data-lucide="function-square" class="w-3.5 h-3.5 text-amber-500"></i>
            <span>KaTeX</span>
          </button>
          <button onclick="insertDocResource('callout')" class="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs shrink-0">
            <i data-lucide="info" class="w-3.5 h-3.5 text-blue-500"></i>
            <span>Nota</span>
          </button>
          <button onclick="insertDocResource('interactive_table')" class="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs shrink-0">
            <i data-lucide="table" class="w-3.5 h-3.5 text-emerald-500"></i>
            <span>Tabla Cálculo</span>
          </button>
          <button onclick="insertDocResource('quiz_multiple')" class="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs shrink-0">
            <i data-lucide="check-square" class="w-3.5 h-3.5 text-purple-500"></i>
            <span>Cuestionario</span>
          </button>
          <button onclick="insertDocParagraph()" class="px-2.5 py-1 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center gap-1.5 transition shadow-xs shrink-0">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>+ Párrafo</span>
          </button>
        </div>
      </div>
    </div>
  `;
}
