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
    Eye,
    X,
    CheckCircle2,
    RotateCcw
} from './Icons';
import {
    BOOK_THEMES,
    getBookTheme,
    renderPdfToBookPages,
    uploadBookPagesToStorage,
    sanitizeBookForFirestore,
    filterBooksCatalog,
    buildFallbackBookPages,
    buildBookPagesFromOutline,
    extractBookOutlinePageTexts,
    syncBookOutlineMetadata,
    generateAiBookPages
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
    callGemini,
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
    const [activeBookModal, setActiveBookModal] = useState(null);

    // Teacher Studio Modal / Form state
    const [isCreating, setIsCreating] = useState(false);
    const [creationMode, setCreationMode] = useState('create'); // 'create' | 'upload'
    const [editingBookId, setEditingBookId] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('textbook');
    const [theme, setTheme] = useState('royal-indigo');
    const [targetGroupId, setTargetGroupId] = useState('all');
    const [aiPageCount, setAiPageCount] = useState(6);
    const [aiLanguage, setAiLanguage] = useState('Inglés');
    const [previewOutline, setPreviewOutline] = useState([]);
    const [isGeneratingBook, setIsGeneratingBook] = useState(false);
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
            category: 'all'
        });

        return [...filtered].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }, [accessibleBooks, searchQuery]);

    const resetForm = useCallback(() => {
        setEditingBookId(null);
        setCreationMode('create');
        setTitle('');
        setDescription('');
        setCategory('textbook');
        setTheme('royal-indigo');
        setTargetGroupId('all');
        setAiPageCount(6);
        setAiLanguage('Inglés');
        setPreviewOutline([]);
        setIsGeneratingBook(false);
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

    const handleOpenCreate = useCallback(
        (mode = 'create') => {
            resetForm();
            setCreationMode(mode === 'upload' ? 'upload' : 'create');
            setIsCreating(true);
        },
        [resetForm]
    );

    const handleSwitchCreationMode = useCallback(
        (nextMode) => {
            const resolved = nextMode === 'upload' ? 'upload' : 'create';
            setCreationMode(resolved);
            if (resolved === 'upload') {
                // Clear AI-generated preview pages so they don't appear as a ready PDF
                if (previewOutline.length > 0 || (!pdfFile && !existingPdfUrl)) {
                    setPreviewOutline([]);
                    setPreviewPages([]);
                    setPreviewPageTexts([]);
                }
            } else {
                // Clear uploaded PDF state when switching to "Crear libro"
                if (pdfFile || existingPdfUrl || existingFileName) {
                    setPdfFile(null);
                    setExistingPdfUrl('');
                    setExistingFileName('');
                    if (previewOutline.length === 0) {
                        setPreviewPages([]);
                        setPreviewPageTexts([]);
                    }
                }
            }
        },
        [previewOutline.length, pdfFile, existingPdfUrl, existingFileName]
    );

    const handleOpenEdit = useCallback((bookItem) => {
        if (!bookItem) return;
        if (bookItem.isPreview || bookItem.id === 'preview_book') {
            setActiveBookModal(null);
            return;
        }
        setActiveBookModal(null);
        setEditingBookId(bookItem.id);
        const hasOutline = Array.isArray(bookItem.bookOutline) && bookItem.bookOutline.length > 0;
        const hasPdf = Boolean(bookItem.pdfUrl || bookItem.fileUrl);
        setCreationMode(hasOutline && !hasPdf ? 'create' : hasPdf || bookItem.fileName || bookItem.pdfFileName ? 'upload' : 'create');
        setTitle(bookItem.title || '');
        setDescription(bookItem.description || '');
        setCategory(bookItem.category || bookItem.bookCategory || 'textbook');
        setTheme(bookItem.theme || bookItem.bookTheme || 'royal-indigo');
        setTargetGroupId(bookItem.targetGroupId || 'all');
        setPreviewOutline(hasOutline ? bookItem.bookOutline : []);
        if (hasOutline) {
            setAiPageCount([5, 6, 8, 10].includes(bookItem.bookOutline.length) ? bookItem.bookOutline.length : 6);
        }
        if (bookItem.aiLanguage || bookItem.language) {
            const rawLang = String(bookItem.aiLanguage || bookItem.language);
            setAiLanguage(
                rawLang === 'ES' ? 'Español' : rawLang === 'BI' ? 'Bilingüe' : rawLang === 'EN' ? 'Inglés' : rawLang
            );
        }
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
        if (initialEditingBook) {
            if (initialEditingBook.id) {
                if (isTeacher) {
                    handleOpenEdit(initialEditingBook);
                } else {
                    setActiveBookModal(initialEditingBook);
                }
            } else if (isTeacher && (initialEditingBook.openCreate || initialEditingBook.mode)) {
                handleOpenCreate(initialEditingBook.mode === 'upload' ? 'upload' : 'create');
            }
            onClearInitialEditingBook?.();
        }
    }, [initialEditingBook, isTeacher, handleOpenEdit, handleOpenCreate, onClearInitialEditingBook]);

    const handleSelectTheme = (newThemeId) => {
        setTheme(newThemeId);
        if (Array.isArray(previewOutline) && previewOutline.length > 0 && !pdfFile) {
            const authorName =
                loggedInName || user?.displayName || getTeacherDisplayName(canonicalTeacherId) || 'Docente';
            const syncedOutline = syncBookOutlineMetadata(previewOutline, {
                title: title.trim(),
                description: description.trim(),
                author: authorName
            });
            setPreviewOutline(syncedOutline);
            setPreviewPages(
                buildBookPagesFromOutline(syncedOutline, {
                    themeId: newThemeId,
                    author: authorName
                })
            );
        }
    };

    const handleGenerateBookPages = async () => {
        if (!title.trim()) {
            notify('Título requerido', 'Escribe el título o tema del libro.', 'warning');
            return null;
        }
        setIsGeneratingBook(true);
        try {
            const authorName =
                loggedInName || user?.displayName || getTeacherDisplayName(canonicalTeacherId) || 'Docente';
            const generated = await generateAiBookPages({
                topic: title.trim(),
                title: title.trim(),
                instructions: description.trim(),
                description: description.trim(),
                language: aiLanguage,
                pageCount: aiPageCount,
                themeId: theme,
                author: authorName,
                category,
                callGemini
            });
            setPreviewOutline(generated.outline || []);
            setPreviewPages(generated.pages || []);
            setPreviewPageTexts(generated.pageTexts || []);
            setAspectRatio(0.707);
            setPdfFile(null);
            setExistingPdfUrl('');
            setExistingFileName('');
            return generated;
        } catch (err) {
            console.error('Error creando páginas del libro:', err);
            notify('Error al crear páginas', 'No se pudieron generar las páginas del libro.', 'error');
            return null;
        } finally {
            setIsGeneratingBook(false);
        }
    };

    const handleSelectPdfFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
            notify('Archivo no válido', 'Selecciona un archivo en formato PDF.', 'error');
            return;
        }

        setPdfFile(file);
        setPreviewOutline([]);
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
            console.error('Error procesando PDF:', err);
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
            notify('Título requerido', 'Escribe un título para el libro.', 'warning');
            return;
        }
        if (
            creationMode === 'upload' &&
            (previewPages.length === 0 || previewOutline.length > 0) &&
            !pdfFile &&
            !existingPdfUrl &&
            !existingFileName
        ) {
            notify('Archivo PDF requerido', 'Selecciona un archivo PDF.', 'warning');
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
            let pageTextsToSave = previewPageTexts;
            let outlineToSave = previewOutline;

            if (creationMode === 'create' && !pdfFile) {
                if (pagesToSave.length === 0 && (!Array.isArray(outlineToSave) || outlineToSave.length === 0)) {
                    setIsGeneratingBook(true);
                    try {
                        const generated = await generateAiBookPages({
                            topic: title.trim(),
                            title: title.trim(),
                            instructions: description.trim(),
                            description: description.trim(),
                            language: aiLanguage,
                            pageCount: aiPageCount,
                            themeId: theme,
                            author: authorName,
                            category,
                            callGemini
                        });
                        pagesToSave = generated.pages || [];
                        pageTextsToSave = generated.pageTexts || [];
                        outlineToSave = generated.outline || [];
                        setPreviewOutline(outlineToSave);
                        setPreviewPages(pagesToSave);
                        setPreviewPageTexts(pageTextsToSave);
                    } finally {
                        setIsGeneratingBook(false);
                    }
                } else if (Array.isArray(outlineToSave) && outlineToSave.length > 0) {
                    outlineToSave = syncBookOutlineMetadata(outlineToSave, {
                        title: title.trim(),
                        description: description.trim(),
                        author: authorName
                    });
                    pagesToSave = buildBookPagesFromOutline(outlineToSave, {
                        themeId: theme,
                        author: authorName
                    });
                    pageTextsToSave = extractBookOutlinePageTexts(outlineToSave);
                    setPreviewOutline(outlineToSave);
                    setPreviewPages(pagesToSave);
                    setPreviewPageTexts(pageTextsToSave);
                }
            }

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
                aiLanguage,
                aiPageCount,
                bookPages: uploadedPages,
                pages: uploadedPages,
                pageTexts: pageTextsToSave,
                bookOutline: Array.isArray(outlineToSave) && outlineToSave.length > 0 ? outlineToSave : [],
                coverUrl: uploadedPages[0] || '',
                pageCount: uploadedPages.length,
                pdfUrl: finalPdfUrl || '',
                fileUrl: finalPdfUrl || '',
                fileName: finalPdfUrl ? finalFileName || `${title.trim()}.pdf` : finalFileName || '',
                pdfFileName: finalPdfUrl ? finalFileName || `${title.trim()}.pdf` : finalFileName || '',
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
                description: sanitizedBook.description || '',
                category: sanitizedBook.category,
                bookCategory: sanitizedBook.category,
                theme: sanitizedBook.theme,
                bookTheme: sanitizedBook.theme,
                bookPages: sanitizedBook.bookPages,
                pageTexts: sanitizedBook.pageTexts || [],
                bookOutline: sanitizedBook.bookOutline || [],
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

            notify('📚 Libro publicado.');
            setIsCreating(false);
            resetForm();
        } catch (err) {
            console.error('Error guardando libro:', err);
            notify('Error al guardar', 'No se pudo publicar el libro.', 'error');
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
                notify('🗑️ Libro eliminado.');
                return;
            }
            try {
                await deleteDoc(doc(effectiveDb, 'artifacts', effectiveAppId, 'public', 'data', 'books', bookItem.id));
                await deleteDoc(
                    doc(effectiveDb, 'artifacts', effectiveAppId, 'public', 'data', 'tasks', `book_wall_${bookItem.id}`)
                ).catch(() => {});
                notify('🗑️ Libro eliminado.');
            } catch (err) {
                console.error('Error eliminando libro:', err);
                notify('Error al eliminar', 'No se pudo eliminar el libro.', 'error');
            }
        };

        requestConfirm(
            'Eliminar libro',
            `¿Eliminar "${bookItem.title}"?`,
            performDelete
        );
    };

    return (
        <div className="space-y-5 pb-20">
            {/* Minimalist Header */}
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Libros
                </h1>

                {isTeacher && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (isCreating && creationMode === 'create' && !editingBookId) {
                                    setIsCreating(false);
                                    resetForm();
                                } else {
                                    handleOpenCreate('create');
                                }
                            }}
                            className={`shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer ${
                                isCreating && creationMode === 'create'
                                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                        >
                            {isCreating && creationMode === 'create' ? <X size={16} /> : <Plus size={16} />}
                            <span>{isCreating && creationMode === 'create' ? 'Cerrar' : 'Crear libro'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (isCreating && creationMode === 'upload' && !editingBookId) {
                                    setIsCreating(false);
                                    resetForm();
                                } else {
                                    handleOpenCreate('upload');
                                }
                            }}
                            className={`shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer ${
                                isCreating && creationMode === 'upload'
                                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            {isCreating && creationMode === 'upload' ? <X size={16} /> : <UploadCloud size={16} />}
                            <span>{isCreating && creationMode === 'upload' ? 'Cerrar' : 'Subir libro'}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Search Bar */}
            {(accessibleBooks.length > 1 || Boolean(searchQuery)) && (
                <div className="relative max-w-md">
                    <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar libro..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            )}

            {/* Teacher Creation / Edit Panel */}
            {isTeacher && isCreating && (
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-lg animate-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <BookOpen size={18} />
                            </div>
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                                {editingBookId
                                    ? 'Editar libro'
                                    : creationMode === 'create'
                                    ? 'Crear libro'
                                    : 'Subir libro'}
                            </h2>
                        </div>

                        <div className="flex items-center gap-2">
                            {!editingBookId && (
                                <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                                    <button
                                        type="button"
                                        onClick={() => handleSwitchCreationMode('create')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            creationMode === 'create'
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                        }`}
                                    >
                                        Crear libro
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSwitchCreationMode('upload')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            creationMode === 'upload'
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                        }`}
                                    >
                                        Subir libro
                                    </button>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    setIsCreating(false);
                                    resetForm();
                                }}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSaveBook} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Left Column: Cover Preview or PDF Upload */}
                        <div className="lg:col-span-5 flex flex-col gap-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={handleSelectPdfFile}
                                className="hidden"
                            />

                            {creationMode === 'upload' ? (
                                <div
                                    onClick={() => !isProcessingPdf && fileInputRef.current?.click()}
                                    className={`relative rounded-2xl border-2 border-dashed p-5 text-center transition-all cursor-pointer ${
                                        previewPages.length > 0
                                            ? 'border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20'
                                            : 'border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/40 dark:bg-slate-800/50 hover:border-indigo-500'
                                    }`}
                                >
                                    {isProcessingPdf ? (
                                        <div className="py-5 flex flex-col items-center">
                                            <Loader2 size={28} className="animate-spin text-indigo-600 dark:text-indigo-400 mb-2" />
                                            <p className="text-xs font-bold text-slate-800 dark:text-white">
                                                Procesando PDF...
                                            </p>
                                            {progressInfo.totalPages > 0 && (
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {progressInfo.currentPage} / {progressInfo.totalPages} ({progressInfo.percent}%)
                                                </p>
                                            )}
                                            <div className="w-full max-w-xs h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2.5">
                                                <div
                                                    className="h-full bg-indigo-600 transition-all duration-300"
                                                    style={{ width: `${Math.max(8, progressInfo.percent || 12)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ) : previewPages.length > 0 ? (
                                        <div className="space-y-2.5">
                                            <div className="mx-auto w-32 h-44 rounded-xl overflow-hidden shadow-md border border-white dark:border-slate-700 relative bg-slate-900">
                                                <img
                                                    src={previewPages[0]}
                                                    alt="Portada"
                                                    className="w-full h-full object-cover"
                                                />
                                                <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-slate-900/85 text-white text-[10px] font-bold">
                                                    {previewPages.length} págs
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                                <CheckCircle2 size={14} />
                                                <span className="truncate max-w-[220px]">{existingFileName || 'PDF listo'}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-400">
                                                Cambiar PDF
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="py-6 flex flex-col items-center">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5">
                                                <UploadCloud size={24} />
                                            </div>
                                            <p className="text-xs font-bold text-slate-800 dark:text-white">
                                                Seleccionar PDF
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5 text-center">
                                    {isGeneratingBook ? (
                                        <div className="py-8 flex flex-col items-center">
                                            <Loader2 size={28} className="animate-spin text-indigo-600 dark:text-indigo-400 mb-2.5" />
                                            <p className="text-xs font-bold text-slate-800 dark:text-white">
                                                Creando páginas del libro...
                                            </p>
                                        </div>
                                    ) : previewPages.length > 0 ? (
                                        <div className="space-y-3">
                                            <div
                                                onClick={() =>
                                                    setActiveBookModal({
                                                        id: editingBookId || 'preview_book',
                                                        isPreview: true,
                                                        initialPage: 0,
                                                        title: title || 'Vista previa',
                                                        description,
                                                        theme,
                                                        category,
                                                        bookPages: previewPages,
                                                        pageCount: previewPages.length,
                                                        pdfUrl: existingPdfUrl
                                                    })
                                                }
                                                className="mx-auto w-32 h-44 rounded-xl overflow-hidden shadow-md border border-white dark:border-slate-700 relative bg-slate-900 cursor-pointer group"
                                            >
                                                <img
                                                    src={previewPages[0]}
                                                    alt="Portada"
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                                <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-slate-900/85 text-white text-[10px] font-bold">
                                                    {previewPages.length} págs
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1">
                                                {previewPages.slice(0, 5).map((pg, idx) => (
                                                    <img
                                                        key={idx}
                                                        src={pg}
                                                        alt={`Página ${idx + 1}`}
                                                        onClick={() =>
                                                            setActiveBookModal({
                                                                id: editingBookId || 'preview_book',
                                                                isPreview: true,
                                                                initialPage: idx,
                                                                title: title || 'Vista previa',
                                                                description,
                                                                theme,
                                                                category,
                                                                bookPages: previewPages,
                                                                pageCount: previewPages.length,
                                                                pdfUrl: existingPdfUrl
                                                            })
                                                        }
                                                        className="w-9 h-12 rounded object-cover border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                                                    />
                                                ))}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleGenerateBookPages}
                                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                            >
                                                <RotateCcw size={12} />
                                                <span>Actualizar páginas</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="py-4 flex flex-col items-center space-y-3">
                                            <div
                                                className="w-28 h-40 rounded-r-xl rounded-l-sm shadow-md border border-white/20 flex flex-col justify-between p-3 text-left text-white relative overflow-hidden"
                                                style={{
                                                    background: `linear-gradient(135deg, ${getBookTheme(theme).coverBg}, ${getBookTheme(theme).spineColor})`
                                                }}
                                            >
                                                <span className="text-[8px] font-bold uppercase tracking-widest opacity-75">
                                                    Libro
                                                </span>
                                                <p className="text-xs font-bold leading-snug line-clamp-4">
                                                    {title.trim() || 'Título del libro'}
                                                </p>
                                                <span className="text-[9px] opacity-80">
                                                    {aiPageCount} págs • {aiLanguage}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleGenerateBookPages}
                                                className="px-3.5 py-1.5 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 text-xs font-bold transition-colors cursor-pointer"
                                            >
                                                Vista previa de páginas
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Compact Color Swatches */}
                            <div className="flex items-center justify-between gap-3 px-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Color
                                </span>
                                <div className="flex items-center gap-2">
                                    {Object.values(BOOK_THEMES).map((th) => (
                                        <button
                                            key={th.id}
                                            type="button"
                                            onClick={() => handleSelectTheme(th.id)}
                                            title={th.name}
                                            aria-label={th.name}
                                            className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                                                theme === th.id
                                                    ? 'border-white ring-2 ring-indigo-500 scale-110'
                                                    : 'border-slate-300 dark:border-slate-700 opacity-75 hover:opacity-100'
                                            }`}
                                            style={{
                                                background: `linear-gradient(135deg, ${th.coverBg}, ${th.accentColor})`
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Book Metadata */}
                        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                            <div className="space-y-3.5">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                                        {creationMode === 'create' ? 'Título o tema *' : 'Título *'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder={
                                            creationMode === 'create'
                                                ? 'Ej. International Trade & Tariffs, Modal Verbs in Finance...'
                                                : 'Título del libro'
                                        }
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                                        {creationMode === 'create' ? 'Indicaciones (opcional)' : 'Descripción (opcional)'}
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder={
                                            creationMode === 'create'
                                                ? 'Capítulos, vocabulario, nivel o ejemplos que quieras incluir...'
                                                : 'Descripción breve...'
                                        }
                                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                {creationMode === 'create' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                                                Páginas
                                            </label>
                                            <select
                                                value={aiPageCount}
                                                onChange={(e) => setAiPageCount(Number(e.target.value) || 6)}
                                                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value={5}>5 páginas</option>
                                                <option value={6}>6 páginas</option>
                                                <option value={8}>8 páginas</option>
                                                <option value={10}>10 páginas</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                                                Idioma
                                            </label>
                                            <select
                                                value={aiLanguage}
                                                onChange={(e) => setAiLanguage(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="Inglés">Inglés</option>
                                                <option value="Bilingüe">Bilingüe</option>
                                                <option value="Español">Español</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                                                Grupo
                                            </label>
                                            <select
                                                value={targetGroupId}
                                                onChange={(e) => setTargetGroupId(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                ) : (
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                                            Grupo
                                        </label>
                                        <select
                                            value={targetGroupId}
                                            onChange={(e) => setTargetGroupId(e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="all">🌍 Todos los grupos</option>
                                            {teacherOwnedGroups.map((grp) => (
                                                <option key={grp.id} value={grp.id}>
                                                    👥 {grp.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
                                {previewPages.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setActiveBookModal({
                                                id: editingBookId || 'preview_book',
                                                title: title || 'Vista previa',
                                                description,
                                                theme,
                                                category,
                                                bookPages: previewPages,
                                                pageCount: previewPages.length,
                                                pdfUrl: existingPdfUrl
                                            })
                                        }
                                        className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                                    >
                                        <Eye size={14} />
                                        <span>Vista previa</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreating(false);
                                        resetForm();
                                    }}
                                    className="px-3.5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={isSaving || isProcessingPdf || isGeneratingBook}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                >
                                    {isSaving || isGeneratingBook ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>
                                                {isGeneratingBook
                                                    ? 'Creando libro...'
                                                    : progressInfo.phase === 'upload'
                                                    ? `Subiendo ${progressInfo.currentPage}/${progressInfo.totalPages}...`
                                                    : 'Guardando...'}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <BookOpen size={14} />
                                            <span>{editingBookId ? 'Guardar' : 'Publicar'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Books Grid / Minimalist Empty State */}
            {visibleBooks.length === 0 ? (
                !(isCreating && accessibleBooks.length === 0) && (
                    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-14 px-6 text-center shadow-xs">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3">
                            <BookOpen size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {accessibleBooks.length === 0
                                ? 'No hay libros publicados aún'
                                : 'No se encontraron libros'}
                        </h3>
                    </div>
                )
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {visibleBooks.map((bk) => {
                        const bkTheme = getBookTheme(bk.theme);
                        const coverImg = bk.coverUrl || bk.bookPages?.[0] || '';
                        const pageCount = bk.pageCount || bk.bookPages?.length || 1;
                        const groupObj =
                            bk.targetGroupId && bk.targetGroupId !== 'all'
                                ? effectiveGroups.find((g) => String(g?.id) === String(bk.targetGroupId))
                                : null;
                        const groupBadgeText =
                            groupObj?.name ||
                            (bk.targetGroupName &&
                            bk.targetGroupName !== 'Global' &&
                            bk.targetGroupName !== 'General'
                                ? bk.targetGroupName
                                : '');

                        return (
                            <div
                                key={bk.id}
                                className="group relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden"
                            >
                                <div className="flex gap-4">
                                    {/* Book Cover Thumbnail */}
                                    <div
                                        onClick={() => setActiveBookModal(bk)}
                                        className="relative shrink-0 w-24 sm:w-28 h-36 sm:h-40 cursor-pointer select-none"
                                        style={{ perspective: '900px' }}
                                    >
                                        <div
                                            className="relative w-full h-full rounded-r-xl rounded-l-sm shadow-md transition-transform duration-300 group-hover:[transform:rotateY(-14deg)_translateY(-2px)] overflow-hidden border border-white/15"
                                            style={{
                                                backgroundColor: bkTheme.coverBg,
                                                transformStyle: 'preserve-3d'
                                            }}
                                        >
                                            <div
                                                className="absolute inset-y-0 left-0 w-3 z-10 pointer-events-none"
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
                                                <div className="w-full h-full flex flex-col items-center justify-center p-2.5 text-center text-white">
                                                    <Book size={24} className="mb-1.5 opacity-80" />
                                                    <span className="text-[10px] font-bold line-clamp-3">
                                                        {bk.title}
                                                    </span>
                                                </div>
                                            )}
                                            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-950/80 text-white text-[10px] font-bold">
                                                {pageCount} págs
                                            </span>
                                        </div>
                                        <div
                                            className="absolute top-1.5 bottom-1.5 -right-1.5 w-1.5 rounded-r-sm pointer-events-none"
                                            style={{
                                                background:
                                                    'repeating-linear-gradient(90deg, #f8fafc 0px, #cbd5e1 1.5px, #f1f5f9 3px)'
                                            }}
                                        />
                                    </div>

                                    {/* Book Info */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                            {groupBadgeText && (
                                                <div className="mb-1">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                        {groupBadgeText}
                                                    </span>
                                                </div>
                                            )}

                                            <h3
                                                onClick={() => setActiveBookModal(bk)}
                                                className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                                            >
                                                {bk.title}
                                            </h3>

                                            {bk.description && (
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                                    {bk.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 truncate">
                                            {bk.authorName || bk.author || getTeacherDisplayName(getItemTeacherId(bk))}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer Actions */}
                                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveBookModal(bk)}
                                        className="flex-1 py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                                    >
                                        <BookOpen size={14} />
                                        <span>Abrir libro</span>
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
                                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                                            title="Descargar PDF"
                                        >
                                            <Download size={15} />
                                        </button>
                                    )}

                                    {isTeacher && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEdit(bk)}
                                                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/20 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                                title="Editar"
                                            >
                                                <Edit3 size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteBook(bk)}
                                                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/20 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                                title="Eliminar"
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

            {/* Book Viewer Modal */}
            {activeBookModal && (
                <Flipbook3DModal
                    book={activeBookModal}
                    initialPage={activeBookModal.initialPage || 0}
                    onClose={() => setActiveBookModal(null)}
                    isTeacher={isTeacher}
                    onEditBook={isTeacher && !activeBookModal.isPreview ? handleOpenEdit : null}
                />
            )}
        </div>
    );
}
