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
  User,
  ImageIcon,
  ReplyIcon,
  Send
} from './Icons.jsx';
import { parseVideoUrl, extractFirstVideoUrl, normalizeVideoItem, deduplicateVideos } from '../utils/videoEngine.js';
import { resolveUserPhoto, sanitizeFirestoreData, compressImage, uploadImageToStorage } from '../utils/helpers.js';
import LinkifyText from './LinkifyText.jsx';
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
  const [commentImagePreview, setCommentImagePreview] = useState(null);
  const [commentVideoUrl, setCommentVideoUrl] = useState('');
  const [showVideoUrlInput, setShowVideoUrlInput] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [viewingImageModal, setViewingImageModal] = useState(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const commentsEndRef = useRef(null);
  const commentInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Estado de sincronización inicial para evitar parpadeo en móviles
  const [isInitialSync, setIsInitialSync] = useState(() => (!videos || videos.length === 0));
  useEffect(() => {
    if (videos && videos.length > 0) {
      setIsInitialSync(false);
    } else {
      const timer = setTimeout(() => setIsInitialSync(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [videos]);

  // Copiar al portapapeles con fallback robusto para todos los navegadores móviles y de escritorio
  const copyToClipboard = async (text) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        showMessage('✅ ¡Enlace del vídeo copiado al portapapeles!');
        return;
      }
    } catch (e) {}

    // Fallback compatible con iOS Safari y webviews móviles
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      el.style.fontSize = '16px'; // Evita zoom automático en iOS
      document.body.appendChild(el);
      el.select();
      el.setSelectionRange(0, 99999); // Requerido para iOS
      const successful = document.execCommand('copy');
      document.body.removeChild(el);
      if (successful) {
        showMessage('✅ ¡Enlace del vídeo copiado al portapapeles!');
        return;
      }
    } catch (err) {}

    // Fallback final interactivo
    try {
      window.prompt('Copia este enlace para compartir el vídeo:', text);
    } catch (e) {
      showMessage('Enlace: ' + text);
    }
  };

  // Compartir vídeo con la API nativa de Android/iOS (WhatsApp, Telegram, etc.)
  const handleShareVideo = async (video, e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();
    if (!video) return;

    let shareUrl = video.url || window.location.href;
    try {
      shareUrl = new URL(shareUrl, window.location.origin).href;
    } catch (err) {
      shareUrl = window.location.href;
    }
    const shareTitle = video.title || 'Vídeo de clase';
    const shareText = `Mira este vídeo de inglés: "${shareTitle}"`;

    // 1. Probar Web Share API nativa en móviles con fallback progresivo
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        return;
      } catch (err) {
        if (err && (err.name === 'AbortError' || String(err).includes('AbortError'))) {
          return; // Cancelado por el usuario
        }
        // Fallback 1a: Intentar solo con url y title (requerido por Samsung Browser y Xiaomi que fallan al combinar text y url)
        try {
          await navigator.share({
            title: shareTitle,
            url: shareUrl
          });
          return;
        } catch (err2) {
          if (err2 && (err2.name === 'AbortError' || String(err2).includes('AbortError'))) {
            return;
          }
          // Fallback 1b: Intentar texto unificado
          try {
            await navigator.share({
              text: `${shareText} ${shareUrl}`
            });
            return;
          } catch (err3) {
            if (err3 && (err3.name === 'AbortError' || String(err3).includes('AbortError'))) {
              return;
            }
          }
        }
        console.warn('Fallback tras error en navigator.share:', err);
      }
    }

    // 2. Si no hay Web Share o falló, copiar enlace directamente con notificación
    await copyToClipboard(shareUrl);
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
        const cleanVideoItem = sanitizeFirestoreData(videoItem);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', videoItem.id), cleanVideoItem);
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
        const likeUpdates = sanitizeFirestoreData({
          likes: updatedLikes,
          updatedAt: Date.now()
        });
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', video.id), likeUpdates)
          .catch(async () => {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', video.id), sanitizeFirestoreData(updatedVideo), { merge: true });
          });
      }
    } catch (err) {
      console.error('Error al actualizar reacción:', err);
    }
  };

  // Selección de imagen para adjuntar al comentario
  const handleCommentImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setCommentImagePreview(compressed);
    } catch (err) {
      console.warn('Compresión fallback para comentario:', err);
      const reader = new FileReader();
      reader.onload = (ev) => setCommentImagePreview(ev.target?.result);
      reader.readAsDataURL(file);
    } finally {
      e.target.value = '';
    }
  };

  // Pegar imagen directamente desde el portapapeles (Ctrl + V)
  const handleCommentPaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          try {
            const compressed = await compressImage(file);
            setCommentImagePreview(compressed);
          } catch {
            const reader = new FileReader();
            reader.onload = (ev) => setCommentImagePreview(ev.target?.result);
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    }
  };

  // Manejador: Enviar comentario (soporta texto, imágenes, enlaces de vídeo y respuestas anidadas)
  const handleAddComment = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (isSubmittingComment) return;

    const cleanText = commentInput.trim();
    const explicitVideo = commentVideoUrl.trim();
    const hasImage = Boolean(commentImagePreview);

    if ((!cleanText && !hasImage && !explicitVideo) || !activePlayingVideo) return;

    setIsSubmittingComment(true);
    const now = Date.now();

    try {
      let uploadedImageUrl = null;
      if (commentImagePreview) {
        uploadedImageUrl = await uploadImageToStorage(commentImagePreview, 'video_comments');
      }

      // Detectar URL de vídeo explícita o embebida en el texto
      const detectedVideo = explicitVideo || extractFirstVideoUrl(cleanText)?.url || null;

      const newComment = {
        id: `comm_${now}_${Math.random().toString(36).substring(2, 7)}`,
        userId: myChatId,
        userName: loggedInName || (role === 'teacher' ? 'Docente' : 'Estudiante'),
        userRole: role,
        userAvatar: resolveAuthorPhoto({ userId: myChatId, userName: loggedInName, userRole: role }) || user?.photoURL || '',
        text: cleanText,
        imageUrl: uploadedImageUrl || null,
        videoUrl: detectedVideo || null,
        parentId: replyingTo ? replyingTo.id : null,
        replyTo: replyingTo ? {
          id: replyingTo.id,
          userName: replyingTo.userName,
          text: replyingTo.text
        } : null,
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
      setCommentImagePreview(null);
      setCommentVideoUrl('');
      setShowVideoUrlInput(false);
      setReplyingTo(null);

      if (isDemoMode || String(activePlayingVideo.id).startsWith('demo_')) {
        saveDemoSandboxItem('videos', updatedVideo);
      } else {
        const commentUpdates = sanitizeFirestoreData({
          comments: updatedComments,
          updatedAt: now
        });
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', activePlayingVideo.id), commentUpdates)
          .catch(async () => {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', activePlayingVideo.id), sanitizeFirestoreData(updatedVideo), { merge: true });
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

  // Manejador: Eliminar comentario y sus respuestas asociadas
  const handleDeleteComment = async (commentId) => {
    if (!activePlayingVideo || !commentId) return;
    askConfirm('¿Deseas eliminar este comentario?', async () => {
      const currentComments = Array.isArray(activePlayingVideo.comments) ? activePlayingVideo.comments : [];
      const updatedComments = currentComments.filter(c => 
        String(c?.id) !== String(commentId) &&
        String(c?.parentId) !== String(commentId) &&
        String(c?.replyTo?.id) !== String(commentId)
      );

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
          const deleteCommentUpdates = sanitizeFirestoreData({
            comments: updatedComments,
            updatedAt: Date.now()
          });
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', activePlayingVideo.id), deleteCommentUpdates)
            .catch(async () => {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', activePlayingVideo.id), sanitizeFirestoreData(updatedVideo), { merge: true });
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
        const editVideoUpdates = sanitizeFirestoreData({
          title: cleanTitle,
          description: editDescription.trim(),
          className: finalClass || editingVideo.className || 'Inglés Técnico Económico',
          format: editFormat || editingVideo.format || 'long',
          updatedAt: now
        });
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', String(editingVideo.id)), editVideoUpdates)
          .catch(async () => {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', String(editingVideo.id)), sanitizeFirestoreData(updatedVideo), { merge: true });
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
          loading="lazy"
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
            loading="lazy"
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
        isInitialSync && !searchQuery && selectedClassFilter === 'all' && selectedFormatFilter === 'all' ? (
          <div className="space-y-6 animate-pulse select-none">
            <div className="space-y-2">
              <div className="h-4 w-28 rounded-lg bg-gray-200 dark:bg-gray-800" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="aspect-[9/16] rounded-2xl bg-gray-200 dark:bg-gray-800/60" />
                ))}
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 w-36 rounded-lg bg-gray-200 dark:bg-gray-800" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/40 p-3 space-y-3">
                    <div className="aspect-video rounded-2xl bg-gray-200 dark:bg-gray-700/60" />
                    <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700/60" />
                    <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700/40" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
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
        )
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
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            if (e.currentTarget.src.includes('hqdefault.jpg')) {
                              e.currentTarget.src = e.currentTarget.src.replace('hqdefault.jpg', 'mqdefault.jpg');
                            }
                          }}
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
                          <button
                            type="button"
                            onClick={(e) => handleShareVideo(video, e)}
                            title="Compartir vídeo"
                            className="p-1.5 sm:p-1 rounded-lg sm:rounded-md bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-colors cursor-pointer touch-manipulation"
                          >
                            <Share2 size={13} />
                          </button>

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
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              if (e.currentTarget.src.includes('hqdefault.jpg')) {
                                e.currentTarget.src = e.currentTarget.src.replace('hqdefault.jpg', 'mqdefault.jpg');
                              }
                            }}
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

                        {/* Botones de acción flotantes (Compartir, Editar y Borrar) */}
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleShareVideo(video, e)}
                            title="Compartir vídeo"
                            className="p-2 sm:p-1.5 rounded-xl bg-black/60 text-white/80 hover:text-white hover:bg-black/90 transition-colors shadow-xs cursor-pointer touch-manipulation"
                          >
                            <Share2 size={14} className="sm:size-[13px]" />
                          </button>

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

                            <button
                              type="button"
                              onClick={(e) => handleShareVideo(video, e)}
                              title="Compartir vídeo"
                              className="flex items-center gap-1 font-semibold hover:text-blue-500 transition-colors cursor-pointer"
                            >
                              <Share2 size={12} />
                              <span className="hidden sm:inline">Compartir</span>
                            </button>

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

      {/* ================= MODAL DEL REPRODUCTOR INMERSIVO (CINE / THEATER EXPANDIDO) ================= */}
      {activePlayingVideo && renderPortal(
        <div
          onClick={() => {
            setActivePlayingVideo(null);
            setViewingImageModal(null);
            setReplyingTo(null);
            setCommentImagePreview(null);
            setCommentVideoUrl('');
            setShowVideoUrlInput(false);
          }}
          className={`fixed inset-0 z-[99999] flex items-center justify-center p-1.5 sm:p-3 md:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer ${isDarkMode ? 'dark' : ''}`}
        >
          <div
            data-testid="video-theater-modal"
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-[98vw] sm:max-w-[96vw] xl:max-w-[95vw] 2xl:max-w-[1650px] h-[96dvh] sm:h-[94vh] max-h-[96dvh] rounded-2xl sm:rounded-3xl shadow-2xl border overflow-hidden flex flex-col cursor-default pb-safe ${
              isDarkMode
                ? 'bg-gray-900 border-gray-800 text-gray-100'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            {/* Barra superior del modal */}
            <div className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between gap-3 shrink-0 ${
              isDarkMode
                ? 'bg-gray-800/90 border-gray-700'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-3 py-1 rounded-xl bg-[#AD3333] text-white text-xs font-black shrink-0 tracking-wide uppercase shadow-xs">
                  {activePlayingVideo.className}
                </span>
                <span className={`text-xs font-bold truncate hidden md:inline ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {activePlayingVideo.title}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleShareVideo(activePlayingVideo, e)}
                  title="Compartir vídeo"
                  className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                    isDarkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <Share2 size={15} />
                  <span>Compartir</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActivePlayingVideo(null);
                    setViewingImageModal(null);
                    setReplyingTo(null);
                    setCommentImagePreview(null);
                    setCommentVideoUrl('');
                    setShowVideoUrlInput(false);
                  }}
                  title="Cerrar reproductor"
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Cuerpo del modal: 2 columnas espaciosas (Vídeo + Comentarios) */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0 h-full">
              {/* Columna izquierda / principal: Reproductor amplio y metadatos */}
              <div className={`lg:col-span-7 xl:col-span-8 p-3 sm:p-5 md:p-6 overflow-y-auto space-y-4 border-b lg:border-b-0 lg:border-r flex flex-col justify-between ${
                isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
              }`}>
                <div className="space-y-4">
                  {/* Área del reproductor espacioso */}
                  <div className={`w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-black shadow-2xl ${
                    activePlayingVideo.format === 'short'
                      ? 'aspect-[9/16] max-h-[68vh] mx-auto w-auto'
                      : 'aspect-video w-full max-h-[66vh]'
                  }`}>
                    {renderEmbeddedPlayer(activePlayingVideo, true)}
                  </div>

                  {/* Título y metadatos */}
                  <div className="space-y-3 pt-1">
                    <h2 className={`text-lg sm:text-2xl font-black leading-tight ${
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
                    <div className={`p-3.5 sm:p-4 rounded-2xl border text-xs whitespace-pre-line leading-relaxed ${
                      isDarkMode
                        ? 'bg-gray-800/80 border-gray-700 text-gray-300'
                        : 'bg-gray-50 border-gray-100 text-gray-700'
                    }`}>
                      {activePlayingVideo.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Columna derecha: Comentarios interactivos, imágenes, enlaces de vídeo y respuestas anidadas */}
              <div className={`lg:col-span-5 xl:col-span-4 p-3 sm:p-4 flex flex-col justify-between h-full overflow-hidden min-h-0 ${
                isDarkMode
                  ? 'bg-gray-900 border-gray-800'
                  : 'bg-gray-50/70 border-gray-200'
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

                  {/* Lista de comentarios con scroll y agrupación en hilos */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {(() => {
                      const allComments = Array.isArray(activePlayingVideo.comments) ? activePlayingVideo.comments : [];
                      if (allComments.length === 0) {
                        return (
                          <div className={`py-12 text-center text-xs space-y-1 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-400'
                          }`}>
                            <p className="font-bold">Aún no hay comentarios.</p>
                            <p className="text-[11px] opacity-80">¡Sé el primero en opinar, adjuntar una imagen o compartir un vídeo!</p>
                          </div>
                        );
                      }

                      // Agrupación en árbol: raíces y respuestas
                      const idMap = new Map();
                      const roots = [];
                      const repliesMap = new Map();

                      allComments.forEach((c) => {
                        if (c?.id) idMap.set(String(c.id), c);
                      });

                      allComments.forEach((c) => {
                        const parentId = c?.parentId || c?.replyTo?.id;
                        if (parentId && idMap.has(String(parentId)) && String(parentId) !== String(c.id)) {
                          const pIdStr = String(parentId);
                          if (!repliesMap.has(pIdStr)) repliesMap.set(pIdStr, []);
                          repliesMap.get(pIdStr).push(c);
                        } else {
                          roots.push(c);
                        }
                      });

                      // Renderizador unificado para cada tarjeta de comentario
                      const renderCommentCard = (comm, isReply = false) => {
                        const canDeleteComment = canModifyComment(comm);
                        const commPhoto = resolveAuthorPhoto(comm);

                        // Detección de vídeo embebido
                        const videoLink = comm.videoUrl || extractFirstVideoUrl(comm.text)?.url;
                        const parsedVideo = videoLink ? parseVideoUrl(videoLink) : null;

                        return (
                          <div
                            key={comm.id}
                            data-comment-id={comm.id}
                            data-is-reply={String(isReply)}
                            className={`p-3 rounded-2xl border text-xs space-y-2 relative group transition-all ${
                              isDarkMode
                                ? 'bg-gray-800/90 border-gray-700/80 text-gray-200 shadow-xs'
                                : 'bg-white border-gray-100 text-gray-800 shadow-xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`relative w-6 h-6 rounded-full overflow-hidden shrink-0 ring-1 ${
                                  isDarkMode ? 'ring-gray-700 bg-red-950/40 text-red-400' : 'ring-gray-200 bg-[#AD3333]/10 text-[#AD3333]'
                                }`}>
                                  <div className="w-full h-full flex items-center justify-center font-bold text-[10px]">
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
                                <div className="min-w-0">
                                  <span className={`font-bold text-xs flex items-center gap-1 truncate ${
                                    isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                  }`}>
                                    {comm.userName}
                                    {comm.userRole === 'teacher' && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#AD3333] text-white shrink-0">
                                        Docente
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                              <span className={`text-[10px] shrink-0 ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-400'
                              }`}>
                                {formatCommentDate(comm.createdAt)}
                              </span>
                            </div>

                            {/* Indicador de respuesta si aplica */}
                            {isReply && comm.replyTo?.userName && (
                              <div className="text-[10px] font-semibold flex items-center gap-1 text-[#AD3333] dark:text-red-400">
                                <ReplyIcon size={11} className="shrink-0" />
                                <span>Respondiendo a @{comm.replyTo.userName}</span>
                              </div>
                            )}

                            {/* Texto del comentario */}
                            {comm.text && (
                              <div className={`leading-relaxed font-normal text-xs break-words ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                <LinkifyText text={comm.text} isDarkMode={isDarkMode} embedVideos={false} />
                              </div>
                            )}

                            {/* Imagen adjunta con zoom */}
                            {comm.imageUrl && (
                              <div className="pt-1">
                                <div className="relative rounded-xl overflow-hidden max-w-sm border border-gray-200 dark:border-gray-700 bg-black/10 inline-block">
                                  <img
                                    src={comm.imageUrl}
                                    alt="Adjunto de comentario"
                                    loading="lazy"
                                    className="max-h-52 sm:max-h-60 w-auto object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                                    onClick={() => setViewingImageModal(comm.imageUrl)}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Vídeo embebido interactivo */}
                            {parsedVideo && parsedVideo.isValid && (
                              <div className={`mt-2 rounded-xl overflow-hidden border shadow-sm max-w-sm ${
                                isDarkMode ? 'border-gray-700 bg-black/70' : 'border-gray-200 bg-gray-900'
                              }`}>
                                <div className="relative aspect-video w-full bg-black">
                                  {renderEmbeddedPlayer({ ...parsedVideo, title: parsedVideo.title || 'Vídeo en comentario' })}
                                </div>
                                <div className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-[10px] bg-black/50 text-gray-300">
                                  <span className="truncate font-semibold flex items-center gap-1">
                                    <Film size={11} className="text-[#AD3333]" />
                                    <span>{parsedVideo.platform.toUpperCase()}</span>
                                  </span>
                                  <a
                                    href={parsedVideo.originalUrl || parsedVideo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-red-400 hover:text-red-300 hover:underline flex items-center gap-0.5 shrink-0"
                                  >
                                    <span>Abrir enlace</span>
                                    <ExternalLink size={10} />
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Botón para responder y eliminar */}
                            <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800/60">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo({
                                    id: comm.id,
                                    userName: comm.userName,
                                    text: comm.text || (comm.imageUrl ? '📷 Imagen' : (comm.videoUrl ? '🎥 Vídeo' : 'Comentario'))
                                  });
                                  setTimeout(() => commentInputRef.current?.focus(), 80);
                                }}
                                className={`inline-flex items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
                                  isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-[#AD3333]'
                                }`}
                              >
                                <ReplyIcon size={12} />
                                <span>Responder</span>
                              </button>

                              {canDeleteComment && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(comm.id)}
                                  title="Borrar comentario"
                                  className="p-1 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      };

                      return roots.map((rootCmt) => {
                        const hasReplies = repliesMap.has(String(rootCmt.id));
                        const replies = hasReplies ? repliesMap.get(String(rootCmt.id)) : [];
                        return (
                          <div key={rootCmt.id} className="space-y-2">
                            {renderCommentCard(rootCmt, false)}

                            {/* Respuestas anidadas (estilo Reddit / YouTube / Slack) */}
                            {hasReplies && (
                              <div className="ml-3 sm:ml-5 pl-2.5 sm:pl-3.5 border-l-2 border-[#AD3333]/30 dark:border-red-500/30 space-y-2 mt-1.5">
                                {replies.map((replyCmt) => (
                                  <React.Fragment key={replyCmt.id}>
                                    {renderCommentCard(replyCmt, true)}
                                  </React.Fragment>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                    <div ref={commentsEndRef} />
                  </div>
                </div>

                {/* Formulario enriquecido para agregar comentario, imagen, vídeo o respuesta */}
                <form
                  onSubmit={handleAddComment}
                  className={`pt-3 border-t mt-2 shrink-0 space-y-2 ${
                    isDarkMode ? 'border-gray-800' : 'border-gray-200'
                  }`}
                >
                  {/* Banner de respuesta a otro comentario */}
                  {replyingTo && (
                    <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs border animate-in fade-in duration-150 ${
                      isDarkMode ? 'bg-[#AD3333]/15 border-[#AD3333]/30 text-gray-200' : 'bg-red-50 border-red-200 text-gray-800'
                    }`}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ReplyIcon size={12} className="text-[#AD3333] shrink-0" />
                        <span className="font-bold text-[#AD3333] shrink-0">Respondiendo a @{replyingTo.userName}:</span>
                        <span className="truncate text-gray-400 text-[11px]">{replyingTo.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
                        title="Cancelar respuesta"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {/* Previsualización de imagen adjunta */}
                  {commentImagePreview && (
                    <div className="flex items-center gap-2 p-1.5 rounded-xl border bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 animate-in fade-in">
                      <img
                        src={commentImagePreview}
                        alt="Previsualización"
                        className="w-12 h-12 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">Imagen adjunta</p>
                        <p className="text-[10px] text-gray-400">Se subirá junto a tu comentario</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCommentImagePreview(null)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-lg cursor-pointer"
                        title="Quitar imagen"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Campo desplegable para adjuntar enlace de vídeo */}
                  {showVideoUrlInput && (
                    <div className="flex items-center gap-1.5 p-1.5 rounded-xl border border-red-200 dark:border-red-950/60 bg-red-50/60 dark:bg-red-950/20 text-xs animate-in fade-in">
                      <Film size={14} className="text-[#AD3333] shrink-0 ml-1" />
                      <input
                        type="url"
                        value={commentVideoUrl}
                        onChange={(e) => setCommentVideoUrl(e.target.value)}
                        placeholder="Pega enlace de vídeo (YouTube, TikTok, Drive, MP4)..."
                        className="flex-1 bg-transparent border-0 outline-none text-xs text-inherit placeholder-gray-400"
                        autoFocus
                      />
                      {commentVideoUrl && (
                        <button
                          type="button"
                          onClick={() => setCommentVideoUrl('')}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Entrada principal con botones de adjunto y envío */}
                  <div className="flex items-center gap-1.5">
                    {/* Botón para adjuntar imagen */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCommentImageSelect}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Adjuntar imagen o captura"
                      className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                        commentImagePreview
                          ? 'bg-red-500/10 text-[#AD3333]'
                          : (isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100')
                      }`}
                    >
                      <ImageIcon size={16} />
                    </button>

                    {/* Botón para adjuntar vídeo */}
                    <button
                      type="button"
                      onClick={() => setShowVideoUrlInput(prev => !prev)}
                      title="Adjuntar enlace de vídeo"
                      className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                        showVideoUrlInput || commentVideoUrl
                          ? 'bg-red-500/10 text-[#AD3333]'
                          : (isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100')
                      }`}
                    >
                      <Film size={16} />
                    </button>

                    <input
                      ref={commentInputRef}
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onPaste={handleCommentPaste}
                      placeholder={
                        replyingTo
                          ? `Responder a @${replyingTo.userName}...`
                          : 'Escribe un comentario o pregunta...'
                      }
                      className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-none ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-[#AD3333]'
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#AD3333]'
                      }`}
                    />

                    <button
                      type="submit"
                      disabled={(!commentInput.trim() && !commentImagePreview && !commentVideoUrl.trim()) || isSubmittingComment}
                      className="px-3.5 py-2 rounded-xl bg-[#AD3333] hover:bg-[#8f2828] text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                    >
                      {isSubmittingComment ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <Send size={13} />
                          <span className="hidden sm:inline">Enviar</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL LIGHTBOX PARA VISUALIZAR IMÁGENES DE COMENTARIOS ================= */}
      {viewingImageModal && renderPortal(
        <div
          onClick={() => setViewingImageModal(null)}
          className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[92vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setViewingImageModal(null)}
              className="absolute -top-11 right-0 p-2 text-white hover:text-red-400 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              title="Cerrar imagen"
            >
              <X size={20} />
            </button>
            <img
              src={viewingImageModal}
              alt="Visualización de imagen en comentario"
              className="max-w-full max-h-[86vh] object-contain rounded-2xl shadow-2xl border border-gray-700"
            />
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
