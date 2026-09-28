// src/components/PublicOvaViewer.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Lock, Unlock, Maximize2, Minimize2, ArrowLeftIcon,
  CheckCircle2, Loader2, Sparkles, X
} from './Icons.jsx';
import goldenRatioTemplate from '../templates/goldenRatioOva.json';
import { db, appId, auth, signInAnonymously, doc, getDoc, setDoc } from '../firebase/config.js';

export default function PublicOvaViewer({
  ovaId = null,
  isDarkMode = false,
  onBackToPortal = () => {},
  user = null,
  role = null
}) {
  const isTeacher = role === 'teacher';
  const [ovaData, setOvaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(isTeacher);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIframeReady, setIsIframeReady] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const iframeRef = useRef(null);
  const initialSrcRef = useRef(
    isTeacher 
      ? `/ova-studio/index.html?mode=editor&locked=false&theme=${isDarkMode ? 'dark' : 'light'}` 
      : `/ova-studio/index.html?mode=viewer&locked=true&theme=${isDarkMode ? 'dark' : 'light'}`
  );

  // Auto sign-in anonymously for visitors if needed to satisfy Firestore security rules
  useEffect(() => {
    if (auth && !auth.currentUser) {
      signInAnonymously(auth).catch(() => {});
    }
  }, []);

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Native Fullscreen Toggle
  const handleToggleFullscreen = () => {
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen().catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen().catch(() => {});
        }
      }
    } catch (e) {}
  };

  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch OVA project from Firestore or localStorage or fallback template
  useEffect(() => {
    let isMounted = true;
    const loadOva = async () => {
      setLoading(true);
      try {
        let loaded = null;

        // Try Firestore first if ID is given
        if (ovaId && db && appId) {
          try {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'ovas', ovaId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              loaded = { id: snap.id, ...snap.data() };
            }
          } catch (e) {
            console.warn('Could not load OVA from cloud:', e);
          }
        }

        // Try localStorage cache
        if (!loaded) {
          try {
            const cachedList = JSON.parse(localStorage.getItem('englishTech_ovas') || '[]');
            if (Array.isArray(cachedList) && cachedList.length > 0) {
              if (ovaId) {
                loaded = cachedList.find(o => o.id === ovaId) || cachedList[0];
              } else {
                loaded = cachedList[0];
              }
            }
          } catch (e) {}
        }

        // Fallback to Golden Ratio template
        if (!loaded) {
          loaded = { ...goldenRatioTemplate, id: ovaId || 'ova-golden-ratio-01', editPin: '1234' };
        }

        if (isMounted) {
          setOvaData(loaded);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error in loadOva:', err);
        if (isMounted) {
          setOvaData({ ...goldenRatioTemplate, id: ovaId || 'ova-golden-ratio-01', editPin: '1234' });
          setLoading(false);
        }
      }
    };

    loadOva();
    return () => { isMounted = false; };
  }, [ovaId]);

  // Send project data to iframe
  const sendProjectToIframe = (project, unlockedMode) => {
    if (!iframeRef.current?.contentWindow || !project) return;
    try {
      iframeRef.current.contentWindow.postMessage({
        type: 'LOAD_PROJECT',
        project: project,
        isTeacher: isTeacher || unlockedMode,
        unlocked: isTeacher || unlockedMode,
        mode: (isTeacher || unlockedMode) ? 'editor' : 'viewer',
        theme: isDarkMode ? 'dark' : 'light',
        isDarkMode: isDarkMode
      }, '*');
    } catch (e) {}
  };

  // Sync theme changes with embedded iframe
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

  // Sync with iframe when ready or when project is loaded
  useEffect(() => {
    if (ovaData && isIframeReady) {
      sendProjectToIframe(ovaData, isUnlocked);
    }
  }, [ovaData, isIframeReady, isUnlocked]);

  // Listen to postMessage from embedded OVA
  useEffect(() => {
    const handleMessage = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      const { type, project, id } = e.data;

      if (type === 'OVA_READY') {
        setIsIframeReady(true);
        if (ovaData) {
          sendProjectToIframe(ovaData, isUnlocked);
        }
      } else if (type === 'OVA_PIN_UNLOCKED') {
        setIsUnlocked(true);
        showToast('¡Edición desbloqueada con éxito!');
      } else if (type === 'COPY_SHARE_LINK') {
        const base = window.location.origin + window.location.pathname;
        const targetId = id || ovaData?.id || ovaId || 'ova-golden-ratio-01';
        const shareUrl = `${base}#ova?id=${encodeURIComponent(targetId)}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('¡Enlace público copiado! Los estudiantes pueden verlo sin cuenta.');
          }).catch(() => {
            prompt('Copia este enlace para compartir el OVA:', shareUrl);
          });
        } else {
          prompt('Copia este enlace para compartir el OVA:', shareUrl);
        }
      } else if (type === 'OVA_SAVED' && project && isUnlocked) {
        // Save if unlocked
        setOvaData(project);
        try {
          const cachedList = JSON.parse(localStorage.getItem('englishTech_ovas') || '[]');
          const idx = cachedList.findIndex(o => o.id === project.id);
          const next = idx >= 0 ? cachedList.map((o, i) => i === idx ? project : o) : [project, ...cachedList];
          localStorage.setItem('englishTech_ovas', JSON.stringify(next));
        } catch (e) {}

        if (db && appId && project.id) {
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'ovas', project.id), {
            ...project,
            updatedAt: Date.now()
          }, { merge: true }).catch(() => {});
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [ovaData, isUnlocked]);

  // Handle PIN unlock submission
  const handleUnlockWithPin = () => {
    const entered = pinInput.trim();
    const correct = String(ovaData?.editPin || '1234').trim();

    if (entered === correct) {
      setIsUnlocked(true);
      setShowPinModal(false);
      setPinInput('');
      setPinError(false);
      showToast('¡Código correcto! Modo de edición desbloqueado.');

      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'SET_UNLOCKED',
          unlocked: true,
          mode: 'editor'
        }, '*');
        iframeRef.current.contentWindow.postMessage({
          type: 'SET_MODE',
          mode: 'editor'
        }, '*');
      }
    } else {
      setPinError(true);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col w-screen h-screen select-none bg-slate-950 text-white ${
      isDarkMode ? 'dark' : ''
    }`}>
      {/* 1. TOP RESPONSIVE HEADER */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/95 backdrop-blur px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-30">
        {/* Left: Brand & OVA Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-brand-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-rose-500/20 shrink-0">
            ET
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              {ovaData?.title || 'Objeto Virtual de Aprendizaje'}
            </h1>
            <p className="text-[10px] text-slate-400 truncate">
              {ovaData?.subject || 'EnglishTech Academy'} • {isUnlocked ? 'Modo Edición Habilitado' : 'Vista Estudiante (Pública)'}
            </p>
          </div>
        </div>

        {/* Right: Mode status, Lock/Unlock button, Fullscreen & Exit */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status Badge */}
          <div className={`hidden sm:flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl border ${
            isUnlocked
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
          }`}>
            {isUnlocked ? <Unlock size={12} /> : <BookOpen size={12} />}
            <span>{isUnlocked ? 'Editor Activo' : 'Lectura'}</span>
          </div>

          {/* Unlock with PIN button (if not unlocked yet) */}
          {!isUnlocked && (
            <button
              onClick={() => {
                setPinInput('');
                setPinError(false);
                setShowPinModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition shadow-xs"
              title="Desbloquear edición con código PIN de 4 dígitos"
            >
              <Lock size={13} />
              <span className="hidden sm:inline">Editar (con PIN)</span>
              <span className="sm:hidden">Editar</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Return to EnglishTech portal */}
          <button
            onClick={onBackToPortal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition"
            title="Regresar a EnglishTech"
          >
            <ArrowLeftIcon size={14} />
            <span className="hidden sm:inline">EnglishTech</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN IFRAME AREA */}
      <main className="flex-1 relative w-full h-[calc(100vh-56px)] bg-slate-950 overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 size={32} className="animate-spin text-rose-500" />
            <p className="text-xs font-medium">Cargando Objeto Virtual de Aprendizaje...</p>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={initialSrcRef.current}
            className="w-full h-full border-0"
            title={ovaData?.title || 'OVA Studio'}
            allow="clipboard-read; clipboard-write; fullscreen"
            allowFullScreen={true}
            onLoad={() => {
              setIsIframeReady(true);
              if (ovaData) sendProjectToIframe(ovaData, isUnlocked);
            }}
          />
        )}
      </main>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PIN UNLOCK MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="max-w-sm w-full p-6 rounded-3xl border border-slate-700 bg-slate-900 text-white shadow-2xl space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Lock size={22} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">Desbloquear Edición del OVA</h3>
              <p className="text-xs text-slate-400 mt-1">
                Ingresa el código PIN de 4 dígitos configurado por la docente para desbloquear la edición.
              </p>
            </div>

            <div className="flex justify-center my-3">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]*"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setPinError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUnlockWithPin();
                }}
                className={`w-36 text-center text-2xl tracking-[0.5em] font-mono font-bold bg-slate-950 border rounded-xl py-2.5 text-white focus:outline-none focus:border-amber-500 transition shadow-inner ${
                  pinError ? 'border-rose-500' : 'border-slate-700'
                }`}
                placeholder="••••"
                autoFocus
              />
            </div>

            {pinError && (
              <p className="text-[11px] text-rose-400 font-medium">
                Código PIN incorrecto. Pídele el PIN de 4 dígitos a la docente.
              </p>
            )}

            <div className="flex justify-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowPinModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleUnlockWithPin}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/25 transition"
              >
                Desbloquear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
