// src/components/SpotifyConnectModal.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  SpotifyIcon, X, CheckLine, ExternalLink, Loader2, Music, Trash2, Edit3 
} from './Icons.jsx';
import { 
  initiateSpotifyOAuth, 
  getStoredSpotifyAuth, 
  clearStoredSpotifyAuth, 
  fetchCurrentlyPlaying,
  fetchSpotifyTrackOembed,
  getStoredSpotifyClientId,
  setStoredSpotifyClientId,
  getSpotifyRedirectUri
} from '../utils/spotify.js';
import { SpotifyWidget } from './SpotifyWidget.jsx';

export const SpotifyConnectModal = ({
  isOpen,
  onClose,
  isDarkMode = false,
  currentStatus = null,
  onSaveStatus,
  showMessage = () => {}
}) => {
  const [activeTab, setActiveTab] = useState('auto'); // 'auto' | 'manual'
  const [storedAuth, setStoredAuth] = useState(null);
  const [isCheckingLive, setIsCheckingLive] = useState(false);
  const [livePreview, setLivePreview] = useState(null);

  // Modo Manual
  const [manualUrl, setManualUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualArtist, setManualArtist] = useState('');
  const [isLoadingOembed, setIsLoadingOembed] = useState(false);
  const [manualPreview, setManualPreview] = useState(null);

  // Configuración de Client ID
  const [customClientId, setCustomClientId] = useState('');
  const [showClientIdConfig, setShowClientIdConfig] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const auth = getStoredSpotifyAuth();
      setStoredAuth(auth);
      setCustomClientId(getStoredSpotifyClientId());

      if (auth?.accessToken) {
        setIsCheckingLive(true);
        fetchCurrentlyPlaying().then((data) => {
          setIsCheckingLive(false);
          if (data) setLivePreview(data);
        }).catch(() => setIsCheckingLive(false));
      }

      if (currentStatus?.isManual) {
        setActiveTab('manual');
        setManualUrl(currentStatus.trackUrl || '');
        setManualTitle(currentStatus.track || '');
        setManualArtist(currentStatus.artist || '');
        setManualPreview(currentStatus);
      }
    }
  }, [isOpen, currentStatus]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleStartOAuth = async () => {
    try {
      if (customClientId) {
        setStoredSpotifyClientId(customClientId);
      }
      await initiateSpotifyOAuth(customClientId);
    } catch (err) {
      showMessage(`Error al iniciar Spotify: ${err.message || err}`);
    }
  };

  const handleDisconnect = () => {
    clearStoredSpotifyAuth();
    setStoredAuth(null);
    setLivePreview(null);
    if (onSaveStatus) {
      onSaveStatus(null);
    }
    showMessage("Cuenta de Spotify desvinculada.");
  };

  const handleResolveManualUrl = async () => {
    if (!manualUrl.trim()) return;
    setIsLoadingOembed(true);
    try {
      const meta = await fetchSpotifyTrackOembed(manualUrl.trim());
      if (meta) {
        setManualPreview(meta);
        setManualTitle(meta.track);
        setManualArtist(meta.artist);
        showMessage("✅ Canción de Spotify cargada correctamente.");
      } else {
        // Fallback básico si la URL no fue resuelta por oembed
        const basicMeta = {
          isPlaying: true,
          track: manualTitle.trim() || 'Canción seleccionada',
          artist: manualArtist.trim() || 'Spotify',
          trackUrl: manualUrl.trim(),
          updatedAt: Date.now(),
          isManual: true
        };
        setManualPreview(basicMeta);
      }
    } finally {
      setIsLoadingOembed(false);
    }
  };

  const handleSaveManual = () => {
    if (!manualPreview && !manualTitle.trim()) {
      showMessage("Ingresa una canción o enlace de Spotify.");
      return;
    }

    const payload = manualPreview || {
      isPlaying: true,
      track: manualTitle.trim() || 'Canción de Spotify',
      artist: manualArtist.trim() || 'Spotify',
      trackUrl: manualUrl.trim() || 'https://open.spotify.com',
      albumArt: '',
      updatedAt: Date.now(),
      isManual: true
    };

    if (onSaveStatus) {
      onSaveStatus(payload);
    }
    showMessage("🎵 Estado de Spotify guardado en tu perfil.");
    onClose();
  };

  const handleRemoveStatus = () => {
    if (onSaveStatus) {
      onSaveStatus(null);
    }
    setManualPreview(null);
    setManualUrl('');
    setManualTitle('');
    setManualArtist('');
    showMessage("Estado musical eliminado.");
    onClose();
  };

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className={`max-w-lg w-full rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 border relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto ${
          isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#1DB954]/15 text-[#1DB954] flex items-center justify-center border border-[#1DB954]/30 shrink-0">
              <SpotifyIcon size={24} />
            </div>
            <div>
              <h3 className="text-base font-extrabold leading-tight">Vincular Spotify</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Muestra en vivo lo que estás escuchando en tu perfil y en el chat
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pestañas de método */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-gray-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('auto')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'auto'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <SpotifyIcon size={14} className="text-[#1DB954]" />
            <span>En vivo (OAuth API)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Music size={14} />
            <span>Enlace de canción</span>
          </button>
        </div>

        {/* TAB 1: En Vivo vía Spotify OAuth API */}
        {activeTab === 'auto' && (
          <div className="space-y-4 text-xs">
            <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                <span className="font-bold text-[#1DB954]">¿Requiere API? Sí.</span> Para detectar automáticamente la canción que suena en tu computadora o celular, Spotify exige autorización mediante su API oficial (<code className="font-mono text-[10px] bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">OAuth 2.0 PKCE</code>). 
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                🔒 Es 100% seguro: se conecta directamente desde tu navegador a Spotify, sin intermediarios ni almacenamiento de contraseñas.
              </p>
            </div>

            {storedAuth?.accessToken ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Conectado a tu cuenta de Spotify</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-[11px] font-bold text-red-500 hover:text-red-700 underline cursor-pointer"
                  >
                    Desvincular
                  </button>
                </div>

                {isCheckingLive ? (
                  <div className="flex items-center justify-center p-4 gap-2 text-gray-400">
                    <Loader2 size={16} className="animate-spin text-[#1DB954]" />
                    <span>Consultando reproductor de Spotify...</span>
                  </div>
                ) : livePreview ? (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Detectado en tu reproductor ahora mismo:
                    </span>
                    <SpotifyWidget spotifyStatus={livePreview} />
                  </div>
                ) : (
                  <div className="p-3 text-center text-gray-400 italic">
                    Abre Spotify en tu dispositivo y reproduce cualquier canción para que aparezca aquí en tiempo real.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <button
                  type="button"
                  onClick={handleStartOAuth}
                  className="w-full py-3 px-4 rounded-2xl bg-[#1DB954] hover:bg-[#1aa34a] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <SpotifyIcon size={18} />
                  <span>Conectar cuenta de Spotify</span>
                </button>

                <p className="text-[11px] text-gray-400">
                  Al pulsar serás redirigido a la página oficial de Spotify para autorizar la lectura de tu música en reproducción.
                </p>

                {/* Configuración de Client ID opcional */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-800 text-left">
                  <button
                    type="button"
                    onClick={() => setShowClientIdConfig(!showClientIdConfig)}
                    className="text-[11px] font-bold text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>⚙️ Configuración avanzada (Client ID de Spotify)</span>
                  </button>

                  {showClientIdConfig && (
                    <div className="mt-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 space-y-2 animate-in fade-in">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                        Spotify Developer Client ID:
                      </label>
                      <input
                        type="text"
                        value={customClientId}
                        onChange={(e) => setCustomClientId(e.target.value)}
                        placeholder="Ingresa tu Client ID de developer.spotify.com"
                        className="w-full p-2 rounded-lg border text-xs outline-none bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                      />
                      <p className="text-[10px] text-gray-400">
                        Redirect URI que debes configurar en tu app de Spotify: <br />
                        <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded select-all font-mono">
                          {getSpotifyRedirectUri()}
                        </code>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Modo Manual con Enlace de Canción */}
        {activeTab === 'manual' && (
          <div className="space-y-3.5 text-xs">
            <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-gray-600 dark:text-gray-300">
                Pega el enlace de una canción de Spotify (o escribe el nombre y artista) para mostrarla fijada en tu perfil y en la vista previa del chat sin tener que iniciar sesión.
              </p>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Enlace de canción en Spotify:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://open.spotify.com/track/..."
                  className="flex-1 p-2.5 rounded-xl border text-xs outline-none bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus:border-[#1DB954]"
                />
                <button
                  type="button"
                  onClick={handleResolveManualUrl}
                  disabled={isLoadingOembed || !manualUrl.trim()}
                  className="px-3 py-2 bg-[#1DB954] hover:bg-[#1aa34a] text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isLoadingOembed ? <Loader2 size={13} className="animate-spin" /> : 'Obtener'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Título de la canción:
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Ej: Bohemian Rhapsody"
                  className="w-full p-2 rounded-xl border text-xs outline-none bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Artista:
                </label>
                <input
                  type="text"
                  value={manualArtist}
                  onChange={(e) => setManualArtist(e.target.value)}
                  placeholder="Ej: Queen"
                  className="w-full p-2 rounded-xl border text-xs outline-none bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                />
              </div>
            </div>

            {/* Previsualización en vivo */}
            {(manualPreview || (manualTitle && manualArtist)) && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Vista previa:
                </span>
                <SpotifyWidget
                  spotifyStatus={manualPreview || {
                    isPlaying: true,
                    track: manualTitle,
                    artist: manualArtist,
                    trackUrl: manualUrl
                  }}
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              {currentStatus && (
                <button
                  type="button"
                  onClick={handleRemoveStatus}
                  className="p-2.5 rounded-xl border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  title="Quitar estado musical de mi perfil"
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveManual}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#1DB954] hover:bg-[#1aa34a] text-white font-extrabold text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckLine size={15} />
                <span>Guardar canción en mi perfil</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default SpotifyConnectModal;
