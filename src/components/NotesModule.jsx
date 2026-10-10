// src/components/NotesModule.jsx
// Módulo de Notas y Cuaderno de Clase (Notas compartidas docente-estudiantes y Notas privadas).
// Soporta personalización de texto (fuentes, tamaños, colores, resaltados), enlaces inteligentes
// (conversión automática/opcional en imagen integrada, video de YouTube o enlace web, sin subida de archivos locales),
// candado/seguro de sesión y registro silencioso de últimos cambios exclusivo para el docente.

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  NavNotebook,
  Lock,
  Unlock,
  Plus,
  X,
  Trash2,
  Edit3,
  Pin,
  Search,
  Clock,
  RotateCcw,
  UsersIcon,
  UserIcon,
  Globe,
  ImageIcon,
  MonitorPlay,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  Quote,
  Heading,
  Palette,
  Type,
  CheckCircle2,
  Shield,
  MessageSquareText
} from './Icons.jsx';
import CustomVideoPlayer from './CustomVideoPlayer.jsx';
import {
  NOTE_FONT_FAMILIES,
  NOTE_FONT_SIZES,
  NOTE_TEXT_COLORS,
  NOTE_HIGHLIGHT_COLORS,
  NOTE_PAPER_THEMES,
  classifyNoteUrl,
  sanitizeNoteHtml,
  stripNoteHtml,
  extractInlineMediaUrlsFromHtml,
  canUserToggleNoteLock,
  canUserEditNote,
  canUserDeleteNote,
  createNoteAuditEntry,
  appendNoteAuditEntry
} from '../utils/notesEngine.js';

const formatRelativeTime = (ts) => {
  if (!ts) return 'Hace un momento';
  const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  if (isNaN(date.getTime())) return 'Reciente';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Hace instantes';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function NotesModule({
  notes = [],
  role = 'student',
  myChatId = '',
  currentUserName = 'Usuario',
  activeTeacherId = 'teacher',
  academicGroups = [],
  isDarkMode = false,
  onSaveNote,
  onDeleteNote,
  showNotify
}) {
  const normalizedUserId = String(myChatId || '').trim().toLowerCase();
  const isTeacher = role === 'teacher';

  // Pestaña activa: 'shared' (Cuaderno compartido de clase) | 'private' (Mis notas privadas)
  const [activeScope, setActiveScope] = useState('shared');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de creación / edición de nota
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('shared');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [fontFamily, setFontFamily] = useState('sans');
  const [fontSize, setFontSize] = useState('base');
  const [paperTheme, setPaperTheme] = useState('default');
  const [isLockedOnSave, setIsLockedOnSave] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [links, setLinks] = useState([]);

  // Barra para insertar enlace inteligente (imagen por URL, YouTube o enlace web)
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const [linkLabelInput, setLinkLabelInput] = useState('');
  const [linkRenderPreference, setLinkRenderPreference] = useState('auto'); // 'auto' | 'image' | 'youtube' | 'link'

  // Popovers de color y resaltado en el editor
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);

  // Hilo de apuntes rápidos dentro de una sesión compartida
  const [expandedThreadNoteId, setExpandedThreadNoteId] = useState(null);
  const [threadEntryText, setThreadEntryText] = useState('');
  const [threadEntryLock, setThreadEntryLock] = useState(true);
  const [threadEntryLinkUrl, setThreadEntryLinkUrl] = useState('');

  // Panel exclusivo para el docente: "Últimos cambios" (estrictamente oculto para estudiantes)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedAuditNoteFilter, setSelectedAuditNoteFilter] = useState('ALL');

  //Confirmación de borrado
  const [notePendingDelete, setNotePendingDelete] = useState(null);

  const editorRef = useRef(null);
  const savedSelectionRef = useRef(null);

  // Inicializar grupo por defecto cuando se abre el editor
  useEffect(() => {
    if (!targetGroupId && academicGroups.length > 0) {
      setTargetGroupId(academicGroups[0].id);
    }
  }, [academicGroups, targetGroupId]);

  const currentUserObj = useMemo(() => ({
    role,
    userId: normalizedUserId,
    myChatId: normalizedUserId,
    name: currentUserName
  }), [role, normalizedUserId, currentUserName]);

  // Filtrar notas visibles según pestaña (compartidas vs privadas), búsqueda y borrado suave de estudiantes
  const visibleNotes = useMemo(() => {
    return (Array.isArray(notes) ? notes : [])
      .filter((note) => {
        if (!note) return false;
        // Las notas marcadas con isSoftDeleted (borradas por un estudiante) no se muestran en la grilla principal
        // (el docente las puede inspeccionar y restaurar desde "Últimos cambios")
        if (note.isSoftDeleted) return false;

        const noteScope = note.scope === 'private' ? 'private' : 'shared';
        if (noteScope !== activeScope) return false;

        if (noteScope === 'private') {
          const owner = String(note.ownerId || note.authorId || '').trim().toLowerCase();
          return owner === normalizedUserId;
        }

        // Filtro por grupo en notas compartidas
        if (selectedGroupFilter !== 'ALL') {
          if (String(note.targetGroupId || '') !== String(selectedGroupFilter)) {
            return false;
          }
        }

        // Búsqueda por texto, título o autor
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const inTitle = String(note.title || '').toLowerCase().includes(q);
          const inContent = stripNoteHtml(note.content || '').toLowerCase().includes(q);
          const inAuthor = String(note.authorName || '').toLowerCase().includes(q);
          return inTitle || inContent || inAuthor;
        }

        return true;
      })
      .sort((a, b) => {
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
          return a.isPinned ? -1 : 1;
        }
        return Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0);
      });
  }, [notes, activeScope, normalizedUserId, selectedGroupFilter, searchQuery]);

  // Historial consolidado de últimos cambios (SOLO se calcula y renderiza si isTeacher === true)
  const teacherAuditFeed = useMemo(() => {
    if (!isTeacher) return [];
    const entries = [];
    (Array.isArray(notes) ? notes : []).forEach((note) => {
      if (!note || note.scope === 'private') return;
      const logList = Array.isArray(note.auditLog) ? note.auditLog : [];
      logList.forEach((logItem) => {
        entries.push({
          ...logItem,
          noteId: note.id,
          noteTitle: note.title || 'Nota sin título',
          isNoteSoftDeleted: Boolean(note.isSoftDeleted),
          noteRef: note
        });
      });
    });
    return entries.sort((a, b) => {
      const tA = new Date(a.timestamp || 0).getTime() || 0;
      const tB = new Date(b.timestamp || 0).getTime() || 0;
      return tB - tA;
    });
  }, [isTeacher, notes]);

  // Abrir compositor para nueva nota
  const handleOpenNewNote = (initialScope = activeScope) => {
    setEditingNote(null);
    setTitle('');
    setScope(initialScope);
    setTargetGroupId(
      selectedGroupFilter !== 'ALL'
        ? selectedGroupFilter
        : (academicGroups[0]?.id || '')
    );
    setFontFamily('sans');
    setFontSize('base');
    setPaperTheme('default');
    setIsLockedOnSave(initialScope === 'shared');
    setIsPinned(false);
    setLinks([]);
    setShowLinkInput(false);
    setLinkUrlInput('');
    setLinkLabelInput('');
    setLinkRenderPreference('auto');
    setIsComposerOpen(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
        editorRef.current.focus();
      }
    }, 40);
  };

  // Abrir compositor para editar una nota existente
  const handleOpenEditNote = (note) => {
    if (!canUserEditNote(note, currentUserObj)) {
      if (showNotify) {
        showNotify('Esta sesión tiene candado de seguridad. Solo quien puso el seguro o el docente puede editarla.', 'warning');
      }
      return;
    }
    setEditingNote(note);
    setTitle(note.title || '');
    setScope(note.scope === 'private' ? 'private' : 'shared');
    setTargetGroupId(note.targetGroupId || academicGroups[0]?.id || '');
    setFontFamily(note.fontFamily || 'sans');
    setFontSize(note.fontSize || 'base');
    setPaperTheme(note.paperTheme || 'default');
    setIsLockedOnSave(Boolean(note.isLocked));
    setIsPinned(Boolean(note.isPinned));
    setLinks(Array.isArray(note.links) ? [...note.links] : []);
    setShowLinkInput(false);
    setLinkUrlInput('');
    setLinkLabelInput('');
    setLinkRenderPreference('auto');
    setIsComposerOpen(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = note.content || '';
      }
    }, 40);
  };

  const saveEditorSelection = () => {
    if (typeof window === 'undefined' || !editorRef.current) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = range.cloneRange();
      }
    }
  };

  const restoreEditorSelection = () => {
    if (typeof window === 'undefined' || !editorRef.current || !savedSelectionRef.current) return;
    const sel = window.getSelection();
    if (!sel) return;
    try {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    } catch {
      // Ignorar si el rango ya no es válido
    }
  };

  // Ejecutar comando de formato enriquecido en el editor
  const execFormat = (command, value = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreEditorSelection();
    try {
      document.execCommand(command, false, value);
      if (command === 'fontSize' && editorRef.current) {
        editorRef.current.innerHTML = sanitizeNoteHtml(editorRef.current.innerHTML);
      }
    } catch {
      // Ignorar si el navegador no soporta un comando específico
    }
    saveEditorSelection();
  };

  // Bloquear estrictamente cualquier intento de pegar o soltar archivos/fotos desde el dispositivo
  const handleEditorPaste = (e) => {
    const clipboardFiles = e.clipboardData?.files;
    if (clipboardFiles && clipboardFiles.length > 0) {
      e.preventDefault();
      if (showNotify) {
        showNotify('En la sección de Notas no se permite subir archivos ni fotos desde el dispositivo. Usa un enlace URL.', 'warning');
      }
      return;
    }
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i += 1) {
        if (items[i].kind === 'file') {
          e.preventDefault();
          if (showNotify) {
            showNotify('No se permite pegar imágenes ni archivos locales. Agrega el enlace URL de la imagen o video.', 'warning');
          }
          return;
        }
      }
    }
    const pastedHtml = e.clipboardData?.getData('text/html');
    if (pastedHtml) {
      e.preventDefault();
      if (/\bsrc\s*=\s*["']\s*(?:data:|blob:|file:)/i.test(pastedHtml) && showNotify) {
        showNotify('Se omitieron imágenes locales pegadas. Usa un enlace URL (https://...) para insertar imágenes.', 'warning');
      }
      const discovered = extractInlineMediaUrlsFromHtml(pastedHtml, links);
      if (discovered.length > 0) {
        setLinks((prev) => [...prev, ...discovered]);
      }
      const safeHtml = sanitizeNoteHtml(pastedHtml);
      const fallbackText = e.clipboardData?.getData('text/plain') || '';
      if (safeHtml) {
        document.execCommand('insertHTML', false, safeHtml);
      } else if (fallbackText) {
        document.execCommand('insertText', false, fallbackText);
      }
    }
  };

  const handleEditorDrop = (e) => {
    if ((e.dataTransfer?.files && e.dataTransfer.files.length > 0) || /\b(?:data:|blob:|file:)/i.test(e.dataTransfer?.getData('text/html') || '')) {
      e.preventDefault();
      if (showNotify) {
        showNotify('No se permite arrastrar ni subir archivos o fotos en Notas. Usa enlaces URL.', 'warning');
      }
    }
  };

  // Clasificación en vivo del enlace escrito en la barra de enlaces
  const liveLinkPreview = useMemo(() => {
    if (!linkUrlInput.trim()) return null;
    const forced = linkRenderPreference === 'image' ? 'image' : (linkRenderPreference === 'link' ? 'link' : null);
    return classifyNoteUrl(linkUrlInput, forced);
  }, [linkUrlInput, linkRenderPreference]);

  // Agregar enlace inteligente a la nota (Imagen por URL, Video de YouTube o Enlace web)
  const handleAddSmartLink = () => {
    if (!linkUrlInput.trim()) return;
    const forced = linkRenderPreference === 'image' ? 'image' : (linkRenderPreference === 'link' ? 'link' : null);
    const info = classifyNoteUrl(linkUrlInput, forced);
    if (!info.valid) {
      if (showNotify) {
        showNotify('Ingresa un enlace web válido (https://...). No se admiten archivos locales.', 'warning');
      }
      return;
    }

    let finalRenderMode = info.defaultRenderMode;
    if (linkRenderPreference === 'link') {
      finalRenderMode = 'link';
    } else if (linkRenderPreference === 'image') {
      finalRenderMode = 'image';
    } else if (linkRenderPreference === 'youtube' && info.youtubeId) {
      finalRenderMode = 'youtube';
    }

    const defaultLabel =
      info.type === 'youtube'
        ? 'Video de YouTube'
        : info.type === 'image'
          ? 'Imagen por enlace'
          : info.url;

    const newLinkItem = {
      id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      url: info.url,
      label: linkLabelInput.trim() || defaultLabel,
      mediaType: linkRenderPreference === 'image' ? 'image' : info.type,
      youtubeId: info.youtubeId,
      renderMode: finalRenderMode
    };

    setLinks((prev) => [...prev, newLinkItem]);

    // Si es un enlace de texto normal, también podemos insertarlo como hipervínculo clicable en el cursor
    if (finalRenderMode === 'link' && editorRef.current) {
      const safeUrl = info.url.replace(/"/g, '&quot;');
      const safeLabel = (linkLabelInput.trim() || info.url)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      execFormat('insertHTML', `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">${safeLabel}</a>&nbsp;`);
    }

    setLinkUrlInput('');
    setLinkLabelInput('');
    setLinkRenderPreference('auto');
    setShowLinkInput(false);
  };

  // Alternar cómo se visualiza un enlace adjunto (ej. convertir enlace de imagen en Imagen o en Enlace, o YouTube en Video o Enlace)
  const handleToggleLinkRenderMode = async (note, linkId, targetNoteInComposer = false) => {
    if (targetNoteInComposer) {
      setLinks((prev) =>
        prev.map((item) => {
          if (item.id !== linkId) return item;
          const nativeMode = item.youtubeId ? 'youtube' : (item.mediaType === 'image' || isLikelyImageLink(item) ? 'image' : 'link');
          const nextMode = item.renderMode === 'link' ? (nativeMode === 'link' ? 'image' : nativeMode) : 'link';
          return {
            ...item,
            mediaType: nextMode === 'image' ? 'image' : item.mediaType,
            renderMode: nextMode
          };
        })
      );
      return;
    }

    if (!note || !canUserEditNote(note, currentUserObj)) {
      if (showNotify) {
        showNotify('La nota tiene candado. Desbloquéala o pide al docente para cambiar el modo del enlace.', 'warning');
      }
      return;
    }

    const updatedLinks = (Array.isArray(note.links) ? note.links : []).map((item) => {
      if (item.id !== linkId) return item;
      const nativeMode = item.youtubeId ? 'youtube' : (item.mediaType === 'image' || isLikelyImageLink(item) ? 'image' : 'link');
      const nextMode = item.renderMode === 'link' ? (nativeMode === 'link' ? 'image' : nativeMode) : 'link';
      return {
        ...item,
        mediaType: nextMode === 'image' ? 'image' : item.mediaType,
        renderMode: nextMode
      };
    });

    const updatedNote = {
      ...note,
      links: updatedLinks,
      updatedAt: Date.now()
    };

    if (onSaveNote) {
      await onSaveNote(updatedNote);
    }
  };

  const isLikelyImageLink = (item) => {
    if (!item) return false;
    if (item.mediaType === 'image') return true;
    const classified = classifyNoteUrl(item.url);
    return classified.type === 'image';
  };

  // Guardar nota (nueva o editada)
  const handleSaveComposerNote = async (e) => {
    if (e) e.preventDefault();
    const rawHtml = editorRef.current ? editorRef.current.innerHTML : '';
    const autoDiscoveredLinks = extractInlineMediaUrlsFromHtml(rawHtml, links);
    const mergedLinks = [...links, ...autoDiscoveredLinks];
    const sanitizedHtml = sanitizeNoteHtml(rawHtml);
    const plainText = stripNoteHtml(sanitizedHtml);

    if (!title.trim() && !plainText && mergedLinks.length === 0) {
      if (showNotify) {
        showNotify('Escribe un título, contenido o agrega un enlace antes de guardar la nota.', 'warning');
      }
      return;
    }

    // Enlaces de YouTube o imágenes ya fusionados en mergedLinks

    const selectedGroupObj = academicGroups.find((g) => String(g.id) === String(targetGroupId));
    const now = Date.now();
    const finalTitle = title.trim() || (scope === 'private' ? 'Apunte privado' : 'Apuntes de sesión');

    if (editingNote) {
      const auditAction =
        Boolean(editingNote.isLocked) !== Boolean(isLockedOnSave)
          ? (isLockedOnSave ? 'lock' : 'unlock')
          : 'edit';

      const newAudit = createNoteAuditEntry({
        action: auditAction,
        actorId: normalizedUserId,
        actorName: currentUserName,
        actorRole: role,
        summary:
          auditAction === 'lock'
            ? 'Editó la nota y activó el candado de seguridad'
            : auditAction === 'unlock'
              ? 'Editó la nota y quitó el candado de seguridad'
              : 'Editó el contenido o formato de la nota compartida',
        previousTitle: editingNote.title || '',
        newTitle: finalTitle,
        previousContent: editingNote.content || '',
        newContent: sanitizedHtml,
        previousLinks: editingNote.links || [],
        newLinks: mergedLinks
      });

      const updatedNote = {
        ...editingNote,
        title: finalTitle,
        scope,
        content: sanitizedHtml,
        fontFamily,
        fontSize,
        paperTheme,
        isPinned: Boolean(isPinned),
        isLocked: scope === 'shared' ? Boolean(isLockedOnSave) : false,
        lockedBy:
          scope === 'shared' && isLockedOnSave
            ? (role === 'teacher' || !editingNote.isLocked ? normalizedUserId : (editingNote.lockedBy || normalizedUserId))
            : null,
        lockedByName:
          scope === 'shared' && isLockedOnSave
            ? (role === 'teacher' || !editingNote.isLocked ? currentUserName : (editingNote.lockedByName || currentUserName))
            : null,
        lockedByRole:
          scope === 'shared' && isLockedOnSave
            ? (role === 'teacher' || !editingNote.isLocked ? role : (editingNote.lockedByRole || role))
            : null,
        lockedAt:
          scope === 'shared' && isLockedOnSave
            ? (!editingNote.isLocked ? now : (editingNote.lockedAt || now))
            : null,
        targetGroupId: scope === 'shared' ? (selectedGroupObj?.id || editingNote.targetGroupId || '') : '',
        targetGroupName: scope === 'shared' ? (selectedGroupObj?.name || editingNote.targetGroupName || 'General') : '',
        links: mergedLinks,
        auditLog:
          scope === 'shared'
            ? appendNoteAuditEntry(editingNote.auditLog, newAudit)
            : (editingNote.auditLog || []),
        updatedAt: now,
        lastEditedBy: normalizedUserId,
        lastEditedByName: currentUserName
      };

      if (onSaveNote) {
        await onSaveNote(updatedNote);
      }
      if (showNotify) {
        showNotify('Nota actualizada correctamente.', 'success');
      }
    } else {
      const initialAudit =
        scope === 'shared'
          ? [
              createNoteAuditEntry({
                action: 'create',
                actorId: normalizedUserId,
                actorName: currentUserName,
                actorRole: role,
                summary: isLockedOnSave
                  ? 'Creó la nota compartida con candado de sesión activo'
                  : 'Creó una nueva nota compartida en la clase',
                previousTitle: '',
                newTitle: finalTitle,
                previousContent: '',
                newContent: sanitizedHtml,
                previousLinks: [],
                newLinks: mergedLinks
              })
            ]
          : [];

      const newNote = {
        id: `note_${now}_${Math.random().toString(36).slice(2, 8)}`,
        title: finalTitle,
        scope,
        content: sanitizedHtml,
        fontFamily,
        fontSize,
        paperTheme,
        isPinned: Boolean(isPinned),
        isLocked: scope === 'shared' ? Boolean(isLockedOnSave) : false,
        lockedBy: scope === 'shared' && isLockedOnSave ? normalizedUserId : null,
        lockedByName: scope === 'shared' && isLockedOnSave ? currentUserName : null,
        lockedByRole: scope === 'shared' && isLockedOnSave ? role : null,
        lockedAt: scope === 'shared' && isLockedOnSave ? now : null,
        ownerId: normalizedUserId,
        authorId: normalizedUserId,
        authorName: currentUserName,
        authorRole: role,
        teacherId: activeTeacherId || 'teacher',
        targetGroupId: scope === 'shared' ? (selectedGroupObj?.id || '') : '',
        targetGroupName: scope === 'shared' ? (selectedGroupObj?.name || 'General') : '',
        links: mergedLinks,
        entries: [],
        auditLog: initialAudit,
        createdAt: now,
        updatedAt: now
      };

      if (onSaveNote) {
        await onSaveNote(newNote);
      }
      setActiveScope(scope);
      if (showNotify) {
        showNotify(
          scope === 'private'
            ? 'Nota privada guardada.'
            : isLockedOnSave
              ? 'Nota compartida publicada y asegurada con candado.'
              : 'Nota compartida publicada en el cuaderno de clase.',
          'success'
        );
      }
    }

    setIsComposerOpen(false);
    setEditingNote(null);
  };

  // Alternar candado/seguro de sesión directamente desde la tarjeta de una nota compartida
  const handleToggleLockOnCard = async (note) => {
    if (!note) return;
    if (!canUserToggleNoteLock(note, currentUserObj)) {
      if (showNotify) {
        showNotify(
          'No puedes quitar el candado colocado por otro compañero o por el docente.',
          'warning'
        );
      }
      return;
    }

    const nextLocked = !note.isLocked;
    const now = Date.now();
    const auditEntry = createNoteAuditEntry({
      action: nextLocked ? 'lock' : 'unlock',
      actorId: normalizedUserId,
      actorName: currentUserName,
      actorRole: role,
      summary: nextLocked
        ? 'Puso seguro (candado) a lo hecho en esta sesión'
        : 'Quitó el candado de seguridad de la sesión',
      previousTitle: note.title,
      newTitle: note.title,
      previousContent: note.content,
      newContent: note.content,
      previousLinks: note.links,
      newLinks: note.links
    });

    const updated = {
      ...note,
      isLocked: nextLocked,
      lockedBy: nextLocked ? normalizedUserId : null,
      lockedByName: nextLocked ? currentUserName : null,
      lockedByRole: nextLocked ? role : null,
      lockedAt: nextLocked ? now : null,
      auditLog: appendNoteAuditEntry(note.auditLog, auditEntry),
      updatedAt: now
    };

    if (onSaveNote) {
      await onSaveNote(updated);
    }
    if (showNotify) {
      showNotify(
        nextLocked
          ? 'Seguro activado: ningún otro estudiante podrá borrar ni modificar esta nota.'
          : 'Candado desactivado: la sesión está abierta para colaborar.',
        'info'
      );
    }
  };

  // Fijar / desfijar nota
  const handleTogglePin = async (note) => {
    if (!note) return;
    if (!canUserEditNote(note, currentUserObj)) return;
    const updated = {
      ...note,
      isPinned: !note.isPinned,
      updatedAt: Date.now()
    };
    if (onSaveNote) {
      await onSaveNote(updated);
    }
  };

  // Agregar un apunte rápido al hilo de una sesión compartida
  const handleAddThreadEntry = async (note) => {
    if (!note || !threadEntryText.trim()) return;
    const now = Date.now();
    let attachedLink = null;
    if (threadEntryLinkUrl.trim()) {
      const info = classifyNoteUrl(threadEntryLinkUrl.trim());
      if (!info.valid) {
        if (showNotify) {
          showNotify('El enlace del apunte no es válido. Usa una URL https://...', 'warning');
        }
        return;
      }
      attachedLink = {
        id: `elink_${now}`,
        url: info.url,
        label: info.type === 'youtube' ? 'Video de YouTube' : info.type === 'image' ? 'Imagen enlazada' : info.url,
        mediaType: info.type,
        youtubeId: info.youtubeId,
        renderMode: info.defaultRenderMode
      };
    }

    const newEntry = {
      id: `entry_${now}_${Math.random().toString(36).slice(2, 7)}`,
      text: threadEntryText.trim(),
      authorId: normalizedUserId,
      authorName: currentUserName,
      authorRole: role,
      isLocked: Boolean(threadEntryLock),
      lockedBy: threadEntryLock ? normalizedUserId : null,
      lockedByName: threadEntryLock ? currentUserName : null,
      lockedByRole: threadEntryLock ? role : null,
      link: attachedLink,
      createdAt: now
    };

    const existingEntries = Array.isArray(note.entries) ? note.entries : [];
    const auditEntry = createNoteAuditEntry({
      action: 'add_block',
      actorId: normalizedUserId,
      actorName: currentUserName,
      actorRole: role,
      summary: `Agregó un apunte al hilo de la sesión${threadEntryLock ? ' (con candado)' : ''}`,
      previousTitle: note.title,
      newTitle: note.title,
      previousContent: note.content,
      newContent: `${note.content || ''}\n[Apunte de ${currentUserName}]: ${threadEntryText.trim()}`
    });

    const updatedNote = {
      ...note,
      entries: [...existingEntries, newEntry],
      auditLog: appendNoteAuditEntry(note.auditLog, auditEntry),
      updatedAt: now
    };

    if (onSaveNote) {
      await onSaveNote(updatedNote);
    }
    setThreadEntryText('');
    setThreadEntryLinkUrl('');
    if (showNotify) {
      showNotify('Apunte agregado al hilo de la sesión.', 'success');
    }
  };

  // Alternar candado de un apunte individual dentro del hilo
  const handleToggleThreadEntryLock = async (note, entryId) => {
    if (!note) return;
    const existingEntries = Array.isArray(note.entries) ? note.entries : [];
    const targetEntry = existingEntries.find((e) => e.id === entryId);
    if (!targetEntry) return;

    if (!canUserToggleNoteLock(targetEntry, currentUserObj)) {
      if (showNotify) {
        showNotify('Solo el autor del candado o el docente puede desbloquear este apunte.', 'warning');
      }
      return;
    }

    const nextLocked = !targetEntry.isLocked;
    const updatedEntries = existingEntries.map((e) =>
      e.id === entryId
        ? {
            ...e,
            isLocked: nextLocked,
            lockedBy: nextLocked ? normalizedUserId : null,
            lockedByName: nextLocked ? currentUserName : null,
            lockedByRole: nextLocked ? role : null
          }
        : e
    );
    const auditEntry = createNoteAuditEntry({
      action: nextLocked ? 'lock' : 'unlock',
      actorId: normalizedUserId,
      actorName: currentUserName,
      actorRole: role,
      summary: nextLocked
        ? `Puso seguro (candado) a un apunte del hilo (${targetEntry.authorName || targetEntry.authorId})`
        : `Quitó el candado de un apunte del hilo (${targetEntry.authorName || targetEntry.authorId})`,
      previousTitle: note.title,
      newTitle: note.title,
      previousContent: targetEntry.text,
      newContent: targetEntry.text,
      blockId: targetEntry.id
    });
    const updatedNote = {
      ...note,
      entries: updatedEntries,
      auditLog: appendNoteAuditEntry(note.auditLog, auditEntry),
      updatedAt: Date.now()
    };
    if (onSaveNote) {
      await onSaveNote(updatedNote);
    }
  };

  // Alternar el modo de visualización del enlace de un apunte dentro del hilo (Imagen/YouTube <-> Enlace)
  const handleToggleThreadEntryLinkMode = async (note, entryId) => {
    if (!note) return;
    const existingEntries = Array.isArray(note.entries) ? note.entries : [];
    const targetEntry = existingEntries.find((e) => e.id === entryId);
    if (!targetEntry || !targetEntry.link) return;
    if (!canUserEditNote(targetEntry, currentUserObj)) {
      if (showNotify) {
        showNotify('Este apunte tiene candado. Desbloquéalo o pide al docente para cambiar el modo del enlace.', 'warning');
      }
      return;
    }
    const item = targetEntry.link;
    const nativeMode = item.youtubeId ? 'youtube' : (item.mediaType === 'image' || isLikelyImageLink(item) ? 'image' : 'link');
    const nextMode = item.renderMode === 'link' ? (nativeMode === 'link' ? 'image' : nativeMode) : 'link';
    const updatedEntries = existingEntries.map((e) =>
      e.id === entryId
        ? {
            ...e,
            link: {
              ...item,
              mediaType: nextMode === 'image' ? 'image' : item.mediaType,
              renderMode: nextMode
            }
          }
        : e
    );
    if (onSaveNote) {
      await onSaveNote({
        ...note,
        entries: updatedEntries,
        updatedAt: Date.now()
      });
    }
  };

  // Borrar un apunte individual dentro del hilo (solo el docente puede borrar todo; un estudiante no puede borrar el de otro)
  const handleDeleteThreadEntry = async (note, entryId) => {
    if (!note) return;
    const existingEntries = Array.isArray(note.entries) ? note.entries : [];
    const targetEntry = existingEntries.find((e) => e.id === entryId);
    if (!targetEntry) return;

    if (!canUserDeleteNote(targetEntry, currentUserObj)) {
      if (showNotify) {
        showNotify('No puedes borrar el apunte de otro estudiante. Solo el docente puede borrar cualquier contenido.', 'warning');
      }
      return;
    }

    const auditEntry = createNoteAuditEntry({
      action: 'delete_block',
      actorId: normalizedUserId,
      actorName: currentUserName,
      actorRole: role,
      summary: `Eliminó un apunte del hilo (Autor original: ${targetEntry.authorName || targetEntry.authorId})`,
      previousTitle: note.title,
      newTitle: note.title,
      previousContent: targetEntry.text,
      newContent: '',
      previousLinks: targetEntry.link ? [targetEntry.link] : [],
      newLinks: [],
      blockId: targetEntry.id
    });

    const updatedNote = {
      ...note,
      entries: existingEntries.filter((e) => e.id !== entryId),
      auditLog: appendNoteAuditEntry(note.auditLog, auditEntry),
      updatedAt: Date.now()
    };

    if (onSaveNote) {
      await onSaveNote(updatedNote);
    }
    if (showNotify) {
      showNotify('Apunte eliminado del hilo.', 'info');
    }
  };

  // Confirmar borrado de una nota completa
  const handleConfirmDeleteNote = async () => {
    if (!notePendingDelete) return;
    const note = notePendingDelete;

    if (!canUserDeleteNote(note, currentUserObj)) {
      if (showNotify) {
        showNotify('No tienes permiso para borrar esta nota. El único que puede borrar todo es el docente.', 'warning');
      }
      setNotePendingDelete(null);
      return;
    }

    // Si es una nota compartida y la borra un estudiante, hacemos soft-delete silencioso
    // para que desaparezca para los estudiantes pero el docente pueda ver qué se borró en "Últimos cambios"
    if (note.scope === 'shared' && !isTeacher) {
      const now = Date.now();
      const auditEntry = createNoteAuditEntry({
        action: 'soft_delete',
        actorId: normalizedUserId,
        actorName: currentUserName,
        actorRole: role,
        summary: 'Eliminó la nota compartida',
        previousTitle: note.title,
        newTitle: note.title,
        previousContent: note.content,
        newContent: '',
        previousLinks: note.links,
        newLinks: []
      });

      const softDeletedNote = {
        ...note,
        isSoftDeleted: true,
        deletedAt: now,
        deletedBy: normalizedUserId,
        deletedByName: currentUserName,
        auditLog: appendNoteAuditEntry(note.auditLog, auditEntry),
        updatedAt: now
      };

      if (onSaveNote) {
        await onSaveNote(softDeletedNote);
      }
      if (showNotify) {
        showNotify('Nota eliminada.', 'info');
      }
      setNotePendingDelete(null);
      return;
    }

    // Si es una nota privada o si el docente decide eliminarla definitivamente
    if (onDeleteNote) {
      await onDeleteNote(note.id);
    }
    if (showNotify) {
      showNotify('Nota eliminada permanentemente.', 'info');
    }
    setNotePendingDelete(null);
  };

  // Restaurar una versión anterior o una nota eliminada desde el panel de auditoría del docente
  const handleTeacherRestoreAuditVersion = async (auditItem) => {
    if (!isTeacher || !auditItem || !auditItem.noteRef) return;
    const note = auditItem.noteRef;
    const now = Date.now();

    const restoredContent =
      typeof auditItem.previousContent === 'string' && auditItem.action !== 'delete_block'
        ? sanitizeNoteHtml(auditItem.previousContent)
        : note.content;
    const restoredTitle =
      typeof auditItem.previousTitle === 'string' && auditItem.previousTitle.trim() !== ''
        ? auditItem.previousTitle
        : note.title;
    const restoredLinks =
      Array.isArray(auditItem.previousLinks) && auditItem.action !== 'delete_block'
        ? auditItem.previousLinks
        : (Array.isArray(note.links) ? note.links : []);
    const restoredEntries = (() => {
      const currentEntries = Array.isArray(note.entries) ? [...note.entries] : [];
      if (auditItem.action === 'delete_block' && auditItem.previousContent) {
        const blockId = auditItem.blockId || `entry_restored_${now}`;
        if (!currentEntries.some((e) => e.id === blockId)) {
          currentEntries.push({
            id: blockId,
            text: auditItem.previousContent,
            authorId: auditItem.actorId || normalizedUserId,
            authorName: auditItem.actorName || currentUserName,
            authorRole: auditItem.actorRole || 'student',
            isLocked: true,
            lockedBy: normalizedUserId,
            lockedByName: currentUserName,
            lockedByRole: 'teacher',
            link: Array.isArray(auditItem.previousLinks) && auditItem.previousLinks[0] ? auditItem.previousLinks[0] : null,
            createdAt: now
          });
        }
      }
      return currentEntries;
    })();

    const restoreLog = createNoteAuditEntry({
      action: 'restore',
      actorId: normalizedUserId,
      actorName: currentUserName,
      actorRole: 'teacher',
      summary: `Restauró la nota al estado previo al cambio de ${auditItem.actorName}`,
      previousTitle: note.title,
      newTitle: restoredTitle,
      previousContent: note.content,
      newContent: restoredContent,
      previousLinks: note.links || [],
      newLinks: restoredLinks
    });

    const updatedNote = {
      ...note,
      title: restoredTitle,
      content: restoredContent,
      links: restoredLinks,
      entries: restoredEntries,
      isSoftDeleted: false,
      deletedAt: null,
      deletedBy: null,
      deletedByName: null,
      auditLog: appendNoteAuditEntry(note.auditLog, restoreLog),
      updatedAt: now
    };

    if (onSaveNote) {
      await onSaveNote(updatedNote);
    }
    if (showNotify) {
      showNotify('Versión restaurada en el cuaderno compartido.', 'success');
    }
  };

  const getFontFamilyStyle = (familyId) => {
    const found = NOTE_FONT_FAMILIES.find((f) => f.id === familyId) || NOTE_FONT_FAMILIES[0];
    return { fontFamily: found.css };
  };

  const getFontSizeClass = (sizeId) => {
    const found = NOTE_FONT_SIZES.find((s) => s.id === sizeId) || NOTE_FONT_SIZES[1];
    return found.className;
  };

  const getPaperThemeClasses = (themeId) => {
    const found = NOTE_PAPER_THEMES.find((t) => t.id === themeId) || NOTE_PAPER_THEMES[0];
    return isDarkMode ? found.darkBg : found.lightBg;
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Encabezado minimalista de la sección Notas */}
      <div className={`rounded-3xl border p-6 sm:p-8 transition-all ${
        isDarkMode
          ? 'bg-slate-900/90 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200/80 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <NavNotebook size={14} />
              <span>Cuaderno Interactivo y Apuntes</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Notas de Clase
            </h1>
            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Lleva el hilo de las sesiones en el cuaderno compartido con tu docente y compañeros, o guarda apuntes en tu espacio privado. Personaliza fuentes, colores y enlaces de YouTube o imágenes por URL, y asegura tus apuntes de sesión con candado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Botón exclusivo y silencioso para el Docente: "Últimos cambios" */}
            {isTeacher && (
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(true)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold border transition-all ${
                  isDarkMode
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                    : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                }`}
                title="Solo visible para el docente: los estudiantes no saben que este registro existe"
              >
                <Clock size={15} />
                <span>Últimos cambios</span>
                {teacherAuditFeed.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {teacherAuditFeed.length}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenNewNote(activeScope)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>{activeScope === 'shared' ? 'Nueva Nota Compartida' : 'Nueva Nota Privada'}</span>
            </button>
          </div>
        </div>

        {/* Pestañas: Cuaderno Compartido vs Mis Notas Privadas + Buscador */}
        <div className="mt-6 pt-5 border-t border-slate-200/70 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className={`inline-flex p-1 rounded-2xl border self-start ${
            isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100/80 border-slate-200/70'
          }`}>
            <button
              type="button"
              onClick={() => setActiveScope('shared')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeScope === 'shared'
                  ? (isDarkMode ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <UsersIcon size={16} />
              <span>Notas Compartidas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveScope('private')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeScope === 'private'
                  ? (isDarkMode ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <UserIcon size={16} />
              <span>Mis Notas Privadas</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-1 md:justify-end">
            {activeScope === 'shared' && academicGroups.length > 0 && (
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium border outline-none transition-all ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <option value="ALL">Todos los grupos</option>
                {academicGroups.map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    {grp.name}
                  </option>
                ))}
              </select>
            )}

            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en notas..."
                className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm border outline-none transition-all ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cinta informativa minimalista sobre reglas de sesión y candado */}
      <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-xs ${
        isDarkMode
          ? 'bg-slate-900/60 border-slate-800/80 text-slate-400'
          : 'bg-slate-50/90 border-slate-200/70 text-slate-600'
      }`}>
        <div className="flex items-center gap-2">
          <Lock size={14} className="text-blue-500 shrink-0" />
          <span>
            {activeScope === 'shared'
              ? 'Puedes poner seguro (candado) a lo hecho en tu sesión para que ningún otro estudiante borre lo de otro. El docente tiene control total.'
              : 'Tus notas privadas son estrictamente personales; nadie más puede verlas ni modificarlas.'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
          <Globe size={13} />
          <span>Enlaces inteligentes: YouTube, imágenes por URL y web (sin subida de archivos locales)</span>
        </div>
      </div>

      {/* Listado de Notas */}
      {visibleNotes.length === 0 ? (
        <div className={`rounded-3xl border p-12 text-center space-y-4 ${
          isDarkMode ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-white border-slate-200/70 text-slate-500'
        }`}>
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
            <NavNotebook size={26} />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className={`text-base font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {activeScope === 'shared'
                ? 'Aún no hay notas compartidas en esta vista'
                : 'No tienes notas privadas todavía'}
            </h3>
            <p className="text-xs leading-relaxed">
              {activeScope === 'shared'
                ? 'Crea la primera nota de la sesión para llevar el hilo de la clase, insertar videos de YouTube o imágenes por enlace y asegurar tus apuntes con candado.'
                : 'Crea una nota privada para guardar tus resúmenes, vocabulario personal o recordatorios de estudio.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenNewNote(activeScope)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Crear primera nota</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {visibleNotes.map((note) => {
            const canEdit = canUserEditNote(note, currentUserObj);
            const canDelete = canUserDeleteNote(note, currentUserObj);
            const canToggleLock = canUserToggleNoteLock(note, currentUserObj);
            const noteLinks = Array.isArray(note.links) ? note.links : [];
            const noteEntries = Array.isArray(note.entries) ? note.entries : [];
            const isThreadOpen = expandedThreadNoteId === note.id;

            return (
              <article
                key={note.id}
                className={`rounded-3xl border p-6 flex flex-col justify-between transition-all shadow-sm hover:shadow-md ${getPaperThemeClasses(note.paperTheme)}`}
              >
                <div>
                  {/* Cabecera de la tarjeta: Badges de estado, grupo y acciones */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {note.isPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                          <Pin size={11} />
                          <span>Fijada</span>
                        </span>
                      )}

                      {note.scope === 'shared' ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          note.isLocked
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
                        }`}>
                          {note.isLocked ? <Lock size={11} /> : <Unlock size={11} />}
                          <span>
                            {note.isLocked
                              ? `Seguro activo (${note.lockedByName || 'Sesión'})`
                              : 'Sesión abierta'}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/15 text-violet-700 dark:text-violet-300">
                          <UserIcon size={11} />
                          <span>Privada</span>
                        </span>
                      )}

                      {note.scope === 'shared' && note.targetGroupName && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200/70 text-slate-700'
                        }`}>
                          {note.targetGroupName}
                        </span>
                      )}
                    </div>

                    {/* Botones de acción en la tarjeta */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Botón de Seguro / Candado de sesión en notas compartidas */}
                      {note.scope === 'shared' && (
                        <button
                          type="button"
                          onClick={() => handleToggleLockOnCard(note)}
                          disabled={!canToggleLock}
                          title={
                            note.isLocked
                              ? (canToggleLock ? 'Quitar seguro (candado) de esta sesión' : `Asegurada por ${note.lockedByName || 'otro usuario'}`)
                              : 'Poner seguro (candado) a lo hecho en esta sesión'
                          }
                          className={`p-1.5 rounded-xl border text-xs transition-all ${
                            note.isLocked
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                              : (isDarkMode ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-slate-200 text-slate-500 hover:text-slate-800')
                          } ${!canToggleLock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {note.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                      )}

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleTogglePin(note)}
                          title={note.isPinned ? 'Desfijar nota' : 'Fijar nota arriba'}
                          className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                            note.isPinned
                              ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                          }`}
                        >
                          <Pin size={14} />
                        </button>
                      )}

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditNote(note)}
                          title="Editar nota"
                          className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setNotePendingDelete(note)}
                          title={isTeacher ? 'Borrar nota (Permiso docente)' : 'Borrar mi nota'}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Título de la nota */}
                  <h2
                    style={getFontFamilyStyle(note.fontFamily)}
                    className={`text-lg font-bold tracking-tight mb-2.5 ${
                      isDarkMode ? 'text-slate-100' : 'text-slate-900'
                    }`}
                  >
                    {note.title}
                  </h2>

                  {/* Cuerpo enriquecido de la nota */}
                  {note.content && (
                    <div
                      style={getFontFamilyStyle(note.fontFamily)}
                      className={`prose prose-sm max-w-none break-words mb-4 ${getFontSizeClass(note.fontSize)} ${
                        isDarkMode ? 'text-slate-200 prose-invert' : 'text-slate-700'
                      } [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-blue-600 [&_a]:underline`}
                      dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(note.content) }}
                    />
                  )}

                  {/* Enlaces Inteligentes Adjuntos (Imágenes por URL, Videos de YouTube o Enlaces Web) */}
                  {noteLinks.length > 0 && (
                    <div className="space-y-3 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
                      {noteLinks.map((item) => {
                        const canConvertImg = isLikelyImageLink(item);
                        const canConvertYt = Boolean(item.youtubeId);

                        return (
                          <div
                            key={item.id}
                            className={`rounded-2xl border p-3 transition-all ${
                              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white/80 border-slate-200/80'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate"
                              >
                                {item.renderMode === 'youtube' ? (
                                  <MonitorPlay size={14} className="text-rose-500 shrink-0" />
                                ) : item.renderMode === 'image' ? (
                                  <ImageIcon size={14} className="text-emerald-500 shrink-0" />
                                ) : (
                                  <Globe size={14} className="text-blue-500 shrink-0" />
                                )}
                                <span className="truncate">{item.label || item.url}</span>
                              </a>

                              {/* Botón para alternar entre Imagen/Video integrado y Enlace */}
                              {(canConvertImg || canConvertYt) && canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleLinkRenderMode(note, item.id, false)}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all shrink-0 cursor-pointer ${
                                    isDarkMode
                                      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  {item.renderMode === 'link'
                                    ? (canConvertYt ? 'Convertir en Video YouTube' : 'Convertir en Imagen')
                                    : 'Ver solo como enlace'}
                                </button>
                              )}
                            </div>

                            {/* Renderizado como Video de YouTube integrado */}
                            {item.renderMode === 'youtube' && item.youtubeId && (
                              <div className="rounded-xl overflow-hidden mt-1">
                                <CustomVideoPlayer
                                  url={item.url}
                                  videoId={item.youtubeId}
                                  title={item.label || 'Video de YouTube en nota'}
                                  isDarkMode={isDarkMode}
                                />
                              </div>
                            )}

                            {/* Renderizado como Imagen por enlace URL */}
                            {item.renderMode === 'image' && (
                              <div className="rounded-xl overflow-hidden mt-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800">
                                <img
                                  src={item.url}
                                  alt={item.label || 'Imagen enlazada'}
                                  loading="lazy"
                                  className="w-full max-h-72 object-contain mx-auto"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Hilo de apuntes de la sesión (solo para notas compartidas) */}
                  {note.scope === 'shared' && (
                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isThreadOpen) {
                              setThreadEntryText('');
                              setThreadEntryLinkUrl('');
                            }
                            setExpandedThreadNoteId(isThreadOpen ? null : note.id);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          <MessageSquareText size={14} />
                          <span>
                            {noteEntries.length > 0
                              ? `Hilo de la sesión (${noteEntries.length} ${noteEntries.length === 1 ? 'apunte' : 'apuntes'})`
                              : 'Agregar apunte al hilo de esta sesión'}
                          </span>
                        </button>
                      </div>

                      {(isThreadOpen || noteEntries.length > 0) && (
                        <div className="mt-3 space-y-2.5">
                          {noteEntries.map((entry) => {
                            const canDeleteEntry = canUserDeleteNote(entry, currentUserObj);
                            const canToggleEntryLock = canUserToggleNoteLock(entry, currentUserObj);

                            return (
                              <div
                                key={entry.id}
                                className={`rounded-2xl p-3 border text-xs transition-all ${
                                  isDarkMode
                                    ? 'bg-slate-950/70 border-slate-800 text-slate-200'
                                    : 'bg-white/90 border-slate-200/80 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold">{entry.authorName}</span>
                                    {entry.authorRole === 'teacher' && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                        Docente
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-400">
                                      • {formatRelativeTime(entry.createdAt)}
                                    </span>
                                    {entry.isLocked && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                        <Lock size={10} />
                                        <span>Con seguro</span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {canToggleEntryLock && (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleThreadEntryLock(note, entry.id)}
                                        title={entry.isLocked ? 'Quitar seguro del apunte' : 'Poner seguro a mi apunte'}
                                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-500 cursor-pointer"
                                      >
                                        {entry.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                      </button>
                                    )}
                                    {canDeleteEntry && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteThreadEntry(note, entry.id)}
                                        title="Borrar apunte"
                                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <p className="whitespace-pre-wrap leading-relaxed">{entry.text}</p>

                                {entry.link && (
                                  <div className="mt-2 space-y-1">
                                    {(isLikelyImageLink(entry.link) || Boolean(entry.link.youtubeId)) && canUserEditNote(entry, currentUserObj) && (
                                      <div className="flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleThreadEntryLinkMode(note, entry.id)}
                                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border cursor-pointer ${
                                            isDarkMode
                                              ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                                              : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                                          }`}
                                        >
                                          {entry.link.renderMode === 'link'
                                            ? (entry.link.youtubeId ? 'Convertir en Video YouTube' : 'Convertir en Imagen')
                                            : 'Ver solo como enlace'}
                                        </button>
                                      </div>
                                    )}
                                    {entry.link.renderMode === 'youtube' && entry.link.youtubeId ? (
                                      <div className="rounded-xl overflow-hidden mt-1">
                                        <CustomVideoPlayer
                                          url={entry.link.url}
                                          videoId={entry.link.youtubeId}
                                          title={entry.link.label || 'Video en apunte'}
                                          isDarkMode={isDarkMode}
                                        />
                                      </div>
                                    ) : entry.link.renderMode === 'image' ? (
                                      <img
                                        src={entry.link.url}
                                        alt={entry.link.label || 'Imagen'}
                                        className="mt-1 rounded-xl max-h-48 object-contain"
                                      />
                                    ) : (
                                      <a
                                        href={entry.link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 underline mt-1"
                                      >
                                        <Globe size={12} />
                                        <span>{entry.link.url}</span>
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {isThreadOpen && (
                            <div className={`rounded-2xl p-3 border space-y-2 ${
                              isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}>
                              <textarea
                                rows={2}
                                value={threadEntryText}
                                onChange={(e) => setThreadEntryText(e.target.value)}
                                placeholder="Añadir un apunte al hilo de esta sesión..."
                                className={`w-full text-xs p-2 rounded-xl border outline-none resize-none ${
                                  isDarkMode
                                    ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500'
                                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                                }`}
                              />
                              <input
                                type="url"
                                value={threadEntryLinkUrl}
                                onChange={(e) => setThreadEntryLinkUrl(e.target.value)}
                                placeholder="Opcional: pegar enlace de YouTube, imagen por URL o web (https://...)"
                                className={`w-full text-[11px] px-2.5 py-1.5 rounded-xl border outline-none ${
                                  isDarkMode
                                    ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
                                    : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400'
                                }`}
                              />
                              <div className="flex items-center justify-between gap-2 pt-1">
                                <label className="inline-flex items-center gap-1.5 text-[11px] font-medium cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={threadEntryLock}
                                    onChange={(e) => setThreadEntryLock(e.target.checked)}
                                    className="rounded text-blue-600"
                                  />
                                  <Lock size={12} className="text-emerald-500" />
                                  <span>Poner seguro (candado) a mi apunte</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleAddThreadEntry(note)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer"
                                >
                                  Publicar apunte
                                </button>
                              </div>
                            </div>
                          )}
                          {!isThreadOpen && noteEntries.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setThreadEntryText('');
                                setThreadEntryLinkUrl('');
                                setExpandedThreadNoteId(note.id);
                              }}
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-1 cursor-pointer"
                            >
                              <Plus size={12} />
                              <span>Añadir apunte en esta sesión</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Pie de la tarjeta: Autor y fecha */}
                <div className="mt-5 pt-3 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {note.authorName || 'Usuario'}
                    </span>
                    {note.authorRole === 'teacher' && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        Docente
                      </span>
                    )}
                  </div>
                  <span>{formatRelativeTime(note.updatedAt || note.createdAt)}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ========================================================================
          MODAL COMPOSITOR / EDITOR DE NOTA CON PERSONALIZACIÓN RICA DE TEXTO
      ======================================================================== */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Cabecera del Editor */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <NavNotebook size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingNote ? 'Editar Nota' : 'Nueva Nota'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Personaliza fuente, tamaño, colores, enlaces de imagen/YouTube y candado de sesión
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo scrollable del Editor */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Selector de Tipo de Nota (Compartida vs Privada) y Grupo */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className={`inline-flex p-1 rounded-2xl border ${
                  isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  <button
                    type="button"
                    onClick={() => setScope('shared')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      scope === 'shared'
                        ? (isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 shadow-sm')
                        : 'text-slate-500'
                    }`}
                  >
                    <UsersIcon size={14} />
                    <span>Nota Compartida (Clase)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('private')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      scope === 'private'
                        ? (isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 shadow-sm')
                        : 'text-slate-500'
                    }`}
                  >
                    <UserIcon size={14} />
                    <span>Nota Privada (Personal)</span>
                  </button>
                </div>

                {scope === 'shared' && academicGroups.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">Grupo:</span>
                    <select
                      value={targetGroupId}
                      onChange={(e) => setTargetGroupId(e.target.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border outline-none ${
                        isDarkMode
                          ? 'bg-slate-950 border-slate-800 text-slate-200'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {academicGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Input de Título */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  scope === 'shared'
                    ? 'Título de la sesión o apunte de clase (ej. Sesión 2: Phrasal Verbs & Market Trends)...'
                    : 'Título de tu nota privada...'
                }
                style={getFontFamilyStyle(fontFamily)}
                className={`w-full px-4 py-3 rounded-2xl text-base sm:text-lg font-bold border outline-none transition-all ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500'
                    : 'bg-slate-50/70 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                }`}
              />

              {/* Barra de Herramientas de Personalización de Texto */}
              <div className={`rounded-2xl border p-2.5 space-y-2.5 ${
                isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Selector de Tipo de Fuente */}
                  <div className="flex items-center gap-1">
                    <Type size={14} className="text-slate-400 ml-1" />
                    <select
                      value={fontFamily}
                      onChange={(e) => {
                        const nextFam = e.target.value;
                        setFontFamily(nextFam);
                        const found = NOTE_FONT_FAMILIES.find((f) => f.id === nextFam);
                        if (found) execFormat('fontName', found.css);
                      }}
                      title="Tipo de fuente"
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border outline-none cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-200'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      {NOTE_FONT_FAMILIES.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selector de Tamaño de Fuente */}
                  <select
                    value={fontSize}
                    onChange={(e) => {
                      const nextSize = e.target.value;
                      setFontSize(nextSize);
                      const found = NOTE_FONT_SIZES.find((s) => s.id === nextSize);
                      if (found) execFormat('fontSize', found.execValue);
                    }}
                    title="Tamaño del texto"
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border outline-none cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-800 text-slate-200'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    {NOTE_FONT_SIZES.map((s) => (
                      <option key={s.id} value={s.id}>
                        Tamaño: {s.label}
                      </option>
                    ))}
                  </select>

                  <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

                  {/* Botones de estilo básico */}
                  <button
                    type="button"
                    onClick={() => execFormat('bold')}
                    title="Negrita"
                    className="p-1.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Bold size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('italic')}
                    title="Cursiva"
                    className="p-1.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Italic size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('underline')}
                    title="Subrayado"
                    className="p-1.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Underline size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('strikeThrough')}
                    title="Tachado"
                    className="p-1.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Strikethrough size={15} />
                  </button>

                  <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

                  {/* Color de Texto */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowColorMenu(!showColorMenu);
                        setShowHighlightMenu(false);
                      }}
                      title="Color del texto"
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-200'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <Palette size={14} className="text-blue-500" />
                      <span>Color</span>
                    </button>
                    {showColorMenu && (
                      <div className={`absolute left-0 top-full mt-1.5 z-20 p-2 rounded-2xl border shadow-xl flex items-center gap-1.5 ${
                        isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                      }`}>
                        {NOTE_TEXT_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              execFormat('foreColor', c.color);
                              setShowColorMenu(false);
                            }}
                            title={c.label}
                            style={{ backgroundColor: c.color }}
                            className="w-6 h-6 rounded-full border border-white/40 shadow-sm hover:scale-110 transition-transform cursor-pointer"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Resaltador */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowHighlightMenu(!showHighlightMenu);
                        setShowColorMenu(false);
                      }}
                      title="Resaltar texto"
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-200'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <Highlighter size={14} className="text-amber-500" />
                      <span>Resaltar</span>
                    </button>
                    {showHighlightMenu && (
                      <div className={`absolute left-0 top-full mt-1.5 z-20 p-2 rounded-2xl border shadow-xl flex items-center gap-1.5 ${
                        isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                      }`}>
                        {NOTE_HIGHLIGHT_COLORS.map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => {
                              execFormat('hiliteColor', h.color);
                              setShowHighlightMenu(false);
                            }}
                            title={h.label}
                            style={{ backgroundColor: h.color === 'transparent' ? '#ffffff' : h.color }}
                            className="w-6 h-6 rounded-full border border-slate-300 shadow-sm hover:scale-110 transition-transform cursor-pointer"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

                  {/* Listas, Cita y Subtítulo */}
                  <button
                    type="button"
                    onClick={() => execFormat('insertUnorderedList')}
                    title="Lista con viñetas"
                    className="p-1.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <List size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('insertOrderedList')}
                    title="Lista numerada"
                    className="p-1.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ListOrdered size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('formatBlock', 'blockquote')}
                    title="Cita destacada"
                    className="p-1.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Quote size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('formatBlock', 'h3')}
                    title="Subtítulo de sección"
                    className="p-1.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Heading size={15} />
                  </button>

                  {/* Botón para abrir la barra de Enlaces Inteligentes (Imagen por URL / YouTube / Web) */}
                  <button
                    type="button"
                    onClick={() => setShowLinkInput(!showLinkInput)}
                    className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      showLinkInput
                        ? 'bg-blue-600 text-white border-blue-600'
                        : (isDarkMode ? 'bg-slate-900 border-slate-700 text-blue-400' : 'bg-white border-blue-200 text-blue-600')
                    }`}
                  >
                    <Globe size={14} />
                    <span>+ Agregar Enlace (Imagen / YouTube / Web)</span>
                  </button>
                </div>

                {/* Panel desplegable para insertar Enlace Inteligente (Sin subida de archivos locales) */}
                {showLinkInput && (
                  <div className={`p-3.5 rounded-2xl border space-y-3 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Pega un enlace de imagen, un enlace de YouTube o una página web:</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        Solo enlaces URL (sin subir archivos del dispositivo)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="url"
                        value={linkUrlInput}
                        onChange={(e) => setLinkUrlInput(e.target.value)}
                        placeholder="https://... (YouTube, imagen .png/.jpg o sitio web)"
                        className={`px-3 py-2 rounded-xl text-xs border outline-none ${
                          isDarkMode
                            ? 'bg-slate-950 border-slate-800 text-slate-100'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                      <input
                        type="text"
                        value={linkLabelInput}
                        onChange={(e) => setLinkLabelInput(e.target.value)}
                        placeholder="Título o descripción del enlace (opcional)"
                        className={`px-3 py-2 rounded-xl text-xs border outline-none ${
                          isDarkMode
                            ? 'bg-slate-950 border-slate-800 text-slate-100'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    {/* Opciones de conversión según el tipo de enlace detectado */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-[11px] font-medium text-slate-400 mr-1">Convertir en:</span>
                        <button
                          type="button"
                          onClick={() => setLinkRenderPreference('auto')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                            linkRenderPreference === 'auto'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : (isDarkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600')
                          }`}
                        >
                          Automático {liveLinkPreview?.type === 'youtube' ? '(Video YouTube)' : liveLinkPreview?.type === 'image' ? '(Imagen)' : '(Enlace)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLinkRenderPreference('image')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                            linkRenderPreference === 'image'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : (isDarkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600')
                          }`}
                        >
                          <ImageIcon size={12} />
                          <span>Imagen integrada</span>
                        </button>
                        {liveLinkPreview?.youtubeId && (
                          <button
                            type="button"
                            onClick={() => setLinkRenderPreference('youtube')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                              linkRenderPreference === 'youtube'
                                ? 'bg-rose-600 text-white border-rose-600'
                                : (isDarkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600')
                            }`}
                          >
                            <MonitorPlay size={12} />
                            <span>Video de YouTube</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setLinkRenderPreference('link')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                            linkRenderPreference === 'link'
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : (isDarkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600')
                          }`}
                        >
                          <Globe size={12} />
                          <span>Solo enlace clicable</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddSmartLink}
                        className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer"
                      >
                        Insertar enlace
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Área de Escritura Enriquecida (ContentEditable sin subida de archivos) */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onKeyUp={saveEditorSelection}
                onMouseUp={saveEditorSelection}
                onBlur={saveEditorSelection}
                onPaste={handleEditorPaste}
                onDrop={handleEditorDrop}
                style={getFontFamilyStyle(fontFamily)}
                data-placeholder="Escribe aquí los apuntes de la sesión... Puedes aplicar colores, cambiar tipos de fuente y tamaños, o agregar enlaces de YouTube e imágenes por URL."
                className={`min-h-[210px] p-4 rounded-2xl border outline-none transition-all prose prose-sm max-w-none ${getFontSizeClass(fontSize)} ${getPaperThemeClasses(paperTheme)} ${
                  isDarkMode
                    ? 'text-slate-100 focus:border-blue-500'
                    : 'text-slate-800 focus:border-blue-500'
                } empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500/50 [&_blockquote]:pl-3 [&_blockquote]:italic`}
              />

              {/* Lista de Enlaces Inteligentes añadidos a la nota en el editor */}
              {links.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-400">
                    Enlaces y recursos integrados en esta nota ({links.length}):
                  </div>
                  <div className="space-y-2">
                    {links.map((item) => (
                      <div
                        key={item.id}
                        className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border text-xs ${
                          isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate max-w-md">
                          {item.renderMode === 'youtube' ? (
                            <MonitorPlay size={14} className="text-rose-500 shrink-0" />
                          ) : item.renderMode === 'image' ? (
                            <ImageIcon size={14} className="text-emerald-500 shrink-0" />
                          ) : (
                            <Globe size={14} className="text-blue-500 shrink-0" />
                          )}
                          <span className="font-semibold truncate">{item.label}</span>
                          <span className="text-[10px] text-slate-400 truncate">({item.url})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleLinkRenderMode(null, item.id, true)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                              isDarkMode
                                ? 'border-slate-700 bg-slate-800 text-slate-200'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            Modo actual: {item.renderMode === 'youtube' ? 'Video YouTube' : item.renderMode === 'image' ? 'Imagen' : 'Enlace'} (Cambiar)
                          </button>
                          <button
                            type="button"
                            onClick={() => setLinks((prev) => prev.filter((l) => l.id !== item.id))}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="Quitar enlace"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selector de Color de Hoja (Paper Theme) y Seguro/Candado de Sesión */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">Fondo de hoja:</span>
                  <div className="flex items-center gap-1.5">
                    {NOTE_PAPER_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setPaperTheme(theme.id)}
                        title={theme.label}
                        className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${theme.dot} ${
                          paperTheme === theme.id ? 'ring-2 ring-blue-500 scale-110' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Candado / Seguro de sesión (en notas compartidas) */}
                {scope === 'shared' && (
                  <label
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-semibold cursor-pointer select-none transition-all ${
                      isLockedOnSave
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                        : (isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700')
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isLockedOnSave}
                      onChange={(e) => setIsLockedOnSave(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    {isLockedOnSave ? <Lock size={14} /> : <Unlock size={14} />}
                    <span>
                      Poner seguro (candado) a lo hecho en esta sesión
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Pie del Modal Editor */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isDarkMode
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveComposerNote}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>{editingNote ? 'Guardar cambios' : 'Publicar nota'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL EXCLUSIVO DEL DOCENTE: "ÚLTIMOS CAMBIOS" (AUDITORÍA SILENCIOSA)
          Estrictamente renderizado solo cuando isTeacher === true.
      ======================================================================== */}
      {isTeacher && isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/65 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Shield size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">Últimos Cambios en Notas Compartidas</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      Vista privada del docente
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Supervisa quién creó, editó, bloqueó o borró apuntes en la clase y restaura versiones anteriores si alguien escribió algo indebido.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-400">
                Filtrar por nota:
              </span>
              <select
                value={selectedAuditNoteFilter}
                onChange={(e) => setSelectedAuditNoteFilter(e.target.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border outline-none ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <option value="ALL">Todas las notas compartidas</option>
                {(Array.isArray(notes) ? notes : [])
                  .filter((n) => n && n.scope !== 'private')
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title} {n.isSoftDeleted ? '(Eliminada por estudiante)' : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {teacherAuditFeed.filter(
                (item) => selectedAuditNoteFilter === 'ALL' || String(item.noteId) === String(selectedAuditNoteFilter)
              ).length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  No hay cambios registrados para este filtro todavía.
                </div>
              ) : (
                teacherAuditFeed
                  .filter(
                    (item) => selectedAuditNoteFilter === 'ALL' || String(item.noteId) === String(selectedAuditNoteFilter)
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-4 space-y-2.5 ${
                        isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{item.actorName}</span>
                          <span className="text-[11px] text-slate-400">@{item.actorId}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.actorRole === 'teacher'
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                              : 'bg-slate-500/15 text-slate-600 dark:text-slate-300'
                          }`}>
                            {item.actorRole === 'teacher' ? 'Docente' : 'Estudiante'}
                          </span>
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                            • {item.summary}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        Nota: {item.noteTitle}
                        {item.isNoteSoftDeleted && (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-rose-500/15 text-rose-500">
                            Oculta / Borrada por estudiante
                          </span>
                        )}
                      </div>

                      {(item.previousTextPreview || item.newTextPreview) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                          {item.previousTextPreview && (
                            <div className={`p-2.5 rounded-xl border ${
                              isDarkMode ? 'bg-rose-950/20 border-rose-900/40 text-rose-200' : 'bg-rose-50/70 border-rose-200 text-rose-900'
                            }`}>
                              <div className="text-[10px] font-bold uppercase tracking-wider opacity-75 mb-1">
                                Contenido anterior:
                              </div>
                              <p className="line-clamp-4 whitespace-pre-wrap">{item.previousTextPreview}</p>
                            </div>
                          )}
                          {item.newTextPreview && (
                            <div className={`p-2.5 rounded-xl border ${
                              isDarkMode ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200' : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            }`}>
                              <div className="text-[10px] font-bold uppercase tracking-wider opacity-75 mb-1">
                                Contenido después del cambio:
                              </div>
                              <p className="line-clamp-4 whitespace-pre-wrap">{item.newTextPreview}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {((Array.isArray(item.previousLinks) && item.previousLinks.length > 0) || (Array.isArray(item.newLinks) && item.newLinks.length > 0)) && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Enlaces previos: {Array.isArray(item.previousLinks) ? item.previousLinks.length : 0} • Enlaces posteriores: {Array.isArray(item.newLinks) ? item.newLinks.length : 0}
                        </div>
                      )}
                      {(item.action === 'edit' || item.action === 'soft_delete' || item.action === 'delete_block') && (typeof item.previousContent === 'string' || Array.isArray(item.previousLinks)) && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleTeacherRestoreAuditVersion(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer"
                          >
                            <RotateCcw size={13} />
                            <span>Restaurar esta versión anterior</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL DE CONFIRMACIÓN DE BORRADO
      ======================================================================== */}
      {notePendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold">¿Eliminar esta nota?</h3>
                <p className="text-xs text-slate-400">
                  {notePendingDelete.title}
                </p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {isTeacher
                ? 'Como docente, tienes permiso total para eliminar definitivamente esta nota del cuaderno.'
                : 'Se quitará esta nota de tu vista actual.'}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setNotePendingDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                  isDarkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteNote}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
