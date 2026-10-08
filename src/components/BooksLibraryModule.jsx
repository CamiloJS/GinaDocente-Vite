import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    BookOpen,
    Book,
    Plus,
    Trash2,
    Edit3,
    Search,
    UploadCloud,
    Download,
    Loader2,
    Sparkles,
    Eye,
    X,
    CheckCircle2
} from './Icons';
import {
    BOOK_THEMES,
    BOOK_CATEGORIES,
    getBookTheme,
    renderPdfToBookPages,
    uploadBookPagesToStorage,
    sanitizeBookForFirestore,
    filterBooksCatalog,
    buildFallbackBookPages
} from '../utils/flipbookEngine';
import {
    db,
    appId,
    doc,
    setDoc,
    deleteDoc
} from '../firebase/config.js';
import {
    generateId,
    getCanonicalTeacherId,
    getItemTeacherId,
    getTeacherDisplayName,
    handleForceDownload,
    uploadImageToStorage as defaultUploadImageToStorage,
    uploadRawFileToStorage as defaultUploadRawFileToStorage
} from '../utils/helpers';
import {
    saveDemoSandboxItem,
    deleteDemoSandboxItem
} from '../utils/demoData';
import Flipbook3DModal from './Flipbook3DModal';

const withTimeout = (promise, ms = 12000) =>
    Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms))
    ]);

export default function BooksLibraryModule({
    user,
    role,
    isTeacher: isTeacherProp,
    loggedInName,
    myChatId,
    books = [],
    setBooks,
    setRawBooks,
    tasks = [],
    setTasks,
    academicGroups = [],
    studentGroups = [],
    currentStudentGroup = null,
    db: dbProp,
    appId: appIdProp,
    isDemoMode = false,
    showMessage,
    showAlert,
    confirmAction,
    showConfirm,
    uploadImageToStorage: uploadImgProp,
    uploadRawFileToStorage: uploadRawProp,
    initialEditingBook = null,
    onClearInitialEditingBook
}) {
    const isTeacher = typeof isTeacherProp === 'boolean' ? isTeacherProp : role === 'teacher';
    const effectiveSetBooks = setRawBooks || setBooks;
    const effectiveDb = dbProp || db;
    const effectiveAppId = appIdProp || appId;
    const uploadImageFn = uploadImgProp || defaultUploadImageToStorage;
    const uploadRawFileFn = uploadRawProp || defaultUploadRawFileToStorage;

    const effectiveGroups = useMemo(() => {
        if (Array.isArray(academicGroups) && academicGroups.length > 0) return academicGroups;
        if (Array.isArray(studentGroups) && studentGroups.length > 0) return studentGroups;
        return [];
    }, [academicGroups, studentGroups]);

    const notify = useCallback(
        (titleOrMsg, detailMsg, type = 'info') => {
            if (typeof showMessage === 'function') {
                showMessage(detailMsg ? `${titleOrMsg}: ${detailMsg}` : titleOrMsg);
            } else if (typeof showAlert === 'function') {
                showAlert(titleOrMsg, detailMsg || titleOrMsg, type);
            }
        },
        [showMessage, showAlert]
    );

    const requestConfirm = useCallback(
        (title, message, onConfirm) => {
            if (typeof confirmAction === 'function') {
                confirmAction(message || title, onConfirm);
            } else if (typeof showConfirm === 'function') {
                showConfirm(title, message, onConfirm, 'danger');
            } else if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                if (window.confirm(message || title)) {
                    onConfirm();
                }
            } else {
                onConfirm();
            }
        },
        [confirmAction, showConfirm]
    );

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [activeBookModal, setActiveBookModal] = useState(null);

    // Teacher Studio Modal / Form state
    const [isCreating, setIsCreating] = useState(false);
    const [editingBookId, setEditingBookId] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('textbook');
    const [theme, setTheme] = useState('royal-indigo');
    const [targetGroupId, setTargetGroupId] = useState('all');
    const [pdfFile, setPdfFile] = useState(null);
    const [existingPdfUrl, setExistingPdfUrl] = useState('');
    const [existingFileName, setExistingFileName] = useState('');
    const [previewPages, setPreviewPages] = useState([]);
    const [previewPageTexts, setPreviewPageTexts] = useState([]);
    const [aspectRatio, setAspectRatio] = useState(0.707);
    const [isProcessingPdf, setIsProcessingPdf] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [progressInfo, setProgressInfo] = useState({ phase: '', currentPage: 0, totalPages: 0, percent: 0 });

    const fileInputRef = useRef(null);

    const canonicalTeacherId = useMemo(
        () => getCanonicalTeacherId(myChatId || loggedInName || user?.displayName || user?.email),
        [myChatId, loggedInName, user]
    );

    // Teacher's own academic groups for assignment selector
    const teacherOwnedGroups = useMemo(() => {
        if (!isTeacher) return effectiveGroups;
        return effectiveGroups.filter((g) => {
            if (!g) return false;
            if (isDemoMode || g.isDemoCreated || String(g.id || '').startsWith('demo')) return true;
            return getItemTeacherId(g) === canonicalTeacherId;
        });
    }, [effectiveGroups, isTeacher, isDemoMode, canonicalTeacherId]);

    // Student's enrolled academic groups & teachers for strict isolation
    const myEnrolledGroups = useMemo(() => {
        if (isTeacher) return [];
        return effectiveGroups.filter((g) => {
            if (!g) return false;
            if (isDemoMode || String(g.id || '').startsWith('demo_') || String(g.id || '').startsWith('demo-')) {
                return true;
            }
            if (currentStudentGroup && String(g.id) === String(currentStudentGroup.id)) {
                return true;
            }
            const membersList = Array.isArray(g.members)
                ? g.members
                : g.members && typeof g.members === 'object'
                ? Object.keys(g.members)
                : [];
            if (membersList.length === 0) return false;
            const cleanMyId = (myChatId || '').toLowerCase().replace('@', '').trim();
            const cleanUid = (user?.uid || '').toLowerCase().trim();
            const cleanEmail = (user?.email || '').toLowerCase().trim();
            const cleanPrefix = (user?.email ? user.email.split('@')[0] : '').toLowerCase().trim();
            return membersList.some((m) => {
                if (!m) return false;
                const cleanM = String(m).toLowerCase().replace('@', '').trim();
                return (
                    (cleanMyId && cleanM === cleanMyId) ||
                    (cleanUid && cleanM === cleanUid) ||
                    (cleanEmail && cleanM === cleanEmail) ||
                    (cleanPrefix && cleanM === cleanPrefix)
                );
            });
        });
    }, [effectiveGroups, isTeacher, isDemoMode, currentStudentGroup, myChatId, user]);

    const myEnrolledTeacherIds = useMemo(
        () => new Set(myEnrolledGroups.map((g) => getItemTeacherId(g))),
        [myEnrolledGroups]
    );

    const accessibleBooks = useMemo(() => {
        return (books || []).filter((bk) => {
            if (!bk) return false;
            if (
                isDemoMode ||
                bk.isDemoCreated ||
                String(bk.id || '').startsWith('demo-') ||
                String(bk.id || '').startsWith('demo_')
            ) {
                return true;
            }

            if (isTeacher) {
                const ownerId = getItemTeacherId(bk);
                return ownerId === canonicalTeacherId;
            }

            const bGrpId = String(bk.targetGroupId || '').trim();
            const bGrpName = String(bk.targetGroupName || '').toLowerCase().trim();
            const bookTeacherId = getItemTeacherId(bk);
            const isGeneric =
                (!bGrpId || bGrpId === 'all') &&
                (!bGrpName ||
                    bGrpName === 'global' ||
                    bGrpName === 'general' ||
                    bGrpName === 'todos' ||
                    bGrpName === 'todos los estudiantes');

            if (isGeneric) {
                if (currentStudentGroup) {
                    return getItemTeacherId(currentStudentGroup) === bookTeacherId;
                }
                return myEnrolledTeacherIds.size === 0
                    ? bookTeacherId === 'teacher'
                    : myEnrolledTeacherIds.has(bookTeacherId);
            }

            if (currentStudentGroup && String(currentStudentGroup.id) === bGrpId) {
                return true;
            }
            if (myEnrolledGroups.length === 0) return false;
            return myEnrolledGroups.some(
                (g) =>
                    String(g.id) === bGrpId ||
                    `acad_${g.id}` === bGrpId ||
                    (bGrpName &&
                        (g.name || '').toLowerCase().trim() === bGrpName &&
                        getItemTeacherId(g) === bookTeacherId)
            );
        });
    }, [books, isTeacher, isDemoMode, canonicalTeacherId, currentStudentGroup, myEnrolledGroups, myEnrolledTeacherIds]);

    const visibleBooks = useMemo(() => {
        const filtered = filterBooksCatalog(accessibleBooks, {
            query: searchQuery,
            category: selectedCategory
        });

        return [...filtered].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }, [accessibleBooks, searchQuery, selectedCategory]);

    const resetForm = useCallback(() => {
        setEditingBookId(null);
        setTitle('');
        setDescription('');
        setCategory('textbook');
        setTheme('royal-indigo');
        setTargetGroupId('all');
        setPdfFile(null);
        setExistingPdfUrl('');
        setExistingFileName('');
        setPreviewPages([]);
        setPreviewPageTexts([]);
        setAspectRatio(0.707);
        setIsProcessingPdf(false);
        setIsSaving(false);
        setProgressInfo({ phase: '', currentPage: 0, totalPages: 0, percent: 0 });
    }, []);

    const handleOpenCreate = () => {
        resetForm();
        setIsCreating(true);
    };

    const handleOpenEdit = useCallback((bookItem) => {
        if (!bookItem) return;
        setActiveBookModal(null);
        setEditingBookId(bookItem.id);
        setTitle(bookItem.title || '');
        setDescription(bookItem.description || '');
        setCategory(bookItem.category || bookItem.bookCategory || 'textbook');
        setTheme(bookItem.theme || bookItem.bookTheme || 'royal-indigo');
        setTargetGroupId(bookItem.targetGroupId || 'all');
        setPdfFile(null);
        setExistingPdfUrl(bookItem.pdfUrl || bookItem.fileUrl || '');
        setExistingFileName(bookItem.fileName || bookItem.pdfFileName || '');
        setPreviewPages(Array.isArray(bookItem.bookPages) ? bookItem.bookPages : []);
        setPreviewPageTexts(Array.isArray(bookItem.pageTexts) ? bookItem.pageTexts : []);
        setAspectRatio(bookItem.aspectRatio || 0.707);
        setIsCreating(true);
    }, []);

    // Support opening a specific book in edit mode when navigated from the Wall
    useEffect(() => {
        if (initialEditingBook && initialEditingBook.id) {
            if (isTeacher) {
                handleOpenEdit(initialEditingBook);
            } else {
                setActiveBookModal(initialEditingBook);
            }
            onClearInitialEditingBook?.();
        }
    }, [initialEditingBook, isTeacher, handleOpenEdit, onClearInitialEditingBook]);

    const handleSelectPdfFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
            notify('Archivo no válido', 'Por favor selecciona un documento en formato .PDF para convertirlo en Libro 3D.', 'error');
            return;
        }

        setPdfFile(file);
        setExistingFileName(file.name);
        if (!title.trim()) {
            const cleanName = file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();
            setTitle(cleanName);
        }

        setIsProcessingPdf(true);
        setProgressInfo({ phase: 'render', currentPage: 0, totalPages: 0, percent: 5 });

        try {
            const rendered = await renderPdfToBookPages(file, {
                maxPages: 60,
                scale: 1.6,
                maxDimension: 1350,
                quality: 0.82,
                onProgress: (prog) => setProgressInfo(prog)
            });

            if (Array.isArray(rendered.pages) && rendered.pages.length > 0) {
                setPreviewPages(rendered.pages);
                setPreviewPageTexts(rendered.pageTexts || []);
                setAspectRatio(rendered.aspectRatio || 0.707);
            }
        } catch (err) {
            console.error('Error procesando PDF para Libro 3D:', err);
            const fallback = buildFallbackBookPages({
                title: title || file.name.replace(/\.pdf$/i, ''),
                description,
                fileName: file.name,
                author: loggedInName || getTeacherDisplayName(canonicalTeacherId) || 'Docente',
                themeId: theme
            });
            setPreviewPages(fallback);
        } finally {
            setIsProcessingPdf(false);
        }
    };

    const handleSaveBook = async (e) => {
        e?.preventDefault?.();
        if (!title.trim()) {
            notify('Título requerido', 'Escribe un título para el Libro 3D antes de publicarlo.', 'warning');
            return;
        }
        if (previewPages.length === 0 && !pdfFile && !existingPdfUrl) {
            notify('Archivo PDF requerido', 'Sube un archivo PDF para generar las hojas interactivas del Libro 3D.', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            const bookId = editingBookId || `book_${generateId()}`;
            const now = Date.now();
            const existingRecord = (books || []).find((b) => String(b?.id) === String(bookId));
            const ownerTid = existingRecord ? getItemTeacherId(existingRecord) : canonicalTeacherId;
            const authorName = loggedInName || user?.displayName || getTeacherDisplayName(ownerTid) || 'Docente';

            let pagesToSave = previewPages;
            if (pagesToSave.length === 0) {
                pagesToSave = buildFallbackBookPages({
                    title: title.trim(),
                    description: description.trim(),
                    fileName: pdfFile?.name || existingFileName,
                    author: authorName,
                    themeId: theme
                });
            }

            // Upload rendered JPEG pages to Firebase Storage (in live mode)
            const uploadedPages = await uploadBookPagesToStorage(
                pagesToSave,
                uploadImageFn,
                {
                    isDemoMode,
                    folder: 'books',
                    onProgress: (prog) => setProgressInfo(prog)
                }
            );

            // Upload raw PDF file if a new one was selected
            let finalPdfUrl = existingPdfUrl;
            let finalFileName = existingFileName;
            if (pdfFile) {
                finalFileName = pdfFile.name;
                if (isDemoMode || typeof uploadRawFileFn !== 'function') {
                    finalPdfUrl = existingPdfUrl || '';
                } else {
                    try {
                        setProgressInfo({ phase: 'pdf', currentPage: 1, totalPages: 1, percent: 95 });
                        const uploadedUrl = await uploadRawFileFn(pdfFile, 'books');
                        if (uploadedUrl) finalPdfUrl = uploadedUrl;
                    } catch (uploadErr) {
                        console.warn('No se pudo subir el PDF original, se usarán las hojas renderizadas:', uploadErr);
                    }
                }
            }

            const resolvedGroupId = targetGroupId || 'all';
            const matchedGroup = effectiveGroups.find((g) => String(g?.id) === String(resolvedGroupId));
            const resolvedGroupName =
                resolvedGroupId === 'all' ? 'Global' : matchedGroup?.name || existingRecord?.targetGroupName || 'Grupo';

            const rawBookPayload = {
                id: bookId,
                title: title.trim(),
                description: description.trim(),
                category,
                theme,
                bookPages: uploadedPages,
                pages: uploadedPages,
                pageTexts: previewPageTexts,
                coverUrl: uploadedPages[0] || '',
                pageCount: uploadedPages.length,
                pdfUrl: finalPdfUrl || '',
                fileUrl: finalPdfUrl || '',
                fileName: finalFileName || `${title.trim()}.pdf`,
                pdfFileName: finalFileName || `${title.trim()}.pdf`,
                aspectRatio,
                targetGroupId: resolvedGroupId,
                targetGroupName: resolvedGroupName,
                author: authorName,
                authorName,
                authorId: ownerTid,
                createdBy: existingRecord?.createdBy || ownerTid,
                teacherId: ownerTid,
                ownerTeacherId: ownerTid,
                createdAt: existingRecord?.createdAt || now,
                updatedAt: now,
                isDemoCreated: Boolean(isDemoMode || existingRecord?.isDemoCreated)
            };

            const sanitizedBook = sanitizeBookForFirestore({
                ...rawBookPayload,
                targetGroupName: resolvedGroupName,
                author: authorName,
                authorId: ownerTid,
                ownerTeacherId: ownerTid,
                isDemoCreated: Boolean(isDemoMode || existingRecord?.isDemoCreated)
            });

            // Update local state immediately for snappy UX
            effectiveSetBooks?.((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                const exists = list.some((b) => String(b?.id) === String(bookId));
                return exists
                    ? list.map((b) => (String(b?.id) === String(bookId) ? sanitizedBook : b))
                    : [sanitizedBook, ...list];
            });

            const wallTaskId = `book_wall_${bookId}`;
            const existingWallTask = (tasks || []).find((t) => String(t?.id) === wallTaskId);
            const wallTaskPayload = {
                id: wallTaskId,
                type: 'book3d',
                bookId: bookId,
                title: sanitizedBook.title,
                description:
                    sanitizedBook.description ||
                    `📚 Libro 3D interactivo (${sanitizedBook.pageCount} páginas). Haz clic en "Abrir Libro 3D" para pasar las hojas en 3D.`,
                category: sanitizedBook.category,
                bookCategory: sanitizedBook.category,
                theme: sanitizedBook.theme,
                bookTheme: sanitizedBook.theme,
                bookPages: sanitizedBook.bookPages,
                coverUrl: sanitizedBook.coverUrl,
                pageCount: sanitizedBook.pageCount,
                pdfUrl: sanitizedBook.pdfUrl,
                fileUrl: sanitizedBook.fileUrl,
                fileName: sanitizedBook.fileName,
                aspectRatio: sanitizedBook.aspectRatio,
                targetGroupId: sanitizedBook.targetGroupId || 'all',
                targetGroupName: resolvedGroupName,
                author: sanitizedBook.authorName,
                authorName: sanitizedBook.authorName,
                authorId: ownerTid,
                authorRole: 'teacher',
                createdBy: sanitizedBook.createdBy,
                teacherId: ownerTid,
                ownerTeacherId: ownerTid,
                createdAt: existingWallTask?.createdAt || sanitizedBook.createdAt,
                updatedAt: now,
                reactions: existingWallTask?.reactions || {},
                comments: existingWallTask?.comments || [],
                isDeletedFromWall: false,
                isDemoCreated: Boolean(isDemoMode || existingRecord?.isDemoCreated)
            };

            if (isDemoMode) {
                saveDemoSandboxItem('books', sanitizedBook);
                saveDemoSandboxItem('tasks', wallTaskPayload);
                setTasks?.((prev) => [
                    wallTaskPayload,
                    ...(Array.isArray(prev) ? prev.filter((t) => String(t?.id) !== wallTaskId) : [])
                ]);
            } else {
                await withTimeout(
                    setDoc(
                        doc(effectiveDb, 'artifacts', effectiveAppId, 'public', 'data', 'books', bookId),
                        sanitizedBook,
                        { merge: true }
                    )
                );
                await withTimeout(
                    setDoc(
                        doc(effectiveDb, 'artifacts', effectiveAppId, 'public', 'data', 'tasks', wallTaskId),
                        wallTaskPayload,
                        { merge: true }
                    )
                );
                setTasks?.((prev) => [
                    wallTaskPayload,
                    ...(Array.isArray(prev) ? prev.filter((t) => String(t?.id) !== wallTaskId) : [])
                ]);
            }

            notify('📚 El Libro 3D interactivo se ha publicado en la Biblioteca y en el Muro.');
            setIsCreating(false);
            resetForm();
        } catch (err) {
            console.error('Error guardando Libro 3D:', err);
            notify('Error al guardar', 'No se pudo publicar el Libro 3D. Intenta nuevamente.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteBook = (bookItem) => {
        if (!bookItem?.id) return;
        const performDelete = async () => {
            effectiveSetBooks?.((prev) =>
                Array.isArray(prev) ? prev.filter((b) => String(b?.id) !== String(bookItem.id)) : []
            );
            setTasks?.((prev) =>
                Array.isArray(prev)
                    ? prev.filter(
                          (t) =>
                              String(t?.id) !== `book_wall_${bookItem.id}` &&
                              String(t?.bookId) !== String(bookItem.id)
                      )
                    : []
            );
            if (isDemoMode || bookItem.isDemoCreated || String(bookItem.id).startsWith('demo')) {
                deleteDemoSandboxItem('books', bookItem.id);
                deleteDemoSandboxItem('tasks', `book_wall_${bookItem.id}`);
                notify('🗑️ Libro 3D eliminado de la Biblioteca y del Muro.');
                return;
            }
            try {
                await deleteDoc(doc(effectiveDb, 'artifacts', effectiveAppId, 'public', 'data', 'books', bookItem.id));
                await deleteDoc(
                    doc(effectiveDb, 'artifacts', effectiveAppId, 'public', 'data', 'tasks', `book_wall_${bookItem.id}`)
                ).catch(() => {});
                notify('🗑️ Libro 3D eliminado de la Biblioteca y del Muro.');
            } catch (err) {
                console.error('Error eliminando Libro 3D:', err);
                notify('Error al eliminar', 'No se pudo eliminar el Libro 3D completamente.', 'error');
            }
        };

        requestConfirm(
            'Eliminar Libro 3D',
            `¿Estás seguro de eliminar "${bookItem.title}" de la Biblioteca 3D y del Muro?`,
            performDelete
        );
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-6 md:p-8 text-white shadow-xl border border-indigo-500/20">
                <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-indigo-200 text-xs font-bold uppercase tracking-wider">
                            <Sparkles size={14} />
                            <span>Biblioteca Interactiva 3D</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                            Libros 3D y Lecturas Interactivas
                        </h1>
                        <p className="text-sm text-indigo-100/80 leading-relaxed">
                            Explora libros académicos, casos de estudio y guías técnicas con animación física de hojas en 3D, sonido de papel y lectura fluida desde cualquier dispositivo.
                        </p>
                    </div>

                    {isTeacher && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="shrink-0 inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                        >
                            <Plus size={18} />
                            <span>Subir PDF como Libro 3D</span>
                        </button>
                    )}
                </div>

                {/* Search & Category Filter Bar */}
                <div className="relative z-10 mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                        <Search
                            size={18}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-300/70 pointer-events-none"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar libro por título, tema o vocabulario..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-indigo-200/60 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('all')}
                            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                selectedCategory === 'all'
                                    ? 'bg-white text-indigo-950 shadow-md'
                                    : 'bg-white/10 text-indigo-100 hover:bg-white/20'
                            }`}
                        >
                            Todos ({accessibleBooks.length})
                        </button>
                        {BOOK_CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                    selectedCategory === cat.id
                                        ? 'bg-white text-indigo-950 shadow-md'
                                        : 'bg-white/10 text-indigo-100 hover:bg-white/20'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Teacher Creation / Edit Panel */}
            {isTeacher && isCreating && (
                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-xl animate-fade-in">
                    <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <BookOpen size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                                    {editingBookId ? 'Editar Libro 3D' : 'Crear Nuevo Libro 3D desde PDF'}
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Convierte automáticamente cualquier archivo PDF en un libro interactivo con paso de hojas en 3D y publícalo en el Muro.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setIsCreating(false);
                                resetForm();
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSaveBook} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Column: PDF Upload & 3D Cover Preview */}
                        <div className="lg:col-span-5 flex flex-col gap-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={handleSelectPdfFile}
                                className="hidden"
                            />

                            <div
                                onClick={() => !isProcessingPdf && fileInputRef.current?.click()}
                                className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                                    previewPages.length > 0
                                        ? 'border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20'
                                        : 'border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/40 dark:bg-slate-800/50 hover:border-indigo-500'
                                }`}
                            >
                                {isProcessingPdf ? (
                                    <div className="py-6 flex flex-col items-center">
                                        <Loader2 size={32} className="animate-spin text-indigo-600 dark:text-indigo-400 mb-3" />
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                                            Convirtiendo páginas a hojas 3D...
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {progressInfo.totalPages > 0
                                                ? `Página ${progressInfo.currentPage} de ${progressInfo.totalPages} (${progressInfo.percent}%)`
                                                : 'Extrayendo páginas en alta definición'}
                                        </p>
                                        <div className="w-full max-w-xs h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-3">
                                            <div
                                                className="h-full bg-indigo-600 transition-all duration-300"
                                                style={{ width: `${Math.max(8, progressInfo.percent || 12)}%` }}
                                            />
                                        </div>
                                    </div>
                                ) : previewPages.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="mx-auto w-36 h-48 rounded-xl overflow-hidden shadow-xl border-2 border-white dark:border-slate-700 relative bg-slate-900">
                                            <img
                                                src={previewPages[0]}
                                                alt="Portada del Libro 3D"
                                                className="w-full h-full object-cover"
                                            />
                                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/85 text-white text-[10px] font-bold">
                                                {previewPages.length} págs
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                            <CheckCircle2 size={15} />
                                            <span>{existingFileName || 'PDF procesado'} listo en 3D</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Haz clic aquí si deseas reemplazar el archivo PDF
                                        </p>
                                    </div>
                                ) : (
                                    <div className="py-6 flex flex-col items-center">
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                                            <UploadCloud size={28} />
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                                            Haz clic para seleccionar un archivo .PDF
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                                            Sus páginas se transformarán automáticamente en hojas interactivas con efecto 3D para móviles y PC.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Color / Binding Theme Selector */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                    Acabado de Pasta y Lomo 3D
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                    {Object.values(BOOK_THEMES).map((th) => (
                                        <button
                                            key={th.id}
                                            type="button"
                                            onClick={() => setTheme(th.id)}
                                            className={`p-2 rounded-xl border text-center transition-all ${
                                                theme === th.id
                                                    ? 'border-indigo-500 ring-2 ring-indigo-500/30 scale-105'
                                                    : 'border-slate-200 dark:border-slate-700 opacity-75 hover:opacity-100'
                                            }`}
                                        >
                                            <div
                                                className="w-full h-6 rounded-lg mb-1 shadow-inner"
                                                style={{
                                                    background: `linear-gradient(135deg, ${th.coverBg}, ${th.accentColor})`
                                                }}
                                            />
                                            <span className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                                                {th.name.split(' ')[1] || th.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Book Metadata */}
                        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                        Título del Libro 3D *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Ej: Macroeconomic Indicators & Financial Markets Handbook"
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                        Descripción o Instrucciones de Lectura
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe qué capítulos deben leer los estudiantes o qué actividades realizarán a partir de este libro..."
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                            Categoría
                                        </label>
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {BOOK_CATEGORIES.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                            Destinatarios (Grupo)
                                        </label>
                                        <select
                                            value={targetGroupId}
                                            onChange={(e) => setTargetGroupId(e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="all">🌍 Todos los grupos</option>
                                            {teacherOwnedGroups.map((grp) => (
                                                <option key={grp.id} value={grp.id}>
                                                    👥 {grp.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-3">
                                {previewPages.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setActiveBookModal({
                                                id: editingBookId || 'preview_book',
                                                title: title || 'Vista Previa Libro 3D',
                                                description,
                                                theme,
                                                category,
                                                bookPages: previewPages,
                                                pageCount: previewPages.length,
                                                pdfUrl: existingPdfUrl
                                            })
                                        }
                                        className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                                    >
                                        <Eye size={15} />
                                        <span>Probar Animación 3D</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreating(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={isSaving || isProcessingPdf}
                                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin" />
                                            <span>
                                                {progressInfo.phase === 'upload'
                                                    ? `Subiendo hoja ${progressInfo.currentPage}/${progressInfo.totalPages}...`
                                                    : 'Publicando Libro 3D...'}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <BookOpen size={15} />
                                            <span>{editingBookId ? 'Guardar Cambios' : 'Publicar en Biblioteca y Muro'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* 3D Bookshelf Grid */}
            {visibleBooks.length === 0 ? (
                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
                        <BookOpen size={30} />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mb-1">
                        No hay Libros 3D publicados aún
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
                        {isTeacher
                            ? 'Sube cualquier documento PDF para transformarlo en un libro interactivo con hojas 3D y compartirlo en el muro del curso.'
                            : 'Tu docente aún no ha publicado libros interactivos en esta categoría.'}
                    </p>
                    {isTeacher && !isCreating && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all"
                        >
                            <Plus size={16} />
                            <span>Subir primer Libro 3D</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {visibleBooks.map((bk) => {
                        const bkTheme = getBookTheme(bk.theme);
                        const coverImg = bk.coverUrl || bk.bookPages?.[0] || '';
                        const pageCount = bk.pageCount || bk.bookPages?.length || 1;
                        const catLabel =
                            BOOK_CATEGORIES.find((c) => c.id === bk.category)?.label ||
                            'Libro Académico 3D';
                        const groupObj =
                            bk.targetGroupId && bk.targetGroupId !== 'all'
                                ? effectiveGroups.find((g) => String(g?.id) === String(bk.targetGroupId))
                                : null;

                        return (
                            <div
                                key={bk.id}
                                className="group relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
                            >
                                <div className="flex gap-5">
                                    {/* Realistic 3D Standing Book Cover Thumbnail */}
                                    <div
                                        onClick={() => setActiveBookModal(bk)}
                                        className="relative shrink-0 w-28 sm:w-32 h-40 sm:h-44 cursor-pointer select-none"
                                        style={{ perspective: '900px' }}
                                    >
                                        <div
                                            className="relative w-full h-full rounded-r-xl rounded-l-sm shadow-[10px_14px_24px_-6px_rgba(15,23,42,0.45)] transition-transform duration-500 group-hover:[transform:rotateY(-18deg)_translateY(-4px)] overflow-hidden border border-white/15"
                                            style={{
                                                backgroundColor: bkTheme.coverBg,
                                                transformStyle: 'preserve-3d'
                                            }}
                                        >
                                            {/* Left Spine Highlight */}
                                            <div
                                                className="absolute inset-y-0 left-0 w-3.5 z-10 pointer-events-none"
                                                style={{
                                                    background:
                                                        'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(255,255,255,0.22) 45%, rgba(0,0,0,0.35) 100%)'
                                                }}
                                            />
                                            {coverImg ? (
                                                <img
                                                    src={coverImg}
                                                    alt={bk.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-white">
                                                    <Book size={28} className="mb-2 opacity-80" />
                                                    <span className="text-[11px] font-bold line-clamp-3">
                                                        {bk.title}
                                                    </span>
                                                </div>
                                            )}
                                            {/* Page count pill */}
                                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-sm text-white text-[10px] font-extrabold shadow">
                                                {pageCount} págs
                                            </span>
                                        </div>
                                        {/* Paper block edge on right */}
                                        <div
                                            className="absolute top-1.5 bottom-1.5 -right-2 w-2 rounded-r-sm pointer-events-none"
                                            style={{
                                                background:
                                                    'repeating-linear-gradient(90deg, #f8fafc 0px, #cbd5e1 1.5px, #f1f5f9 3px)'
                                            }}
                                        />
                                    </div>

                                    {/* Book Info */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                                    {catLabel}
                                                </span>
                                                {(groupObj?.name || (bk.targetGroupName && bk.targetGroupName !== 'Global' && bk.targetGroupName !== 'General')) && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                        {groupObj?.name || bk.targetGroupName}
                                                    </span>
                                                )}
                                            </div>

                                            <h3
                                                onClick={() => setActiveBookModal(bk)}
                                                className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                                            >
                                                {bk.title}
                                            </h3>

                                            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                                                {bk.description ||
                                                    'Edición interactiva 3D con simulación de hojas y lectura inmersiva.'}
                                            </p>
                                        </div>

                                        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                                            <span className="truncate">
                                                Por {bk.authorName || bk.author || getTeacherDisplayName(getItemTeacherId(bk))}
                                            </span>
                                            <span className="font-semibold text-indigo-500">
                                                3D Flipbook
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer Actions */}
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveBookModal(bk)}
                                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
                                    >
                                        <BookOpen size={15} />
                                        <span>Abrir Libro 3D</span>
                                    </button>

                                    {(bk.pdfUrl || bk.fileUrl) && (
                                        <button
                                            type="button"
                                            onClick={(e) =>
                                                handleForceDownload(
                                                    bk.pdfUrl || bk.fileUrl,
                                                    bk.fileName || `${bk.title}.pdf`,
                                                    e
                                                )
                                            }
                                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                                            title="Descargar archivo PDF original"
                                        >
                                            <Download size={15} />
                                        </button>
                                    )}

                                    {isTeacher && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEdit(bk)}
                                                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/20 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                                title="Editar Libro 3D"
                                            >
                                                <Edit3 size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteBook(bk)}
                                                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/20 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                                title="Eliminar Libro 3D"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Interactive 3D Book Viewer Modal */}
            {activeBookModal && (
                <Flipbook3DModal
                    book={activeBookModal}
                    onClose={() => setActiveBookModal(null)}
                    isTeacher={isTeacher}
                    onEditBook={isTeacher ? handleOpenEdit : null}
                />
            )}
        </div>
    );
}
