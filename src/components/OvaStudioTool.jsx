// src/components/OvaStudioTool.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BookOpen, Plus, Trash2, Copy, Lock, Unlock, Maximize2, Minimize2,
  CheckCircle2, Share2, RotateCcw, FileText, Layers, Download,
  Search, X, ChevronDown, Sliders, Eye, Loader2, Sparkles, AlertTriangle
} from './Icons.jsx';
import goldenRatioTemplate from '../templates/goldenRatioOva.json';
import { db, appId, collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, limit } from '../firebase/config.js';

export default function OvaStudioTool({
  isDarkMode = false,
  showMessage = () => {},
  user = null,
  role = 'teacher',
  db: propDb = null,
  appId: propAppId = null
}) {
  const firestoreDb = propDb || db;
  const activeAppId = propAppId || appId;

  const [ovas, setOvas] = useState(() => {
    try {
      const cached = localStorage.getItem('englishTech_ovas');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    // Seed with goldenRatioTemplate
    const seed = { ...goldenRatioTemplate, id: 'ova-golden-ratio-01', editPin: '1234' };
    return [seed];
  });

  const [selectedOvaId, setSelectedOvaId] = useState(() => ovas[0]?.id || 'ova-golden-ratio-01');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'saving' | 'local'
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isIframeReady, setIsIframeReady] = useState(false);

  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  const currentOva = useMemo(() => {
    return ovas.find(o => o.id === selectedOvaId) || ovas[0] || null;
  }, [ovas, selectedOvaId]);

  const currentOvaRef = useRef(currentOva);
  useEffect(() => {
    currentOvaRef.current = currentOva;
  }, [currentOva]);

  // Load OVAs from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    const fetchOvas = async () => {
      try {
        if (!firestoreDb || !activeAppId) return;
        const ovasColl = collection(firestoreDb, 'artifacts', activeAppId, 'public', 'data', 'ovas');
        let snap;
        try {
          const q = query(ovasColl, orderBy('updatedAt', 'desc'), limit(50));
          snap = await getDocs(q);
        } catch (queryErr) {
          // Fallback without orderBy in case index or field is missing
          snap = await getDocs(ovasColl);
        }

        if (!snap.empty && isMounted) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          setOvas(list);
          try {
            localStorage.setItem('englishTech_ovas', JSON.stringify(list));
          } catch (e) {}
          const activeItem = list.find(o => o.id === selectedOvaId) || list[0];
          if (activeItem) {
            setSelectedOvaId(activeItem.id);
            sendProjectToIframe(activeItem);
          }
        } else if (snap.empty && isMounted) {
          // Save default seed to Firestore
          const seed = { ...goldenRatioTemplate, id: 'ova-golden-ratio-01', editPin: '1234', updatedAt: Date.now() };
          await setDoc(doc(firestoreDb, 'artifacts', activeAppId, 'public', 'data', 'ovas', seed.id), seed);
        }
      } catch (err) {
        console.warn('Could not fetch OVAs from cloud, using local cache:', err);
      }
    };
    fetchOvas();
    return () => { isMounted = false; };
  }, [firestoreDb, activeAppId]);

  // Sync fullscreen state with document fullscreen changes (e.g. user presses Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Send project to iframe
  const sendProjectToIframe = (project) => {
    if (!iframeRef.current?.contentWindow || !project) return;
    try {
      iframeRef.current.contentWindow.postMessage({
        type: 'LOAD_PROJECT',
        project: project,
        isTeacher: true,
        unlocked: true,
        mode: 'editor',
        theme: isDarkMode ? 'dark' : 'light',
        isDarkMode: isDarkMode
      }, '*');
    } catch (e) {}
  };

  // Synchronize theme changes with embedded iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow && isIframeReady) {
      try {
        iframeRef.current.contentWindow.postMessage({
          type: 'SET_THEME',
          theme: isDarkMode ? 'dark' : 'light',
          isDarkMode: isDarkMode
        }, '*');
      } catch (e) {}
    }
  }, [isDarkMode, isIframeReady]);

  // When selected OVA changes, post to iframe
  useEffect(() => {
    if (currentOva && isIframeReady) {
      sendProjectToIframe(currentOva);
    }
  }, [selectedOvaId, isIframeReady]);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      const { type, project } = e.data;
      const activeOva = currentOvaRef.current;

      if (type === 'OVA_READY') {
        setIsIframeReady(true);
        if (activeOva) {
          sendProjectToIframe(activeOva);
        }
      } else if (type === 'COPY_SHARE_LINK') {
        const targetId = e.data.id || activeOva?.id;
        handleCopyPublicLink(targetId);
      } else if (type === 'OVA_SAVED' && project) {
        setSyncStatus('saving');
        const updatedProject = {
          ...project,
          updatedAt: Date.now(),
          editPin: project.editPin || activeOva?.editPin || '1234'
        };

        setOvas(prev => {
          const idx = prev.findIndex(o => o.id === updatedProject.id);
          const next = idx >= 0 ? prev.map((o, i) => i === idx ? updatedProject : o) : [updatedProject, ...prev];
          try {
            localStorage.setItem('englishTech_ovas', JSON.stringify(next));
          } catch (err) {}
          return next;
        });

        // Persist to Firestore
        if (firestoreDb && activeAppId && updatedProject.id) {
          setDoc(doc(firestoreDb, 'artifacts', activeAppId, 'public', 'data', 'ovas', updatedProject.id), updatedProject, { merge: true })
            .then(() => setSyncStatus('synced'))
            .catch(err => {
              console.warn('Firestore save error:', err);
              setSyncStatus('local');
            });
        } else {
          setSyncStatus('local');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [firestoreDb, activeAppId]);

  // Create new OVA
  const handleCreateNewOva = async () => {
    const title = newTitle.trim() || 'Nuevo Objeto de Aprendizaje';
    const subject = newSubject.trim() || 'General';
    const newId = `ova-${Date.now()}`;

    const newOva = {
      id: newId,
      version: '1.0.0',
      title: title,
      subject: subject,
      description: 'Objeto Virtual de Aprendizaje creado con EnglishTech OVA Studio.',
      author: user?.displayName || 'GinaDocente',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: Date.now(),
      editPin: '1234',
      theme: {
        primaryColor: '#AD3333',
        accentColor: '#d97706',
        isDarkMode: true
      },
      cover: {
        title: title,
        subtitle: 'Explora este Objeto Virtual de Aprendizaje interactivo.',
        badgeText: 'OBJETO VIRTUAL DE APRENDIZAJE • ENGLISHTECH',
        institution: 'EnglishTech Academy',
        authorName: user?.displayName || 'GinaDocente',
        backgroundImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1600&q=80',
        backgroundColor: '#0f172a',
        textColor: '#ffffff',
        overlayOpacity: 0.75,
        startButtonText: 'Comenzar Recorrido',
        showEnglishTechBranding: true,
        elements: []
      },
      pages: [
        {
          id: `page-${Date.now()}-1`,
          title: 'Inicio',
          type: 'cover',
          icon: 'Home',
          subSlides: [
            {
              id: `slide-${Date.now()}-1`,
              title: 'Portada Interactiva',
              blocks: [
                {
                  id: `blk-${Date.now()}-1`,
                  type: 'callout',
                  title: '¡Bienvenido al OVA!',
                  content: 'En este espacio pedagógico interactivo podrás explorar los contenidos, actividades evaluativas y recursos multimedia preparados para la clase.',
                  metadata: { calloutType: 'tip' }
                }
              ]
            }
          ]
        },
        {
          id: `page-${Date.now()}-2`,
          title: 'Actividades',
          type: 'activity',
          icon: 'FileText',
          subSlides: [
            {
              id: `slide-${Date.now()}-2`,
              title: 'Hoja de Actividades y Recursos',
              blocks: [
                {
                  id: `blk-${Date.now()}-2`,
                  type: 'text',
                  content: '<h2 class="font-playfair text-2xl font-bold mb-2">Taller Práctico</h2><p>Escribe aquí las instrucciones de la actividad para los estudiantes...</p>'
                }
              ]
            }
          ]
        }
      ]
    };

    const nextList = [newOva, ...ovas];
    setOvas(nextList);
    setSelectedOvaId(newId);
    try {
      localStorage.setItem('englishTech_ovas', JSON.stringify(nextList));
    } catch (e) {}

    if (firestoreDb && activeAppId) {
      try {
        await setDoc(doc(firestoreDb, 'artifacts', activeAppId, 'public', 'data', 'ovas', newId), newOva);
      } catch (e) {}
    }

    sendProjectToIframe(newOva);
    setShowNewModal(false);
    setNewTitle('');
    setNewSubject('');
    showMessage('Nuevo OVA creado con éxito. ¡Listo para diseñar!');
  };

  // Duplicate current OVA
  const handleDuplicateOva = async () => {
    if (!currentOva) return;
    const newId = `ova-${Date.now()}`;
    const clone = {
      ...JSON.parse(JSON.stringify(currentOva)),
      id: newId,
      title: `${currentOva.title} (Copia)`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: Date.now()
    };
    if (clone.cover) clone.cover.title = clone.title;

    const nextList = [clone, ...ovas];
    setOvas(nextList);
    setSelectedOvaId(newId);
    try {
      localStorage.setItem('englishTech_ovas', JSON.stringify(nextList));
    } catch (e) {}

    if (firestoreDb && activeAppId) {
      try {
        await setDoc(doc(firestoreDb, 'artifacts', activeAppId, 'public', 'data', 'ovas', newId), clone);
      } catch (e) {}
    }

    sendProjectToIframe(clone);
    showMessage(`OVA duplicado como "${clone.title}"`);
  };

  // Delete current OVA
  const handleDeleteOva = async () => {
    if (!currentOva) return;
    if (ovas.length <= 1) {
      showMessage('No puedes eliminar el único OVA restante.');
      setShowDeleteModal(false);
      return;
    }

    const idToDelete = currentOva.id;
    const nextList = ovas.filter(o => o.id !== idToDelete);
    setOvas(nextList);
    setSelectedOvaId(nextList[0].id);
    try {
      localStorage.setItem('englishTech_ovas', JSON.stringify(nextList));
    } catch (e) {}

    if (firestoreDb && activeAppId) {
      try {
        await deleteDoc(doc(firestoreDb, 'artifacts', activeAppId, 'public', 'data', 'ovas', idToDelete));
      } catch (e) {}
    }

    setShowDeleteModal(false);
    showMessage('OVA eliminado correctamente.');
  };

  // Copy public share link
  const handleCopyPublicLink = (overrideId = null) => {
    const targetId = overrideId || currentOva?.id;
    if (!targetId) return;
    const base = window.location.origin + window.location.pathname;
    const shareUrl = `${base}#ova?id=${encodeURIComponent(targetId)}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showMessage('Enlace público copiado: ¡los estudiantes pueden verlo sin cuenta!');
      }).catch(() => {
        prompt('Copia este enlace para compartir el OVA:', shareUrl);
      });
    } else {
      prompt('Copia este enlace para compartir el OVA:', shareUrl);
    }
  };

  // Save new 4-digit PIN
  const handleSavePin = async () => {
    const cleanPin = pinInput.replace(/\D/g, '').slice(0, 4);
    if (cleanPin.length !== 4) {
      showMessage('El código PIN debe tener exactamente 4 dígitos numéricos.');
      return;
    }

    if (!currentOva) return;
    const updated = {
      ...currentOva,
      editPin: cleanPin,
      updatedAt: Date.now()
    };

    setOvas(prev => {
      const next = prev.map(o => o.id === updated.id ? updated : o);
      try {
        localStorage.setItem('englishTech_ovas', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    if (firestoreDb && activeAppId) {
      try {
        await setDoc(doc(firestoreDb, 'artifacts', activeAppId, 'public', 'data', 'ovas', updated.id), updated, { merge: true });
      } catch (e) {}
    }

    sendProjectToIframe(updated);
    setShowPinModal(false);
    setPinInput('');
    showMessage(`Código PIN actualizado a: ${cleanPin}. Los visitantes requerirán este código para desbloquear edición.`);
  };

  // Toggle fullscreen (combines native HTML5 Fullscreen API with fallback)
  const handleToggleFullscreen = () => {
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          containerRef.current.requestFullscreen().catch(() => {
            setIsFullscreen(true);
          });
        } else if (containerRef.current?.webkitRequestFullscreen) {
          containerRef.current.webkitRequestFullscreen().catch(() => {
            setIsFullscreen(true);
          });
        } else {
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    } catch (e) {
      setIsFullscreen(prev => !prev);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[99999] bg-slate-950 flex flex-col w-screen h-screen'
          : 'w-full space-y-3'
      }`}
    >
      {/* 1. COMPACT TOP MANAGEMENT BAR */}
      <div className={`p-2 sm:p-2.5 rounded-2xl border shadow-xs flex items-center justify-between gap-2 ${
        isDarkMode ? 'bg-gray-800/95 border-gray-700/80' : 'bg-white border-gray-200'
      }`}>
        {/* Left: OVA Selector & Title */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-rose-500 to-brand-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <BookOpen size={15} />
          </div>

          <div className="min-w-0 max-w-[120px] xs:max-w-[170px] sm:max-w-xs md:max-w-sm">
            <div className="flex items-center gap-1">
              <select
                value={selectedOvaId}
                onChange={(e) => {
                  setSelectedOvaId(e.target.value);
                  const chosen = ovas.find(o => o.id === e.target.value);
                  if (chosen) sendProjectToIframe(chosen);
                }}
                className={`text-xs sm:text-sm font-bold bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-rose-500 focus:outline-none transition py-0.5 max-w-full truncate cursor-pointer ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
                title="Seleccionar OVA para editar"
              >
                {ovas.map(o => (
                  <option key={o.id} value={o.id} className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>
                    {o.title || 'Sin Título'}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
              {currentOva?.subject || 'Materia'} • {currentOva?.pages?.length || 1} secciones
            </p>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition shrink-0"
            title="Crear un nuevo Objeto Virtual de Aprendizaje"
          >
            <Plus size={13} />
            <span className="hidden xs:inline">Nuevo</span>
          </button>
        </div>

        {/* Right Actions: Cloud Sync, PIN, Share, Fullscreen */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 justify-end">
          {/* Cloud Sync Status */}
          <div className="hidden md:flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-gray-100 dark:bg-gray-700/60 font-medium text-gray-600 dark:text-gray-300">
            {syncStatus === 'saving' ? (
              <>
                <Loader2 size={12} className="animate-spin text-amber-500" />
                <span className="text-[10px]">Guardando...</span>
              </>
            ) : syncStatus === 'synced' ? (
              <>
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span className="text-[10px]">Nube</span>
              </>
            ) : (
              <>
                <FileText size={12} className="text-blue-500" />
                <span className="text-[10px]">Local</span>
              </>
            )}
          </div>

          {/* 4-digit PIN setting button */}
          <button
            onClick={() => {
              setPinInput(currentOva?.editPin || '1234');
              setShowPinModal(true);
            }}
            className="flex items-center gap-1 px-2 py-1 sm:py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold transition border border-amber-500/20 shrink-0"
            title="Configurar código PIN de edición (4 dígitos)"
          >
            <Lock size={12} />
            <span className="text-[10px] sm:text-[11px] font-bold"><span className="hidden sm:inline">PIN: </span><strong className="font-mono">{currentOva?.editPin || '1234'}</strong></span>
          </button>

          {/* Share Link button */}
          <button
            onClick={handleCopyPublicLink}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition shrink-0"
            title="Copiar enlace público para compartir con estudiantes"
          >
            <Share2 size={12} />
            <span className="hidden xs:inline">Compartir</span>
          </button>

          {/* Duplicate button */}
          <button
            onClick={handleDuplicateOva}
            className="p-1 sm:p-1.5 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/60 transition shrink-0"
            title="Duplicar este OVA"
          >
            <Copy size={14} />
          </button>

          {/* Delete button */}
          {ovas.length > 1 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-1 sm:p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0"
              title="Eliminar este OVA"
            >
              <Trash2 size={14} />
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            className={`p-1.5 rounded-xl transition shrink-0 ${
              isFullscreen
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
            }`}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* 2. EMBEDDED OVA STUDIO IFRAME */}
      <div className={`relative w-full rounded-2xl overflow-hidden border shadow-xl bg-slate-950 transition-all ${
        isFullscreen
          ? 'flex-1 border-0 rounded-none h-[calc(100vh-56px)]'
          : 'h-[calc(100dvh-130px)] min-h-[540px] xs:min-h-[580px] sm:min-h-[660px] md:min-h-[740px] lg:min-h-[800px] border-gray-200 dark:border-gray-800'
      }`}>
        <iframe
          ref={iframeRef}
          src={`/ova-studio/index.html?theme=${isDarkMode ? 'dark' : 'light'}`}
          className="w-full h-full border-0"
          title="EnglishTech OVA Studio"
          allow="clipboard-read; clipboard-write; fullscreen"
          allowFullScreen={true}
          onLoad={() => {
            setIsIframeReady(true);
            if (currentOva) sendProjectToIframe(currentOva);
          }}
        />
      </div>

      {/* MODAL: CONFIGURAR PIN DE EDICIÓN */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className={`max-w-sm w-full p-5 rounded-3xl border shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Lock size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Código PIN de Edición</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Protege la autoría del OVA</p>
                </div>
              </div>
              <button onClick={() => setShowPinModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-gray-600 dark:text-gray-300">
                Al compartir el enlace público, los estudiantes o visitantes abrirán el OVA en <strong>modo lectura</strong>. Para desbloquear el editor, se solicitará este PIN de 4 dígitos:
              </p>

              <div className="flex justify-center py-2">
                <input
                  type="text"
                  maxLength={4}
                  pattern="[0-9]*"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className={`w-36 text-center text-2xl tracking-[0.5em] font-mono font-bold rounded-2xl py-2.5 border focus:outline-none focus:border-amber-500 ${
                    isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                  placeholder="1234"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-center text-gray-400">
                PIN actual: <span className="font-mono font-bold text-amber-500">{currentOva?.editPin || '1234'}</span>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setShowPinModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePin}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
              >
                Guardar PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREAR NUEVO OVA */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className={`max-w-md w-full p-5 rounded-3xl border shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Crear Nuevo OVA</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Objeto Virtual de Aprendizaje interactivo</p>
                </div>
              </div>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-700 dark:text-gray-300">Título del OVA:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Vocabulario de Negocios e Inglés Técnico"
                  className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:border-rose-500 ${
                    isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-700 dark:text-gray-300">Materia o Asignatura:</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Ej: Inglés Técnico III"
                  className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:border-rose-500 ${
                    isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-[11px] text-gray-600 dark:text-gray-300 space-y-1">
                <p className="font-bold text-rose-600 dark:text-rose-400">Incluye de serie:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-gray-500 dark:text-gray-400">
                  <li>Lienzo de Portada interactivo tipo Canva</li>
                  <li>Hoja de actividades y recursos didácticos</li>
                  <li>PIN de edición por defecto: <strong>1234</strong></li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNewOva}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
              >
                Crear OVA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAR OVA */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className={`max-w-sm w-full p-5 rounded-3xl border shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">¿Eliminar este OVA?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">
                  "{currentOva?.title}"
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300">
              Esta acción eliminará el Objeto Virtual de Aprendizaje de tu panel y de la nube. No se puede deshacer.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteOva}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
