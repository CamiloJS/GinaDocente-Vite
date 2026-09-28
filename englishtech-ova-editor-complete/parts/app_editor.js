// Canva Navigation & Drawer Logic
function switchDockTab(tabId) {
  const isMobile = window.innerWidth <= 1024;

  // If user clicked same tab on mobile and drawer is already open, toggle it closed
  if (isMobile && currentDockTab === tabId && !isDrawerCollapsed) {
    closeDrawerMobile();
    return;
  }

  currentDockTab = tabId;
  
  // If user clicked 'cover', automatically navigate to Cover page (index 0)
  if (tabId === 'cover' && currentProject.pages && currentProject.pages.length > 0) {
    if (currentProject.pages[activePageIndex].type !== 'cover') {
      const coverIdx = currentProject.pages.findIndex(p => p.type === 'cover');
      if (coverIdx !== -1) {
        activePageIndex = coverIdx;
        activeSubSlideIndex = 0;
        renderEditor();
      }
    }
  }

  // Ensure drawer is open when switching tab
  if (isDrawerCollapsed) {
    openDrawer();
  }

  // Update Dock buttons styling
  ['pages', 'elements', 'cover', 'settings'].forEach(t => {
    const btn = document.getElementById('dockBtn' + t.charAt(0).toUpperCase() + t.slice(1));
    const tab = document.getElementById('drawerTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (t === tabId) {
      if (btn) btn.className = 'dock-btn w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-[9px] sm:text-[10px] font-bold gap-0.5 transition bg-brand-500 text-white shadow-md shadow-brand-500/20';
      if (tab) tab.classList.remove('hidden');
    } else {
      if (btn) btn.className = 'dock-btn w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-[9px] sm:text-[10px] font-medium gap-0.5 transition text-slate-400 hover:text-white hover:bg-slate-800';
      if (tab) tab.classList.add('hidden');
    }
  });

  if (tabId === 'cover') {
    renderCoverDrawer();
  } else if (tabId === 'settings') {
    renderSettingsDrawer();
  }

  if (window.lucide) lucide.createIcons();
}

function openDrawer() {
  const drawer = document.getElementById('canvaDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const icon = document.getElementById('drawerCollapseIcon');
  isDrawerCollapsed = false;

  if (drawer) {
    drawer.classList.remove('is-drawer-closed');
  }
  if (backdrop && window.innerWidth <= 1024) {
    backdrop.classList.remove('is-backdrop-hidden');
  }
  if (icon) icon.setAttribute('data-lucide', 'panel-left-close');
  if (window.lucide) lucide.createIcons();
}

function closeDrawerMobile() {
  const drawer = document.getElementById('canvaDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const icon = document.getElementById('drawerCollapseIcon');
  isDrawerCollapsed = true;

  if (drawer) {
    drawer.classList.add('is-drawer-closed');
  }
  if (backdrop) {
    backdrop.classList.add('is-backdrop-hidden');
  }
  if (icon) icon.setAttribute('data-lucide', 'panel-left-open');
  if (window.lucide) lucide.createIcons();
}

function toggleDrawerCollapse() {
  if (isDrawerCollapsed) {
    openDrawer();
  } else {
    closeDrawerMobile();
  }
}

function renderEditor() {
  if (!currentProject.pages || currentProject.pages.length === 0) {
    document.getElementById('canvasContentArea').innerHTML = '<div class="text-center p-12 text-slate-500">No hay páginas. Añade una sección para comenzar.</div>';
    return;
  }

  if (activePageIndex >= currentProject.pages.length) {
    activePageIndex = currentProject.pages.length - 1;
  }
  if (activePageIndex < 0) {
    activePageIndex = 0;
  }
  const page = currentProject.pages[activePageIndex];

  // Make sure subSlides exist
  if (!page.subSlides || page.subSlides.length === 0) {
    page.subSlides = [{ id: 'slide-' + Date.now(), title: 'Página 1', blocks: [] }];
    activeSubSlideIndex = 0;
  }
  if (activeSubSlideIndex >= page.subSlides.length) {
    activeSubSlideIndex = page.subSlides.length - 1;
  }

  // Context bar
  const badge = document.getElementById('canvasSectionBadge');
  if (badge) badge.innerText = getPageTypeLabel(page.type);

  const titleInput = document.getElementById('sectionTitleInput');
  if (titleInput) titleInput.value = page.title;

  renderPageTreeList();
  renderSubSlidesTabs();

  // Canvas Area: Always render content blocks, and if cover, render Canva Banner on top!
  const canvas = document.getElementById('canvasContentArea');
  if (page.type === 'cover') {
    const docStickyToolbar = document.getElementById('docStickyToolbarContainer');
    if (docStickyToolbar) {
      docStickyToolbar.classList.add('hidden');
      docStickyToolbar.innerHTML = '';
    }
    const coverStickyToolbar = document.getElementById('coverStickyToolbarContainer');
    if (coverStickyToolbar) {
      coverStickyToolbar.classList.remove('hidden');
      coverStickyToolbar.innerHTML = renderCoverStickyToolbarHtml();
    }
    canvas.innerHTML = `
      <div class="space-y-8">
        ${renderCoverCanvaEditor()}
        <div class="pt-6 border-t border-slate-800/80">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <i data-lucide="layers" class="w-4 h-4 text-brand-400"></i>
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">Contenido Adicional de la Portada</h3>
            </div>
            <button onclick="switchDockTab('elements')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition">
              <i data-lucide="plus" class="w-3.5 h-3.5 text-brand-400"></i>
              <span>Añadir Bloque aquí</span>
            </button>
          </div>
          ${renderSubSlideBlocksEditor(true)}
        </div>
      </div>
    `;
  } else if (page.type === 'activity' || page.id === 'page-activities') {
    const coverStickyToolbar = document.getElementById('coverStickyToolbarContainer');
    if (coverStickyToolbar) {
      coverStickyToolbar.classList.add('hidden');
      coverStickyToolbar.innerHTML = '';
    }
    const docStickyToolbar = document.getElementById('docStickyToolbarContainer');
    if (docStickyToolbar) {
      docStickyToolbar.classList.remove('hidden');
      docStickyToolbar.innerHTML = renderDocumentToolbarHtml();
    }
    canvas.innerHTML = renderDocumentSheetEditor();
  } else {
    const docStickyToolbar = document.getElementById('docStickyToolbarContainer');
    if (docStickyToolbar) {
      docStickyToolbar.classList.add('hidden');
      docStickyToolbar.innerHTML = '';
    }
    const coverStickyToolbar = document.getElementById('coverStickyToolbarContainer');
    if (coverStickyToolbar) {
      coverStickyToolbar.classList.add('hidden');
      coverStickyToolbar.innerHTML = '';
    }
    canvas.innerHTML = renderSubSlideBlocksEditor(false);
  }

  renderAllKaTeX();
  if (window.lucide) lucide.createIcons();
}

function getPageTypeLabel(type) {
  const map = {
    cover: 'Portada',
    objectives: 'Objetivos',
    content: 'Contenido',
    activity: 'Actividades',
    conclusion: 'Conclusión',
    credits: 'Créditos',
    copyright: 'Derechos'
  };
  return map[type] || 'Página';
}

function getPageIcon(type) {
  const map = {
    cover: 'sparkles',
    objectives: 'target',
    content: 'book-open',
    activity: 'file-text',
    conclusion: 'award',
    credits: 'users',
    copyright: 'shield-check'
  };
  return map[type] || 'file-text';
}

function renderPageTreeList() {
  const container = document.getElementById('pageTreeList');
  if (!container) return;

  let html = '';
  currentProject.pages.forEach((page, idx) => {
    const isActive = idx === activePageIndex;
    const subCount = page.subSlides ? page.subSlides.length : 0;
    const iconName = getPageIcon(page.type);

    html += `
      <div class="group relative rounded-2xl transition border ${isActive ? 'bg-brand-500/10 border-brand-500/50 shadow-md shadow-brand-500/5' : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'} p-3">
        <div class="flex items-center justify-between gap-2 cursor-pointer" onclick="selectPage(${idx})">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-brand-500 text-white shadow-sm' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'}">
              <i data-lucide="${iconName}" class="w-4 h-4"></i>
            </div>
            <div class="min-w-0">
              <div class="text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-200'}">${page.title}</div>
              <div class="text-[10px] text-slate-400 flex items-center gap-1.5">
                <span>${getPageTypeLabel(page.type)}</span>
                ${subCount > 1 ? `<span class="text-brand-400 font-semibold">• ${subCount} diapositivas</span>` : ''}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 shrink-0 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition">
            <button onclick="event.stopPropagation(); movePage(${idx}, -1)" title="Mover arriba" ${idx === 0 ? 'disabled' : ''} class="p-1 rounded-lg transition ${idx === 0 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800'}">
              <i data-lucide="chevron-up" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="event.stopPropagation(); movePage(${idx}, 1)" title="Mover abajo" ${idx === currentProject.pages.length - 1 ? 'disabled' : ''} class="p-1 rounded-lg transition ${idx === currentProject.pages.length - 1 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800'}">
              <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="event.stopPropagation(); deletePage(${idx})" title="Eliminar sección" class="p-1 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg text-slate-500 transition">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderSubSlidesTabs() {
  const container = document.getElementById('subSlidesTabsContainer');
  if (!container) return;

  const page = currentProject.pages[activePageIndex];
  if (!page.subSlides || page.subSlides.length === 0) {
    page.subSlides = [{ id: 'slide-' + Date.now(), title: page.type === 'activity' ? 'Hoja 1' : 'Página 1', blocks: [] }];
  }

  if (activeSubSlideIndex >= page.subSlides.length) {
    activeSubSlideIndex = page.subSlides.length - 1;
  }

  const isActivity = page.type === 'activity' || page.id === 'page-activities';

  let html = '';
  page.subSlides.forEach((slide, sIdx) => {
    const isActive = sIdx === activeSubSlideIndex;
    const label = isActivity ? `Hoja ${sIdx + 1}${slide.title && slide.title !== 'Hoja ' + (sIdx+1) ? ': ' + slide.title : ''}` : `${sIdx + 1}. ${slide.title || 'Diapositiva'}`;
    html += `
      <div class="flex items-center shrink-0">
        <button onclick="selectSubSlide(${sIdx})" class="px-3 py-1 rounded-xl text-xs transition flex items-center gap-1.5 ${isActive ? 'bg-brand-500 text-white font-bold shadow-sm shadow-brand-500/25' : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-medium'}">
          <i data-lucide="${isActivity ? 'file-text' : 'layers'}" class="w-3.5 h-3.5 opacity-80"></i>
          <span>${label}</span>
          ${page.subSlides.length > 1 ? `
            <span onclick="event.stopPropagation(); deleteSubSlide(${sIdx})" title="${isActivity ? 'Eliminar hoja de trabajo' : 'Eliminar sub-página'}" class="hover:text-rose-300 ml-1 text-sm font-bold">×</span>
          ` : ''}
        </button>
      </div>
    `;
  });

  if (isActivity) {
    html += `
      <button onclick="insertNewWorksheet()" title="Crear e insertar una nueva hoja de trabajo en blanco" class="px-3 py-1 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-brand-500/25">
        <i data-lucide="file-plus-2" class="w-3.5 h-3.5"></i>
        <span>+ Insertar Hoja</span>
      </button>
    `;
  } else {
    html += `
      <button onclick="addNewSubSlide()" title="Añadir nueva sub-página / diapositiva interna" class="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-dashed border-slate-700 transition flex items-center gap-1">
        <i data-lucide="plus" class="w-3.5 h-3.5"></i>
        <span>Sub-página</span>
      </button>
    `;
  }

  container.innerHTML = html;
}

function insertNewWorksheet() {
  const page = currentProject.pages[activePageIndex];
  if (!page.subSlides) page.subSlides = [];
  const nextNum = page.subSlides.length + 1;
  page.subSlides.push({
    id: 'sheet-' + Date.now(),
    title: 'Hoja ' + nextNum,
    blocks: [
      {
        id: 'blk-' + Date.now(),
        type: 'text',
        content: `<h2 class="font-playfair text-2xl font-bold text-brand-600 dark:text-brand-400 mb-2">Hoja de Trabajo ${nextNum}</h2><p class="font-inter text-base text-slate-700 dark:text-slate-300">Comienza a redactar en esta nueva hoja de actividades o inserta recursos didácticos de Genially, Educaplay o YouTube...</p>`
      }
    ]
  });
  activeSubSlideIndex = page.subSlides.length - 1;
  saveProjectState();
  renderEditor();
  showToast(`Nueva Hoja de Trabajo (${nextNum}) añadida con éxito`);
}

function renderSettingsDrawer() {
  const container = document.getElementById('settingsDrawerControls');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div>
        <label class="block text-slate-300 font-semibold mb-1">Materia o Asignatura:</label>
        <input type="text" value="${currentProject.subject || ''}" oninput="currentProject.subject = this.value; saveProjectState();" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-brand-500" placeholder="Ej: Matemáticas" />
      </div>

      <div>
        <label class="block text-slate-300 font-semibold mb-1">Autor Principal:</label>
        <input type="text" value="${currentProject.author || ''}" oninput="currentProject.author = this.value; saveProjectState();" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-brand-500" />
      </div>

      <div>
        <label class="block text-slate-300 font-semibold mb-1">Descripción del OVA:</label>
        <textarea rows="3" oninput="currentProject.description = this.value; saveProjectState();" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-brand-500 custom-scrollbar">${currentProject.description || ''}</textarea>
      </div>

      <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
        <label class="block text-amber-400 font-bold mb-0.5 flex items-center gap-1.5">
          <i data-lucide="lock" class="w-3.5 h-3.5"></i>
          <span>Código PIN de Edición (4 dígitos):</span>
        </label>
        <p class="text-[10px] text-slate-400">Protege la autoría. Si compartes el enlace público, los visitantes solo podrán ver el OVA a menos que ingresen este código.</p>
        <input 
          type="text" 
          maxlength="4" 
          pattern="[0-9]*" 
          value="${currentProject.editPin || '1234'}" 
          oninput="currentProject.editPin = (this.value || '').replace(/\\D/g, '').slice(0, 4); saveProjectState();" 
          class="w-32 text-center bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono tracking-widest text-sm font-bold focus:outline-none focus:border-amber-500" 
          placeholder="1234" 
        />
      </div>

      <div class="pt-2">
        <button onclick="downloadStandaloneHtml()" class="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-500/20">
          <i data-lucide="download-cloud" class="w-4 h-4"></i>
          <span>Descargar Paquete OVA</span>
        </button>
      </div>
    </div>
  `;
}
