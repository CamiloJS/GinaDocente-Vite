// src/components/VideosModule.jsx
// Módulo de Videoteca académica (mini-YouTube / TikTok de clase)
// Permite a docentes y estudiantes subir vídeos mediante enlace, explorarlos en formato largo y corto,
// ver la etiqueta de la clase a la que pertenecen, reaccionar con Me gusta y comentar interactivamente.

import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Video,
  Film,
  Play,
  Plus,
  Search,
  X,
  Heart,
  MessageSquare,
  Share2,
  Trash2,
  Edit3,
  ExternalLink,
  Clapperboard,
  Filter,
  CheckCircle2,
  Smartphone,
  SmartphoneHorizontal,
  Loader2,
  User
} from './Icons.jsx';
import { parseVideoUrl, normalizeVideoItem, deduplicateVideos } from '../utils/videoEngine.js';
import { resolveUserPhoto } from '../utils/helpers.js';
import {
  db as defaultDb,
  appId as defaultAppId,
  doc,
  setDoc,
  deleteDoc,
  updateDoc
} from '../firebase/config.js';
import { saveDemoSandboxItem, deleteDemoSandboxItem } from '../utils/demoData.js';

// Helper seguro para renderizar portales en document.body evitando el error React #31
const renderPortal = (children) => {
  if (typeof document === 'undefined' || !document.body) return null;
  if (ReactDOM && typeof ReactDOM.createPortal === 'function') {
    return ReactDOM.createPortal(children, document.body);
  }
  return children;
};

export default function VideosModule({
  videos = [],
  setVideos,
  role = 'student',
  myChatId = 'user_guest',
  loggedInName = 'Usuario',
  user = null,
  userMappings = {},
  academicGroups = [],
  isDarkMode = false,
  isDemoMode = false,
  db = defaultDb,
  appId = defaultAppId,
  showMessage = (msg) => console.log(msg),
  confirmAction
}) {
  // Helper para resolver la foto de perfil en tiempo real de cualquier usuario / autor
  const resolveAuthorPhoto = (item) => {
    if (!item) return '';
    const authorId = item.authorId || item.userId || '';
    const authorName = item.authorName || item.userName || '';
    const explicitPhoto = item.authorAvatar || item.userAvatar || item.photoURL || '';
    const authorRole = item.authorRole || item.userRole || '';
    return resolveUserPhoto({
      id: authorId,
      authorId,
      userId: authorId,
      author: authorName,
      authorName,
      name: authorName,
      authorRole,
      role: authorRole,
      profilePicUrl: explicitPhoto,
      photoURL: explicitPhoto,
      avatar: explicitPhoto
    }, userMappings, explicitPhoto);
  };

  // Helper para confirmaciones elegantes en modal propio con fallback a window.confirm
  const askConfirm = (msg, onConfirm) => {
    if (typeof confirmAction === 'function') {
      confirmAction(msg, onConfirm);
    } else if (typeof window !== 'undefined' && window.confirm(msg)) {
      onConfirm();
    }
  };

  // Helper seguro para formatear fechas de vídeos y comentarios sin riesgo de 'Invalid Date'
  const formatVideoDate = (val) => {
    if (!val) return '';
    const ms = typeof val === 'number' ? val : (val.toMillis ? val.toMillis() : (val.toDate ? val.toDate().getTime() : (val.seconds ? val.seconds * 1000 : Number(val))));
    if (!ms || isNaN(ms)) return '';
    return new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  const formatCommentDate = (val) => {
    if (!val) return '';
    const ms = typeof val === 'number' ? val : (val.toMillis ? val.toMillis() : (val.toDate ? val.toDate().getTime() : (val.seconds ? val.seconds * 1000 : Number(val))));
    if (!ms || isNaN(ms)) return '';
    return new Date(ms).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper para determinar permisos de edición y eliminación de vídeos
  const canModifyVideo = (vid) => {
    if (!vid) return false;
    if (role === 'teacher') return true;
    const cleanAuth = String(vid.authorId || vid.authorUsername || vid.userId || '').toLowerCase().replace(/^@/, '').trim();
    const cleanMyId = String(myChatId || '').toLowerCase().replace(/^@/, '').trim();
    if (cleanAuth && cleanMyId && cleanAuth === cleanMyId) return true;
    if (user?.uid && (vid.authorId === user.uid || vid.uid === user.uid || vid.userId === user.uid)) return true;
    if (loggedInName && vid.authorName && vid.authorName.toLowerCase().trim() === loggedInName.toLowerCase().trim()) return true;
    return false;
  };

  // Helper para determinar permisos de eliminación de comentarios
  const canModifyComment = (comm) => {
    if (!comm) return false;
    if (role === 'teacher') return true;
    const cleanCommUser = String(comm.userId || comm.authorId || '').toLowerCase().replace(/^@/, '').trim();
    const cleanMyId = String(myChatId || '').toLowerCase().replace(/^@/, '').trim();
    if (cleanCommUser && cleanMyId && cleanCommUser === cleanMyId) return true;
    if (user?.uid && (comm.userId === user.uid || comm.authorId === user.uid)) return true;
    if (loggedInName && comm.userName && comm.userName.toLowerCase().trim() === loggedInName.toLowerCase().trim()) return true;
    return false;
  };
  // Filtros de navegación
  const [selectedFormatFilter, setSelectedFormatFilter] = useState('all'); // 'all' | 'long' | 'short'
  const [selectedClassFilter, setSelectedClassFilter] = useState('all'); // 'all' | class name
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activePlayingVideo, setActivePlayingVideo] = useState(null);
  const [editingVideo, setEditingVideo] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editClass, setEditClass] = useState('');
  const [isCustomEditClass, setIsCustomEditClass] = useState(false);
  const [customEditClassName, setCustomEditClassName] = useState('');
  const [editFormat, setEditFormat] = useState('long');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Formulario de nuevo vídeo
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoDescription, setNewVideoDescription] = useState('');
  const [newVideoClass, setNewVideoClass] = useState('');
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [customClassName, setCustomClassName] = useState('');
  const [newVideoFormat, setNewVideoFormat] = useState('long'); // 'long' | 'short'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para nuevo comentario en el reproductor
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const commentsEndRef = useRef(null);

  // Copiar al portapapeles con fallback robusto para todos los navegadores
  const copyToClipboard = async (text) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        showMessage('Enlace copiado al portapapeles.');
        return;
      }
    } catch (e) {}
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      showMessage('Enlace copiado al portapapeles.');
    } catch (err) {
      showMessage('No se pudo copiar el enlace.');
    }
  };

  // Cerrar modales con la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (editingVideo) {
          setEditingVideo(null);
        } else if (isUploadModalOpen) {
          setIsUploadModalOpen(false);
        } else if (activePlayingVideo) {
          setActivePlayingVideo(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingVideo, isUploadModalOpen, activePlayingVideo]);

  // Bloqueo de scroll en body al abrir modales para evitar scroll doble en móviles
  useEffect(() => {
    const isAnyModalOpen = Boolean(activePlayingVideo || isUploadModalOpen || editingVideo);
    if (isAnyModalOpen && typeof document !== 'undefined' && document.body) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [activePlayingVideo, isUploadModalOpen, editingVideo]);

  // Inicializar clase por defecto
  useEffect(() => {
    if (academicGroups && academicGroups.length > 0 && !newVideoClass) {
      setNewVideoClass(academicGroups[0].name);
    } else if (!newVideoClass) {
      setNewVideoClass('Inglés Técnico Económico');
    }
  }, [academicGroups]);

  // Auto-detectar formato al cambiar URL en el formulario de subida
  const parsedPreview = useMemo(() => {
    return parseVideoUrl(newVideoUrl);
  }, [newVideoUrl]);

  useEffect(() => {
    if (parsedPreview.isValid && parsedPreview.suggestedFormat) {
      setNewVideoFormat(parsedPreview.suggestedFormat);
    }
  }, [parsedPreview]);

  // Deduplicación defensiva y unificación estricta de la lista de vídeos recibida
  const deduplicatedVideos = useMemo(() => {
    return deduplicateVideos(videos);
  }, [videos]);

  // Lista única de clases presentes en los vídeos para los filtros
  const availableClasses = useMemo(() => {
    const set = new Set();
    // Clases de los grupos académicos
    (academicGroups || []).forEach(g => {
      if (g.name) set.add(g.name.trim());
    });
    // Clases presentes en los vídeos
    (deduplicatedVideos || []).forEach(v => {
      if (v.className) set.add(v.className.trim());
    });
    return Array.from(set).filter(Boolean);
  }, [academicGroups, deduplicatedVideos]);

  // Filtrado de vídeos
  const filteredVideos = useMemo(() => {
    return (deduplicatedVideos || []).filter(v => {
      // Filtro por formato
      if (selectedFormatFilter === 'long' && v.format !== 'long') return false;
      if (selectedFormatFilter === 'short' && v.format !== 'short') return false;

      // Filtro por clase
      if (selectedClassFilter !== 'all' && v.className !== selectedClassFilter) {
        return false;
      }

      // Filtro por búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const haystack = `${v.title || ''} ${v.description || ''} ${v.className || ''} ${v.authorName || ''}`.toLowerCase();
        return haystack.includes(q);
      }

      return true;
    });
  }, [deduplicatedVideos, selectedFormatFilter, selectedClassFilter, searchQuery]);

  // Separar en formato largo y corto para la vista combinada ('all')
  const longVideos = useMemo(() => {
    return filteredVideos.filter(v => v.format === 'long');
  }, [filteredVideos]);

  const shortVideos = useMemo(() => {
    return filteredVideos.filter(v => v.format === 'short');
  }, [filteredVideos]);

  // Actualizar el video activo en reproducción si cambia la lista (e.g. nuevos comentarios o likes)
  useEffect(() => {
    if (activePlayingVideo) {
      const updated = deduplicatedVideos.find(v => String(v.id) === String(activePlayingVideo.id));
      if (updated) {
        setActivePlayingVideo(updated);
      }
    }
  }, [deduplicatedVideos]);

  // Manejador: Subir vídeo
  const handleUploadVideo = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (isSubmitting) return;

    const cleanUrl = newVideoUrl.trim();
    const cleanTitle = newVideoTitle.trim();
    const finalClass = isCustomClass ? customClassName.trim() : newVideoClass.trim();

    if (!cleanUrl) {
      showMessage('Por favor pega el enlace del vídeo.');
      return;
    }
    if (!cleanTitle) {
      showMessage('Por favor escribe un título para el vídeo.');
      return;
    }

    const parsed = parseVideoUrl(cleanUrl);
    if (!parsed.isValid) {
      showMessage('El enlace no parece válido. Verifica la URL e intenta nuevamente.');
      return;
    }

    setIsSubmitting(true);
    const now = Date.now();
    const videoItem = normalizeVideoItem({
      id: `vid_${now}_${Math.random().toString(36).substring(2, 7)}`,
      url: cleanUrl,
      title: cleanTitle,
      description: newVideoDescription.trim(),
      className: finalClass || 'Inglés Técnico',
      format: newVideoFormat,
      authorId: myChatId,
      authorName: loggedInName || (role === 'teacher' ? 'Docente' : 'Estudiante'),
      authorRole: role,
      authorAvatar: resolveAuthorPhoto({ authorId: myChatId, authorName: loggedInName, authorRole: role }) || user?.photoURL || '',
      likes: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
      isDemoCreated: isDemoMode
    });

    try {
      if (isDemoMode) {
        saveDemoSandboxItem('videos', videoItem);
        if (typeof setVideos === 'function') {
          setVideos(prev => {
            const list = Array.isArray(prev) ? prev : [];
            const exists = list.some(v => String(v?.id) === String(videoItem.id));
            return exists
              ? list.map(v => (String(v?.id) === String(videoItem.id) ? videoItem : v))
              : [videoItem, ...list.filter(v => String(v?.id) !== String(videoItem.id))];
          });
        }
      } else {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', videoItem.id), videoItem);
        if (typeof setVideos === 'function') {
          setVideos(prev => {
            const list = Array.isArray(prev) ? prev : [];
            const exists = list.some(v => String(v?.id) === String(videoItem.id));
            return exists
              ? list.map(v => (String(v?.id) === String(videoItem.id) ? videoItem : v))
              : [videoItem, ...list.filter(v => String(v?.id) !== String(videoItem.id))];
          });
        }
      }

      showMessage('¡Vídeo publicado con éxito en la videoteca!');
      setIsUploadModalOpen(false);
      setNewVideoUrl('');
      setNewVideoTitle('');
      setNewVideoDescription('');
      setIsCustomClass(false);
      setCustomClassName('');
    } catch (err) {
      console.error('Error al subir vídeo:', err);
      showMessage('No se pudo guardar el vídeo. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejador: Reaccionar (Me gusta / Heart)
  const handleToggleLike = async (video, e) => {
    if (e) e.stopPropagation();
    if (!video || !video.id) return;

    const currentLikes = Array.isArray(video.likes) ? video.likes : [];
    const hasLiked = currentLikes.includes(myChatId);
    const updatedLikes = hasLiked
      ? currentLikes.filter(id => id !== myChatId)
      : [...currentLikes, myChatId];

    const updatedVideo = {
      ...video,
      likes: updatedLikes,
      updatedAt: Date.now()
    };

    // Actualización optimista local
    if (typeof setVideos === 'function') {
      setVideos(prev => (prev || []).map(v => (String(v?.id) === String(video.id) ? updatedVideo : v)));
    }
    if (activePlayingVideo && String(activePlayingVideo.id) === String(video.id)) {
      setActivePlayingVideo(updatedVideo);
    }

    try {
      if (isDemoMode || String(video.id).startsWith('demo_')) {
        saveDemoSandboxItem('videos', updatedVideo);
      } else {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', video.id), {
          likes: updatedLikes,
          updatedAt: Date.now()
        });
      }
    } catch (err) {
      console.error('Error al actualizar reacción:', err);
    }
  };

  // Manejador: Enviar comentario
  const handleAddComment = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (isSubmittingComment) return;

    const cleanText = commentInput.trim();
    if (!cleanText || !activePlayingVideo) return;

    setIsSubmittingComment(true);
    const now = Date.now();
    const newComment = {
      id: `comm_${now}_${Math.random().toString(36).substring(2, 7)}`,
      userId: myChatId,
      userName: loggedInName || (role === 'teacher' ? 'Docente' : 'Estudiante'),
      userRole: role,
      userAvatar: resolveAuthorPhoto({ userId: myChatId, userName: loggedInName, userRole: role }) || user?.photoURL || '',
      text: cleanText,
      createdAt: now
    };

    const currentComments = Array.isArray(activePlayingVideo.comments) ? activePlayingVideo.comments : [];
    const updatedComments = [...currentComments, newComment];

    const updatedVideo = {
      ...activePlayingVideo,
      comments: updatedComments,
      updatedAt: now
    };

    // Actualización optimista
    setActivePlayingVideo(updatedVideo);
    if (typeof setVideos === 'function') {
      setVideos(prev => (prev || []).map(v => (String(v?.id) === String(activePlayingVideo.id) ? updatedVideo : v)));
    }
    setCommentInput('');

    try {
      if (isDemoMode || String(activePlayingVideo.id).startsWith('demo_')) {
        saveDemoSandboxItem('videos', updatedVideo);
      } else {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', activePlayingVideo.id), {
          comments: updatedComments,
          updatedAt: now
        });
      }
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error al agregar comentario:', err);
      showMessage('No se pudo enviar el comentario.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Manejador: Eliminar comentario
  const handleDeleteComment = async (commentId) => {
    if (!activePlayingVideo || !commentId) return;
    askConfirm('¿Deseas eliminar este comentario?', async () => {
      const currentComments = Array.isArray(activePlayingVideo.comments) ? activePlayingVideo.comments : [];
      const updatedComments = currentComments.filter(c => String(c?.id) !== String(commentId));

      const updatedVideo = {
        ...activePlayingVideo,
        comments: updatedComments,
        updatedAt: Date.now()
      };

      setActivePlayingVideo(updatedVideo);
      if (typeof setVideos === 'function') {
        setVideos(prev => (prev || []).map(v => (String(v?.id) === String(activePlayingVideo.id) ? updatedVideo : v)));
      }

      try {
        if (isDemoMode || String(activePlayingVideo.id).startsWith('demo_')) {
          saveDemoSandboxItem('videos', updatedVideo);
        } else {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', activePlayingVideo.id), {
            comments: updatedComments,
            updatedAt: Date.now()
          });
        }
      } catch (err) {
        console.error('Error al borrar comentario:', err);
      }
    });
  };

  // Manejador: Eliminar vídeo
  const handleDeleteVideo = async (video, e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (!video || !video.id) return;
    askConfirm(`¿Estás seguro de eliminar el vídeo "${video.title}"?`, async () => {
      const targetId = String(video.id);

      if (activePlayingVideo && String(activePlayingVideo.id) === targetId) {
        setActivePlayingVideo(null);
      }

      if (typeof setVideos === 'function') {
        setVideos(prev => (prev || []).filter(v => String(v?.id) !== targetId));
      }

      try {
        if (isDemoMode || targetId.startsWith('demo_')) {
          deleteDemoSandboxItem('videos', targetId);
        } else {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', targetId));
        }
        showMessage('Vídeo eliminado de la videoteca.');
      } catch (err) {
        console.error('Error al eliminar vídeo:', err);
        showMessage('No se pudo eliminar el vídeo.');
      }
    });
  };

  // Manejador: Abrir modal de edición
  const handleOpenEditModal = (video, e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (!video) return;
    setEditingVideo(video);
    setEditTitle(video.title || '');
    setEditDescription(video.description || '');
    setEditClass(video.className || (academicGroups?.[0]?.name || 'Inglés Técnico Económico'));
    setEditFormat(video.format || 'long');
    setIsCustomEditClass(false);
    setCustomEditClassName('');
  };

  // Manejador: Guardar cambios de edición (Título, Descripción, Clase y Formato)
  const handleSaveEditVideo = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!editingVideo || isSavingEdit) return;

    const cleanTitle = editTitle.trim();
    if (!cleanTitle) {
      showMessage('Por favor escribe un título para el vídeo.');
      return;
    }

    setIsSavingEdit(true);
    const now = Date.now();
    const finalClass = isCustomEditClass ? customEditClassName.trim() : editClass.trim();
    const updatedVideo = {
      ...editingVideo,
      title: cleanTitle,
      description: editDescription.trim(),
      className: finalClass || editingVideo.className || 'Inglés Técnico Económico',
      format: editFormat || editingVideo.format || 'long',
      updatedAt: now
    };

    // Actualización optimista en memoria
    if (typeof setVideos === 'function') {
      setVideos(prev => (prev || []).map(v => String(v?.id) === String(editingVideo.id) ? updatedVideo : v));
    }
    if (activePlayingVideo && String(activePlayingVideo.id) === String(editingVideo.id)) {
      setActivePlayingVideo(updatedVideo);
    }

    try {
      if (isDemoMode || String(editingVideo.id).startsWith('demo_')) {
        saveDemoSandboxItem('videos', updatedVideo);
      } else {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', String(editingVideo.id)), {
          title: cleanTitle,
          description: editDescription.trim(),
          className: finalClass || editingVideo.className || 'Inglés Técnico Económico',
          format: editFormat || editingVideo.format || 'long',
          updatedAt: now
        });
      }
      showMessage('Vídeo actualizado con éxito.');
      setEditingVideo(null);
    } catch (err) {
      console.error('Error al editar vídeo:', err);
      showMessage('No se pudieron guardar los cambios del vídeo.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Componente de Renderizado del Reproductor embebido
  const renderEmbeddedPlayer = (video, isTheater = false) => {
    if (!video) return null;
    const { playerType, embedUrl, title, url } = video;

    if (!embedUrl) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gray-900 text-white rounded-2xl space-y-3">
          <Film size={36} className="text-gray-400" />
          <p className="text-xs sm:text-sm font-semibold max-w-sm">Este formato se reproduce mejor en su enlace original.</p>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-[#AD3333] hover:bg-[#8f2828] text-white text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Abrir enlace del vídeo</span>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      );
    }

    // 1. YouTube
    if (playerType === 'youtube' && embedUrl) {
      return (
        <iframe
          src={embedUrl}
          title={title}
          className="w-full h-full rounded-2xl border-0 shadow-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      );
    }

    // 2. TikTok
    if (playerType === 'tiktok') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black rounded-2xl overflow-hidden">
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full rounded-2xl border-0"
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    // 3. Archivos directos (.mp4, .webm, File Garden, Dropbox raw, etc.)
    if (playerType === 'direct' || playerType === 'filegarden' || playerType === 'dropbox') {
      return (
        <video
          src={embedUrl}
          controls
          playsInline
          autoPlay
          className="w-full h-full rounded-2xl bg-black object-contain shadow-lg"
        >
          Tu navegador no soporta reproducción de vídeo HTML5.
        </video>
      );
    }

    // 4. pCloud / Google Drive / Vimeo / Fallback
    return (
      <iframe
        src={embedUrl}
        title={title}
        className="w-full h-full rounded-2xl border-0 shadow-lg"
        allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-7xl mx-auto w-full px-2 sm:px-4">
      {/* ================= ENCABEZADO PRINCIPAL DE LA VIDEOTECA ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#AD3333] to-red-500 text-white flex items-center justify-center shadow-md">
              <Film size={22} />
            </div>
            <span>Vídeos</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Videoteca académica: clases grabadas, explicaciones técnicas y tutoriales de clase.
          </p>
        </div>

        {/* Botón de acción principal: Subir vídeo (disponible para todos) */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#AD3333] hover:bg-[#8f2828] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus size={16} />
            <span>Subir vídeo</span>
          </button>
        </div>
      </div>

      {/* ================= BARRA DE BÚSQUEDA Y NAVEGACIÓN ESTILO MINI-YOUTUBE ================= */}
      <div className="space-y-3">
        {/* Fila superior: Selector de formato (Todos / Largo / Cortos) + Buscador */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Segmented Controls de Formato */}
          <div className={`flex items-center p-1 rounded-2xl border shadow-2xs ${
            isDarkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-gray-100 border-gray-200'
          }`}>
            <button
              type="button"
              onClick={() => setSelectedFormatFilter('all')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedFormatFilter === 'all'
                  ? (isDarkMode ? 'bg-gray-900 text-gray-100 shadow-xs' : 'bg-white text-gray-900 shadow-xs')
                  : (isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900')
              }`}
            >
              <Clapperboard size={14} />
              <span>Todos</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormatFilter('long')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedFormatFilter === 'long'
                  ? (isDarkMode ? 'bg-gray-900 text-gray-100 shadow-xs' : 'bg-white text-gray-900 shadow-xs')
                  : (isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900')
              }`}
            >
              <SmartphoneHorizontal size={14} />
              <span>Largos</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormatFilter('short')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedFormatFilter === 'short'
                  ? (isDarkMode ? 'bg-gray-900 text-gray-100 shadow-xs' : 'bg-white text-gray-900 shadow-xs')
                  : (isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900')
              }`}
            >
              <Smartphone size={14} />
              <span>Cortos</span>
            </button>
          </div>

          {/* Campo de Búsqueda */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar vídeos por título, autor o clase..."
              className={`w-full pl-9 pr-8 py-2 rounded-2xl border text-xs font-medium outline-none transition-all shadow-2xs ${
                isDarkMode
                  ? 'bg-gray-800/90 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-[#AD3333]'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#AD3333]'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Fila inferior: Chips de Clases (Filtro por etiqueta de clase) */}
        {availableClasses.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            <span className="text-[11px] font-bold text-gray-400 shrink-0 pl-0.5 flex items-center gap-1">
              <Filter size={12} />
              <span>Clases:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedClassFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedClassFilter === 'all'
                  ? 'bg-[#AD3333] text-white shadow-xs'
                  : (isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
              }`}
            >
              Todas las clases
            </button>

            {availableClasses.map((clsName) => (
              <button
                key={clsName}
                type="button"
                onClick={() => setSelectedClassFilter(clsName)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedClassFilter === clsName
                    ? 'bg-[#AD3333] text-white shadow-xs'
                    : (isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                }`}
              >
                {clsName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ================= CONTENIDO DE VÍDEOS ================= */}
      {filteredVideos.length === 0 ? (
        <div className={`py-16 text-center border-2 border-dashed rounded-3xl p-8 space-y-4 ${
          isDarkMode ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <div className="w-16 h-16 mx-auto rounded-3xl bg-red-500/10 text-[#AD3333] dark:text-red-400 flex items-center justify-center">
            <Video size={32} />
          </div>
          <div className="space-y-1">
            <h3 className={`text-base font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              No hay vídeos disponibles
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              {searchQuery || selectedClassFilter !== 'all' || selectedFormatFilter !== 'all'
                ? 'No encontramos vídeos que coincidan con tus filtros actuales. Intenta limpiar la búsqueda.'
                : 'Sé el primero en compartir un vídeo'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedClassFilter('all');
              setSelectedFormatFilter('all');
              setIsUploadModalOpen(true);
            }}
            className="px-4 py-2 rounded-2xl bg-[#AD3333] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm hover:scale-[1.02] transition-transform cursor-pointer"
          >
            <Plus size={14} />
            <span>Subir el primer vídeo</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. SECCIÓN DE CORTOS (Se muestra en 'all' o en 'short') */}
          {(selectedFormatFilter === 'all' || selectedFormatFilter === 'short') && shortVideos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Smartphone size={18} className="text-[#AD3333] dark:text-red-400" />
                  <span>Cortos</span>
                </h3>
                <span className="text-xs text-gray-400 font-bold">
                  {shortVideos.length} {shortVideos.length === 1 ? 'corto' : 'cortos'}
                </span>
              </div>

              {/* Grid / Carrusel de Cortos 9:16 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {shortVideos.map((video) => {
                  const hasLiked = (video.likes || []).some(id => String(id || '').toLowerCase().replace(/^@/, '').trim() === String(myChatId || '').toLowerCase().replace(/^@/, '').trim() || (user?.uid && id === user.uid));
                  const canEdit = canModifyVideo(video);
                  const canDelete = canModifyVideo(video);
                  const authorPhoto = resolveAuthorPhoto(video);

                  return (
                    <div
                      key={video.id}
                      onClick={() => setActivePlayingVideo(video)}
                      className="group relative rounded-2xl overflow-hidden aspect-[9/16] bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between p-3"
                    >
                      {/* Fondo de Thumbnail o gradiente oscuro */}
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-gray-900 to-black" />
                      )}

                      {/* Overlay con degradado para legibilidad del texto */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40 group-hover:via-black/20 transition-all" />

                      {/* Header de la tarjeta vertical: Etiqueta de la clase (solo en 'all') y acciones */}
                      <div className="relative z-10 flex items-start justify-between gap-1">
                        {selectedClassFilter === 'all' ? (
                          <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-black text-white border border-white/10 truncate max-w-[70%]">
                            {video.className}
                          </span>
                        ) : <div />}

                        <div className="flex items-center gap-1 shrink-0">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditModal(video, e)}
                              title="Editar vídeo"
                              className="p-1 rounded-md bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-colors cursor-pointer"
                            >
                              <Edit3 size={12} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteVideo(video, e)}
                              title="Eliminar vídeo"
                              className="p-1 rounded-md bg-black/50 text-white/70 hover:text-red-400 hover:bg-black/80 transition-colors cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Botón flotante central de Play al hacer hover */}
                      <div className="relative z-10 mx-auto my-auto opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-lg">
                          <Play size={20} className="ml-0.5 text-white" />
                        </div>
                      </div>

                      {/* Footer de la tarjeta vertical: Título, autor y contadores */}
                      <div className="relative z-10 space-y-1.5 text-left">
                        <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight drop-shadow-sm">
                          {video.title}
                        </h4>

                        <div className="flex items-center justify-between text-[10px] text-gray-300">
                          <div className="flex items-center gap-1.5 min-w-0 max-w-[62%]">
                            <div className="relative w-4 h-4 rounded-full overflow-hidden shrink-0 ring-1 ring-white/50 bg-white/20">
                              <div className="w-full h-full text-white flex items-center justify-center font-bold text-[8px]">
                                {(video.authorName || 'U').charAt(0).toUpperCase()}
                              </div>
                              {authorPhoto && (
                                <img
                                  src={authorPhoto}
                                  alt={video.authorName}
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              )}
                            </div>
                            <span className="truncate opacity-95 text-[10.5px] text-white font-medium">
                              {video.authorName}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleToggleLike(video, e)}
                              className={`flex items-center gap-0.5 transition-colors ${
                                hasLiked ? 'text-red-400' : 'text-gray-300 hover:text-white'
                              }`}
                            >
                              <Heart size={12} fill={hasLiked ? '#f87171' : 'none'} />
                              <span>{(video.likes || []).length}</span>
                            </button>

                            <div className="flex items-center gap-0.5 text-gray-300">
                              <MessageSquare size={12} />
                              <span>{(video.comments || []).length}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. SECCIÓN DE VÍDEOS LARGOS (Se muestra en 'all' o en 'long') */}
          {(selectedFormatFilter === 'all' || selectedFormatFilter === 'long') && longVideos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <SmartphoneHorizontal size={18} className="text-[#AD3333]" />
                  <span>Largos</span>
                </h3>
                <span className="text-xs text-gray-400 font-bold">
                  {longVideos.length} {longVideos.length === 1 ? 'vídeo' : 'vídeos'}
                </span>
              </div>

              {/* Grid 16:9 estilo mini-YouTube: miniaturas más grandes en escritorio y metadatos más compactos */}
              <div className="grid grid-cols-1 md:grid-cols-2 min-[1400px]:grid-cols-3 gap-6 sm:gap-7">
                {longVideos.map((video) => {
                  const hasLiked = (video.likes || []).some(id => String(id || '').toLowerCase().replace(/^@/, '').trim() === String(myChatId || '').toLowerCase().replace(/^@/, '').trim() || (user?.uid && id === user.uid));
                  const canEdit = canModifyVideo(video);
                  const canDelete = canModifyVideo(video);
                  const authorPhoto = resolveAuthorPhoto(video);

                  return (
                    <div
                      key={video.id}
                      onClick={() => setActivePlayingVideo(video)}
                      className={`group rounded-3xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {/* Portada 16:9 de gran formato */}
                      <div className="relative aspect-video w-full bg-gray-900 overflow-hidden">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-950">
                            <Film size={40} className="text-gray-600 group-hover:scale-110 transition-transform" />
                          </div>
                        )}

                        {/* Botón flotante central de Play */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                          <div className="w-13 h-13 rounded-full bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                            <Play size={22} className="ml-0.5 fill-current" />
                          </div>
                        </div>

                        {/* Etiqueta de la clase flotante (solo cuando está en 'all') */}
                        {selectedClassFilter === 'all' && (
                          <div className="absolute top-3 left-3 z-10 max-w-[65%] pointer-events-none">
                            <span className="px-2.5 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-bold text-white border border-white/10 shadow-xs truncate block">
                              {video.className}
                            </span>
                          </div>
                        )}

                        {/* Botones de acción flotantes (Editar y Borrar) */}
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditModal(video, e)}
                              title="Editar vídeo"
                              className="p-1.5 rounded-xl bg-black/60 text-white/80 hover:text-white hover:bg-black/90 transition-colors shadow-xs cursor-pointer"
                            >
                              <Edit3 size={13} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteVideo(video, e)}
                              title="Eliminar vídeo"
                              className="p-1.5 rounded-xl bg-black/60 text-white/70 hover:text-red-400 hover:bg-black/90 transition-colors shadow-xs cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Contenido inferior estilo YouTube: Foto de perfil destacada a la izquierda, título y autor compactos a la derecha */}
                      <div className="p-3 sm:p-3.5 flex items-start gap-3">
                        {/* Foto de perfil del autor */}
                        <div className="shrink-0 mt-0.5">
                          <div className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 ring-2 shadow-xs ${
                            isDarkMode ? 'ring-gray-700 bg-red-950/40 text-red-400' : 'ring-gray-100 bg-[#AD3333]/10 text-[#AD3333]'
                          }`}>
                            <div className="w-full h-full flex items-center justify-center font-extrabold text-xs">
                              {(video.authorName || 'U').charAt(0).toUpperCase()}
                            </div>
                            {authorPhoto && (
                              <img
                                src={authorPhoto}
                                alt={video.authorName}
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                          </div>
                        </div>

                        {/* Info compacta: Título arriba, autor y métricas debajo */}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <h4
                            className={`text-xs sm:text-[13.5px] font-bold line-clamp-2 leading-snug group-hover:text-[#AD3333] transition-colors ${
                              isDarkMode ? 'text-gray-100' : 'text-gray-900'
                            }`}
                            title={video.title}
                          >
                            {video.title}
                          </h4>

                          <p className={`text-[11px] font-medium truncate ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`} title={video.authorName}>
                            {video.authorName}
                          </p>

                          <div className={`flex items-center gap-3 text-[11px] pt-0.5 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-400'
                          }`}>
                            <button
                              type="button"
                              onClick={(e) => handleToggleLike(video, e)}
                              className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                                hasLiked ? 'text-red-500' : 'hover:text-red-500'
                              }`}
                            >
                              <Heart size={12} fill={hasLiked ? '#ef4444' : 'none'} />
                              <span>{(video.likes || []).length}</span>
                            </button>

                            <div className="flex items-center gap-1 font-semibold">
                              <MessageSquare size={12} />
                              <span>{(video.comments || []).length}</span>
                            </div>

                            <span>•</span>
                            <span>{formatVideoDate(video.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL DEL REPRODUCTOR INMERSIVO (CINE / THEATER) ================= */}
      {activePlayingVideo && renderPortal(
        <div
          onClick={() => setActivePlayingVideo(null)}
          className={`fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer ${isDarkMode ? 'dark' : ''}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl border overflow-hidden flex flex-col cursor-default ${
              isDarkMode
                ? 'bg-gray-900 border-gray-800 text-gray-100'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            {/* Barra superior del modal */}
            <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2.5 py-1 rounded-xl bg-[#AD3333] text-white text-xs font-black shrink-0">
                  {activePlayingVideo.className}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => copyToClipboard(activePlayingVideo.url)}
                  title="Copiar enlace del vídeo"
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  <Share2 size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setActivePlayingVideo(null)}
                  title="Cerrar reproductor"
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Cuerpo del modal: Reproductor + Panel de Comentarios */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-0">
              {/* Columna izquierda / principal: Reproductor y detalles */}
              <div className={`lg:col-span-2 p-3 sm:p-5 space-y-4 border-b lg:border-b-0 lg:border-r flex flex-col justify-between ${
                isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
              }`}>
                <div className="space-y-4">
                  {/* Área del reproductor */}
                  <div className={`w-full overflow-hidden rounded-2xl bg-black ${
                    activePlayingVideo.format === 'short'
                      ? 'aspect-[9/16] max-h-[60vh] mx-auto w-auto'
                      : 'aspect-video w-full'
                  }`}>
                    {renderEmbeddedPlayer(activePlayingVideo, true)}
                  </div>

                  {/* Título y metadatos */}
                  <div className="space-y-2">
                    <h2 className={`text-lg sm:text-xl font-black leading-tight ${
                      isDarkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      {activePlayingVideo.title}
                    </h2>

                    <div className={`flex flex-wrap items-center justify-between gap-3 text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`relative w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 shadow-xs ${
                          isDarkMode ? 'ring-gray-700 bg-red-950/40 text-red-400' : 'ring-gray-100 bg-[#AD3333]/10 text-[#AD3333]'
                        }`}>
                          <div className="w-full h-full flex items-center justify-center font-extrabold text-xs">
                            {(activePlayingVideo.authorName || 'U').charAt(0).toUpperCase()}
                          </div>
                          {resolveAuthorPhoto(activePlayingVideo) && (
                            <img
                              src={resolveAuthorPhoto(activePlayingVideo)}
                              alt={activePlayingVideo.authorName}
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                        </div>
                        <div>
                          <p className={`font-bold text-xs sm:text-sm ${
                            isDarkMode ? 'text-gray-100' : 'text-gray-800'
                          }`}>
                            {activePlayingVideo.authorName}
                          </p>
                          <p className={`text-[10px] ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-400'
                          }`}>
                            {activePlayingVideo.authorRole === 'teacher' ? 'Docente' : 'Estudiante'} • {formatVideoDate(activePlayingVideo.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center gap-2">
                        {canModifyVideo(activePlayingVideo) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(activePlayingVideo)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isDarkMode
                                  ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              title="Editar título y descripción"
                            >
                              <Edit3 size={13} />
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteVideo(activePlayingVideo, e)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isDarkMode
                                  ? 'bg-gray-800 text-red-400 hover:bg-red-950/40 hover:text-red-300'
                                  : 'bg-gray-100 text-red-600 hover:bg-red-50 hover:text-red-700'
                              }`}
                              title="Eliminar vídeo de la videoteca"
                            >
                              <Trash2 size={13} />
                              <span className="hidden sm:inline">Eliminar</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleToggleLike(activePlayingVideo, e)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            (activePlayingVideo.likes || []).some(id => String(id || '').toLowerCase().replace(/^@/, '').trim() === String(myChatId || '').toLowerCase().replace(/^@/, '').trim() || (user?.uid && id === user.uid))
                              ? 'bg-red-500 text-white shadow-xs'
                              : (isDarkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                          }`}
                        >
                          <Heart size={14} fill={(activePlayingVideo.likes || []).some(id => String(id || '').toLowerCase().replace(/^@/, '').trim() === String(myChatId || '').toLowerCase().replace(/^@/, '').trim() || (user?.uid && id === user.uid)) ? '#ffffff' : 'none'} />
                          <span>{(activePlayingVideo.likes || []).length} Me gusta</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Descripción */}
                  {activePlayingVideo.description && (
                    <div className={`p-3.5 rounded-2xl border text-xs whitespace-pre-line leading-relaxed ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-gray-300'
                        : 'bg-gray-50 border-gray-100 text-gray-700'
                    }`}>
                      {activePlayingVideo.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Columna derecha: Comentarios interactivos */}
              <div className={`lg:col-span-1 p-3 sm:p-4 flex flex-col justify-between max-h-[500px] lg:max-h-none overflow-hidden ${
                isDarkMode
                  ? 'bg-gray-900 border-gray-800'
                  : 'bg-gray-50/50 border-gray-200'
              }`}>
                <div className="space-y-3 flex-1 flex flex-col min-h-0">
                  <div className={`flex items-center justify-between pb-2 border-b shrink-0 ${
                    isDarkMode ? 'border-gray-800' : 'border-gray-200'
                  }`}>
                    <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      <MessageSquare size={14} className="text-[#AD3333]" />
                      <span>Comentarios ({ (activePlayingVideo.comments || []).length })</span>
                    </h4>
                  </div>

                  {/* Lista de comentarios con scroll */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {(activePlayingVideo.comments || []).length === 0 ? (
                      <div className={`py-8 text-center text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-400'
                      }`}>
                        Aún no hay comentarios. ¡Sé el primero en opinar!
                      </div>
                    ) : (
                      (activePlayingVideo.comments || []).map((comm) => {
                        const canDeleteComment = canModifyComment(comm);
                        const commPhoto = resolveAuthorPhoto(comm);
                        return (
                          <div
                            key={comm.id}
                            className={`p-2.5 rounded-2xl border text-xs space-y-1 relative group ${
                              isDarkMode
                                ? 'bg-gray-800 border-gray-700 text-gray-200'
                                : 'bg-white border-gray-100 text-gray-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className={`relative w-5 h-5 rounded-full overflow-hidden shrink-0 ring-1 ${
                                  isDarkMode ? 'ring-gray-700 bg-red-950/40 text-red-400' : 'ring-gray-200 bg-[#AD3333]/10 text-[#AD3333]'
                                }`}>
                                  <div className="w-full h-full flex items-center justify-center font-bold text-[9px]">
                                    {(comm.userName || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  {commPhoto && (
                                    <img
                                      src={commPhoto}
                                      alt={comm.userName}
                                      className="absolute inset-0 w-full h-full object-cover"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  )}
                                </div>
                                <span className={`font-bold flex items-center gap-1 truncate ${
                                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                }`}>
                                  {comm.userName}
                                  {comm.userRole === 'teacher' && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#AD3333] text-white shrink-0">
                                      Docente
                                    </span>
                                  )}
                                </span>
                              </div>
                              <span className={`text-[10px] shrink-0 ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-400'
                              }`}>
                                {formatCommentDate(comm.createdAt)}
                              </span>
                            </div>

                            <p className={`leading-relaxed font-normal ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {comm.text}
                            </p>

                            {canDeleteComment && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comm.id)}
                                title="Borrar comentario"
                                className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-opacity cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                    <div ref={commentsEndRef} />
                  </div>
                </div>

                {/* Formulario para agregar nuevo comentario */}
                <form onSubmit={handleAddComment} className={`pt-3 border-t mt-2 shrink-0 ${
                  isDarkMode ? 'border-gray-800' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Escribe un comentario o pregunta..."
                      className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-none ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-[#AD3333]'
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#AD3333]'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={!commentInput.trim() || isSubmittingComment}
                      className="px-3.5 py-2 rounded-xl bg-[#AD3333] hover:bg-[#8f2828] text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                    >
                      {isSubmittingComment ? <Loader2 size={13} className="animate-spin" /> : 'Enviar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL SUBIR VÍDEO (MINIMALISTA Y MODERNO) ================= */}
      {isUploadModalOpen && renderPortal(
        <div
          onClick={() => setIsUploadModalOpen(false)}
          className={`fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer ${isDarkMode ? 'dark' : ''}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-3xl shadow-2xl border p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-200 cursor-default ${
              isDarkMode
                ? 'bg-gray-900 border-gray-800 text-gray-100'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            {/* Header del Modal */}
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDarkMode ? 'border-gray-800' : 'border-gray-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 text-[#AD3333] dark:text-red-400 flex items-center justify-center font-black">
                  <Video size={16} />
                </div>
                <div>
                  <h3 className={`text-base font-extrabold ${
                    isDarkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    Subir vídeo
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Añade un vídeo a la videoteca pegando su enlace.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleUploadVideo} className="space-y-4">
              {/* 1. Enlace del vídeo */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Enlace del vídeo *
                </label>
                <input
                  type="url"
                  required
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-[#AD3333]'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#AD3333]'
                  }`}
                />
                {parsedPreview.isValid && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>Plataforma detectada: {parsedPreview.platform.toUpperCase()}</span>
                  </p>
                )}
              </div>

              {/* 2. Título del vídeo */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Título del vídeo *
                </label>
                <input
                  type="text"
                  required
                  value={newVideoTitle}
                  onChange={(e) => setNewVideoTitle(e.target.value)}
                  placeholder="Ej: Pronunciación técnica en ingeniería o finanzas"
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-[#AD3333]'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#AD3333]'
                  }`}
                />
              </div>

              {/* 3. Clase a la que pertenece */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-bold ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Clase *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomClass(!isCustomClass)}
                    className="text-[11px] font-bold text-[#AD3333] dark:text-red-400 hover:underline cursor-pointer"
                  >
                    {isCustomClass ? 'Elegir de la lista' : '+ Otra clase'}
                  </button>
                </div>

                {isCustomClass ? (
                  <input
                    type="text"
                    required
                    value={customClassName}
                    onChange={(e) => setCustomClassName(e.target.value)}
                    placeholder="Escribe el nombre de la clase..."
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-[#AD3333]'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#AD3333]'
                    }`}
                  />
                ) : (
                  <select
                    value={newVideoClass}
                    onChange={(e) => setNewVideoClass(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-gray-100 focus:border-[#AD3333]'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#AD3333]'
                    }`}
                  >
                    {academicGroups && academicGroups.length > 0 ? (
                      academicGroups.map((g) => (
                        <option
                          key={g.id}
                          value={g.name}
                          className={isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}
                        >
                          {g.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Inglés Técnico Económico" className={isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}>Inglés Técnico Económico</option>
                        <option value="Inglés Técnico I" className={isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}>Inglés Técnico I</option>
                        <option value="Inglés General" className={isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}>Inglés General</option>
                      </>
                    )}
                  </select>
                )}
              </div>

              {/* 4. Formato: Largos o Cortos */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Formato de visualización
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewVideoFormat('long')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      newVideoFormat === 'long'
                        ? 'border-[#AD3333] bg-[#AD3333]/10 text-[#AD3333] dark:text-red-400 font-black'
                        : (isDarkMode ? 'border-gray-700 text-gray-400 hover:border-gray-600' : 'border-gray-200 text-gray-600 hover:border-gray-300')
                    }`}
                  >
                    <SmartphoneHorizontal size={14} />
                    <span>Largos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewVideoFormat('short')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      newVideoFormat === 'short'
                        ? 'border-[#AD3333] bg-[#AD3333]/10 text-[#AD3333] dark:text-red-400 font-black'
                        : (isDarkMode ? 'border-gray-700 text-gray-400 hover:border-gray-600' : 'border-gray-200 text-gray-600 hover:border-gray-300')
                    }`}
                  >
                    <Smartphone size={14} />
                    <span>Cortos</span>
                  </button>
                </div>
              </div>

              {/* 5. Descripción opcional */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Descripción (opcional)
                </label>
                <textarea
                  rows={2}
                  value={newVideoDescription}
                  onChange={(e) => setNewVideoDescription(e.target.value)}
                  placeholder="Explica brevemente los conceptos clave o actividades relacionadas..."
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none resize-none ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-[#AD3333]'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#AD3333]'
                  }`}
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#AD3333] hover:bg-[#8f2828] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Publicando...</span>
                    </>
                  ) : (
                    <span>Publicar vídeo</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL EDITAR VÍDEO (TÍTULO Y DESCRIPCIÓN) ================= */}
      {editingVideo && renderPortal(
        <div
          onClick={() => setEditingVideo(null)}
          className={`fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer ${isDarkMode ? 'dark' : ''}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-3xl shadow-2xl border p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 cursor-default ${
              isDarkMode
                ? 'bg-gray-900 border-gray-800 text-gray-100'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            {/* Header del Modal */}
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDarkMode ? 'border-gray-800' : 'border-gray-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#AD3333]/10 text-[#AD3333] dark:text-red-400 flex items-center justify-center font-black">
                  <Edit3 size={16} />
                </div>
                <div>
                  <h3 className={`text-base font-extrabold ${
                    isDarkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    Editar vídeo
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Modifica el título o la descripción del vídeo
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveEditVideo} className="space-y-4">
              {/* 1. Título */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Título del vídeo *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Título del vídeo..."
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-[#AD3333]'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#AD3333]'
                  }`}
                />
              </div>

              {/* 2. Descripción */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Descripción (opcional)
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Explica brevemente los conceptos clave o actividades relacionadas..."
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none resize-none ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-[#AD3333]'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#AD3333]'
                  }`}
                />
              </div>

              {/* 3. Clase a la que pertenece */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-bold ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Clase *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomEditClass(!isCustomEditClass)}
                    className="text-[11px] font-bold text-[#AD3333] dark:text-red-400 hover:underline cursor-pointer"
                  >
                    {isCustomEditClass ? 'Elegir de la lista' : '+ Otra clase'}
                  </button>
                </div>

                {isCustomEditClass ? (
                  <input
                    type="text"
                    required
                    value={customEditClassName}
                    onChange={(e) => setCustomEditClassName(e.target.value)}
                    placeholder="Escribe el nombre de la clase..."
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-[#AD3333]'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#AD3333]'
                    }`}
                  />
                ) : (
                  <select
                    value={editClass}
                    onChange={(e) => setEditClass(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-gray-100 focus:border-[#AD3333]'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#AD3333]'
                    }`}
                  >
                    {academicGroups && academicGroups.length > 0 ? (
                      academicGroups.map((g) => (
                        <option
                          key={g.id}
                          value={g.name}
                          className={isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}
                        >
                          {g.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Inglés Técnico Económico" className={isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}>Inglés Técnico Económico</option>
                        <option value="Inglés Técnico I" className={isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}>Inglés Técnico I</option>
                        <option value="Inglés General" className={isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}>Inglés General</option>
                      </>
                    )}
                  </select>
                )}
              </div>

              {/* 4. Formato: Largos o Cortos */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Formato de visualización
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditFormat('long')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editFormat === 'long'
                        ? 'border-[#AD3333] bg-[#AD3333]/10 text-[#AD3333] dark:text-red-400 font-black'
                        : (isDarkMode ? 'border-gray-700 text-gray-400 hover:border-gray-600' : 'border-gray-200 text-gray-600 hover:border-gray-300')
                    }`}
                  >
                    <SmartphoneHorizontal size={14} />
                    <span>Largos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditFormat('short')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editFormat === 'short'
                        ? 'border-[#AD3333] bg-[#AD3333]/10 text-[#AD3333] dark:text-red-400 font-black'
                        : (isDarkMode ? 'border-gray-700 text-gray-400 hover:border-gray-600' : 'border-gray-200 text-gray-600 hover:border-gray-300')
                    }`}
                  >
                    <Smartphone size={14} />
                    <span>Cortos</span>
                  </button>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSavingEdit || !editTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-[#AD3333] hover:bg-[#8f2828] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar cambios</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
