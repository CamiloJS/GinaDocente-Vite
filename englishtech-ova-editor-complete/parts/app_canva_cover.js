// Professional EnglishTech OVA Studio - Interactive Freeform Cover Canvas Engine
let selectedCoverElementId = 'title';
let isDraggingCoverElement = false;
let coverDragData = null;

function ensureCoverElements(cover) {
  if (!cover) return [];
  if (!Array.isArray(cover.elements) || cover.elements.length === 0) {
    cover.elements = [
      {
        id: 'badge',
        type: 'badge',
        text: cover.badgeText || 'OBJETO VIRTUAL DE APRENDIZAJE',
        x: 5,
        y: 6,
        fontSize: 12,
        fontFamily: 'Inter',
        color: '#ffffff',
        bg: '#AD3333',
        bold: true,
        italic: false,
        shadow: 'sm'
      },
      {
        id: 'institution',
        type: 'institution',
        text: cover.institution || 'Universidad de Pamplona',
        x: 36,
        y: 6,
        fontSize: 13,
        fontFamily: 'Inter',
        color: '#cbd5e1',
        bg: 'rgba(0,0,0,0.4)',
        bold: false,
        italic: false,
        shadow: 'sm'
      },
      {
        id: 'brand',
        type: 'brand',
        text: 'English TECH',
        x: 72,
        y: 6,
        fontSize: 12,
        fontFamily: 'Inter',
        color: '#ffffff',
        bg: 'rgba(0,0,0,0.5)',
        bold: true,
        italic: false,
        shadow: 'sm'
      },
      {
        id: 'title',
        type: 'title',
        text: cover.title || (typeof currentProject !== 'undefined' ? currentProject.title : '') || 'Título del OVA',
        x: 5,
        y: 24,
        fontSize: 44,
        fontFamily: 'Playfair Display',
        color: '#ffffff',
        bold: true,
        italic: false,
        underline: false,
        shadow: 'md',
        maxWidth: 90
      },
      {
        id: 'subtitle',
        type: 'subtitle',
        text: cover.subtitle || 'Subtítulo o descripción breve del objeto virtual de aprendizaje',
        x: 5,
        y: 52,
        fontSize: 17,
        fontFamily: 'Inter',
        color: '#cbd5e1',
        bold: false,
        italic: false,
        underline: false,
        shadow: 'sm',
        maxWidth: 88
      },
      {
        id: 'author',
        type: 'author',
        text: cover.authorName ? 'Autor: ' + cover.authorName : 'Autor: Docente Autor',
        x: 5,
        y: 84,
        fontSize: 13,
        fontFamily: 'Inter',
        color: '#94a3b8',
        bold: false,
        italic: false,
        underline: false,
        shadow: 'sm'
      },
      {
        id: 'startButton',
        type: 'button',
        text: cover.startButtonText || 'Comenzar Recorrido',
        x: 55,
        y: 80,
        fontSize: 13,
        fontFamily: 'Inter',
        color: '#ffffff',
        bg: '#AD3333',
        bold: true,
        italic: false,
        underline: false,
        shadow: 'lg'
      }
    ];
  }
  return cover.elements;
}

function getShadowCss(shadowType) {
  switch (shadowType) {
    case 'none': return 'none';
    case 'sm': return '0 1px 3px rgba(0,0,0,0.7)';
    case 'md': return '0 3px 8px rgba(0,0,0,0.85)';
    case 'lg': return '0 6px 18px rgba(0,0,0,0.95)';
    case 'glow': return '0 0 14px rgba(173, 51, 51, 0.9)';
    default: return '0 2px 5px rgba(0,0,0,0.8)';
  }
}

function renderCoverCanvaEditor() {
  const cover = currentProject.cover || {
    title: currentProject.title || 'Título del OVA',
    subtitle: 'Subtítulo o descripción breve del objeto de aprendizaje',
    badgeText: 'OBJETO VIRTUAL DE APRENDIZAJE',
    institution: 'Universidad de Pamplona',
    authorName: 'Docente Autor',
    backgroundImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1600&q=80',
    backgroundColor: '#0f172a',
    textColor: '#ffffff',
    overlayOpacity: 0.75,
    startButtonText: 'Comenzar Recorrido',
    showEnglishTechBranding: true
  };
  currentProject.cover = cover;
  const elements = ensureCoverElements(cover);

  const elementsHtml = elements.map(el => {
    const isSel = el.id === selectedCoverElementId;
    const shadowCss = getShadowCss(el.shadow);
    const responsiveClamp = `clamp(${Math.max(9, Math.round(el.fontSize * 0.35))}px, ${(el.fontSize / 7.5).toFixed(2)}cqw, ${el.fontSize}px)`;
    const handlePosClass = (el.y < 18 ? 'top-full mt-1.5' : '-top-7') + (el.x > 70 ? ' right-0' : ' left-0');
    const customStyle = `
      left: ${el.x}%; 
      top: ${el.y}%; 
      font-family: '${el.fontFamily}', sans-serif; 
      font-size: ${responsiveClamp}; 
      color: ${el.color}; 
      font-weight: ${el.bold ? 'bold' : 'normal'}; 
      font-style: ${el.italic ? 'italic' : 'normal'}; 
      text-decoration: ${el.underline ? 'underline' : 'none'}; 
      text-shadow: ${shadowCss};
      ${el.maxWidth ? `max-width: ${el.maxWidth}%;` : ''}
    `;

    if (el.type === 'badge') {
      return `
        <div 
          id="cover-el-${el.id}"
          class="cover-draggable-item ${isSel ? 'is-selected' : ''}" 
          style="${customStyle}"
          onpointerdown="handleCoverPointerDown(event, '${el.id}')"
          onclick="selectCoverElement('${el.id}')"
        >
          <div class="drag-handle-pill hidden absolute ${handlePosClass} px-2 py-0.5 rounded-md bg-brand-500 text-white text-[10px] font-bold items-center gap-1 shadow-lg pointer-events-auto cursor-grab active:cursor-grabbing select-none">
            <i data-lucide="move" class="w-3 h-3"></i><span>Mover</span>
          </div>
          <span 
            contenteditable="true" 
            oninput="handleCoverElementTextInput('${el.id}', this.innerText)"
            class="cover-badge-text px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-500 text-white shadow-lg border border-brand-400/40 cursor-text inline-block"
          >${el.text}</span>
        </div>
      `;
    }

    if (el.type === 'institution') {
      return `
        <div 
          id="cover-el-${el.id}"
          class="cover-draggable-item ${isSel ? 'is-selected' : ''}" 
          style="${customStyle}"
          onpointerdown="handleCoverPointerDown(event, '${el.id}')"
          onclick="selectCoverElement('${el.id}')"
        >
          <div class="drag-handle-pill hidden absolute ${handlePosClass} px-2 py-0.5 rounded-md bg-brand-500 text-white text-[10px] font-bold items-center gap-1 shadow-lg pointer-events-auto cursor-grab active:cursor-grabbing select-none">
            <i data-lucide="move" class="w-3 h-3"></i><span>Mover</span>
          </div>
          <span 
            contenteditable="true" 
            oninput="handleCoverElementTextInput('${el.id}', this.innerText)"
            class="cover-institution-text text-xs text-slate-300 font-medium px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-black/40 backdrop-blur border border-white/10 cursor-text inline-block"
          >${el.text}</span>
        </div>
      `;
    }

    if (el.type === 'brand') {
      return `
        <div 
          id="cover-el-${el.id}"
          class="cover-draggable-item ${isSel ? 'is-selected' : ''}" 
          style="${customStyle}"
          onpointerdown="handleCoverPointerDown(event, '${el.id}')"
          onclick="selectCoverElement('${el.id}')"
        >
          <div class="drag-handle-pill hidden absolute ${handlePosClass} px-2 py-0.5 rounded-md bg-brand-500 text-white text-[10px] font-bold items-center gap-1 shadow-lg pointer-events-auto cursor-grab active:cursor-grabbing select-none">
            <i data-lucide="move" class="w-3 h-3"></i><span>Mover</span>
          </div>
          <div class="cover-brand-text flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-black/50 backdrop-blur border border-white/10 text-xs font-bold text-slate-200 cursor-pointer">
            <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-brand-500 animate-pulse"></span>
            <span contenteditable="true" oninput="handleCoverElementTextInput('${el.id}', this.innerText)">${el.text}</span>
          </div>
        </div>
      `;
    }

    if (el.type === 'button') {
      return `
        <div 
          id="cover-el-${el.id}"
          class="cover-draggable-item ${isSel ? 'is-selected' : ''}" 
          style="${customStyle}"
          onpointerdown="handleCoverPointerDown(event, '${el.id}')"
          onclick="selectCoverElement('${el.id}')"
        >
          <div class="drag-handle-pill hidden absolute ${handlePosClass} px-2 py-0.5 rounded-md bg-brand-500 text-white text-[10px] font-bold items-center gap-1 shadow-lg pointer-events-auto cursor-grab active:cursor-grabbing select-none">
            <i data-lucide="move" class="w-3 h-3"></i><span>Mover</span>
          </div>
          <button class="cover-btn-text flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-6 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-brand-500 text-white font-bold text-xs shadow-xl shadow-brand-500/30 hover:scale-105 transition pointer-events-auto">
            <span contenteditable="true" oninput="handleCoverElementTextInput('${el.id}', this.innerText)">${el.text}</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i>
          </button>
        </div>
      `;
    }

    // Default: title, subtitle, author, custom_text
    const specificClass = el.id === 'title' ? 'cover-title-text' : (el.id === 'subtitle' ? 'cover-subtitle-text' : (el.id === 'author' ? 'cover-author-text' : 'cover-free-text'));
    return `
      <div 
        id="cover-el-${el.id}"
        class="cover-draggable-item ${isSel ? 'is-selected' : ''} ${specificClass}" 
        style="${customStyle}"
        onpointerdown="handleCoverPointerDown(event, '${el.id}')"
        onclick="selectCoverElement('${el.id}')"
      >
        <div class="drag-handle-pill hidden absolute ${handlePosClass} px-2 py-0.5 rounded-md bg-brand-500 text-white text-[10px] font-bold items-center gap-1 shadow-lg pointer-events-auto cursor-grab active:cursor-grabbing select-none">
          <i data-lucide="move" class="w-3 h-3"></i><span>Mover</span>
        </div>
        <div 
          contenteditable="true" 
          oninput="handleCoverElementTextInput('${el.id}', this.innerText)"
          class="cursor-text outline-none leading-tight"
        >${el.text}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      <!-- Interactive Freeform Cover Canvas -->
      <div 
        id="coverInteractiveCanvas" 
        class="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 aspect-video min-h-[220px] xs:min-h-[260px] sm:min-h-[320px] select-none" 
        style="background-color: ${cover.backgroundColor};"
      >
        <!-- Background Image -->
        <img id="coverPreviewImg" src="${cover.backgroundImage}" alt="Cover Background" class="absolute inset-0 w-full h-full object-cover transition duration-500 pointer-events-none select-none" onerror="this.src='https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1600&q=80'" />
        
        <!-- Dark Gradient Overlay -->
        <div id="coverOverlay" class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-950/40 pointer-events-none select-none" style="opacity: ${cover.overlayOpacity};"></div>

        <!-- Rendered Movable Elements Layer -->
        <div class="absolute inset-0 z-10 w-full h-full">
          ${elementsHtml}
        </div>
      </div>

      <!-- Canvas Action Bar & Quick Tools -->
      <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 shadow-xs">
        <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button onclick="addNewCoverText()" class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold transition shadow-md shadow-brand-500/20">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>Añadir Texto</span>
          </button>
          <button onclick="alignCoverElementCenter()" class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition">
            <i data-lucide="align-center" class="w-3.5 h-3.5 text-brand-500 dark:text-brand-400"></i>
            <span>Centrar</span>
          </button>
          <button onclick="resetCoverLayout()" class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-700 transition" title="Restablecer posiciones por defecto">
            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
            <span class="hidden sm:inline">Restablecer</span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="exportCoverToPng()" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-700 transition">
            <i data-lucide="download" class="w-3.5 h-3.5 text-brand-500 dark:text-brand-400"></i>
            <span>Exportar Banner PNG</span>
          </button>
        </div>
      </div>

      <!-- Quick Hint Banner -->
      <div class="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-700 dark:text-brand-300">
        <i data-lucide="sparkles" class="w-4 h-4 shrink-0 text-brand-500 dark:text-brand-400"></i>
        <span><strong>Lienzo de Portada Libre:</strong> Haz clic sobre cualquier elemento para seleccionarlo o arrastrarlo a cualquier posición. Usa la barra superior para cambiar su tipografía, tamaño de fuente y color en tiempo real.</span>
      </div>
    </div>
  `;
}

function renderCoverStickyToolbarHtml() {
  const cover = currentProject.cover;
  if (!cover) return '';
  const elements = ensureCoverElements(cover);
  const el = elements.find(item => item.id === selectedCoverElementId) || elements[0];
  if (!el) return '';

  const fonts = [
    { label: 'Playfair Display (Elegante)', val: 'Playfair Display' },
    { label: 'Inter (Moderna)', val: 'Inter' },
    { label: 'Montserrat (Geométrica)', val: 'Montserrat' },
    { label: 'Outfit (Vanguardista)', val: 'Outfit' },
    { label: 'Poppins (Amigable)', val: 'Poppins' },
    { label: 'Merriweather (Académica)', val: 'Merriweather' },
    { label: 'Bebas Neue (Impacto)', val: 'Bebas Neue' },
    { label: 'Great Vibes (Cursiva)', val: 'Great Vibes' },
    { label: 'Fira Code (Código)', val: 'Fira Code' },
    { label: 'Comic Neue (Casual)', val: 'Comic Neue' }
  ];

  const colors = [
    '#ffffff',
    '#AD3333',
    '#fbbf24',
    '#38bdf8',
    '#34d399',
    '#a855f7',
    '#94a3b8'
  ];

  return `
    <div class="flex items-center justify-between gap-3 text-xs overflow-x-auto no-scrollbar py-0.5 flex-nowrap w-full" style="touch-action: pan-x;">
      <!-- Left: Selected Element & Typography -->
      <div class="flex items-center gap-2 shrink-0">
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-500/20 border border-brand-500/30 text-brand-400 font-bold text-[11px] shrink-0">
          <i data-lucide="layers" class="w-3.5 h-3.5"></i>
          <span>${el.id === 'title' ? 'Título' : el.id === 'subtitle' ? 'Subtítulo' : el.id === 'badge' ? 'Insignia' : el.id === 'institution' ? 'Institución' : el.id === 'author' ? 'Autor' : el.id === 'startButton' ? 'Botón' : 'Texto Libre'}</span>
        </div>

        <!-- Font Family Dropdown -->
        <select 
          onchange="updateCoverElementProp('${el.id}', 'fontFamily', this.value)" 
          class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-brand-500 shrink-0"
        >
          ${fonts.map(f => `<option value="${f.val}" ${el.fontFamily === f.val ? 'selected' : ''}>${f.label}</option>`).join('')}
        </select>

        <!-- Font Size Stepper -->
        <div class="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
          <button onclick="stepCoverFontSize('${el.id}', -2)" class="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition">-</button>
          <span class="px-2.5 py-1 font-bold text-slate-800 dark:text-slate-200 text-[11px] min-w-[36px] text-center">${el.fontSize || 16}px</span>
          <button onclick="stepCoverFontSize('${el.id}', 2)" class="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition">+</button>
        </div>

        <!-- Styles: Bold, Italic, Underline -->
        <div class="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
          <button 
            onclick="toggleCoverElementStyle('${el.id}', 'bold')" 
            class="px-2.5 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition font-bold ${el.bold ? 'text-brand-500 bg-brand-500/10' : 'text-slate-600 dark:text-slate-400'}"
            title="Negrita"
          >B</button>
          <button 
            onclick="toggleCoverElementStyle('${el.id}', 'italic')" 
            class="px-2.5 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition italic ${el.italic ? 'text-brand-500 bg-brand-500/10' : 'text-slate-600 dark:text-slate-400'}"
            title="Cursiva"
          >I</button>
          <button 
            onclick="toggleCoverElementStyle('${el.id}', 'underline')" 
            class="px-2.5 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition underline ${el.underline ? 'text-brand-500 bg-brand-500/10' : 'text-slate-600 dark:text-slate-400'}"
            title="Subrayado"
          >U</button>
        </div>
      </div>

      <!-- Center: Color Swatches & Native Color Picker -->
      <div class="flex items-center gap-1.5 shrink-0">
        <span class="text-[11px] text-slate-500 font-medium mr-1">Color:</span>
        ${colors.map(c => `
          <button 
            onclick="updateCoverElementProp('${el.id}', 'color', '${c}')" 
            class="w-5 h-5 rounded-full border border-black/30 hover:scale-125 transition ${el.color === c ? 'ring-2 ring-brand-500 ring-offset-1' : ''}" 
            style="background-color: ${c};" 
            title="${c}"
          ></button>
        `).join('')}
        <label class="relative cursor-pointer w-5 h-5 rounded-full overflow-hidden border border-slate-400 dark:border-slate-600 flex items-center justify-center bg-gradient-to-tr from-rose-500 via-emerald-500 to-sky-500" title="Color personalizado">
          <input type="color" value="${el.color || '#ffffff'}" onchange="updateCoverElementProp('${el.id}', 'color', this.value)" class="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
        </label>
      </div>

      <!-- Right: Shadow & Actions -->
      <div class="flex items-center gap-2 shrink-0">
        <select 
          onchange="updateCoverElementProp('${el.id}', 'shadow', this.value)" 
          class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 text-[11px] font-medium focus:outline-none focus:border-brand-500"
          title="Sombra / Relieve"
        >
          <option value="none" ${el.shadow === 'none' ? 'selected' : ''}>Sin Sombra</option>
          <option value="sm" ${el.shadow === 'sm' ? 'selected' : ''}>Sombra Suave</option>
          <option value="md" ${el.shadow === 'md' ? 'selected' : ''}>Sombra Media</option>
          <option value="lg" ${el.shadow === 'lg' ? 'selected' : ''}>Sombra Fuerte</option>
          <option value="glow" ${el.shadow === 'glow' ? 'selected' : ''}>Resplandor</option>
        </select>

        <button onclick="alignCoverElementCenter()" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-semibold text-[11px] transition flex items-center gap-1" title="Centrar este elemento">
          <i data-lucide="align-center" class="w-3.5 h-3.5"></i>
          <span>Centrar</span>
        </button>

        ${el.id.startsWith('text-') ? `
          <button onclick="deleteCoverElement('${el.id}')" class="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition flex items-center gap-1" title="Eliminar este texto libre">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            <span>Eliminar</span>
          </button>
        ` : ''}

        <button onclick="addNewCoverText()" class="px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-bold text-[11px] transition flex items-center gap-1 shadow-sm">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          <span>+ Texto</span>
        </button>
      </div>
    </div>
  `;
}

function selectCoverElement(elId) {
  selectedCoverElementId = elId;
  highlightCoverSelectedDom(elId);
  updateCoverToolbar();
}

function updateCoverToolbar() {
  const toolbar = document.getElementById('coverStickyToolbarContainer');
  if (toolbar && !toolbar.classList.contains('hidden')) {
    toolbar.innerHTML = renderCoverStickyToolbarHtml();
    if (window.lucide) lucide.createIcons();
  }
}

function highlightCoverSelectedDom(elId) {
  document.querySelectorAll('.cover-draggable-item').forEach(node => {
    if (node.id === 'cover-el-' + elId) {
      node.classList.add('is-selected');
    } else {
      node.classList.remove('is-selected');
    }
  });
}

function handleCoverPointerDown(e, elId) {
  const isDragHandle = e.target.closest('.drag-handle-pill');
  const isInputOrEditable = e.target.isContentEditable || e.target.tagName === 'INPUT';

  selectedCoverElementId = elId;
  highlightCoverSelectedDom(elId);
  updateCoverToolbar();

  if (isInputOrEditable && !isDragHandle) {
    return;
  }

  e.preventDefault();
  const canvas = document.getElementById('coverInteractiveCanvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();

  const elements = ensureCoverElements(currentProject.cover);
  const el = elements.find(item => item.id === elId);
  if (!el) return;

  isDraggingCoverElement = true;
  coverDragData = {
    elId: elId,
    startX: e.clientX,
    startY: e.clientY,
    initialX: el.x,
    initialY: el.y,
    canvasRect: rect,
    hasMoved: false
  };

  window.addEventListener('pointermove', onCoverPointerMove);
  window.addEventListener('pointerup', onCoverPointerUp);
  window.addEventListener('pointercancel', onCoverPointerUp);
}

function onCoverPointerMove(e) {
  if (!isDraggingCoverElement || !coverDragData) return;
  const dx = e.clientX - coverDragData.startX;
  const dy = e.clientY - coverDragData.startY;
  if (!coverDragData.hasMoved && Math.hypot(dx, dy) > 2) {
    coverDragData.hasMoved = true;
  }
  if (!coverDragData.hasMoved) return;

  const dxPct = (dx / coverDragData.canvasRect.width) * 100;
  const dyPct = (dy / coverDragData.canvasRect.height) * 100;

  const elements = ensureCoverElements(currentProject.cover);
  const el = elements.find(item => item.id === coverDragData.elId);
  if (!el) return;

  const newX = Math.max(0, Math.min(92, Math.round((coverDragData.initialX + dxPct) * 10) / 10));
  const newY = Math.max(0, Math.min(92, Math.round((coverDragData.initialY + dyPct) * 10) / 10));

  el.x = newX;
  el.y = newY;

  const domEl = document.getElementById('cover-el-' + el.id);
  if (domEl) {
    domEl.style.left = newX + '%';
    domEl.style.top = newY + '%';
  }
}

function onCoverPointerUp(e) {
  if (!isDraggingCoverElement) return;
  isDraggingCoverElement = false;
  window.removeEventListener('pointermove', onCoverPointerMove);
  window.removeEventListener('pointerup', onCoverPointerUp);
  window.removeEventListener('pointercancel', onCoverPointerUp);
  if (coverDragData && coverDragData.hasMoved) {
    saveProjectState();
  }
  coverDragData = null;
}

function handleCoverElementTextInput(elId, newText) {
  const elements = ensureCoverElements(currentProject.cover);
  const el = elements.find(item => item.id === elId);
  if (!el) return;
  el.text = newText;

  if (el.id === 'title') {
    currentProject.cover.title = newText;
    currentProject.title = newText;
    const ti = document.getElementById('projectTitleInput');
    if (ti) ti.value = newText;
  } else if (el.id === 'subtitle') {
    currentProject.cover.subtitle = newText;
  } else if (el.id === 'badge') {
    currentProject.cover.badgeText = newText;
  } else if (el.id === 'institution') {
    currentProject.cover.institution = newText;
  } else if (el.id === 'author') {
    currentProject.cover.authorName = newText.replace(/^Autor:\s*/i, '');
  } else if (el.id === 'startButton') {
    currentProject.cover.startButtonText = newText;
  }
  saveProjectState();
}

function updateCoverElementProp(elId, prop, val) {
  const elements = ensureCoverElements(currentProject.cover);
  const el = elements.find(item => item.id === elId);
  if (!el) return;
  el[prop] = val;
  saveProjectState();
  renderEditor();
}

function stepCoverFontSize(elId, delta) {
  const elements = ensureCoverElements(currentProject.cover);
  const el = elements.find(item => item.id === elId);
  if (!el) return;
  el.fontSize = Math.max(10, Math.min(96, (el.fontSize || 16) + delta));
  saveProjectState();
  renderEditor();
}

function toggleCoverElementStyle(elId, styleKey) {
  const elements = ensureCoverElements(currentProject.cover);
  const el = elements.find(item => item.id === elId);
  if (!el) return;
  el[styleKey] = !el[styleKey];
  saveProjectState();
  renderEditor();
}

function alignCoverElementCenter() {
  const elements = ensureCoverElements(currentProject.cover);
  const el = elements.find(item => item.id === selectedCoverElementId) || elements[0];
  if (!el) return;
  el.x = 25;
  saveProjectState();
  renderEditor();
  showToast('Elemento centrado');
}

function addNewCoverText() {
  const elements = ensureCoverElements(currentProject.cover);
  const newId = 'text-' + Date.now();
  const newEl = {
    id: newId,
    type: 'custom_text',
    text: 'Nuevo Texto',
    x: 25 + Math.floor(Math.random() * 20),
    y: 40 + Math.floor(Math.random() * 20),
    fontSize: 22,
    fontFamily: 'Montserrat',
    color: '#ffffff',
    bold: true,
    italic: false,
    underline: false,
    shadow: 'md'
  };
  elements.push(newEl);
  selectedCoverElementId = newId;
  saveProjectState();
  renderEditor();
  showToast('Nuevo texto añadido a la portada');
}

function deleteCoverElement(elId) {
  const elements = ensureCoverElements(currentProject.cover);
  const idx = elements.findIndex(item => item.id === elId);
  if (idx !== -1) {
    elements.splice(idx, 1);
    selectedCoverElementId = 'title';
    saveProjectState();
    renderEditor();
    showToast('Elemento eliminado');
  }
}

function resetCoverLayout() {
  currentProject.cover.elements = [];
  ensureCoverElements(currentProject.cover);
  selectedCoverElementId = 'title';
  saveProjectState();
  renderEditor();
  showToast('Diseño y posiciones restablecidas');
}

function renderCoverDrawer() {
  const container = document.getElementById('coverDrawerControls');
  if (!container) return;
  const cover = currentProject.cover || {};

  container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div>
        <label class="block text-slate-300 font-semibold mb-1.5">Galería de Fondos Temáticos:</label>
        <div class="grid grid-cols-2 gap-2">
          <button onclick="setCoverBackground('https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1600&q=80')" class="h-20 rounded-xl overflow-hidden border border-slate-700 hover:border-brand-500 relative group">
            <img src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=300&q=80" class="w-full h-full object-cover" />
            <span class="absolute inset-0 bg-black/60 text-[10px] flex items-center justify-center font-bold text-white group-hover:bg-brand-500/80 transition">Geometría</span>
          </button>
          <button onclick="setCoverBackground('https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1600&q=80')" class="h-20 rounded-xl overflow-hidden border border-slate-700 hover:border-brand-500 relative group">
            <img src="https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=300&q=80" class="w-full h-full object-cover" />
            <span class="absolute inset-0 bg-black/60 text-[10px] flex items-center justify-center font-bold text-white group-hover:bg-brand-500/80 transition">Matemáticas</span>
          </button>
          <button onclick="setCoverBackground('https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1600&q=80')" class="h-20 rounded-xl overflow-hidden border border-slate-700 hover:border-brand-500 relative group">
            <img src="https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=300&q=80" class="w-full h-full object-cover" />
            <span class="absolute inset-0 bg-black/60 text-[10px] flex items-center justify-center font-bold text-white group-hover:bg-brand-500/80 transition">Arte Clásico</span>
          </button>
          <button onclick="setCoverBackground('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80')" class="h-20 rounded-xl overflow-hidden border border-slate-700 hover:border-brand-500 relative group">
            <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80" class="w-full h-full object-cover" />
            <span class="absolute inset-0 bg-black/60 text-[10px] flex items-center justify-center font-bold text-white group-hover:bg-brand-500/80 transition">Tecnología</span>
          </button>
        </div>
      </div>

      <div>
        <label class="block text-slate-300 font-semibold mb-1">O URL de imagen personalizada:</label>
        <input type="text" value="${cover.backgroundImage || ''}" onchange="setCoverBackground(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-brand-500 text-xs" placeholder="https://..." />
      </div>

      <div class="space-y-1.5">
        <div class="flex justify-between text-slate-300 font-semibold">
          <span>Oscurecimiento del Fondo:</span>
          <span id="opacityDrawerLabel">${Math.round((cover.overlayOpacity || 0.75) * 100)}%</span>
        </div>
        <input type="range" min="0" max="1" step="0.05" value="${cover.overlayOpacity || 0.75}" oninput="updateCoverOpacity(this.value)" class="w-full accent-brand-500 cursor-pointer" />
      </div>

      <div class="pt-2 border-t border-slate-800 flex flex-col gap-2">
        <button onclick="addNewCoverText()" class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition">
          <i data-lucide="plus" class="w-4 h-4 text-brand-400"></i>
          <span>+ Añadir Texto Libre</span>
        </button>
        <button onclick="exportCoverToPng()" class="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-500/20">
          <i data-lucide="image-down" class="w-4 h-4"></i>
          <span>Descargar Portada en PNG</span>
        </button>
      </div>
    </div>
  `;
}

function setCoverBackground(url) {
  currentProject.cover.backgroundImage = url;
  const img = document.getElementById('coverPreviewImg');
  if (img) img.src = url;
  saveProjectState();
  showToast('Fondo actualizado');
}

function updateCoverOpacity(val) {
  currentProject.cover.overlayOpacity = parseFloat(val);
  const overlay = document.getElementById('coverOverlay');
  if (overlay) overlay.style.opacity = val;
  const label = document.getElementById('opacityDrawerLabel');
  if (label) label.innerText = Math.round(val * 100) + '%';
  saveProjectState();
}

function exportCoverToPng() {
  const canvas = document.getElementById('coverExportCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cover = currentProject.cover || {};
  const elements = ensureCoverElements(cover);

  ctx.fillStyle = cover.backgroundColor || '#0f172a';
  ctx.fillRect(0, 0, 1280, 720);

  const drawElements = () => {
    // Gradient overlay
    const gradient = ctx.createLinearGradient(0, 0, 0, 720);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.5)');
    gradient.addColorStop(0.5, `rgba(15, 23, 42, ${cover.overlayOpacity || 0.75})`);
    gradient.addColorStop(1, 'rgba(10, 15, 29, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);

    // Draw elements
    elements.forEach(el => {
      const pxX = (el.x / 100) * 1280;
      const pxY = (el.y / 100) * 720;
      const scaledFontSize = Math.round(el.fontSize * 1.35);

      ctx.save();
      ctx.fillStyle = el.color || '#ffffff';
      ctx.font = `${el.bold ? 'bold ' : ''}${el.italic ? 'italic ' : ''}${scaledFontSize}px ${el.fontFamily || 'Inter'}, sans-serif`;

      if (el.shadow && el.shadow !== 'none') {
        ctx.shadowColor = el.shadow === 'glow' ? 'rgba(173,51,51,0.9)' : 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = el.shadow === 'lg' ? 12 : 6;
        ctx.shadowOffsetY = 3;
      }

      if (el.type === 'badge') {
        ctx.fillStyle = '#AD3333';
        ctx.beginPath();
        ctx.roundRect(pxX - 8, pxY - 18, 300, 32, 16);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(el.text, pxX + 12, pxY + 4);
      } else if (el.type === 'button') {
        ctx.fillStyle = '#AD3333';
        ctx.beginPath();
        ctx.roundRect(pxX - 12, pxY - 22, 220, 44, 22);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(el.text, pxX + 16, pxY + 6);
      } else {
        ctx.fillText(el.text, pxX, pxY + scaledFontSize * 0.8);
      }
      ctx.restore();
    });

    const a = document.createElement('a');
    a.download = ((currentProject.title || 'portada').toLowerCase().replace(/[^a-z0-9]/g, '-')) + '-banner.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    showToast('Portada descargada como imagen PNG');
  };

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.drawImage(img, 0, 0, 1280, 720);
    drawElements();
  };
  img.onerror = () => {
    const bgGrad = ctx.createLinearGradient(0, 0, 1280, 720);
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1280, 720);
    drawElements();
  };
  img.src = cover.backgroundImage;
}
