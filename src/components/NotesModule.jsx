// src/components/NotesModule.jsx
// Módulo de Notas y Cuaderno de Clase (Notas compartidas docente-estudiantes y Notas privadas).
// Soporta personalización de texto (fuentes, tamaños, colores, resaltados), enlaces inteligentes
// (conversión automática/opcional en imagen integrada, video de YouTube o enlace web, sin subida de archivos locales),
// candado/seguro de sesión y registro silencioso de últimos cambios exclusivo para el docente.

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  MessageSquareText,
  FileText,
  Grid,
  Maximize2
} from './Icons.jsx';
import CustomVideoPlayer from './CustomVideoPlayer.jsx';
import {
  NOTE_FONT_FAMILIES,
  NOTE_FONT_SIZES,
  NOTE_TEXT_COLORS,
  NOTE_HIGHLIGHT_COLORS,
  NOTE_PAPER_THEMES,
  NOTE_FORMATS,
  NOTE_SHEET_STYLES,
  normalizeNoteFormat,
  normalizeNoteSheetStyle,
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
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'sticky' | 'sheet'

  // Modal de creación / edición de nota
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('shared');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [fontFamily, setFontFamily] = useState('sans');
  const [fontSize, setFontSize] = useState('base');
  const [paperTheme, setPaperTheme] = useState('default');
  const [noteFormat, setNoteFormat] = useState('sticky'); // 'sticky' | 'sheet'
  const [sheetStyle, setSheetStyle] = useState('blank'); // 'blank' | 'lined' | 'grid'
  const [isLockedOnSave, setIsLockedOnSave] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [links, setLinks] = useState([]);

  // Vista ampliada de Hoja Completa Profesional
  const [activeSheetNoteId, setActiveSheetNoteId] = useState(null);

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
  const handleOpenNewNote = (initialScope = activeScope, initialFormat = null) => {
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
    setNoteFormat(initialFormat ? normalizeNoteFormat(initialFormat) : (viewMode === 'sheet' ? 'sheet' : 'sticky'));
    setSheetStyle('blank');
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
    setNoteFormat(normalizeNoteFormat(note.noteFormat));
    setSheetStyle(normalizeNoteSheetStyle(note.sheetStyle));
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
        noteFormat: normalizeNoteFormat(noteFormat),
        sheetStyle: normalizeNoteSheetStyle(sheetStyle),
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
        noteFormat: normalizeNoteFormat(noteFormat),
        sheetStyle: normalizeNoteSheetStyle(sheetStyle),
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

  // Alternar formato entre Nota rápida (sticky) y Hoja completa profesional (sheet)
  const handleToggleNoteFormat = async (note) => {
    if (!note) return;
    if (!canUserEditNote(note, currentUserObj)) {
      if (showNotify) {
        showNotify('Esta nota tiene candado. Desbloquéala para cambiar su formato.', 'warning');
      }
      return;
    }
    const nextFmt = normalizeNoteFormat(note.noteFormat) === 'sheet' ? 'sticky' : 'sheet';
    const updated = {
      ...note,
      noteFormat: nextFmt,
      sheetStyle: normalizeNoteSheetStyle(note.sheetStyle),
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

  const getSheetRulingStyle = (styleId) => {
    const normalized = normalizeNoteSheetStyle(styleId);
    if (normalized === 'lined') {
      const lineColor = isDarkMode ? 'rgba(148, 163, 184, 0.14)' : 'rgba(100, 116, 139, 0.16)';
      return {
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 31px, ${lineColor} 31px, ${lineColor} 32px)`,
        backgroundAttachment: 'local',
        lineHeight: '32px'
      };
    }
    if (normalized === 'grid') {
      const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.11)' : 'rgba(100, 116, 139, 0.13)';
      return {
        backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
        backgroundAttachment: 'local'
      };
    }
    return {};
  };

  const activeSheetNote = useMemo(() => {
    if (!activeSheetNoteId) return null;
    return visibleNotes.find((n) => String(n.id) === String(activeSheetNoteId)) || null;
  }, [activeSheetNoteId, visibleNotes]);

  return (
    <div className="w-full space-y-5 pb-16">
      {/* Encabezado minimalista */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={`text-2xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Notas
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          {isTeacher && (
            <button
              type="button"
              onClick={() => setIsAuditModalOpen(true)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Clock size={14} />
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
            onClick={() => handleOpenNewNote(activeScope, 'sheet')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 shadow-2xs'
            }`}
          >
            <FileText size={14} className="text-blue-500" />
            <span>Hoja completa</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenNewNote(activeScope, 'sticky')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>Nueva nota</span>
          </button>
        </div>
      </div>

      {/* Pestañas: Notas compartidas / Notas privadas + Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className={`inline-flex p-1 rounded-xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200/80'
          }`}>
            <button
              type="button"
              onClick={() => setActiveScope('shared')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeScope === 'shared'
                  ? (isDarkMode ? 'bg-slate-800 text-white shadow-2xs' : 'bg-white text-slate-900 shadow-2xs')
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <UsersIcon size={14} />
              <span>Notas compartidas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveScope('private')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeScope === 'private'
                  ? (isDarkMode ? 'bg-slate-800 text-white shadow-2xs' : 'bg-white text-slate-900 shadow-2xs')
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <UserIcon size={14} />
              <span>Notas privadas</span>
            </button>
          </div>

          {/* Selector de vista: Automático / Notas rápidas / Hojas completas */}
          <div className={`inline-flex p-1 rounded-xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200/80'
          }`}>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'all'
                  ? (isDarkMode ? 'bg-slate-800 text-white shadow-2xs' : 'bg-white text-slate-900 shadow-2xs')
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              Todo
            </button>
            <button
              type="button"
              onClick={() => setViewMode('sticky')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'sticky'
                  ? (isDarkMode ? 'bg-slate-800 text-white shadow-2xs' : 'bg-white text-slate-900 shadow-2xs')
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <Grid size={12} />
              <span>Notas rápidas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('sheet')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'sheet'
                  ? (isDarkMode ? 'bg-slate-800 text-white shadow-2xs' : 'bg-white text-slate-900 shadow-2xs')
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <FileText size={12} />
              <span>Hojas</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1 sm:justify-end">
          {activeScope === 'shared' && academicGroups.length > 0 && (
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border outline-none transition-all ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-700'
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

          <div className="relative flex-1 sm:flex-initial sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className={`w-full pl-8 pr-7 py-1.5 rounded-xl text-xs border outline-none transition-all ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500'
                  : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Listado de notas */}
      {visibleNotes.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center space-y-2 ${
          isDarkMode ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200/70 text-slate-500'
        }`}>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
            <NavNotebook size={22} />
          </div>
          <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {activeScope === 'shared' ? 'No hay notas compartidas aún' : 'No hay notas privadas aún'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleNotes.map((note) => {
            const canEdit = canUserEditNote(note, currentUserObj);
            const canDelete = canUserDeleteNote(note, currentUserObj);
            const canToggleLock = canUserToggleNoteLock(note, currentUserObj);
            const noteLinks = Array.isArray(note.links) ? note.links : [];
            const noteEntries = Array.isArray(note.entries) ? note.entries : [];
            const isThreadOpen = expandedThreadNoteId === note.id;
            const savedFormat = normalizeNoteFormat(note.noteFormat);
            const effectiveFormat = viewMode === 'all' ? savedFormat : viewMode;
            const isSheet = effectiveFormat === 'sheet';
            const noteSheetStyle = normalizeNoteSheetStyle(note.sheetStyle);

            return (
              <article
                key={note.id}
                className={`rounded-2xl border flex flex-col justify-between transition-all ${
                  isSheet
                    ? 'lg:col-span-2 overflow-hidden shadow-sm hover:shadow-md'
                    : 'p-5 shadow-2xs hover:shadow-sm'
                } ${getPaperThemeClasses(note.paperTheme)}`}
              >
                <div>
                  {/* Cabecera de la tarjeta / hoja */}
                  <div className={`flex items-start justify-between gap-2 ${
                    isSheet
                      ? `px-6 sm:px-10 py-3.5 border-b ${isDarkMode ? 'border-slate-800/80 bg-slate-950/30' : 'border-slate-200/70 bg-white/50'}`
                      : 'mb-2.5'
                  }`}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isSheet && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          isDarkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-500/10 text-blue-700'
                        }`}>
                          <FileText size={11} />
                          <span>Hoja completa</span>
                        </span>
                      )}

                      {note.isPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                          <Pin size={11} />
                          <span>Fijada</span>
                        </span>
                      )}

                      {note.scope === 'shared' && note.isLocked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          <Lock size={11} />
                          <span>{note.lockedByName || 'Con candado'}</span>
                        </span>
                      )}

                      {note.scope === 'shared' && note.targetGroupName && (
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200/70 text-slate-700'
                        }`}>
                          {note.targetGroupName}
                        </span>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveSheetNoteId(note.id)}
                        title="Abrir hoja en pantalla completa"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer"
                      >
                        <Maximize2 size={13} />
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleToggleNoteFormat(note)}
                          title={savedFormat === 'sheet' ? 'Cambiar a nota rápida' : 'Cambiar a hoja completa'}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            savedFormat === 'sheet'
                              ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                          }`}
                        >
                          <FileText size={13} />
                        </button>
                      )}

                      {note.scope === 'shared' && (
                        <button
                          type="button"
                          onClick={() => handleToggleLockOnCard(note)}
                          disabled={!canToggleLock}
                          title={
                            note.isLocked
                              ? (canToggleLock ? 'Quitar candado' : `Bloqueada por ${note.lockedByName || 'otro usuario'}`)
                              : 'Poner candado'
                          }
                          className={`p-1.5 rounded-lg border text-xs transition-all ${
                            note.isLocked
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                              : (isDarkMode ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-slate-200 text-slate-500 hover:text-slate-800')
                          } ${!canToggleLock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {note.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                        </button>
                      )}

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleTogglePin(note)}
                          title={note.isPinned ? 'Desfijar' : 'Fijar'}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            note.isPinned
                              ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                          }`}
                        >
                          <Pin size={13} />
                        </button>
                      )}

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditNote(note)}
                          title="Editar"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer"
                        >
                          <Edit3 size={13} />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setNotePendingDelete(note)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cuerpo de la nota / Hoja completa */}
                  <div
                    style={isSheet ? getSheetRulingStyle(noteSheetStyle) : undefined}
                    className={
                      isSheet
                        ? `px-6 sm:px-10 py-6 sm:py-8 min-h-[220px] relative ${
                            noteSheetStyle === 'lined'
                              ? (isDarkMode ? 'border-l-2 border-rose-500/20 sm:ml-6' : 'border-l-2 border-rose-400/30 sm:ml-6')
                              : ''
                          }`
                        : ''
                    }
                  >
                    {/* Título */}
                    <h2
                      style={getFontFamilyStyle(note.fontFamily)}
                      className={`font-bold tracking-tight ${
                        isSheet
                          ? 'text-lg sm:text-xl pb-2.5 mb-3.5 border-b border-slate-200/70 dark:border-slate-800/80'
                          : 'text-base mb-2'
                      } ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}
                    >
                      {note.title}
                    </h2>

                    {/* Cuerpo */}
                    {note.content && (
                      <div
                        style={getFontFamilyStyle(note.fontFamily)}
                        className={`prose prose-sm max-w-none break-words mb-3 ${getFontSizeClass(note.fontSize)} ${
                          isDarkMode ? 'text-slate-200 prose-invert' : 'text-slate-700'
                        } [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-blue-600 [&_a]:underline`}
                        dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(note.content) }}
                      />
                    )}

                    {/* Enlaces adjuntos */}
                    {noteLinks.length > 0 && (
                      <div className="space-y-2.5 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80">
                        {noteLinks.map((item) => {
                          const canConvertImg = isLikelyImageLink(item);
                          const canConvertYt = Boolean(item.youtubeId);

                          return (
                            <div
                              key={item.id}
                              className={`rounded-xl border p-2.5 transition-all ${
                                isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white/80 border-slate-200/80'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate"
                                >
                                  {item.renderMode === 'youtube' ? (
                                    <MonitorPlay size={13} className="text-rose-500 shrink-0" />
                                  ) : item.renderMode === 'image' ? (
                                    <ImageIcon size={13} className="text-emerald-500 shrink-0" />
                                  ) : (
                                    <Globe size={13} className="text-blue-500 shrink-0" />
                                  )}
                                  <span className="truncate">{item.label || item.url}</span>
                                </a>

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
                                      ? (canConvertYt ? 'Ver video' : 'Ver imagen')
                                      : 'Ver enlace'}
                                  </button>
                                )}
                              </div>

                              {item.renderMode === 'youtube' && item.youtubeId && (
                                <div className="rounded-lg overflow-hidden mt-2">
                                  <CustomVideoPlayer
                                    url={item.url}
                                    videoId={item.youtubeId}
                                    title={item.label || 'Video'}
                                    isDarkMode={isDarkMode}
                                  />
                                </div>
                              )}

                              {item.renderMode === 'image' && (
                                <div className="rounded-lg overflow-hidden mt-2 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800">
                                  <img
                                    src={item.url}
                                    alt={item.label || 'Imagen'}
                                    loading="lazy"
                                    className={`w-full ${isSheet ? 'max-h-96' : 'max-h-64'} object-contain mx-auto`}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Apuntes en notas compartidas */}
                    {note.scope === 'shared' && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80">
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
                            <MessageSquareText size={13} />
                            <span>
                              {noteEntries.length > 0
                                ? `Apuntes (${noteEntries.length})`
                                : 'Agregar apunte'}
                            </span>
                          </button>
                        </div>

                        {(isThreadOpen || noteEntries.length > 0) && (
                          <div className="mt-2.5 space-y-2">
                            {noteEntries.map((entry) => {
                              const canDeleteEntry = canUserDeleteNote(entry, currentUserObj);
                              const canToggleEntryLock = canUserToggleNoteLock(entry, currentUserObj);

                              return (
                                <div
                                  key={entry.id}
                                  className={`rounded-xl p-2.5 border text-xs transition-all ${
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
                                        <Lock size={10} className="text-emerald-500" />
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                      {canToggleEntryLock && (
                                        <button
                                          type="button"
                                          onClick={() => handleToggleThreadEntryLock(note, entry.id)}
                                          title={entry.isLocked ? 'Quitar candado' : 'Poner candado'}
                                          className="p-1 rounded-lg text-slate-400 hover:text-emerald-500 cursor-pointer"
                                        >
                                          {entry.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                        </button>
                                      )}
                                      {canDeleteEntry && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteThreadEntry(note, entry.id)}
                                          title="Eliminar"
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
                                              ? (entry.link.youtubeId ? 'Ver video' : 'Ver imagen')
                                              : 'Ver enlace'}
                                          </button>
                                        </div>
                                      )}
                                      {entry.link.renderMode === 'youtube' && entry.link.youtubeId ? (
                                        <div className="rounded-lg overflow-hidden mt-1">
                                          <CustomVideoPlayer
                                            url={entry.link.url}
                                            videoId={entry.link.youtubeId}
                                            title={entry.link.label || 'Video'}
                                            isDarkMode={isDarkMode}
                                          />
                                        </div>
                                      ) : entry.link.renderMode === 'image' ? (
                                        <img
                                          src={entry.link.url}
                                          alt={entry.link.label || 'Imagen'}
                                          className="mt-1 rounded-lg max-h-48 object-contain"
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
                              <div className={`rounded-xl p-2.5 border space-y-2 ${
                                isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                              }`}>
                                <textarea
                                  rows={2}
                                  value={threadEntryText}
                                  onChange={(e) => setThreadEntryText(e.target.value)}
                                  placeholder="Escribir apunte..."
                                  className={`w-full text-xs p-2 rounded-lg border outline-none resize-none ${
                                    isDarkMode
                                      ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500'
                                      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                                  }`}
                                />
                                <input
                                  type="url"
                                  value={threadEntryLinkUrl}
                                  onChange={(e) => setThreadEntryLinkUrl(e.target.value)}
                                  placeholder="Enlace https://... (opcional)"
                                  className={`w-full text-[11px] px-2.5 py-1.5 rounded-lg border outline-none ${
                                    isDarkMode
                                      ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
                                      : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400'
                                  }`}
                                />
                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                  <label className="inline-flex items-center gap-1.5 text-[11px] font-medium cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={threadEntryLock}
                                      onChange={(e) => setThreadEntryLock(e.target.checked)}
                                      className="rounded text-blue-600"
                                    />
                                    <Lock size={11} className="text-emerald-500" />
                                    <span>Poner candado</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleAddThreadEntry(note)}
                                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer"
                                  >
                                    Guardar
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
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-0.5 cursor-pointer"
                              >
                                <Plus size={12} />
                                <span>Agregar apunte</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pie de la tarjeta / hoja */}
                <div className={`flex items-center justify-between text-[11px] text-slate-400 ${
                  isSheet
                    ? `px-6 sm:px-10 py-3 border-t ${isDarkMode ? 'border-slate-800/80 bg-slate-950/30' : 'border-slate-200/60 bg-white/50'}`
                    : 'mt-4 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/60'
                }`}>
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
          MODAL COMPOSITOR / EDITOR DE NOTA
      ======================================================================== */}
      {isComposerOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full ${noteFormat === 'sheet' ? 'max-w-4xl' : 'max-w-2xl'} max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Cabecera del Editor */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {noteFormat === 'sheet' ? (
                  <FileText size={16} className="text-blue-500" />
                ) : (
                  <NavNotebook size={16} className="text-blue-500" />
                )}
                <h3 className="text-sm font-bold">
                  {editingNote
                    ? (noteFormat === 'sheet' ? 'Editar hoja completa' : 'Editar nota')
                    : (noteFormat === 'sheet' ? 'Nueva hoja completa' : 'Nueva nota')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Cuerpo scrollable */}
            <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
              {/* Selector: Notas compartidas vs Notas privadas + Formato (Nota rápida / Hoja completa) + Grupo */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className={`inline-flex p-1 rounded-xl border ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setScope('shared')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        scope === 'shared'
                          ? (isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 shadow-2xs')
                          : 'text-slate-500'
                      }`}
                    >
                      <UsersIcon size={13} />
                      <span>Notas compartidas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope('private')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        scope === 'private'
                          ? (isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 shadow-2xs')
                          : 'text-slate-500'
                      }`}
                    >
                      <UserIcon size={13} />
                      <span>Notas privadas</span>
                    </button>
                  </div>

                  {/* Selector de Formato: Nota rápida vs Hoja completa */}
                  <div className={`inline-flex p-1 rounded-xl border ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    {NOTE_FORMATS.map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setNoteFormat(fmt.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          noteFormat === fmt.id
                            ? (isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 shadow-2xs')
                            : 'text-slate-500'
                        }`}
                      >
                        {fmt.id === 'sheet' ? <FileText size={13} /> : <Grid size={13} />}
                        <span>{fmt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {scope === 'shared' && academicGroups.length > 0 && (
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
                )}
              </div>

              {/* Título */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título"
                style={getFontFamilyStyle(fontFamily)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm sm:text-base font-bold border outline-none transition-all ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500'
                    : 'bg-slate-50/70 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                }`}
              />

              {/* Barra de herramientas */}
              <div className={`rounded-xl border p-2 space-y-2 ${
                isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="flex items-center gap-1">
                    <Type size={13} className="text-slate-400 ml-1" />
                    <select
                      value={fontFamily}
                      onChange={(e) => {
                        const nextFam = e.target.value;
                        setFontFamily(nextFam);
                        const found = NOTE_FONT_FAMILIES.find((f) => f.id === nextFam);
                        if (found) execFormat('fontName', found.css);
                      }}
                      title="Fuente"
                      className={`px-2 py-1 rounded-lg text-xs font-semibold border outline-none cursor-pointer ${
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

                  <select
                    value={fontSize}
                    onChange={(e) => {
                      const nextSize = e.target.value;
                      setFontSize(nextSize);
                      const found = NOTE_FONT_SIZES.find((s) => s.id === nextSize);
                      if (found) execFormat('fontSize', found.execValue);
                    }}
                    title="Tamaño"
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border outline-none cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-800 text-slate-200'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    {NOTE_FONT_SIZES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>

                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

                  <button
                    type="button"
                    onClick={() => execFormat('bold')}
                    title="Negrita"
                    className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Bold size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('italic')}
                    title="Cursiva"
                    className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Italic size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('underline')}
                    title="Subrayado"
                    className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Underline size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('strikeThrough')}
                    title="Tachado"
                    className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Strikethrough size={14} />
                  </button>

                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

                  {/* Color de texto */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowColorMenu(!showColorMenu);
                        setShowHighlightMenu(false);
                      }}
                      title="Color de letra"
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-200'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <Palette size={13} className="text-blue-500" />
                    </button>
                    {showColorMenu && (
                      <div className={`absolute left-0 top-full mt-1.5 z-20 p-2 rounded-xl border shadow-xl flex items-center gap-1.5 ${
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
                            className="w-5 h-5 rounded-full border border-white/40 shadow-2xs hover:scale-110 transition-transform cursor-pointer"
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
                      title="Resaltar"
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-200'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <Highlighter size={13} className="text-amber-500" />
                    </button>
                    {showHighlightMenu && (
                      <div className={`absolute left-0 top-full mt-1.5 z-20 p-2 rounded-xl border shadow-xl flex items-center gap-1.5 ${
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
                            className="w-5 h-5 rounded-full border border-slate-300 shadow-2xs hover:scale-110 transition-transform cursor-pointer"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

                  <button
                    type="button"
                    onClick={() => execFormat('insertUnorderedList')}
                    title="Viñetas"
                    className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <List size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('insertOrderedList')}
                    title="Lista numerada"
                    className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ListOrdered size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('formatBlock', 'blockquote')}
                    title="Cita"
                    className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Quote size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('formatBlock', 'h3')}
                    title="Subtítulo"
                    className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Heading size={14} />
                  </button>

                  {/* Botón Enlace */}
                  <button
                    type="button"
                    onClick={() => setShowLinkInput(!showLinkInput)}
                    className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      showLinkInput
                        ? 'bg-blue-600 text-white border-blue-600'
                        : (isDarkMode ? 'bg-slate-900 border-slate-700 text-blue-400' : 'bg-white border-blue-200 text-blue-600')
                    }`}
                  >
                    <Globe size={13} />
                    <span>Enlace</span>
                  </button>
                </div>

                {/* Panel desplegable de Enlace */}
                {showLinkInput && (
                  <div className={`p-3 rounded-xl border space-y-2.5 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="url"
                        value={linkUrlInput}
                        onChange={(e) => setLinkUrlInput(e.target.value)}
                        placeholder="https://... (imagen, YouTube o web)"
                        className={`px-3 py-1.5 rounded-lg text-xs border outline-none ${
                          isDarkMode
                            ? 'bg-slate-950 border-slate-800 text-slate-100'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                      <input
                        type="text"
                        value={linkLabelInput}
                        onChange={(e) => setLinkLabelInput(e.target.value)}
                        placeholder="Título (opcional)"
                        className={`px-3 py-1.5 rounded-lg text-xs border outline-none ${
                          isDarkMode
                            ? 'bg-slate-950 border-slate-800 text-slate-100'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setLinkRenderPreference('auto')}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                            linkRenderPreference === 'auto'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : (isDarkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600')
                          }`}
                        >
                          Automático
                        </button>
                        <button
                          type="button"
                          onClick={() => setLinkRenderPreference('image')}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                            linkRenderPreference === 'image'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : (isDarkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600')
                          }`}
                        >
                          <ImageIcon size={11} />
                          <span>Imagen</span>
                        </button>
                        {liveLinkPreview?.youtubeId && (
                          <button
                            type="button"
                            onClick={() => setLinkRenderPreference('youtube')}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                              linkRenderPreference === 'youtube'
                                ? 'bg-rose-600 text-white border-rose-600'
                                : (isDarkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600')
                            }`}
                          >
                            <MonitorPlay size={11} />
                            <span>YouTube</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setLinkRenderPreference('link')}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                            linkRenderPreference === 'link'
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : (isDarkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600')
                          }`}
                        >
                          <Globe size={11} />
                          <span>Enlace</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddSmartLink}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Área de escritura */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onKeyUp={saveEditorSelection}
                onMouseUp={saveEditorSelection}
                onBlur={saveEditorSelection}
                onPaste={handleEditorPaste}
                onDrop={handleEditorDrop}
                style={{
                  ...getFontFamilyStyle(fontFamily),
                  ...(noteFormat === 'sheet' ? getSheetRulingStyle(sheetStyle) : {})
                }}
                data-placeholder="Escribe aquí..."
                className={`${
                  noteFormat === 'sheet'
                    ? 'min-h-[320px] sm:min-h-[380px] px-6 sm:px-10 py-6 shadow-inner'
                    : 'min-h-[200px] p-3.5'
                } rounded-xl border outline-none transition-all prose prose-sm max-w-none ${getFontSizeClass(fontSize)} ${getPaperThemeClasses(paperTheme)} ${
                  isDarkMode
                    ? 'text-slate-100 focus:border-blue-500'
                    : 'text-slate-800 focus:border-blue-500'
                } empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500/50 [&_blockquote]:pl-3 [&_blockquote]:italic`}
              />

              {/* Enlaces añadidos en el editor */}
              {links.length > 0 && (
                <div className="space-y-1.5">
                  {links.map((item) => (
                    <div
                      key={item.id}
                      className={`flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl border text-xs ${
                        isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate max-w-md">
                        {item.renderMode === 'youtube' ? (
                          <MonitorPlay size={13} className="text-rose-500 shrink-0" />
                        ) : item.renderMode === 'image' ? (
                          <ImageIcon size={13} className="text-emerald-500 shrink-0" />
                        ) : (
                          <Globe size={13} className="text-blue-500 shrink-0" />
                        )}
                        <span className="font-semibold truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleLinkRenderMode(null, item.id, true)}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                            isDarkMode
                              ? 'border-slate-700 bg-slate-800 text-slate-200'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          {item.renderMode === 'youtube' ? 'Video' : item.renderMode === 'image' ? 'Imagen' : 'Enlace'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLinks((prev) => prev.filter((l) => l.id !== item.id))}
                          className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                          title="Quitar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Color de hoja, Renglonado (para Hoja completa) y Candado */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {NOTE_PAPER_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setPaperTheme(theme.id)}
                        title={theme.label}
                        className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${theme.dot} ${
                          paperTheme === theme.id ? 'ring-2 ring-blue-500 scale-110' : ''
                        }`}
                      />
                    ))}
                  </div>

                  {noteFormat === 'sheet' && (
                    <div className={`inline-flex p-0.5 rounded-xl border ${
                      isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                    }`}>
                      {NOTE_SHEET_STYLES.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setSheetStyle(st.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            sheetStyle === st.id
                              ? (isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 shadow-2xs')
                              : 'text-slate-500'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {scope === 'shared' && (
                  <label
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all ${
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
                    {isLockedOnSave ? <Lock size={13} /> : <Unlock size={13} />}
                    <span>Poner candado</span>
                  </label>
                )}
              </div>
            </div>

            {/* Pie del Modal Editor */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
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
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Guardar</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================
          MODAL EXCLUSIVO DEL DOCENTE: "ÚLTIMOS CAMBIOS"
      ======================================================================== */}
      {isTeacher && isAuditModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-slate-950/65 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Shield size={17} className="text-amber-500" />
                <h3 className="text-sm font-bold">Últimos cambios</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-2.5 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-400">
                Nota:
              </span>
              <select
                value={selectedAuditNoteFilter}
                onChange={(e) => setSelectedAuditNoteFilter(e.target.value)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border outline-none ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <option value="ALL">Todas</option>
                {(Array.isArray(notes) ? notes : [])
                  .filter((n) => n && n.scope !== 'private')
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title} {n.isSoftDeleted ? '(Eliminada)' : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
              {teacherAuditFeed.filter(
                (item) => selectedAuditNoteFilter === 'ALL' || String(item.noteId) === String(selectedAuditNoteFilter)
              ).length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  Sin cambios registrados
                </div>
              ) : (
                teacherAuditFeed
                  .filter(
                    (item) => selectedAuditNoteFilter === 'ALL' || String(item.noteId) === String(selectedAuditNoteFilter)
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-3.5 space-y-2 ${
                        isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold">{item.actorName}</span>
                          <span className="text-[11px] text-slate-400">@{item.actorId}</span>
                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                            • {item.summary}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {item.noteTitle}
                        {item.isNoteSoftDeleted && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-500">
                            Eliminada
                          </span>
                        )}
                      </div>

                      {(item.previousTextPreview || item.newTextPreview) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                          {item.previousTextPreview && (
                            <div className={`p-2 rounded-lg border ${
                              isDarkMode ? 'bg-rose-950/20 border-rose-900/40 text-rose-200' : 'bg-rose-50/70 border-rose-200 text-rose-900'
                            }`}>
                              <div className="text-[10px] font-bold opacity-75 mb-0.5">
                                Antes:
                              </div>
                              <p className="line-clamp-3 whitespace-pre-wrap">{item.previousTextPreview}</p>
                            </div>
                          )}
                          {item.newTextPreview && (
                            <div className={`p-2 rounded-lg border ${
                              isDarkMode ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200' : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            }`}>
                              <div className="text-[10px] font-bold opacity-75 mb-0.5">
                                Después:
                              </div>
                              <p className="line-clamp-3 whitespace-pre-wrap">{item.newTextPreview}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {((Array.isArray(item.previousLinks) && item.previousLinks.length > 0) || (Array.isArray(item.newLinks) && item.newLinks.length > 0)) && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Enlaces: {Array.isArray(item.previousLinks) ? item.previousLinks.length : 0} → {Array.isArray(item.newLinks) ? item.newLinks.length : 0}
                        </div>
                      )}
                      {(item.action === 'edit' || item.action === 'soft_delete' || item.action === 'delete_block') && (typeof item.previousContent === 'string' || Array.isArray(item.previousLinks)) && (
                        <div className="flex items-center justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleTeacherRestoreAuditVersion(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer"
                          >
                            <RotateCcw size={12} />
                            <span>Restaurar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================
          MODAL DE CONFIRMACIÓN DE BORRADO
      ======================================================================== */}
      {notePendingDelete && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold">¿Eliminar nota?</h3>
                <p className="text-xs text-slate-400 truncate">
                  {notePendingDelete.title}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setNotePendingDelete(null)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                  isDarkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteNote}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================
          MODAL LECTOR DE HOJA COMPLETA PROFESIONAL
      ======================================================================== */}
      {activeSheetNote && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-slate-950/65 backdrop-blur-sm animate-fade-in"
          onClick={() => setActiveSheetNoteId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${getPaperThemeClasses(activeSheetNote.paperTheme)}`}
          >
            {/* Barra superior de la Hoja */}
            <div className={`flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 border-b ${
              isDarkMode ? 'border-slate-800 bg-slate-950/60 text-slate-100' : 'border-slate-200/80 bg-white/80 text-slate-900'
            }`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                  isDarkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-500/10 text-blue-700'
                }`}>
                  <FileText size={13} />
                  <span>Hoja completa</span>
                </span>
                {activeSheetNote.scope === 'shared' && activeSheetNote.targetGroupName && (
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200/70 text-slate-700'
                  }`}>
                    {activeSheetNote.targetGroupName}
                  </span>
                )}
                {activeSheetNote.scope === 'shared' && activeSheetNote.isLocked && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    <Lock size={12} />
                    <span>{activeSheetNote.lockedByName || 'Con candado'}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {canUserEditNote(activeSheetNote, currentUserObj) && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeSheetNote;
                      setActiveSheetNoteId(null);
                      handleOpenEditNote(target);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Edit3 size={13} />
                    <span>Editar</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveSheetNoteId(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Cuerpo de página profesional */}
            <div
              style={getSheetRulingStyle(activeSheetNote.sheetStyle)}
              className="flex-1 overflow-y-auto px-6 sm:px-14 py-8 sm:py-10 space-y-5"
            >
              <div className="border-b border-slate-200/80 dark:border-slate-800 pb-4 space-y-1.5">
                <h1
                  style={getFontFamilyStyle(activeSheetNote.fontFamily)}
                  className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {activeSheetNote.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {activeSheetNote.authorName || 'Usuario'}
                  </span>
                  {activeSheetNote.authorRole === 'teacher' && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      Docente
                    </span>
                  )}
                  <span>•</span>
                  <span>{formatRelativeTime(activeSheetNote.updatedAt || activeSheetNote.createdAt)}</span>
                </div>
              </div>

              {activeSheetNote.content && (
                <div
                  style={getFontFamilyStyle(activeSheetNote.fontFamily)}
                  className={`prose prose-sm sm:prose-base max-w-none break-words ${getFontSizeClass(activeSheetNote.fontSize)} ${
                    isDarkMode ? 'text-slate-100 prose-invert' : 'text-slate-800'
                  } [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-blue-600 [&_a]:underline`}
                  dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(activeSheetNote.content) }}
                />
              )}

              {Array.isArray(activeSheetNote.links) && activeSheetNote.links.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200/70 dark:border-slate-800">
                  {activeSheetNote.links.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-3 ${
                        isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white/85 border-slate-200/80'
                      }`}
                    >
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Globe size={13} />
                        <span>{item.label || item.url}</span>
                      </a>
                      {item.renderMode === 'youtube' && item.youtubeId && (
                        <div className="rounded-lg overflow-hidden mt-2">
                          <CustomVideoPlayer
                            url={item.url}
                            videoId={item.youtubeId}
                            title={item.label || 'Video'}
                            isDarkMode={isDarkMode}
                          />
                        </div>
                      )}
                      {item.renderMode === 'image' && (
                        <div className="rounded-lg overflow-hidden mt-2 bg-slate-100 dark:bg-slate-900">
                          <img
                            src={item.url}
                            alt={item.label || 'Imagen'}
                            className="w-full max-h-[420px] object-contain mx-auto"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
