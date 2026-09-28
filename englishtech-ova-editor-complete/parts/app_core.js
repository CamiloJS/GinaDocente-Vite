// EnglishTech OVA Studio Core Application Logic
let currentProject = null;
let activePageIndex = 0;
let activeSubSlideIndex = 0;
let appMode = 'editor'; // 'editor' | 'viewer'
let currentDockTab = 'pages'; // 'pages' | 'elements' | 'cover' | 'settings'
let isDrawerCollapsed = false;
let isEditUnlocked = true; // Governs whether user can enter editor mode
const isEmbedded = window.parent && window.parent !== window;

// Toast Notifications System
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const icon = type === 'success' ? 'check-circle-2' : (type === 'error' ? 'alert-circle' : 'info');
  const colors = type === 'success' 
    ? 'bg-slate-900 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10'
    : (type === 'error' 
      ? 'bg-slate-900 border-rose-500/40 text-rose-300 shadow-rose-500/10'
      : 'bg-slate-900 border-blue-500/40 text-blue-300 shadow-blue-500/10');

  toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl text-xs font-semibold ${colors} transition-all duration-300 opacity-0 translate-y-2`;
  toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4 shrink-0"></i><span>${message}</span>`;
  container.appendChild(toast);

  if (window.lucide) lucide.createIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');
  });

  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Custom Dialog Replacements (Non-AI Feel)
function showCustomConfirm(title, desc, onConfirm) {
  const modal = document.getElementById('customConfirmModal');
  document.getElementById('confirmModalTitle').innerText = title;
  document.getElementById('confirmModalDesc').innerText = desc;
  modal.classList.remove('hidden');

  const btnOk = document.getElementById('btnConfirmOk');
  const btnCancel = document.getElementById('btnConfirmCancel');

  const cleanup = () => {
    modal.classList.add('hidden');
    btnOk.onclick = null;
    btnCancel.onclick = null;
  };

  btnOk.onclick = () => {
    cleanup();
    if (onConfirm) onConfirm();
  };
  btnCancel.onclick = cleanup;
}

function showCustomPrompt(title, desc, defaultValue, onConfirm) {
  const modal = document.getElementById('customPromptModal');
  const input = document.getElementById('promptModalInput');
  document.getElementById('promptModalTitle').innerText = title;
  document.getElementById('promptModalDesc').innerText = desc;
  input.value = defaultValue || '';
  modal.classList.remove('hidden');
  input.focus();

  const btnOk = document.getElementById('btnPromptOk');
  const btnCancel = document.getElementById('btnPromptCancel');

  const cleanup = () => {
    modal.classList.add('hidden');
    btnOk.onclick = null;
    btnCancel.onclick = null;
  };

  btnOk.onclick = () => {
    const val = input.value.trim();
    cleanup();
    if (val && onConfirm) onConfirm(val);
  };
  btnCancel.onclick = cleanup;
}

// 4-Digit PIN Verification for Edit Locking
function showPinUnlockModal(onSuccess) {
  const modal = document.getElementById('customPinModal');
  const input = document.getElementById('pinModalInput');
  const err = document.getElementById('pinModalError');
  if (!modal || !input) return;

  input.value = '';
  if (err) err.classList.add('hidden');
  input.classList.remove('border-rose-500');
  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 80);

  const btnOk = document.getElementById('btnPinSubmit');
  const btnCancel = document.getElementById('btnPinCancel');

  const cleanup = () => {
    modal.classList.add('hidden');
    btnOk.onclick = null;
    btnCancel.onclick = null;
    input.onkeydown = null;
  };

  const submitPin = () => {
    const entered = (input.value || '').trim();
    const actualPin = String(currentProject?.editPin || '1234').trim();
    if (entered === actualPin) {
      cleanup();
      isEditUnlocked = true;
      if (onSuccess) {
        onSuccess();
      } else {
        setAppMode('editor');
      }
      showToast('¡Edición desbloqueada con éxito!', 'success');
      if (isEmbedded) {
        try {
          window.parent.postMessage({ type: 'OVA_PIN_UNLOCKED', id: currentProject?.id }, '*');
        } catch (e) {}
      }
    } else {
      if (err) err.classList.remove('hidden');
      input.classList.add('border-rose-500');
      input.select();
    }
  };

  btnOk.onclick = submitPin;
  input.onkeydown = (e) => {
    if (e.key === 'Enter') submitPin();
    if (e.key === 'Escape') cleanup();
  };
  btnCancel.onclick = cleanup;
}

function handleViewerSwitchToEditor() {
  if (isEditUnlocked) {
    setAppMode('editor');
  } else {
    showPinUnlockModal(() => setAppMode('editor'));
  }
}

// Fullscreen capability
function toggleFullScreen() {
  try {
    if (!document.fullscreenElement) {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => {});
    }
  } catch (e) {}
}

// Copy Shareable Link
function copyShareableLink() {
  try {
    if (isEmbedded) {
      try {
        window.parent.postMessage({ type: 'COPY_SHARE_LINK', id: currentProject?.id }, '*');
      } catch (e) {}
    }
    let url = window.location.href;
    if (isEmbedded) {
      let parentUrl = '';
      try {
        parentUrl = window.parent.location.href.split('#')[0].split('?')[0];
      } catch (e) {
        parentUrl = document.referrer ? document.referrer.split('#')[0].split('?')[0] : window.location.origin;
      }
      const ovaId = currentProject?.id || 'golden-ratio';
      url = `${parentUrl}#ova?id=${encodeURIComponent(ovaId)}`;
    } else {
      const base = window.location.origin + window.location.pathname;
      const ovaId = currentProject?.id || 'golden-ratio';
      url = `${base}?id=${encodeURIComponent(ovaId)}&mode=viewer&locked=true`;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('Enlace público copiado al portapapeles', 'success');
      }).catch(() => {
        prompt('Copia este enlace para compartir:', url);
      });
    } else {
      prompt('Copia este enlace para compartir:', url);
    }
  } catch (e) {
    showToast('Enlace listo para compartir', 'info');
  }
}

// Safe LocalStorage helpers for cross-origin / mobile iframe security restrictions
function safeGetStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
}

// Initial Data Bootstrapping
function initApp() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'viewer') {
    appMode = 'viewer';
  }
  if (urlParams.get('locked') === '1' || urlParams.get('locked') === 'true') {
    isEditUnlocked = false;
  }
  if (urlParams.get('unlocked') === '1' || urlParams.get('unlocked') === 'true') {
    isEditUnlocked = true;
  }

  const saved = safeGetStorage('englishTech_ova_project');
  if (saved) {
    try {
      currentProject = JSON.parse(saved);
      if (!currentProject.pages || !Array.isArray(currentProject.pages) || currentProject.pages.length === 0) {
        throw new Error('Invalid project structure in cache');
      }
      // If cached project lacks the 'Actividades' section, refresh with modern template
      if (!currentProject.pages.some(p => p.id === 'page-activities' || p.title === 'Actividades')) {
        currentProject = JSON.parse(JSON.stringify(window.DEFAULT_GOLDEN_RATIO_OVA));
        safeSetStorage('englishTech_ova_project', JSON.stringify(currentProject));
      }
    } catch (e) {
      console.warn('Could not parse saved OVA, loading default template', e);
      currentProject = JSON.parse(JSON.stringify(window.DEFAULT_GOLDEN_RATIO_OVA));
    }
  } else {
    currentProject = JSON.parse(JSON.stringify(window.DEFAULT_GOLDEN_RATIO_OVA));
  }

  // Defensive sanity check on all pages
  if (!currentProject.cover) {
    currentProject.cover = JSON.parse(JSON.stringify(window.DEFAULT_GOLDEN_RATIO_OVA.cover));
  }
  if (!currentProject.editPin) {
    currentProject.editPin = '1234';
  }
  currentProject.pages.forEach(p => {
    if (!p.subSlides || !Array.isArray(p.subSlides) || p.subSlides.length === 0) {
      p.subSlides = [{ id: 'slide-' + Date.now(), title: 'Página 1', blocks: [] }];
    }
    p.subSlides.forEach(s => {
      if (!s.blocks || !Array.isArray(s.blocks)) s.blocks = [];
    });
  });

  if (window.innerWidth <= 1024) {
    isDrawerCollapsed = true;
  }

  // Restore Theme with full fallback support
  const savedTheme = safeGetStorage('englishTech_theme');
  const urlTheme = urlParams.get('theme');
  let isDark = true;
  if (urlTheme) {
    isDark = urlTheme !== 'light';
  } else if (savedTheme) {
    isDark = savedTheme !== 'light';
  } else {
    // Default to dark mode for OVA Studio
    isDark = true;
  }

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  updateThemeUI(isDark);

  window.addEventListener('resize', () => {
    const backdrop = document.getElementById('drawerBackdrop');
    if (backdrop) {
      if (window.innerWidth <= 1024 && !isDrawerCollapsed) {
        backdrop.classList.remove('is-backdrop-hidden');
      } else {
        backdrop.classList.add('is-backdrop-hidden');
      }
    }
  });

  // Setup PostMessage listener for two-way integration
  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;
    const { type, project, mode, unlocked, isTeacher, theme, isDarkMode: incomingIsDark } = event.data;

    if (type === 'SET_THEME') {
      const wantDark = (typeof incomingIsDark !== 'undefined') ? !!incomingIsDark : (theme !== 'light');
      if (wantDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      safeSetStorage('englishTech_theme', wantDark ? 'dark' : 'light');
      updateThemeUI(wantDark);
    } else if (type === 'LOAD_PROJECT' && project) {
      currentProject = project;
      if (!currentProject.editPin) currentProject.editPin = '1234';
      if (typeof isTeacher !== 'undefined' || typeof unlocked !== 'undefined') {
        isEditUnlocked = !!(isTeacher || unlocked);
      }
      if (mode) appMode = mode;
      if (typeof theme !== 'undefined' || typeof incomingIsDark !== 'undefined') {
        const wantDark = (typeof incomingIsDark !== 'undefined') ? !!incomingIsDark : (theme !== 'light');
        if (wantDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        updateThemeUI(wantDark);
      }
      renderApp();
    } else if (type === 'SET_MODE' && mode) {
      setAppMode(mode);
    } else if (type === 'SET_UNLOCKED') {
      isEditUnlocked = !!unlocked;
      if (mode) appMode = mode;
      renderApp();
    } else if (type === 'REQUEST_PROJECT') {
      if (isEmbedded) {
        window.parent.postMessage({ type: 'CURRENT_PROJECT', project: currentProject }, '*');
      }
    }
  });

  // Notify parent if embedded that child is ready
  if (isEmbedded) {
    try {
      window.parent.postMessage({ type: 'OVA_READY' }, '*');
    } catch (e) {}
  }

  renderApp();
}

function saveProjectState() {
  try {
    currentProject.updatedAt = new Date().toISOString().split('T')[0];
    safeSetStorage('englishTech_ova_project', JSON.stringify(currentProject));
    
    // Animate auto-save indicator
    const ind = document.getElementById('saveStatusIndicator');
    if (ind) {
      ind.classList.remove('hidden');
      ind.classList.add('animate-pulse');
      setTimeout(() => ind.classList.remove('animate-pulse'), 800);
    }

    // Bidirectional notification to parent container
    if (isEmbedded) {
      try {
        window.parent.postMessage({ type: 'OVA_SAVED', project: currentProject }, '*');
      } catch (e) {}
    }
  } catch (e) {
    console.error('Error saving project to localStorage', e);
  }
}

function renderApp() {
  const titleInput = document.getElementById('projectTitleInput');
  if (titleInput) titleInput.value = currentProject.title || '';

  const btnUnlock = document.getElementById('btnUnlockEdit');
  const viewerBtnSwitch = document.getElementById('viewerBtnSwitchEditor');
  const viewerEditIcon = document.getElementById('viewerEditIcon');
  const viewerEditText = document.getElementById('viewerEditText');

  if (!isEditUnlocked) {
    if (btnUnlock) btnUnlock.classList.remove('hidden');
    if (viewerBtnSwitch) {
      viewerBtnSwitch.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-300 border border-amber-500/30 transition shadow-xs';
    }
    if (viewerEditIcon) viewerEditIcon.setAttribute('data-lucide', 'lock');
    if (viewerEditText) viewerEditText.innerText = 'Editar con PIN';
  } else {
    if (btnUnlock) btnUnlock.classList.add('hidden');
    if (viewerBtnSwitch) {
      viewerBtnSwitch.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition';
    }
    if (viewerEditIcon) viewerEditIcon.setAttribute('data-lucide', 'edit-3');
    if (viewerEditText) viewerEditText.innerText = 'Modo Editor';
  }

  if (!isEditUnlocked && appMode === 'editor') {
    appMode = 'viewer';
  }

  if (appMode === 'editor') {
    document.getElementById('editorContainer').classList.remove('hidden');
    document.getElementById('viewerContainer').classList.add('hidden');
    document.getElementById('btnModeEditor').className = 'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition bg-brand-500 text-white shadow-sm';
    document.getElementById('btnModeViewer').className = 'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition text-slate-400 hover:text-white';

    const drawer = document.getElementById('canvaDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    const icon = document.getElementById('drawerCollapseIcon');
    if (drawer) {
      if (isDrawerCollapsed) {
        drawer.classList.add('is-drawer-closed');
      } else {
        drawer.classList.remove('is-drawer-closed');
      }
    }
    if (backdrop) {
      if (isDrawerCollapsed || window.innerWidth > 1024) {
        backdrop.classList.add('is-backdrop-hidden');
      } else {
        backdrop.classList.remove('is-backdrop-hidden');
      }
    }
    if (icon) icon.setAttribute('data-lucide', isDrawerCollapsed ? 'panel-left-open' : 'panel-left-close');

    renderEditor();
  } else {
    document.getElementById('editorContainer').classList.add('hidden');
    document.getElementById('viewerContainer').classList.remove('hidden');
    document.getElementById('btnModeViewer').className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition bg-brand-500 text-white shadow-sm';
    document.getElementById('btnModeEditor').className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition text-slate-400 hover:text-white';
    renderViewer();
  }

  if (window.lucide) lucide.createIcons();
}

function setAppMode(mode) {
  if (mode === 'editor' && !isEditUnlocked) {
    showPinUnlockModal(() => {
      appMode = 'editor';
      renderApp();
    });
    return;
  }
  appMode = mode;
  renderApp();
  if (mode === 'viewer') {
    showToast('Visualizando como estudiante', 'info');
  }
}

function updateThemeUI(isDark) {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.title = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    btn.innerHTML = isDark 
      ? '<i data-lucide="sun" class="w-4 h-4 text-amber-400"></i>' 
      : '<i data-lucide="moon" class="w-4 h-4 text-indigo-600"></i>';
    if (window.lucide) lucide.createIcons();
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  safeSetStorage('englishTech_theme', isDark ? 'dark' : 'light');
  updateThemeUI(isDark);
  showToast(isDark ? 'Modo Oscuro activado' : 'Modo Claro activado', 'info');
}

function updateProjectTitle(val) {
  currentProject.title = val;
  if (currentProject.cover) {
    currentProject.cover.title = val;
  }
  saveProjectState();
}

function toggleExportMenu() {
  const menu = document.getElementById('exportMenu');
  if (menu) menu.classList.toggle('hidden');
}

// Close export menu when clicking outside
document.addEventListener('click', (e) => {
  const container = document.getElementById('exportDropdownContainer');
  const menu = document.getElementById('exportMenu');
  if (container && menu && !container.contains(e.target)) {
    menu.classList.add('hidden');
  }
});

