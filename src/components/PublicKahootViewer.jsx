// src/components/PublicKahootViewer.jsx
// Acceso público directo a Kahoot en Vivo mediante englishtech.vercel.app/#kahoot
// Permite que cualquier persona externa (sin cuenta de estudiante ni inicio de sesión)
// ingrese el PIN del Kahoot, elija su nombre/apodo y avatar, y participe en tiempo real.

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Gamepad2,
  Play,
  Users,
  Sparkles,
  Trophy,
  Zap,
  ArrowLeftIcon,
  CheckCircle2,
  Share2,
} from './Icons.jsx';
import {
  KAHOOT_AVATARS,
  sanitizeKahootPlayerId,
  buildKahootLeaderboard,
  buildPublicKahootUrl,
} from '../utils/kahootEngine.js';
import { containsBadWords, checkBadWordsAsync } from '../utils/helpers.js';
import {
  auth,
  signInAnonymously,
  collection,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
} from '../firebase/config.js';
import { DEMO_TASKS, loadDemoSandbox, saveDemoSandboxItem, isDemoItemExpired } from '../utils/demoData.js';
import KahootLiveModal from './KahootLiveModal.jsx';

const GUEST_ID_STORAGE_KEY = 'englishTech_kahootGuestId';
const GUEST_NAME_STORAGE_KEY = 'englishTech_kahootGuestName';
const GUEST_AVATAR_STORAGE_KEY = 'englishTech_kahootGuestAvatar';

function getOrCreateGuestPlayerId() {
  try {
    const existing = localStorage.getItem(GUEST_ID_STORAGE_KEY);
    if (existing && existing.trim().length >= 6) {
      return existing.trim();
    }
    const generated = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(GUEST_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `guest_${Date.now().toString(36)}`;
  }
}

const PublicKahootViewer = ({
  initialPin = '',
  db,
  appId,
  isDemoMode = false,
  loggedInName = '',
  currentUser = null,
  role = null,
  onBackToPortal,
}) => {
  const [pinInput, setPinInput] = useState(() => String(initialPin || '').replace(/\D/g, '').slice(0, 6));
  const [nickname, setNickname] = useState(() => {
    try {
      const saved = localStorage.getItem(GUEST_NAME_STORAGE_KEY);
      if (saved && saved.trim()) return saved.trim();
    } catch {
      // ignorar
    }
    if (role !== 'teacher' && loggedInName) return loggedInName;
    return '';
  });
  const [avatar, setAvatar] = useState(() => {
    try {
      return localStorage.getItem(GUEST_AVATAR_STORAGE_KEY) || '🦊';
    } catch {
      return '🦊';
    }
  });

  const [guestPlayerId] = useState(() => getOrCreateGuestPlayerId());

  const [firestoreKahoots, setFirestoreKahoots] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [activeKahootTask, setActiveKahootTask] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimerRef = useRef(null);

  const showMessage = useCallback((msg) => {
    if (!msg) return;
    setToastMsg(String(msg));
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMsg('');
    }, 3600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const clean = String(initialPin || '').replace(/\D/g, '').slice(0, 6);
    if (clean) {
      setPinInput(clean);
    }
  }, [initialPin]);

  // Autenticación anónima automática para invitados externos y suscripción en tiempo real a las salas Kahoot
  useEffect(() => {
    if (!db || !appId) {
      setLoadingRooms(false);
      return undefined;
    }

    let unsubscribe = null;
    let isCancelled = false;
    let deferredTasks = null;

    const flushDeferredTasks = () => {
      if (deferredTasks && !isCancelled) {
        const snapshotToFlush = deferredTasks;
        deferredTasks = null;
        setFirestoreKahoots(snapshotToFlush);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('kahoot-live-modal-closed', flushDeferredTasks);
    }

    const connectToKahootRooms = async () => {
      if (!auth?.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch {
          // Continuar incluso si lectura pública está permitida
        }
      }
      if (isCancelled) return;

      try {
        const tasksColRef = collection(db, 'artifacts', appId, 'public', 'data', 'tasks');
        unsubscribe = onSnapshot(
          tasksColRef,
          (snapshot) => {
            if (isCancelled) return;
            const list = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (data && !data.isDeleted && (data.type === 'kahoot' || data.kahoot)) {
                list.push({
                  ...data,
                  id: docSnap.id,
                });
              }
            });
            list.sort(
              (a, b) =>
                Number(b.kahoot?.updatedAt || b.createdAt || 0) -
                Number(a.kahoot?.updatedAt || a.createdAt || 0)
            );
            if (typeof window !== 'undefined' && window.__KAHOOT_LIVE_MODAL_OPEN__) {
              deferredTasks = list;
            } else {
              deferredTasks = null;
              setFirestoreKahoots(list);
            }
            setLoadingRooms(false);
          },
          () => {
            if (!isCancelled) setLoadingRooms(false);
          }
        );
      } catch {
        if (!isCancelled) setLoadingRooms(false);
      }
    };

    connectToKahootRooms();

    return () => {
      isCancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('kahoot-live-modal-closed', flushDeferredTasks);
      }
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [db, appId]);

  // Combinar salas de Firestore con salas de respaldo del Modo Demo para que cualquier PIN válido funcione
  const allAvailableKahoots = useMemo(() => {
    const mapById = new Map();
    firestoreKahoots.forEach((t) => {
      if (t?.id && t?.kahoot) {
        mapById.set(String(t.id), t);
      }
    });

    const deletedTaskIds = new Set();
    try {
      const sandbox = loadDemoSandbox();
      const rawDeleted = Array.isArray(sandbox?.deletedIds)
        ? sandbox.deletedIds
        : (Array.isArray(sandbox?.deletedIds?.tasks) ? sandbox.deletedIds.tasks : []);
      rawDeleted.forEach((d) => {
        const id = typeof d === 'string' ? d : d?.id;
        if (id) deletedTaskIds.add(String(id));
      });
      const sandboxTasks = Array.isArray(sandbox?.tasks) ? sandbox.tasks : [];
      sandboxTasks.forEach((t) => {
        if (
          t?.id &&
          !t.isDeleted &&
          !deletedTaskIds.has(String(t.id)) &&
          !isDemoItemExpired(t) &&
          (t.type === 'kahoot' || t.kahoot) &&
          !mapById.has(String(t.id))
        ) {
          mapById.set(String(t.id), t);
        }
      });
    } catch {
      // ignorar errores de sandbox local
    }

    (DEMO_TASKS || []).forEach((t) => {
      if (
        t?.id &&
        !t.isDeleted &&
        !deletedTaskIds.has(String(t.id)) &&
        (t.type === 'kahoot' || t.kahoot) &&
        !mapById.has(String(t.id))
      ) {
        mapById.set(String(t.id), t);
      }
    });

    return Array.from(mapById.values());
  }, [firestoreKahoots, activeKahootTask]);

  const liveKahootRooms = useMemo(() => {
    const sourceList = isDemoMode ? allAvailableKahoots : firestoreKahoots;
    return sourceList.filter(
      (t) => t?.kahoot && Array.isArray(t.kahoot.questions) && t.kahoot.questions.length > 0
    );
  }, [isDemoMode, allAvailableKahoots, firestoreKahoots]);

  const setTasksAdapter = useCallback((updater) => {
    setFirestoreKahoots((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return Array.isArray(next) ? next : prev;
    });
    setActiveKahootTask((prevActive) => {
      if (!prevActive) return prevActive;
      const list = typeof updater === 'function' ? updater([prevActive]) : [];
      return Array.isArray(list) && list[0] ? list[0] : prevActive;
    });
  }, []);

  const handleJoinKahoot = async (customTask = null) => {
    const validCustomTask = customTask && typeof customTask === 'object' && customTask.kahoot ? customTask : null;
    const cleanPin = String(validCustomTask?.kahoot?.pin || pinInput || '')
      .replace(/\D/g, '')
      .trim();
    const cleanName = String(nickname || '').trim();

    if (!cleanPin || cleanPin.length < 4) {
      showMessage('⚠️ Ingresa el PIN del Kahoot (6 dígitos) para entrar a la sala.');
      return;
    }

    if (!cleanName) {
      showMessage('⚠️ Escribe tu nombre o apodo para identificarte en el Kahoot.');
      return;
    }

    if (containsBadWords(cleanName) || await checkBadWordsAsync(cleanName)) {
      showMessage('⚠️ Por favor usa un nombre o apodo respetuoso.');
      return;
    }

    try {
      localStorage.setItem(GUEST_NAME_STORAGE_KEY, cleanName);
      localStorage.setItem(GUEST_AVATAR_STORAGE_KEY, avatar);
    } catch {
      // ignorar si almacenamiento está restringido
    }

    setJoiningRoom(true);
    try {
      let targetTask =
        validCustomTask ||
        allAvailableKahoots.find(
          (t) => String(t?.kahoot?.pin || '').replace(/\D/g, '') === cleanPin
        );

      // Si aún no estaba en caché local, consultar Firestore en vivo
      if (!targetTask && db && appId) {
        if (!auth?.currentUser) {
          try {
            await signInAnonymously(auth);
          } catch {
            // continuar
          }
        }
        try {
          const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'));
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (
              data &&
              !data.isDeleted &&
              (data.type === 'kahoot' || data.kahoot) &&
              String(data.kahoot?.pin || '').replace(/\D/g, '') === cleanPin
            ) {
              targetTask = { ...data, id: docSnap.id };
            }
          });
        } catch {
          // ignorar fallo de red
        }
      }

      if (!targetTask || !targetTask.kahoot) {
        showMessage(`❌ No se encontró ningún Kahoot activo con el PIN ${cleanPin}. Verifica el código con el docente.`);
        setJoiningRoom(false);
        return;
      }

      // Registrar participante inmediatamente en la sala para que aparezca en el Lobby / Ranking en vivo
      const safeId = sanitizeKahootPlayerId(guestPlayerId || cleanName);
      const existingPart = targetTask.kahoot.participants?.[safeId];
      const participantRecord = {
        id: safeId,
        realName: cleanName,
        nickname: cleanName,
        avatar: avatar || existingPart?.avatar || '🦊',
        score: Number(existingPart?.score) || 0,
        streak: Number(existingPart?.streak) || 0,
        correctCount: Number(existingPart?.correctCount) || 0,
        totalTimeMs: Number(existingPart?.totalTimeMs) || 0,
        joinedAt: existingPart?.joinedAt || Date.now(),
        lastSeenAt: Date.now(),
        isExternalGuest: !currentUser || role === 'teacher',
        answers: existingPart?.answers || {},
        ...(existingPart?.lastAnswer ? { lastAnswer: existingPart.lastAnswer } : {}),
      };

      const nextKahoot = {
        ...targetTask.kahoot,
        participants: {
          ...(targetTask.kahoot.participants || {}),
          [safeId]: participantRecord,
        },
        updatedAt: Date.now(),
      };
      const updatedTask = {
        ...targetTask,
        kahoot: nextKahoot,
      };

      const isTargetDemo = Boolean(
        isDemoMode ||
          targetTask.isDemoCreated ||
          String(targetTask.id || '').startsWith('demo-') ||
          String(targetTask.id || '').startsWith('demo_')
      );

      if (isTargetDemo) {
        saveDemoSandboxItem('tasks', updatedTask);
      } else if (db && appId && targetTask.id) {
        try {
          if (!auth?.currentUser) {
            await signInAnonymously(auth);
          }
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', targetTask.id), {
            [`kahoot.participants.${safeId}`]: participantRecord,
            'kahoot.updatedAt': Date.now(),
          });
        } catch {
          // KahootLiveModal volverá a sincronizar al abrirse
        }
      }

      try {
        window.history.replaceState(null, '', `${window.location.pathname}#kahoot=${cleanPin}`);
      } catch {
        // ignorar
      }

      setActiveKahootTask(updatedTask);
    } finally {
      setJoiningRoom(false);
    }
  };

  // En el acceso público #kahoot el usuario siempre entra como jugador/participante
  const effectiveRole = 'student';

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1F0657] via-[#39127A] to-[#130338] text-white flex flex-col justify-between relative overflow-x-hidden select-none">
      {/* Luces decorativas de fondo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-fuchsia-500 blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 rotate-45 bg-indigo-500 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-3xl bg-purple-500 blur-3xl" />
      </div>

      {/* Notificación flotante */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000000] max-w-md w-[92%] px-4 py-3 rounded-2xl bg-gray-950/95 border border-white/20 text-white text-xs sm:text-sm font-extrabold shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top duration-200">
          <Sparkles size={16} className="text-amber-400 shrink-0" />
          <span className="flex-1">{toastMsg}</span>
        </div>
      )}

      {/* Barra superior */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#E21B3C] via-[#7B2CBF] to-[#1368CE] flex items-center justify-center font-black text-xl shadow-lg border border-white/25">
            K!
          </div>
          <div>
            <h1 className="font-black text-base sm:text-lg tracking-tight leading-none">
              English Tech • Kahoot Live
            </h1>
            <p className="text-[11px] text-purple-200/80 font-semibold mt-0.5">
              Acceso directo para participantes e invitados sin cuenta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const shareUrl = buildPublicKahootUrl(pinInput);
              try {
                await navigator.clipboard.writeText(shareUrl);
                showMessage(`🔗 Enlace copiado: ${shareUrl}`);
              } catch {
                showMessage(`🔗 Enlace: ${shareUrl}`);
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">Compartir enlace</span>
          </button>

          {typeof onBackToPortal === 'function' && (
            <button
              type="button"
              onClick={onBackToPortal}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeftIcon size={14} />
              <span>Ir al portal</span>
            </button>
          )}
        </div>
      </header>

      {/* Tarjeta central de acceso por PIN y Apodo */}
      <main className="relative z-10 flex-1 w-full max-w-xl mx-auto px-4 py-4 flex flex-col justify-center gap-6">
        <div className="p-6 sm:p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-5">
          <div className="text-center space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-[11px] font-black uppercase tracking-widest">
              <Gamepad2 size={13} /> Juego en Vivo
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              ¡Únete al Kahoot!
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/85 font-medium">
              Ingresa el PIN de 6 dígitos proyectado por el docente y escribe tu nombre para participar en tiempo real.
            </p>
          </div>

          <div className="space-y-4">
            {/* Campo de PIN */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-purple-200 mb-1.5">
                PIN del Juego
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={pinInput}
                maxLength={6}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoinKahoot();
                }}
                placeholder="Ej: 749205"
                className="w-full py-3.5 px-4 rounded-2xl bg-white text-gray-950 font-black text-2xl sm:text-3xl tracking-[0.25em] text-center placeholder:text-gray-400 placeholder:tracking-normal placeholder:text-lg outline-none ring-2 ring-transparent focus:ring-amber-400 shadow-inner"
              />
            </div>

            {/* Campo de Nombre / Apodo */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-purple-200 mb-1.5">
                Tu Nombre o Apodo
              </label>
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-2xl shrink-0 shadow-md">
                  {avatar}
                </div>
                <input
                  type="text"
                  value={nickname}
                  maxLength={28}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleJoinKahoot();
                  }}
                  placeholder="Escribe tu nombre o apodo..."
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-white/15 border border-white/25 text-white font-black text-sm sm:text-base placeholder:text-purple-200/50 outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Selector de Avatar */}
            <div>
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-purple-200/90 mb-2">
                Elige tu icono de jugador
              </span>
              <div className="grid grid-cols-8 gap-1.5 p-2.5 rounded-2xl bg-black/25 border border-white/10">
                {KAHOOT_AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                      avatar === av
                        ? 'bg-amber-400 text-gray-950 scale-110 ring-2 ring-white shadow-md'
                        : 'bg-white/5 hover:bg-white/15'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Botón Principal para Entrar */}
            <button
              type="button"
              disabled={joiningRoom}
              onClick={() => handleJoinKahoot()}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-60 text-gray-950 font-black text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Play size={20} />
              <span>{joiningRoom ? 'Conectando a la sala...' : '¡Entrar al Kahoot!'}</span>
            </button>
          </div>
        </div>

        {/* Salas Activas Disponibles para Selección Rápida */}
        <div className="p-5 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-purple-100">
                Salas disponibles en vivo
              </h3>
            </div>
            {loadingRooms && (
              <span className="text-[11px] text-purple-200/70 font-bold animate-pulse">
                Sincronizando...
              </span>
            )}
          </div>

          {liveKahootRooms.length === 0 ? (
            <p className="text-xs text-purple-200/70 font-medium py-2">
              Ingresa arriba el PIN de 6 dígitos que te comparta el docente para unirte a la partida.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {liveKahootRooms.map((roomTask) => {
                const k = roomTask.kahoot || {};
                const roomPin = String(k.pin || '482915');
                const qLen = Array.isArray(k.questions) ? k.questions.length : 0;
                const { totalParticipants } = buildKahootLeaderboard(
                  k.participants || {},
                  k.currentQuestionIndex
                );
                const isFinished = k.status === 'finished';
                const isSelected = String(pinInput).trim() === roomPin;

                return (
                  <div
                    key={roomTask.id}
                    onClick={() => setPinInput(roomPin)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-amber-400/20 border-amber-300 shadow-md'
                        : 'bg-black/25 hover:bg-white/15 border-white/10'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg bg-white text-[#46178F] font-black text-xs tracking-wider">
                          PIN: {roomPin}
                        </span>
                        {isFinished ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase flex items-center gap-1">
                            <Trophy size={10} /> Finalizado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1">
                            <CheckCircle2 size={10} /> En vivo
                          </span>
                        )}
                        <span className="text-[11px] text-purple-200 font-bold flex items-center gap-1">
                          <Users size={12} /> {totalParticipants}
                        </span>
                      </div>
                      <p className="font-extrabold text-sm text-white truncate">
                        {roomTask.title || 'Kahoot en Vivo'}
                      </p>
                      <p className="text-[11px] text-purple-200/80">
                        {qLen} {qLen === 1 ? 'pregunta' : 'preguntas'}
                        {roomTask.targetGroupName && roomTask.targetGroupName !== 'Global'
                          ? ` • ${roomTask.targetGroupName}`
                          : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPinInput(roomPin);
                        handleJoinKahoot(roomTask);
                      }}
                      className="px-4 py-2 rounded-xl bg-white/15 hover:bg-amber-400 hover:text-gray-950 text-white font-black text-xs transition-all shrink-0 cursor-pointer border border-white/20"
                    >
                      Usar PIN {roomPin}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Pie de página informativo */}
      <footer className="relative z-10 w-full text-center py-3 px-4 text-[11px] text-purple-200/70 font-semibold">
        Universidad de Pamplona • English Tech Live Kahoot • Sin registro requerido
      </footer>

      {/* Modal de Juego en Vivo en Pantalla Completa */}
      {activeKahootTask && (
        <KahootLiveModal
          isOpen={Boolean(activeKahootTask)}
          onClose={() => setActiveKahootTask(null)}
          task={activeKahootTask}
          role={effectiveRole}
          currentUserId={guestPlayerId}
          loggedInName={nickname.trim() || 'Invitado'}
          initialAvatar={avatar}
          onProfileChange={({ nickname: nextNick, avatar: nextAv }) => {
            if (nextNick) {
              setNickname(nextNick);
              try { localStorage.setItem(GUEST_NAME_STORAGE_KEY, nextNick); } catch { /* ignore */ }
            }
            if (nextAv) {
              setAvatar(nextAv);
              try { localStorage.setItem(GUEST_AVATAR_STORAGE_KEY, nextAv); } catch { /* ignore */ }
            }
          }}
          isDemoMode={Boolean(
            isDemoMode ||
              activeKahootTask.isDemoCreated ||
              String(activeKahootTask.id || '').startsWith('demo-') ||
              String(activeKahootTask.id || '').startsWith('demo_')
          )}
          db={db}
          appId={appId}
          setTasks={setTasksAdapter}
          showMessage={showMessage}
          initialMode="live"
        />
      )}
    </div>
  );
};

export default PublicKahootViewer;
