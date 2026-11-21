// src/components/TasksTab.jsx
import React, { useState, useRef, useEffect } from 'react'
import {
  Book, BookOpen, CheckCheck, CheckCircle2, ChevronRight, Globe, ImageIcon, Mic, NavNotebook, PaperclipIcon, Plus, SearchIcon, Sparkles, Square, Target, Loader2, Undo2, UploadCloud, X, Play, Pause, MessageCircle, BarChart2, Vote, Gamepad2, ClipboardList, NavSlides, Music, Volume2, VolumeX, CheckLine, AlertTriangle, ArrowRightIcon, ArrowLeftIcon, Lock, Link2
} from './Icons.jsx'
import TaskCard from './TaskCard.jsx'
import KahootBuilder from './KahootBuilder.jsx'
import EmptyState from './EmptyState.jsx'
import SkeletonCard from './SkeletonCard.jsx'
import RichTextToolbar from './RichTextToolbar.jsx'
import RichVisualEditor from './RichVisualEditor.jsx'
import { useVoiceRecorder } from '../utils/useVoiceRecorder.js'
import { auth, signInAnonymously, db as defaultDb, appId as defaultAppId, collection, addDoc, doc, setDoc } from '../firebase/config.js'
import AudioPlayer, { AudioRecordingVisualizer } from './AudioPlayer.jsx'
import CustomVideoPlayer from './CustomVideoPlayer.jsx'
import GeniallyEmbedPlayer, { extractGeniallyUrl } from './GeniallyEmbedPlayer.jsx'
import { DEMO_TTL_MS, saveDemoSandboxItem } from '../utils/demoData.js'
import { getCanonicalTeacherId, getItemTeacherId, getTeacherDisplayName, uploadImageToStorage, uploadRawFileToStorage, deleteFileFromStorage, generateId, resolveUserPhoto, sanitizeFirestoreData } from '../utils/helpers.js'
import { createDefaultKahootQuestion, validateKahootConfig, generateKahootPin } from '../utils/kahootEngine.js'
import { BOOK_THEMES, renderPdfToBookPages, uploadBookPagesToStorage, sanitizeBookForFirestore, buildFallbackBookPages, buildBookPagesFromOutline, extractBookOutlinePageTexts, syncBookOutlineMetadata, stripBookHtml, generateAiBookPages, applyCustomCoverToPages, compressBookImageDataUrl, READING_AUDIO_PRESETS, getReadingAudioPreset, clampReadingVolume, readingAmbientPlayer } from '../utils/flipbookEngine.js'
import Flipbook3DModal from './Flipbook3DModal.jsx'
import BookWordEditor from './BookWordEditor.jsx'
import UniversalImage from './UniversalImage.jsx'
import { dispatchStudentEmailNotification } from '../utils/studentNotificationService.js'

const TasksTab = React.memo(({
    role, glassCard, glassInput, redButton, postType, setPostType, taskTitle, setTaskTitle,
    taskDesc, setTaskDesc, showImageInput, setShowImageInput, postImageUrl, setPostImageUrl, postImageUrls = [], setPostImageUrls,
    postFileUrl, setPostFileUrl, postFileName, setPostFileName, showPostAttachmentMenu,
    setShowPostAttachmentMenu, handlePostLocalFileUpload, isAiLoading, setIsAiLoading,
    prevTaskTitle, setPrevTaskTitle, prevTaskDesc, setPrevTaskDesc, hasAiModified,
    setHasAiModified, callGemini, showMessage, handleAiTranslate, taskDate, setTaskDate,
    taskTime, setTaskTime, allowLate, setAllowLate, db, appId, loggedInName, getToday,
    tasks, setTasks, isDemoMode = false, user, isDarkMode, themeMode = 'light', confirmAction, setFullScreenImage, handleOpenProfileByName,
    academicGroups, myChatId, userMappings, tasksLoading, taskLimit, loadMoreTasks, hasMoreTasks = true, isLoadingMoreTasks = false, pinnedTasks,
    filterType, setFilterType, selectedGroupFilter, setSelectedGroupFilter, onTogglePin,
    taskSortOrder, setTaskSortOrder, wallSearchTerm: propWallSearchTerm, setWallSearchTerm: propSetWallSearchTerm,
    isFormExpanded: propIsFormExpanded, setIsFormExpanded: propSetIsFormExpanded,
    postTargetGroup: propPostTargetGroup, setPostTargetGroup: propSetPostTargetGroup,
    fixedTargetGroup, isGroupChannelMode = false,
    evaluations = [], grades = [], reviews = [], books = [], setRawBooks,
    onStartEvaluation, onOpenEvaluationResults, onOpenImmediateFeedback,
    onRetryDemoEvaluation, onOpenEvaluationsTab, onOpenReviewsTab, onOpenBooksTab,
    activePostModalId, setActivePostModalId, setUserPosts, chatGroups, students
}) => {

    // ESTADOS DEL MENÚ LIQUID GLASS
    const [localIsFormExpanded, setLocalIsFormExpanded] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const isPublishingRef = useRef(false);
    const [localPostTargetGroup, setLocalPostTargetGroup] = useState(fixedTargetGroup || "");
    const [composerStep, setComposerStep] = useState(() => (fixedTargetGroup ? 2 : 1));
    const isFormExpanded = propIsFormExpanded !== undefined ? propIsFormExpanded : localIsFormExpanded;
    const setIsFormExpanded = propSetIsFormExpanded || setLocalIsFormExpanded;
    const postTargetGroup = propPostTargetGroup !== undefined ? propPostTargetGroup : localPostTargetGroup;
    const setPostTargetGroup = propSetPostTargetGroup || setLocalPostTargetGroup;

    // Nombre amigable y validado del grupo actualmente seleccionado en el compositor
    const currentGroupName = React.useMemo(() => {
        if (!postTargetGroup) return '';
        if (postTargetGroup === 'all') return 'Todas las materias (General)';
        const cleanId = String(postTargetGroup).replace(/^acad_/i, '').trim().toLowerCase();
        const found = (academicGroups || []).find(g => {
            if (!g) return false;
            const gClean = String(g.id || '').replace(/^acad_/i, '').trim().toLowerCase();
            return String(g.id).toLowerCase() === String(postTargetGroup).toLowerCase() || gClean === cleanId;
        });
        return found?.name || 'Materia seleccionada';
    }, [postTargetGroup, academicGroups]);
    const [hasDueDate, setHasDueDate] = useState(true);
    const [hidePublicationDate, setHidePublicationDate] = useState(false);
    const [postVideoUrl, setPostVideoUrl] = useState("");
    const [showVideoInput, setShowVideoInput] = useState(false);
    const [postGeniallyUrl, setPostGeniallyUrl] = useState("");
    const [showGeniallyInput, setShowGeniallyInput] = useState(false);
    const [localWallSearchTerm, setLocalWallSearchTerm] = useState("");
    const taskDescRef = useRef(null);
    const [dynamicPlaceholder, setDynamicPlaceholder] = useState('Comparte algo con tu clase...');
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [isMultipleChoice, setIsMultipleChoice] = useState(false);
    const [kahootQuestions, setKahootQuestions] = useState(() => [createDefaultKahootQuestion('quiz', 0)]);
    const [book3dMode, setBook3dMode] = useState('create'); // 'create' | 'upload'
    const [book3dTheme, setBook3dTheme] = useState('royal-indigo');
    const [book3dPages, setBook3dPages] = useState([]);
    const [book3dPageTexts, setBook3dPageTexts] = useState([]);
    const [book3dOutline, setBook3dOutline] = useState([]);
    const [book3dCustomCover, setBook3dCustomCover] = useState('');
    const [book3dRawPdfFirstPage, setBook3dRawPdfFirstPage] = useState('');
    const [book3dPageCount, setBook3dPageCount] = useState(6);
    const [book3dLanguage, setBook3dLanguage] = useState('Inglés');
    const [isGeneratingBook3d, setIsGeneratingBook3d] = useState(false);
    const [book3dPdfFile, setBook3dPdfFile] = useState(null);
    const [book3dAspectRatio, setBook3dAspectRatio] = useState(0.707);
    const [isRenderingBook3d, setIsRenderingBook3d] = useState(false);
    const [book3dProgress, setBook3dProgress] = useState({ phase: '', currentPage: 0, totalPages: 0, percent: 0 });
    const [book3dPreviewModal, setBook3dPreviewModal] = useState(null);
    const book3dFileInputRef = useRef(null);
    const book3dCoverInputRef = useRef(null);
    const book3dAmbientFileInputRef = useRef(null);
    const loadMoreSentinelRef = useRef(null);

    // Infinite scroll automático: auto-cargar publicaciones más antiguas al desplazarse hacia abajo
    useEffect(() => {
        const sentinel = loadMoreSentinelRef.current;
        if (!sentinel || !hasMoreTasks) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && !tasksLoading && !isLoadingMoreTasks && hasMoreTasks) {
                    loadMoreTasks?.();
                }
            },
            {
                root: null,
                rootMargin: '400px',
                threshold: 0
            }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMoreTasks, tasksLoading, isLoadingMoreTasks, loadMoreTasks]);

    // Respaldo de scroll por contenedor (para contenedores con overflow-y-auto en escritorio y móvil)
    useEffect(() => {
        if (!hasMoreTasks) return;
        let ticking = false;

        const handleScroll = (e) => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                ticking = false;
                if (tasksLoading || isLoadingMoreTasks || !hasMoreTasks) return;
                const target = e.target && e.target.scrollHeight ? e.target : document.documentElement;
                const scrollTop = target.scrollTop || window.scrollY || 0;
                const clientHeight = target.clientHeight || window.innerHeight || 0;
                const scrollHeight = target.scrollHeight || document.documentElement.scrollHeight || 0;
                if (scrollHeight - (scrollTop + clientHeight) < 450) {
                    loadMoreTasks?.();
                }
            });
        };

        const scrollContainer = loadMoreSentinelRef.current?.closest('.overflow-y-auto') || document.querySelector('.overflow-y-auto');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        }
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', handleScroll);
            }
            window.removeEventListener('scroll', handleScroll);
        };
    }, [hasMoreTasks, tasksLoading, isLoadingMoreTasks, loadMoreTasks]);

    // Configuración de música de fondo / audio de lectura para libros
    const [book3dAmbientEnabled, setBook3dAmbientEnabled] = useState(true);
    const [book3dAmbientTrack, setBook3dAmbientTrack] = useState('piano-calm');
    const [book3dAmbientUrl, setBook3dAmbientUrl] = useState('');
    const [book3dAmbientVolume, setBook3dAmbientVolume] = useState(0.22);
    const [book3dPreviewingAmbient, setBook3dPreviewingAmbient] = useState(false);

    const handleToggleBook3dPreviewAmbient = () => {
        if (book3dPreviewingAmbient) {
            readingAmbientPlayer.stop({ fadeOutDuration: 0.5 });
            setBook3dPreviewingAmbient(false);
        } else {
            readingAmbientPlayer.start({
                trackId: book3dAmbientTrack,
                customUrl: book3dAmbientUrl,
                volume: book3dAmbientVolume,
                fadeInDuration: 0.8,
                title: getReadingAudioPreset(book3dAmbientTrack)?.name
            });
            setBook3dPreviewingAmbient(true);
        }
    };

    const handleSelectBook3dCustomAudioFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name)) {
            showMessage('⚠️ Selecciona un archivo de audio (MP3, WAV, OGG, M4A).');
            return;
        }
        try {
            if (!isDemoMode) {
                const uploaded = await uploadRawFileToStorage(file, 'books_audio');
                if (uploaded) {
                    setBook3dAmbientUrl(uploaded);
                    setBook3dAmbientTrack('custom');
                    showMessage('🎵 Audio de lectura listo.');
                    return;
                }
            }
            if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
                const localUrl = URL.createObjectURL(file);
                setBook3dAmbientUrl(localUrl);
                setBook3dAmbientTrack('custom');
                showMessage('🎵 Audio cargado en la sesión.');
            }
        } catch (err) {
            console.warn('Error subiendo audio de libro:', err);
        }
    };

    React.useEffect(() => {
        if ((!isFormExpanded || postType !== 'book3d') && book3dPreviewingAmbient) {
            readingAmbientPlayer.stop({ fadeOutDuration: 0.5 });
            setBook3dPreviewingAmbient(false);
        }
        return () => {
            if (book3dPreviewingAmbient) {
                readingAmbientPlayer.stop({ fadeOutDuration: 0.5 });
            }
        };
    }, [isFormExpanded, postType, book3dPreviewingAmbient]);

    const handleSwitchBook3dMode = (nextMode) => {
        if (nextMode === book3dMode) return;
        if (nextMode === 'upload') {
            if (!book3dPdfFile) {
                setBook3dPages([]);
                setBook3dPageTexts([]);
                setBook3dOutline([]);
                setBook3dRawPdfFirstPage('');
                setBook3dAspectRatio(0.707);
            }
        } else if (nextMode === 'create') {
            if (book3dPdfFile || book3dOutline.length === 0) {
                setBook3dPdfFile(null);
                setBook3dRawPdfFirstPage('');
                setBook3dPages([]);
                setBook3dPageTexts([]);
                setBook3dOutline([]);
                setBook3dAspectRatio(0.707);
                if (book3dFileInputRef.current) book3dFileInputRef.current.value = '';
            }
        }
        setBook3dMode(nextMode);
    };

    const handleSelectBook3dTheme = (newThemeId) => {
        setBook3dTheme(newThemeId);
        if (Array.isArray(book3dOutline) && book3dOutline.length > 0 && !book3dPdfFile) {
            const syncedOutline = syncBookOutlineMetadata(book3dOutline, {
                title: (taskTitle || '').trim(),
                description: stripBookHtml(taskDesc || ''),
                author: loggedInName || 'Docente'
            });
            setBook3dOutline(syncedOutline);
            setBook3dPages(
                buildBookPagesFromOutline(syncedOutline, {
                    themeId: newThemeId,
                    author: loggedInName || 'Docente',
                    customCoverUrl: book3dCustomCover
                })
            );
        }
    };

    const handleBook3dOutlineChange = (nextOutline) => {
        setBook3dOutline(nextOutline);
        if (Array.isArray(nextOutline) && nextOutline[0]?.title && typeof setTaskTitle === 'function') {
            setTaskTitle(nextOutline[0].title);
        }
        const coverPageImage =
            Array.isArray(nextOutline) && typeof nextOutline[0]?.imageUrl === 'string'
                ? nextOutline[0].imageUrl
                : book3dCustomCover;
        if (coverPageImage !== book3dCustomCover) {
            setBook3dCustomCover(coverPageImage);
        }
        setBook3dPages(
            buildBookPagesFromOutline(nextOutline, {
                themeId: book3dTheme,
                author: loggedInName || 'Docente',
                customCoverUrl: coverPageImage
            })
        );
        setBook3dPageTexts(extractBookOutlinePageTexts(nextOutline));
    };

    const handleSelectBook3dCustomCover = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressedCover = await compressBookImageDataUrl(file, {
                maxDimension: 1200,
                quality: 0.84
            });
            if (!compressedCover) return;
            setBook3dCustomCover(compressedCover);
            if (Array.isArray(book3dOutline) && book3dOutline.length > 0 && !book3dPdfFile) {
                const updatedOutline = book3dOutline.map((p, idx) =>
                    idx === 0 ? { ...p, imageUrl: compressedCover } : p
                );
                setBook3dOutline(updatedOutline);
                setBook3dPages(
                    buildBookPagesFromOutline(updatedOutline, {
                        themeId: book3dTheme,
                        author: loggedInName || 'Docente',
                        customCoverUrl: compressedCover
                    })
                );
            } else if (book3dPages.length > 0) {
                setBook3dPages((prev) => {
                    if (!book3dRawPdfFirstPage && prev[0] && prev[0] !== compressedCover) {
                        setBook3dRawPdfFirstPage(prev[0]);
                    }
                    return applyCustomCoverToPages(prev, compressedCover);
                });
            }
            showMessage('📚 Portada personalizada aplicada.');
        } catch (err) {
            console.warn('No se pudo aplicar la portada personalizada:', err);
        }
    };

    const handleClearBook3dCustomCover = () => {
        setBook3dCustomCover('');
        if (book3dCoverInputRef.current) book3dCoverInputRef.current.value = '';
        if (Array.isArray(book3dOutline) && book3dOutline.length > 0 && !book3dPdfFile) {
            const updatedOutline = book3dOutline.map((p, idx) => (idx === 0 ? { ...p, imageUrl: '' } : p));
            setBook3dOutline(updatedOutline);
            setBook3dPages(
                buildBookPagesFromOutline(updatedOutline, {
                    themeId: book3dTheme,
                    author: loggedInName || 'Docente',
                    customCoverUrl: ''
                })
            );
        } else if (book3dRawPdfFirstPage) {
            setBook3dPages((prev) => applyCustomCoverToPages(prev, book3dRawPdfFirstPage));
        }
    };

    const handleGenerateBook3dPages = async () => {
        const cleanTopic = (taskTitle || '').trim();
        if (!cleanTopic) {
            showMessage('⚠️ Escribe el título o tema del libro arriba.');
            return null;
        }
        setIsGeneratingBook3d(true);
        try {
            const plainInstructions = stripBookHtml(taskDesc || '');
            const generated = await generateAiBookPages({
                topic: cleanTopic,
                title: cleanTopic,
                instructions: plainInstructions,
                description: plainInstructions,
                language: book3dLanguage,
                pageCount: book3dPageCount,
                themeId: book3dTheme,
                author: loggedInName || 'Docente',
                category: 'textbook',
                customCoverUrl: book3dCustomCover,
                callGemini
            });
            setBook3dOutline(generated.outline || []);
            setBook3dPages(generated.pages || []);
            setBook3dPageTexts(generated.pageTexts || []);
            setBook3dAspectRatio(0.707);
            setBook3dPdfFile(null);
            setBook3dRawPdfFirstPage('');
            showMessage(`📚 Libro listo (${generated.pages.length} págs).`);
            return generated;
        } catch (err) {
            console.error('Error creando libro:', err);
            showMessage('⚠️ No se pudieron crear las páginas del libro.');
            return null;
        } finally {
            setIsGeneratingBook3d(false);
        }
    };

    const handleSelectBook3dPdf = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
            showMessage('⚠️ Selecciona un archivo PDF.');
            return;
        }
        setBook3dPdfFile(file);
        setBook3dOutline([]);
        setBook3dRawPdfFirstPage('');
        if (!(taskTitle || '').trim() && typeof setTaskTitle === 'function') {
            setTaskTitle(file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim());
        }
        setIsRenderingBook3d(true);
        setBook3dProgress({ phase: 'render', currentPage: 0, totalPages: 0, percent: 8 });
        try {
            const rendered = await renderPdfToBookPages(file, {
                maxPages: 60,
                scale: 1.6,
                maxDimension: 1350,
                quality: 0.82,
                fallbackTitle: (taskTitle || '').trim() || file.name.replace(/\.pdf$/i, ''),
                themeId: book3dTheme,
                onProgress: (prog) => setBook3dProgress(prog)
            });
            if (Array.isArray(rendered?.pages) && rendered.pages.length > 0) {
                setBook3dRawPdfFirstPage(rendered.pages[0] || '');
                const finalPages = book3dCustomCover
                    ? applyCustomCoverToPages(rendered.pages, book3dCustomCover)
                    : rendered.pages;
                setBook3dPages(finalPages);
                setBook3dPageTexts(rendered.pageTexts || []);
                setBook3dAspectRatio(rendered.aspectRatio || 0.707);
                showMessage(`📚 PDF listo (${finalPages.length} págs).`);
            }
        } catch (err) {
            console.error('Error renderizando PDF a libro:', err);
            const fallback = buildFallbackBookPages({
                title: taskTitle || file.name.replace(/\.pdf$/i, ''),
                description: stripBookHtml(taskDesc || ''),
                fileName: file.name,
                author: loggedInName || 'Docente',
                themeId: book3dTheme,
                customCoverUrl: book3dCustomCover
            });
            setBook3dRawPdfFirstPage(fallback[0] || '');
            setBook3dPages(fallback);
        } finally {
            setIsRenderingBook3d(false);
        }
    };

    const wallSearchTerm = propWallSearchTerm !== undefined ? propWallSearchTerm : localWallSearchTerm;
    const setWallSearchTerm = propSetWallSearchTerm || setLocalWallSearchTerm;
    const { isRecording: recPub, audioUrl: audioPub, isUploading: upPub, recordingTime: recTimePub, setAudioUrl: setAudioPub, startRecording: startPub, stopRecording: stopPub, cancelRecording: cancelPub } = useVoiceRecorder('tasks_audios', showMessage);

    // Frases del banner: se descargan despues de montar y SOLO para la docente
    // (asi los estudiantes no bajan 237 KB que no usan).
    const frasesRef = useRef(null);
    React.useEffect(() => {
        if (role !== 'teacher') return;
        let vivo = true;
        import('../utils/teacherPlaceholders.js')
            .then((m) => {
                if (!vivo) return;
                frasesRef.current = m.getTeacherDynamicPlaceholder;
                setDynamicPlaceholder(m.getTeacherDynamicPlaceholder(loggedInName));
            })
            .catch(() => {});
        const interval = setInterval(() => {
            if (frasesRef.current) setDynamicPlaceholder(frasesRef.current(loggedInName));
        }, 180000);
        return () => { vivo = false; clearInterval(interval); };
    }, [loggedInName, role]);

    // Sincronizar postTargetGroup y paso si cambia fixedTargetGroup
    React.useEffect(() => {
        if (fixedTargetGroup) {
            setPostTargetGroup(fixedTargetGroup);
            setComposerStep(2);
        }
    }, [fixedTargetGroup]);

    // 1. Identificadores completos y validados del estudiante actual
    const studentIdentifiers = React.useMemo(() => {
        const ids = new Set();
        if (myChatId) {
            const clean = String(myChatId).toLowerCase().replace('@', '').trim();
            if (clean) ids.add(clean);
        }
        if (user?.uid) {
            const clean = String(user.uid).toLowerCase().trim();
            if (clean) ids.add(clean);
        }
        if (user?.email) {
            const clean = String(user.email).toLowerCase().trim();
            if (clean) {
                ids.add(clean);
                const prefix = clean.split('@')[0].trim();
                if (prefix) ids.add(prefix);
            }
        }
        if (loggedInName) {
            const clean = String(loggedInName).toLowerCase().trim();
            if (clean) ids.add(clean);
        }
        Object.entries(userMappings || {}).forEach(([uk, ud]) => {
            const cleanUk = String(uk).toLowerCase().replace('@', '').trim();
            const cleanUid = ud?.uid ? String(ud.uid).toLowerCase().trim() : '';
            const cleanEmail = ud?.email ? String(ud.email).toLowerCase().trim() : '';
            const cleanName = ud?.fullName ? String(ud.fullName).toLowerCase().trim() : '';
            if (
                (cleanUk && ids.has(cleanUk)) ||
                (cleanUid && ids.has(cleanUid)) ||
                (cleanEmail && ids.has(cleanEmail)) ||
                (cleanName && ids.has(cleanName))
            ) {
                if (cleanUk) ids.add(cleanUk);
                if (cleanUid) ids.add(cleanUid);
                if (cleanEmail) {
                    ids.add(cleanEmail);
                    const p = cleanEmail.split('@')[0].trim();
                    if (p) ids.add(p);
                }
            }
        });
        return ids;
    }, [myChatId, user, loggedInName, userMappings]);

    // 2. Comprobar si el estudiante pertenece a un grupo académico
    const isStudentInGroup = React.useCallback((group) => {
        if (!group) return false;
        if (isDemoMode || String(group.id || '').startsWith('demo_') || String(group.id || '').startsWith('demo-')) return true;
        if (!group.members) return false;
        const membersList = Array.isArray(group.members)
            ? group.members
            : (typeof group.members === 'object' ? Object.keys(group.members) : []);
        if (membersList.length === 0 || studentIdentifiers.size === 0) return false;
        return membersList.some(m => {
            if (!m) return false;
            const cleanM = String(m).toLowerCase().replace('@', '').trim();
            return cleanM && studentIdentifiers.has(cleanM);
        });
    }, [studentIdentifiers, isDemoMode]);

    // 3. Materias / grupos en los que está inscrito el estudiante
    const myEnrolledGroups = React.useMemo(() => {
        if (role === 'teacher') return academicGroups || [];
        return (academicGroups || []).filter(isStudentInGroup);
    }, [academicGroups, isStudentInGroup, role]);

    // 4. Verificador estricto de visibilidad de publicaciones y tareas
    const isTaskVisibleForUser = React.useCallback((t) => {
        if (!t) return false;

        // Si la tarea o evaluación tiene estudiantes específicos asignados, verificar pertenencia
        if (role === 'student' && (t.type === 'evaluation' || t.evaluationId)) {
            const evId = String(t.evaluationId || '').trim();
            const targetStudentIds = (Array.isArray(t.targetStudentIds) && t.targetStudentIds.length > 0)
                ? t.targetStudentIds
                : (evId && Array.isArray(evaluations) && evaluations.find(e => String(e.id) === evId)?.targetStudentIds);

            if (Array.isArray(targetStudentIds) && targetStudentIds.length > 0) {
                const isTargeted = targetStudentIds.some(targetId => {
                    const cleanTId = String(targetId).toLowerCase().replace('@', '').trim();
                    return studentIdentifiers.has(cleanTId);
                });
                if (!isTargeted) return false;
            }
        }

        const isDemoTask = Boolean(
            isDemoMode ||
            t.isDemoCreated ||
            String(t.id || '').startsWith('demo-') ||
            String(t.id || '').startsWith('demo_') ||
            String(t.evaluationId || '').startsWith('demo') ||
            String(t.reviewId || '').startsWith('demo') ||
            String(t.bookId || '').startsWith('demo')
        );
        if (!fixedTargetGroup && (isDemoTask || String(t.id || '').startsWith('demo-'))) return true;

        const taskTeacherId = getItemTeacherId(t);

        // Si estamos viendo el feed específico de un grupo (fixedTargetGroup)
        if (fixedTargetGroup) {
            const cleanFixed = String(fixedTargetGroup).trim().replace(/^acad_/i, '').toLowerCase();
            if (!cleanFixed) return false;

            // Si es estudiante, verificar que esté inscrito en el grupo que está visualizando
            if (role === 'student') {
                const isEnrolled = myEnrolledGroups.some(g => String(g?.id || '').trim().replace(/^acad_/i, '').toLowerCase() === cleanFixed);
                if (!isEnrolled) return false;
            }

            // Datos canónicos del grupo actual
            const targetGroupObj = (academicGroups || []).find(g => String(g?.id || '').trim().replace(/^acad_/i, '').toLowerCase() === cleanFixed);
            if (!isDemoTask && targetGroupObj && getItemTeacherId(targetGroupObj) !== taskTeacherId) {
                return false;
            }
            const targetGroupName = (targetGroupObj?.name || '').toLowerCase().trim();

            const rawTaskGrpId = String(t.targetGroupId || t.groupId || t.academicGroupId || '').trim();
            const cleanTaskGrpId = rawTaskGrpId.replace(/^acad_/i, '').toLowerCase();
            const rawLegacyGrp = String(t.targetGroup || '').trim().replace(/^acad_/i, '').toLowerCase();
            const taskGrpName = String(t.targetGroupName || '').toLowerCase().trim();

            // Publicaciones globales o para todos NO deben contaminar el muro exclusivo del grupo
            if (cleanTaskGrpId === 'all' || cleanTaskGrpId === 'global' || cleanTaskGrpId === 'todos' ||
                rawLegacyGrp === 'all' || rawLegacyGrp === 'global' || rawLegacyGrp === 'todos' ||
                taskGrpName === 'global' || taskGrpName === 'todos' || taskGrpName === 'general' ||
                taskGrpName === 'todos los estudiantes' || taskGrpName === 'todos los estudiantes (global)') {
                return false;
            }

            // 1. Si tiene ID explícito, debe pertenecer a este grupo (o coincidir con el nombre de este grupo)
            if (cleanTaskGrpId) {
                if (cleanTaskGrpId === cleanFixed || (targetGroupName && cleanTaskGrpId === targetGroupName)) return true;
                return false; // Apunta a otro grupo, descartar de inmediato
            }

            // 2. Si tiene campo heredado targetGroup
            if (rawLegacyGrp) {
                if (rawLegacyGrp === cleanFixed || (targetGroupName && rawLegacyGrp === targetGroupName)) return true;
                return false;
            }

            // 3. Si solo tiene targetGroupName asignado
            if (targetGroupName && taskGrpName && taskGrpName === targetGroupName) {
                return true;
            }

            return false;
        }

        // Muro General (sin grupo fijo seleccionado)
        if (role === 'teacher') return true;

        const rawTaskGrpId = String(t.targetGroupId || t.targetGroup || t.groupId || t.academicGroupId || '').trim();
        const cleanTaskGrpId = rawTaskGrpId.replace(/^acad_/i, '');
        const taskGrpName = String(t.targetGroupName || '').toLowerCase().trim();

        // Detectar si la publicación fue dirigida a una materia específica
        const hasSpecificGroupId = cleanTaskGrpId && cleanTaskGrpId !== 'all' && cleanTaskGrpId !== 'global';
        const hasSpecificGroupName = taskGrpName && 
            taskGrpName !== 'global' && 
            taskGrpName !== 'todos' && 
            taskGrpName !== 'todos los estudiantes' && 
            taskGrpName !== 'todos los estudiantes (global)' && 
            taskGrpName !== 'general';

        // Buscar si coincide con alguna materia existente en la plataforma (del mismo docente)
        const matchingGroupInSystem = (academicGroups || []).find(g => {
            if (!g) return false;
            if (getItemTeacherId(g) !== taskTeacherId) return false;
            const gClean = String(g.id || '').trim().replace(/^acad_/i, '');
            const gName = (g.name || '').toLowerCase().trim();
            return (
                (cleanTaskGrpId && (gClean.toLowerCase() === cleanTaskGrpId.toLowerCase() || gName === cleanTaskGrpId.toLowerCase())) ||
                (hasSpecificGroupName && gName && gName === taskGrpName)
            );
        });

        const isGroupTask = hasSpecificGroupId || hasSpecificGroupName || Boolean(matchingGroupInSystem);

        if (isGroupTask) {
            // Estudiantes nuevos o sin grupo asignado: NUNCA pueden ver publicaciones de grupos
            if (myEnrolledGroups.length === 0) {
                return false;
            }

            // Si tienen grupo, solo ven publicaciones de sus materias inscritas (del mismo docente)
            return myEnrolledGroups.some(g => {
                if (getItemTeacherId(g) !== taskTeacherId) return false;
                const gClean = String(g.id || '').trim().replace(/^acad_/i, '');
                const gName = (g.name || '').toLowerCase().trim();
                return (
                    (cleanTaskGrpId && (gClean.toLowerCase() === cleanTaskGrpId.toLowerCase() || gName === cleanTaskGrpId.toLowerCase())) ||
                    (hasSpecificGroupName && gName && gName === taskGrpName) ||
                    (matchingGroupInSystem && String(matchingGroupInSystem.id || '').trim().replace(/^acad_/i, '').toLowerCase() === gClean.toLowerCase())
                );
            });
        }

        // Publicación auténticamente Global / Para todos los estudiantes de los docentes con los que está inscrito
        if (myEnrolledGroups.length > 0) {
            return myEnrolledGroups.some(g => getItemTeacherId(g) === taskTeacherId);
        }
        return taskTeacherId === 'teacher';
    }, [role, fixedTargetGroup, academicGroups, myEnrolledGroups, isDemoMode, evaluations, studentIdentifiers]);

    // Deduplicación estricta por ID y huella de contenido para evitar duplicados en el feed
    const deduplicateTasks = React.useCallback((list) => {
        if (!Array.isArray(list)) return [];
        const seenIds = new Set();
        const seenSignatures = new Set();
        const result = [];
        for (const item of list) {
            if (!item) continue;
            const id = String(item.id || '').trim();
            if (id) {
                if (seenIds.has(id)) continue;
                seenIds.add(id);
            }
            // Huella de contenido para detectar posts idénticos generados por doble-clic o reintento de red
            const cleanTitle = String(item.title || '').trim().toLowerCase();
            const cleanDesc = String(item.description || '').trim().toLowerCase();
            const grp = String(item.targetGroupId || item.targetGroup || item.groupId || item.academicGroupId || '').replace(/^acad_/i, '').trim().toLowerCase();
            const author = String(item.authorId || item.authorUsername || item.authorName || item.author || '').trim().toLowerCase();

            const rawTs = typeof item.createdAt === 'number' ? item.createdAt :
                          item.createdAt?.toMillis ? item.createdAt.toMillis() :
                          item.createdAt?.seconds ? item.createdAt.seconds * 1000 :
                          typeof item.createdAt === 'string' ? new Date(item.createdAt).getTime() : 0;
            const validTs = !isNaN(rawTs) && rawTs > 0 ? rawTs : null;

            if ((cleanTitle || cleanDesc) && validTs) {
                const timeBucket = Math.floor(validTs / 10000); // Ventana de 10 segundos
                const sig = `${author}|${cleanTitle}|${cleanDesc}|${grp}|${timeBucket}`;
                if (seenSignatures.has(sig)) continue;
                seenSignatures.add(sig);
            }
            result.push(item);
        }
        return result;
    }, []);

    // Combinar publicaciones del muro con evaluaciones activas, presentaciones de diapositivas y libros 3D
    const combinedTasks = React.useMemo(() => {
        const getTs = (item) => {
            if (!item) return 0;
            if (typeof item.createdAt === 'number') return item.createdAt;
            if (item.createdAt?.toMillis) return item.createdAt.toMillis();
            if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
            if (typeof item.createdAt === 'string') {
                const p = new Date(item.createdAt).getTime();
                return isNaN(p) ? 0 : p;
            }
            return 0;
        };

        const evalMap = new Map((evaluations || []).filter(Boolean).map(ev => [String(ev.id), ev]));
        const reviewMap = new Map((reviews || []).filter(Boolean).map(rv => [String(rv.id), rv]));
        const bookMap = new Map((books || []).filter(Boolean).map(bk => [String(bk.id), bk]));

        // Registrar IDs ya presentes en tasks o pinnedTasks (incluso si fueron ocultados del muro con isDeletedFromWall)
        const existingEvalIds = new Set();
        const existingReviewIds = new Set();
        const existingBookIds = new Set();
        [...(tasks || []), ...(pinnedTasks || [])].forEach(t => {
            if (!t) return;
            if (t.evaluationId) existingEvalIds.add(String(t.evaluationId));
            if (String(t.id || '').startsWith('eval_wall_')) existingEvalIds.add(String(t.id).replace(/^eval_wall_/, ''));
            if (t.reviewId) existingReviewIds.add(String(t.reviewId));
            if (String(t.id || '').startsWith('rev_wall_')) existingReviewIds.add(String(t.id).replace(/^rev_wall_/, ''));
            if (t.bookId) existingBookIds.add(String(t.bookId));
            if (String(t.id || '').startsWith('book_wall_')) existingBookIds.add(String(t.id).replace(/^book_wall_/, ''));
        });

        const baseList = (tasks || []).filter(t => {
            if (!t || t.isDeletedFromWall || t.isArchived) return false;
            if (t.type === 'evaluation' || t.evaluationId) {
                const evId = String(t.evaluationId || '').trim();
                if (evId && evalMap.has(evId)) {
                    const linkedEv = evalMap.get(evId);
                    if (linkedEv?.isArchived) return false;
                } else if (evId && Array.isArray(evaluations) && String(t.id || '').startsWith('eval_wall_')) {
                    return false;
                }
            }
            if (t.type === 'slides' || t.type === 'review' || t.reviewId) {
                const revId = String(t.reviewId || '').trim();
                if (revId && Array.isArray(reviews) && !reviewMap.has(revId) && String(t.id || '').startsWith('rev_wall_')) {
                    return false;
                }
            }
            if (t.type === 'book3d' && String(t.id || '').startsWith('book_wall_')) {
                const bkId = String(t.bookId || '').trim();
                if (bkId && Array.isArray(books) && !bookMap.has(bkId)) {
                    return false;
                }
            }
            return true;
        });

        const synthesized = [];

        (evaluations || []).forEach(ev => {
            if (!ev || !ev.id || ev.isArchived) return;
            if (existingEvalIds.has(String(ev.id))) return;
            const ownerTid = getItemTeacherId(ev);
            const teacherDisp = ev.authorName || getTeacherDisplayName(ownerTid);
            synthesized.push({
                id: `eval_wall_${ev.id}`,
                type: 'evaluation',
                evaluationId: ev.id,
                title: ev.title || 'Evaluación Académica',
                description: ev.description || '',
                dueDate: ev.dueDate || '',
                dueTime: ev.dueTime || '23:59',
                timeLimit: ev.timeLimit || 30,
                strictAntiCheat: Boolean(ev.strictAntiCheat),
                immediateFeedback: Boolean(ev.immediateFeedback),
                questionCount: Array.isArray(ev.questions) ? ev.questions.length : 0,
                targetGroupId: ev.targetGroupId || 'all',
                targetGroupName: ev.targetGroupName || 'General',
                targetStudentIds: Array.isArray(ev.targetStudentIds) ? ev.targetStudentIds : [],
                author: teacherDisp,
                authorName: teacherDisp,
                authorId: ownerTid,
                authorRole: 'teacher',
                teacherId: ownerTid,
                ownerTeacherId: ownerTid,
                createdAt: ev.createdAt || Date.now(),
                reactions: {},
                comments: [],
                isDemoCreated: Boolean(ev.isDemoCreated),
                isSynthesizedFeedItem: true
            });
        });

        (reviews || []).forEach(rev => {
            if (!rev || !rev.id) return;
            if (existingReviewIds.has(String(rev.id))) return;
            const ownerTid = getItemTeacherId(rev);
            const teacherDisp = rev.author || getTeacherDisplayName(ownerTid);
            const firstSlide = Array.isArray(rev.slides) && rev.slides.length > 0 ? rev.slides[0] : {};
            const rawSub = String(firstSlide.subtitle || firstSlide.description || '').trim();
            const isPlaceholderSub = !rawSub ||
                /^subt[íi]tulo de la presentaci[óo]n$/i.test(rawSub) ||
                /^haz clic para a[ñn]adir/i.test(rawSub) ||
                /^escribe un subt[íi]tulo/i.test(rawSub) ||
                /^a[ñn]ade una descripci[óo]n/i.test(rawSub);
            const slideCountNum = Array.isArray(rev.slides) ? rev.slides.length : (Number(rev.slideCount) || 0);
            const cleanSlideDesc = isPlaceholderSub
                ? `Presentación interactiva de ${slideCountNum} diapositivas (${rev.language || 'Inglés'}).`
                : rawSub;
            synthesized.push({
                id: `rev_wall_${rev.id}`,
                type: 'slides',
                reviewId: rev.id,
                title: rev.topic || firstSlide.title || 'Presentación de Diapositivas',
                description: cleanSlideDesc,
                slideCount: slideCountNum,
                language: rev.language || 'Inglés',
                theme: rev.theme || 'unipamplona',
                targetGroupId: rev.targetGroupId || 'all',
                targetGroupName: rev.targetGroupName || 'General',
                author: teacherDisp,
                authorName: teacherDisp,
                authorId: ownerTid,
                authorRole: 'teacher',
                teacherId: ownerTid,
                ownerTeacherId: ownerTid,
                createdAt: rev.createdAt || Date.now(),
                reactions: {},
                comments: [],
                isDemoCreated: Boolean(rev.isDemoCreated),
                isSynthesizedFeedItem: true
            });
        });

        (books || []).forEach(bk => {
            if (!bk || !bk.id) return;
            if (existingBookIds.has(String(bk.id))) return;
            const ownerTid = getItemTeacherId(bk);
            const teacherDisp = bk.authorName || bk.author || getTeacherDisplayName(ownerTid);
            const rawPages = Array.isArray(bk.bookPages) && bk.bookPages.length > 0 ? bk.bookPages : (Array.isArray(bk.pages) ? bk.pages : []);
            const pageCountNum = Math.max(rawPages.length, Number(bk.pageCount) || 0, 1);
            const firstPageSrc = rawPages[0] ? (typeof rawPages[0] === 'string' ? rawPages[0] : rawPages[0]?.imageUrl) : '';
            synthesized.push({
                id: `book_wall_${bk.id}`,
                type: 'book3d',
                bookId: bk.id,
                title: bk.title || 'Libro',
                description: bk.description || '',
                category: bk.category || bk.bookCategory || 'textbook',
                bookCategory: bk.category || bk.bookCategory || 'textbook',
                theme: bk.theme || bk.bookTheme || 'royal-indigo',
                bookTheme: bk.theme || bk.bookTheme || 'royal-indigo',
                aspectRatio: bk.aspectRatio || 0.707,
                pageCount: pageCountNum,
                customCoverUrl: bk.customCoverUrl || '',
                coverUrl: bk.coverUrl || firstPageSrc || '',
                bookPages: rawPages,
                pageTexts: Array.isArray(bk.pageTexts) ? bk.pageTexts : [],
                bookOutline: Array.isArray(bk.bookOutline) ? bk.bookOutline : [],
                pdfUrl: bk.pdfUrl || bk.fileUrl || '',
                fileUrl: bk.pdfUrl || bk.fileUrl || '',
                fileName: bk.pdfFileName || bk.fileName || `${bk.title || 'Libro'}.pdf`,
                targetGroupId: bk.targetGroupId || 'all',
                targetGroupName: bk.targetGroupName || 'General',
                ambientAudio: bk.ambientAudio,
                ambientAudioTrack: bk.ambientAudioTrack || bk.ambientAudio?.trackId || 'piano-calm',
                ambientAudioUrl: bk.ambientAudioUrl || bk.ambientAudio?.customUrl || '',
                ambientAudioEnabled: bk.ambientAudioEnabled ?? bk.ambientAudio?.enabled ?? true,
                ambientAudioVolume: bk.ambientAudioVolume ?? bk.ambientAudio?.volume ?? 0.22,
                author: teacherDisp,
                authorName: teacherDisp,
                authorId: ownerTid,
                authorRole: 'teacher',
                teacherId: ownerTid,
                ownerTeacherId: ownerTid,
                createdAt: bk.createdAt || Date.now(),
                reactions: {},
                comments: [],
                isDemoCreated: Boolean(bk.isDemoCreated),
                isSynthesizedFeedItem: true
            });
        });

        const merged = [...baseList, ...synthesized];
        merged.sort((a, b) => getTs(b) - getTs(a));
        return merged;
    }, [tasks, pinnedTasks, evaluations, reviews, books]);

    // Publicaciones regulares filtradas y deduplicadas
    const visibleTasks = React.useMemo(() => {
        return deduplicateTasks((combinedTasks || []).filter(isTaskVisibleForUser));
    }, [combinedTasks, isTaskVisibleForUser, deduplicateTasks]);

    // Publicaciones fijadas (Pinned Posts) con el MISMO filtro estricto y deduplicadas
    const visiblePinnedTasks = React.useMemo(() => {
        const evalMap = new Map((evaluations || []).filter(Boolean).map(ev => [String(ev.id), ev]));
        const reviewMap = new Map((reviews || []).filter(Boolean).map(rv => [String(rv.id), rv]));
        const bookMap = new Map((books || []).filter(Boolean).map(bk => [String(bk.id), bk]));
        const tasksById = new Map((tasks || []).filter(Boolean).map(t => [String(t.id), t]));
        const combinedPinned = (combinedTasks || []).filter(t => t && t.isPinned);
        const rawCandidates = [...combinedPinned, ...(pinnedTasks || [])];
        const validPinned = rawCandidates.filter(t => {
            if (!t || t.isDeletedFromWall || t.isArchived) return false;
            const stateTask = tasksById.get(String(t.id));
            if (stateTask && (stateTask.isPinned === false || stateTask.isDeletedFromWall || stateTask.isArchived)) return false;
            if (t.type === 'evaluation' || t.evaluationId) {
                const evId = String(t.evaluationId || '').trim();
                if (evId && evalMap.has(evId) && evalMap.get(evId)?.isArchived) return false;
                if (evId && Array.isArray(evaluations) && !evalMap.has(evId) && String(t.id || '').startsWith('eval_wall_')) return false;
            }
            if (t.type === 'slides' || t.type === 'review' || t.reviewId) {
                const revId = String(t.reviewId || '').trim();
                if (revId && Array.isArray(reviews) && !reviewMap.has(revId) && String(t.id || '').startsWith('rev_wall_')) return false;
            }
            if (t.type === 'book3d' && String(t.id || '').startsWith('book_wall_')) {
                const bkId = String(t.bookId || '').trim();
                if (bkId && Array.isArray(books) && !bookMap.has(bkId)) return false;
            }
            return isTaskVisibleForUser(t);
        });
        return deduplicateTasks(validPinned);
    }, [combinedTasks, tasks, pinnedTasks, evaluations, reviews, books, isTaskVisibleForUser, deduplicateTasks]);

    // Buscador de publicaciones
    const filteredTasks = React.useMemo(() => {
        if (!wallSearchTerm.trim()) return visibleTasks;
        const term = wallSearchTerm.trim().toLowerCase();
        return visibleTasks.filter(t => {
            const hay = (t.title || '') + ' ' + (t.description || '');
            return hay.toLowerCase().includes(term);
        });
    }, [visibleTasks, wallSearchTerm]);

    // Publicaciones fijadas filtradas por término de búsqueda
    const filteredPinnedTasks = React.useMemo(() => {
        if (!wallSearchTerm.trim()) return visiblePinnedTasks;
        const term = wallSearchTerm.trim().toLowerCase();
        return visiblePinnedTasks.filter(t => {
            const hay = (t.title || '') + ' ' + (t.description || '');
            return hay.toLowerCase().includes(term);
        });
    }, [visiblePinnedTasks, wallSearchTerm]);

    // Publicaciones regulares listas para renderizar (excluyendo cualquier post fijado)
    const regularTasksToRender = React.useMemo(() => {
        const pinnedIdSet = new Set(visiblePinnedTasks.map(p => String(p.id || '').trim()).filter(Boolean));
        return filteredTasks.filter(t => {
            const id = String(t.id || '').trim();
            if (id && pinnedIdSet.has(id)) return false;
            if (t.isPinned) return false;
            return true;
        });
    }, [filteredTasks, visiblePinnedTasks]);

    // Publicación solicitada vía modal directo (#post/<id>) que podría no estar en el listado filtrado actual
    const modalStandaloneTask = React.useMemo(() => {
        if (!activePostModalId) return null;
        return (combinedTasks || tasks || []).find(t => String(t?.id) === String(activePostModalId)) || null;
    }, [activePostModalId, combinedTasks, tasks]);

    const teacherPic = resolveUserPhoto(myChatId, userMappings, userMappings?.[myChatId]?.profilePicUrl || '');
    const activeComposerGroupObj = (academicGroups || []).find(g => String(g?.id || '').replace(/^acad_/i, '').toLowerCase() === String((fixedTargetGroup || postTargetGroup || '')).replace(/^acad_/i, '').toLowerCase());
    const currentImgList = (postImageUrls && postImageUrls.length > 0 ? postImageUrls : (postImageUrl ? [postImageUrl] : []));
    const hasAttachments = Boolean((currentImgList && currentImgList.length > 0) || postVideoUrl || postGeniallyUrl || postFileUrl || audioPub);

    // FUNCIÓN UNIFICADA DE PUBLICACIÓN BLINDADA (PASO 4)
    const executePublishTask = async () => {
        if (isPublishing || isPublishingRef.current) return;
        if (recPub) {
            return showMessage("Detén la grabación de voz antes de publicar.");
        }
        if (upPub) {
            return showMessage("Espera a que termine de subir la nota de voz...");
        }
        const cleanTitle = (taskTitle || '').trim();
        const cleanDesc = (taskDesc || '').trim();
        const rawMainImg = (postImageUrls && postImageUrls.length > 0 ? postImageUrls[0] : (postImageUrl || ''));
        const hasAnyAttachment = Boolean(rawMainImg || postVideoUrl || postGeniallyUrl || postFileUrl || audioPub);
        const currentPostType = postType || 'task';
        if (currentPostType === 'book3d') {
            if (book3dMode === 'upload' && (book3dPages.length === 0 || !book3dPdfFile)) {
                return showMessage("⚠️ Selecciona un archivo PDF.");
            }
            if (book3dMode === 'create' && !cleanTitle) {
                return showMessage("⚠️ Escribe un título para el libro.");
            }
        }
        if (currentPostType !== 'kahoot' && currentPostType !== 'book3d' && !cleanTitle && !cleanDesc && !hasAnyAttachment) {
            return showMessage("Por favor ingresa al menos un título o descripción para publicar.");
        }

        const finalTargetGroup = fixedTargetGroup || postTargetGroup;
        if (!finalTargetGroup) {
            setComposerStep(1);
            return showMessage("⚠️ Por favor selecciona a qué materia o grupo deseas dirigir la publicación.");
        }

        let validPoll = null;
        if (currentPostType === 'poll') {
            if (!cleanTitle) {
                return showMessage("⚠️ Por favor ingresa la pregunta principal de la encuesta.");
            }
            const validOptions = pollOptions.map(o => (o || '').trim()).filter(Boolean);
            if (validOptions.length < 2) {
                return showMessage("⚠️ La encuesta debe tener al menos 2 opciones de respuesta con texto.");
            }
            validPoll = {
                isMultipleChoice: Boolean(isMultipleChoice),
                options: validOptions.map((optText, idx) => ({
                    id: `opt_${Date.now()}_${idx}`,
                    text: optText,
                    voterIds: []
                }))
            };
        }

        let validKahoot = null;
        if (currentPostType === 'kahoot') {
            const validation = validateKahootConfig(kahootQuestions);
            if (!validation.valid) {
                return showMessage(`⚠️ ${validation.error}`);
            }
            validKahoot = {
                pin: generateKahootPin(),
                status: 'live',
                phase: 'lobby',
                currentQuestionIndex: 0,
                questionStartedAt: 0,
                musicEnabled: true,
                allowNicknameChange: true,
                reviewEnabled: false,
                questions: validation.normalizedQuestions,
                participants: {},
                updatedAt: Date.now()
            };
        }
        isPublishingRef.current = true;
        setIsPublishing(true);
        const cleanTargetId = String(finalTargetGroup).replace(/^acad_/i, '').trim().toLowerCase();
        const isTimed = (currentPostType === 'task' || currentPostType === 'forum' || currentPostType === 'poll') && Boolean(hasDueDate);
        const targetGrpObj = academicGroups?.find(g => {
            if (!g) return false;
            const gClean = String(g.id || '').replace(/^acad_/i, '').trim().toLowerCase();
            return String(g?.id || '').toLowerCase() === String(finalTargetGroup || '').toLowerCase() || gClean === cleanTargetId;
        });
        const targetGroupName = targetGrpObj?.name 
            ? targetGrpObj.name 
            : (cleanTargetId === 'all' || !cleanTargetId ? 'Global' : '');
        const resolvedTargetGroupId = targetGrpObj ? targetGrpObj.id : (cleanTargetId || 'all');

        const effectiveDb = db || defaultDb;
        const effectiveAppId = appId || defaultAppId;

        const withTimeout = (promise, ms = 12000, errorMsg = "La conexión con el servidor tardó demasiado. Por favor verifica tu internet.") => {
            return Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
            ]);
        };

        try {
            if (!isDemoMode && !auth.currentUser) {
                try {
                    await Promise.race([
                        signInAnonymously(auth),
                        new Promise(r => setTimeout(r, 2500))
                    ]);
                } catch (authErr) {
                    console.warn("Auth initialization note:", authErr);
                }
            }

            if (currentPostType === 'book3d') {
                const bookId = isDemoMode ? `demo-book-${Date.now()}` : `book_${generateId()}`;
                const canonicalOwnerId = getCanonicalTeacherId(myChatId || loggedInName || 'teacher');
                const authorDisplay = loggedInName || getTeacherDisplayName(canonicalOwnerId) || 'Docente';
                const plainInstructions = stripBookHtml(cleanDesc);

                let pagesToPublish = book3dPages;
                let pageTextsToPublish = book3dPageTexts;
                let outlineToPublish = book3dOutline;

                if (pagesToPublish.length === 0 && book3dMode === 'create') {
                    const generated = await generateAiBookPages({
                        topic: cleanTitle || 'Libro',
                        title: cleanTitle || 'Libro',
                        instructions: plainInstructions,
                        description: plainInstructions,
                        language: book3dLanguage,
                        pageCount: book3dPageCount,
                        themeId: book3dTheme,
                        author: authorDisplay,
                        category: 'textbook',
                        customCoverUrl: book3dCustomCover,
                        callGemini
                    });
                    pagesToPublish = generated.pages || [];
                    pageTextsToPublish = generated.pageTexts || [];
                    outlineToPublish = generated.outline || [];
                } else if (Array.isArray(outlineToPublish) && outlineToPublish.length > 0 && !book3dPdfFile) {
                    outlineToPublish = syncBookOutlineMetadata(outlineToPublish, {
                        title: cleanTitle || 'Libro',
                        description: plainInstructions,
                        author: authorDisplay
                    });
                    pagesToPublish = buildBookPagesFromOutline(outlineToPublish, {
                        themeId: book3dTheme,
                        author: authorDisplay,
                        customCoverUrl: book3dCustomCover
                    });
                    pageTextsToPublish = extractBookOutlinePageTexts(outlineToPublish);
                } else if (pagesToPublish.length === 0 && book3dPdfFile) {
                    try {
                        const rendered = await renderPdfToBookPages(book3dPdfFile, {
                            maxPages: 60,
                            scale: 1.6,
                            maxDimension: 1350,
                            quality: 0.82,
                            fallbackTitle: cleanTitle || book3dPdfFile.name.replace(/\.pdf$/i, ''),
                            themeId: book3dTheme
                        });
                        if (Array.isArray(rendered?.pages) && rendered.pages.length > 0) {
                            pagesToPublish = rendered.pages;
                            pageTextsToPublish = rendered.pageTexts || [];
                        }
                    } catch (renderErr) {
                        console.warn('PDF render fallback during publish:', renderErr);
                    }
                }

                if (book3dCustomCover) {
                    pagesToPublish = applyCustomCoverToPages(pagesToPublish, book3dCustomCover);
                }

                const uploadedPages = await uploadBookPagesToStorage(
                    pagesToPublish,
                    uploadImageToStorage,
                    {
                        isDemoMode,
                        folder: 'books'
                    }
                );
                let uploadedPdfUrl = postFileUrl || '';
                let sessionBlobPdfUrl = '';
                if (book3dPdfFile) {
                    if (!isDemoMode) {
                        try {
                            const rawUrl = await uploadRawFileToStorage(book3dPdfFile, 'books');
                            if (rawUrl) uploadedPdfUrl = rawUrl;
                        } catch (e) {
                            console.warn("PDF raw upload fallback:", e);
                        }
                    }
                    if (!uploadedPdfUrl && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
                        try {
                            sessionBlobPdfUrl = URL.createObjectURL(book3dPdfFile);
                        } catch {
                            sessionBlobPdfUrl = '';
                        }
                    }
                }
                const persistedPdfUrl = uploadedPdfUrl || (isDemoMode ? sessionBlobPdfUrl : '');
                const activeSessionPdfUrl = uploadedPdfUrl || sessionBlobPdfUrl || '';
                const finalBookTitle = cleanTitle || (book3dPdfFile?.name ? book3dPdfFile.name.replace(/\.pdf$/i, '') : 'Libro');
                const ambientAudioPayload = {
                    enabled: Boolean(book3dAmbientEnabled),
                    trackId: book3dAmbientTrack || 'piano-calm',
                    customUrl: (book3dAmbientUrl || '').trim(),
                    volume: clampReadingVolume(book3dAmbientVolume),
                    title: getReadingAudioPreset(book3dAmbientTrack)?.name || 'Música de lectura'
                };
                const sanitizedBook = sanitizeBookForFirestore({
                    id: bookId,
                    title: finalBookTitle,
                    subtitle: '',
                    description: plainInstructions,
                    category: 'textbook',
                    theme: book3dTheme,
                    aspectRatio: book3dAspectRatio || 0.707,
                    pageCount: uploadedPages.length,
                    customCoverUrl: book3dCustomCover ? uploadedPages[0] || book3dCustomCover : '',
                    coverUrl: uploadedPages[0] || '',
                    pdfUrl: persistedPdfUrl,
                    fileUrl: persistedPdfUrl,
                    fileName: book3dPdfFile?.name || ((persistedPdfUrl || activeSessionPdfUrl) ? `${finalBookTitle}.pdf` : ''),
                    pdfFileName: book3dPdfFile?.name || ((persistedPdfUrl || activeSessionPdfUrl) ? `${finalBookTitle}.pdf` : ''),
                    bookPages: uploadedPages,
                    pageTexts: pageTextsToPublish,
                    bookOutline: Array.isArray(outlineToPublish) && outlineToPublish.length > 0 ? outlineToPublish : [],
                    targetGroupId: resolvedTargetGroupId,
                    targetGroupName: targetGroupName || 'Global',
                    author: authorDisplay,
                    authorName: authorDisplay,
                    authorId: canonicalOwnerId,
                    teacherId: canonicalOwnerId,
                    ownerTeacherId: canonicalOwnerId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    isDemoCreated: Boolean(isDemoMode),
                    ambientAudio: ambientAudioPayload,
                    ambientAudioTrack: ambientAudioPayload.trackId,
                    ambientAudioUrl: ambientAudioPayload.customUrl,
                    ambientAudioEnabled: ambientAudioPayload.enabled,
                    ambientAudioVolume: ambientAudioPayload.volume
                });

                const inMemoryBook = {
                    ...sanitizedBook,
                    bookPages: uploadedPages.length > 0 ? uploadedPages : sanitizedBook.bookPages,
                    coverUrl: uploadedPages[0] || sanitizedBook.coverUrl,
                    pageCount: Math.max(uploadedPages.length, sanitizedBook.pageCount || 0),
                    pdfUrl: activeSessionPdfUrl || sanitizedBook.pdfUrl,
                    fileUrl: activeSessionPdfUrl || sanitizedBook.fileUrl,
                    ambientAudio: ambientAudioPayload,
                    ambientAudioTrack: ambientAudioPayload.trackId,
                    ambientAudioUrl: ambientAudioPayload.customUrl,
                    ambientAudioEnabled: ambientAudioPayload.enabled,
                    ambientAudioVolume: ambientAudioPayload.volume
                };

                const wallPostId = `book_wall_${bookId}`;
                const wallPostPayload = {
                    id: wallPostId,
                    type: 'book3d',
                    bookId,
                    title: sanitizedBook.title,
                    description: sanitizedBook.description,
                    category: sanitizedBook.category,
                    bookCategory: sanitizedBook.category,
                    theme: sanitizedBook.theme,
                    bookTheme: sanitizedBook.theme,
                    aspectRatio: sanitizedBook.aspectRatio,
                    pageCount: sanitizedBook.pageCount,
                    customCoverUrl: sanitizedBook.customCoverUrl || '',
                    coverUrl: sanitizedBook.coverUrl,
                    bookPages: sanitizedBook.bookPages,
                    pageTexts: sanitizedBook.pageTexts || [],
                    bookOutline: sanitizedBook.bookOutline || [],
                    pdfUrl: sanitizedBook.pdfUrl || '',
                    fileUrl: sanitizedBook.pdfUrl || '',
                    fileName: sanitizedBook.pdfFileName || '',
                    targetGroupId: sanitizedBook.targetGroupId,
                    targetGroupName: sanitizedBook.targetGroupName,
                    author: sanitizedBook.authorName,
                    authorName: sanitizedBook.authorName,
                    authorId: sanitizedBook.authorId,
                    authorRole: 'teacher',
                    teacherId: sanitizedBook.teacherId,
                    ownerTeacherId: sanitizedBook.ownerTeacherId,
                    hideDate: Boolean(hidePublicationDate),
                    createdAt: Date.now(),
                    reactions: {},
                    comments: [],
                    isDemoCreated: Boolean(isDemoMode),
                    ambientAudio: ambientAudioPayload,
                    ambientAudioTrack: ambientAudioPayload.trackId,
                    ambientAudioUrl: ambientAudioPayload.customUrl,
                    ambientAudioEnabled: ambientAudioPayload.enabled,
                    ambientAudioVolume: ambientAudioPayload.volume
                };

                const inMemoryWallPost = {
                    ...wallPostPayload,
                    bookPages: inMemoryBook.bookPages,
                    coverUrl: inMemoryBook.coverUrl,
                    pageCount: inMemoryBook.pageCount,
                    pdfUrl: inMemoryBook.pdfUrl,
                    fileUrl: inMemoryBook.fileUrl,
                    ambientAudio: ambientAudioPayload,
                    ambientAudioTrack: ambientAudioPayload.trackId,
                    ambientAudioUrl: ambientAudioPayload.customUrl,
                    ambientAudioEnabled: ambientAudioPayload.enabled,
                    ambientAudioVolume: ambientAudioPayload.volume
                };

                if (isDemoMode) {
                    const savedBook = saveDemoSandboxItem('books', sanitizedBook);
                    if (typeof setRawBooks === 'function') {
                        setRawBooks(prev => [{ ...savedBook, ...inMemoryBook }, ...(prev || []).filter(b => String(b.id) !== String(bookId))]);
                    }
                    const savedWall = saveDemoSandboxItem('tasks', wallPostPayload);
                    if (typeof setTasks === 'function') {
                        setTasks(prev => [{ ...savedWall, ...inMemoryWallPost }, ...(prev || []).filter(t => String(t.id) !== String(wallPostId))]);
                    }
                } else {
                    await withTimeout(setDoc(doc(effectiveDb, 'artifacts', effectiveAppId, 'public', 'data', 'books', bookId), sanitizedBook, { merge: true }));
                    await withTimeout(setDoc(doc(effectiveDb, 'artifacts', effectiveAppId, 'public', 'data', 'tasks', wallPostId), sanitizeFirestoreData(wallPostPayload), { merge: true }));
                    if (typeof setRawBooks === 'function') {
                        setRawBooks(prev => [inMemoryBook, ...(prev || []).filter(b => String(b.id) !== String(bookId))]);
                    }
                    if (typeof setTasks === 'function') {
                        setTasks(prev => [inMemoryWallPost, ...(prev || []).filter(t => String(t.id) !== String(wallPostId))]);
                    }
                }

                setBook3dPages([]);
                setBook3dPageTexts([]);
                setBook3dOutline([]);
                setBook3dCustomCover('');
                setBook3dRawPdfFirstPage('');
                setBook3dPdfFile(null);
                setBook3dPreviewModal(null);
                setBook3dAmbientEnabled(true);
                setBook3dAmbientTrack('piano-calm');
                setBook3dAmbientUrl('');
                setBook3dAmbientVolume(0.22);
                if (book3dPreviewingAmbient) {
                    readingAmbientPlayer.stop({ fadeOutDuration: 0.5 });
                    setBook3dPreviewingAmbient(false);
                }
                if (typeof setTaskTitle === 'function') setTaskTitle("");
                if (typeof setTaskDesc === 'function') setTaskDesc("");
                setIsFormExpanded(false);
                setPostTargetGroup(fixedTargetGroup || "");
                setComposerStep(fixedTargetGroup ? 2 : 1);
                showMessage("📚 Libro publicado.");
                return;
            }

            const cleanMainImg = typeof rawMainImg === 'string' ? rawMainImg.trim() : '';
            const cleanImgList = (postImageUrls && postImageUrls.length > 0 ? postImageUrls : (postImageUrl ? [postImageUrl] : []))
                .filter(img => typeof img === 'string' && img.trim())
                .map(img => img.trim());

            const resolvedPostTitle = cleanTitle || (currentPostType === 'kahoot' ? 'Kahoot' : (hasAnyAttachment ? 'Publicación adjunta' : 'Sin título'));

            const payload = { 
                type: currentPostType, 
                title: resolvedPostTitle, 
                description: cleanDesc, 
                authorName: loggedInName || 'Profesora', 
                authorId: myChatId || 'teacher',
                teacherId: myChatId || 'teacher',
                ownerTeacherId: myChatId || 'teacher',
                targetGroupId: resolvedTargetGroupId,
                imageUrl: cleanMainImg,
                imageUrls: cleanImgList, 
                fileUrl: postFileUrl || '', 
                fileName: postFileName || '', 
                dueDate: (isTimed && taskDate) ? String(taskDate) : null, 
                dueTime: (isTimed && taskTime) ? String(taskTime) : null, 
                allowLate: (isTimed && currentPostType !== 'poll' && currentPostType !== 'kahoot') ? Boolean(allowLate) : (currentPostType === 'poll' || currentPostType === 'kahoot' ? false : true),
                hideDate: Boolean(hidePublicationDate),
                createdAt: Date.now(), 
                comments: [], 
                reactions: {} 
            };

            if (validPoll) payload.poll = validPoll;
            if (validKahoot) payload.kahoot = validKahoot;
            if (postVideoUrl && postVideoUrl.trim()) payload.videoUrl = postVideoUrl.trim();
            if (postGeniallyUrl && postGeniallyUrl.trim()) payload.geniallyUrl = extractGeniallyUrl(postGeniallyUrl.trim());
            if (audioPub && typeof audioPub === 'string' && audioPub.trim()) payload.audioUrl = audioPub.trim();
            if (targetGroupName) payload.targetGroupName = targetGroupName;
            if (role) payload.authorRole = role;
            if (isDemoMode) {
                payload.isDemoCreated = true;
                payload.expiresAt = Date.now() + DEMO_TTL_MS;
            }

            // Asegurar que no existan valores undefined en el documento
            Object.keys(payload).forEach(k => {
                if (payload[k] === undefined) {
                    delete payload[k];
                }
            });

            let createdPostId = null;
            if (isDemoMode) {
                const demoCreatedTask = saveDemoSandboxItem('tasks', {
                    id: `demo-task-${Date.now()}`,
                    ...payload
                });
                createdPostId = demoCreatedTask.id;
                if (typeof setTasks === 'function') {
                    setTasks(prev => [demoCreatedTask, ...(prev || []).filter(t => String(t.id) !== String(demoCreatedTask.id))]);
                }
            } else {
                try {
                    const docRef = await withTimeout(addDoc(collection(effectiveDb, 'artifacts', effectiveAppId, 'public', 'data', 'tasks'), sanitizeFirestoreData(payload)));
                    createdPostId = docRef?.id || null;
                } catch (primaryErr) {
                    console.warn("Retrying task creation with basic schema:", primaryErr);
                    const basicPayload = {
                        type: currentPostType,
                        title: resolvedPostTitle,
                        description: cleanDesc,
                        authorName: loggedInName || 'Profesora',
                        authorId: myChatId || 'teacher',
                        teacherId: myChatId || 'teacher',
                        ownerTeacherId: myChatId || 'teacher',
                        targetGroupId: resolvedTargetGroupId,
                        imageUrl: cleanMainImg,
                        imageUrls: cleanImgList,
                        fileUrl: postFileUrl || '',
                        fileName: postFileName || '',
                        dueDate: isTimed && taskDate ? String(taskDate) : null,
                        dueTime: isTimed && taskTime ? String(taskTime) : null,
                        allowLate: (isTimed && currentPostType !== 'poll' && currentPostType !== 'kahoot') ? Boolean(allowLate) : (currentPostType === 'poll' || currentPostType === 'kahoot' ? false : true),
                        hideDate: Boolean(hidePublicationDate),
                        createdAt: Date.now(),
                        comments: [],
                        reactions: {}
                    };
                    if (postGeniallyUrl && postGeniallyUrl.trim()) basicPayload.geniallyUrl = extractGeniallyUrl(postGeniallyUrl.trim());
                    if (validPoll) basicPayload.poll = validPoll;
                    if (validKahoot) basicPayload.kahoot = validKahoot;
                    const docRef2 = await withTimeout(addDoc(collection(effectiveDb, 'artifacts', effectiveAppId, 'public', 'data', 'tasks'), sanitizeFirestoreData(basicPayload)), 10000);
                    createdPostId = docRef2?.id || null;
                }
            }

            // Despachar notificación automática por correo Google a los estudiantes del grupo
            dispatchStudentEmailNotification({
                type: 'wall_post',
                post: {
                    id: createdPostId,
                    type: currentPostType,
                    title: resolvedPostTitle,
                    description: cleanDesc,
                    dueDate: isTimed && taskDate ? String(taskDate) : null,
                    dueTime: isTimed && taskTime ? String(taskTime) : null,
                    targetGroupId: resolvedTargetGroupId,
                    targetGroupName: targetGroupName || 'Inglés Técnico Económico'
                },
                senderName: loggedInName || 'Profesora',
                targetGroupId: resolvedTargetGroupId,
                academicGroups,
                chatGroups,
                userMappings,
                appId: effectiveAppId,
                db: effectiveDb,
                isDemoMode,
                saveDemoSandboxItem,
                addDocFn: addDoc,
                collectionFn: collection
            }).then(notifRes => {
                if (notifRes?.count > 0 && typeof showMessage === 'function') {
                    showMessage(`📧 Notificación enviada a ${notifRes.count} estudiante(s) por correo Google.`);
                }
            }).catch(errNotif => {
                console.warn('Error en notificación por correo:', errNotif);
            });

            if (typeof setTaskTitle === 'function') setTaskTitle("");
            if (typeof setTaskDesc === 'function') setTaskDesc("");
            if (typeof setPostImageUrl === 'function') setPostImageUrl("");
            if (typeof setPostImageUrls === 'function') setPostImageUrls([]);
            if (typeof setPostVideoUrl === 'function') setPostVideoUrl("");
            setPostGeniallyUrl("");
            setShowGeniallyInput(false);
            if (typeof setPostFileUrl === 'function') setPostFileUrl("");
            if (typeof setPostFileName === 'function') setPostFileName("");
            if (typeof setAudioPub === 'function') setAudioPub(""); 
            setPollOptions(["", ""]);
            setIsMultipleChoice(false);
            setKahootQuestions([createDefaultKahootQuestion('quiz', 0)]);
            setShowImageInput(false);
            setShowVideoInput(false);
            setShowPostAttachmentMenu(false); 
            const todayStr = typeof getToday === 'function' ? getToday() : new Date().toISOString().split('T')[0];
            if (typeof setTaskDate === 'function') setTaskDate(todayStr);
            if (typeof setTaskTime === 'function') setTaskTime("23:59");
            setHidePublicationDate(false);
            if (typeof setHasAiModified === 'function') setHasAiModified(false);
            if (typeof setAllowLate === 'function') setAllowLate(false);
            setHasDueDate(true);
            setIsFormExpanded(false);
            setPostTargetGroup(fixedTargetGroup || "");
            setComposerStep(fixedTargetGroup ? 2 : 1);
            if (isDemoMode) {
                showMessage("Publicación creada en Modo Demo.");
            } else {
                showMessage(currentPostType === 'kahoot' ? "Kahoot publicado con éxito." : currentPostType === 'poll' ? "Encuesta publicada con éxito." : currentPostType === 'forum' ? "Foro de debate publicado con éxito." : currentPostType === 'task' ? "Tarea publicada con éxito." : "Publicación compartida con éxito.");
            }
        } catch (err) {
            console.error("Error al publicar:", err);
            showMessage(`Error al publicar: ${err?.message || 'Intenta nuevamente.'}`);
        } finally {
            isPublishingRef.current = false;
            setIsPublishing(false);
        }
    };

    return (
        <div className="space-y-4">
            
            {/* COMPOSER CARD (ALWAYS MOUNTED FOR FLUID 60FPS CSS ACCORDION EXPANSION) */}
            {role === 'teacher' && (
                <div className={`${glassCard} !p-0 mb-6 border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-xl rounded-3xl transition-all duration-300 overflow-hidden`}>
                    {/* TRIGGER BAR (Visible when collapsed) */}
                    <div 
                        onClick={() => {
                            if (!postTargetGroup && fixedTargetGroup) setPostTargetGroup(fixedTargetGroup);
                            setComposerStep(fixedTargetGroup ? 2 : 1);
                            setIsFormExpanded(true);
                        }} 
                        className={`p-4 cursor-pointer transition-all duration-300 ${!isFormExpanded ? 'block' : 'hidden'}`}
                    >
                        <div className="flex items-center gap-3">
                            {teacherPic ? (
                                <img loading="lazy" decoding="async" 
                                    src={teacherPic} 
                                    alt={loggedInName} 
                                    className="w-11 h-11 rounded-full object-cover shadow-md border-2 border-white dark:border-gray-700 shrink-0" 
                                />
                            ) : (
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#AD3333] to-[#8a2828] text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0 border-2 border-white dark:border-gray-700">
                                    {loggedInName?.charAt(0) || 'G'}
                                </div>
                            )}
                            <div className={`flex-1 px-4 py-2.5 rounded-full border text-sm font-medium transition-all truncate select-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200/70'}`}>
                                {dynamicPlaceholder}
                            </div>
                            <button type="button" className="p-2.5 rounded-full bg-red-50 dark:bg-red-950/40 text-[#AD3333] hover:scale-110 transition-transform shadow-sm" title="Crear">
                                <Plus size={18} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400 w-full overflow-hidden">
                            <div className="flex gap-2 items-center overflow-x-auto overflow-y-hidden pb-1 pt-0.5 max-w-full hide-scrollbars no-scrollbar select-none" style={{ WebkitOverflowScrolling: 'touch' }}>
                                <button 
                                    type="button" 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setPostType('task'); 
                                        if (fixedTargetGroup) {
                                            setPostTargetGroup(fixedTargetGroup);
                                            setComposerStep(2);
                                        } else {
                                            setComposerStep(1);
                                        }
                                        setIsFormExpanded(true); 
                                    }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-[#AD3333] hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors shrink-0 whitespace-nowrap"
                                >
                                    <NavNotebook size={15} /> Tarea
                                </button>
                                <button 
                                    type="button" 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setPostType('forum'); 
                                        if (fixedTargetGroup) {
                                            setPostTargetGroup(fixedTargetGroup);
                                            setComposerStep(2);
                                        } else {
                                            setComposerStep(1);
                                        }
                                        setIsFormExpanded(true); 
                                    }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors shrink-0 whitespace-nowrap"
                                >
                                    <MessageCircle size={15} /> Foro
                                </button>
                                <button 
                                    type="button" 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setPostType('post'); 
                                        if (fixedTargetGroup) {
                                            setPostTargetGroup(fixedTargetGroup);
                                            setComposerStep(2);
                                        } else {
                                            setComposerStep(1);
                                        }
                                        setIsFormExpanded(true); 
                                    }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors shrink-0 whitespace-nowrap"
                                >
                                    <BookOpen size={15} /> Publicación
                                </button>
                                <button 
                                    type="button" 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setPostType('poll'); 
                                        if (fixedTargetGroup) {
                                            setPostTargetGroup(fixedTargetGroup);
                                            setComposerStep(2);
                                        } else {
                                            setComposerStep(1);
                                        }
                                        setIsFormExpanded(true); 
                                    }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors shrink-0 whitespace-nowrap"
                                >
                                    <BarChart2 size={15} /> Encuesta
                                </button>
                                <button 
                                    type="button" 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setPostType('kahoot'); 
                                        if (fixedTargetGroup) {
                                            setPostTargetGroup(fixedTargetGroup);
                                            setComposerStep(2);
                                        } else {
                                            setComposerStep(1);
                                        }
                                        setIsFormExpanded(true); 
                                    }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/60 transition-colors shrink-0 whitespace-nowrap"
                                >
                                    <Gamepad2 size={15} /> Kahoot
                                </button>
                                <button 
                                    type="button" 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setPostType('book3d'); 
                                        if (fixedTargetGroup) {
                                            setPostTargetGroup(fixedTargetGroup);
                                            setComposerStep(2);
                                        } else {
                                            setComposerStep(1);
                                        }
                                        setIsFormExpanded(true); 
                                    }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-950/60 transition-colors shrink-0 whitespace-nowrap"
                                >
                                    <Book size={15} /> Libro
                                </button>
                                {typeof onOpenEvaluationsTab === 'function' && (
                                    <button 
                                        type="button" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenEvaluationsTab(
                                                activeComposerGroupObj?.id || fixedTargetGroup || 'all',
                                                activeComposerGroupObj?.name || 'Todos los estudiantes (Global)'
                                            );
                                        }} 
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors shrink-0 whitespace-nowrap"
                                    >
                                        <ClipboardList size={15} /> Evaluación
                                    </button>
                                )}
                                {typeof onOpenReviewsTab === 'function' && (
                                    <button 
                                        type="button" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenReviewsTab({
                                                openCreate: true,
                                                targetGroupId: activeComposerGroupObj?.id || fixedTargetGroup || 'all',
                                                targetGroupName: activeComposerGroupObj?.name || 'Todos los estudiantes (Global)'
                                            });
                                        }} 
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors shrink-0 whitespace-nowrap"
                                    >
                                        <NavSlides size={15} /> Diapositivas
                                    </button>
                                )}
                                <button 
                                    type="button" 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (fixedTargetGroup) {
                                            setPostTargetGroup(fixedTargetGroup);
                                            setComposerStep(3);
                                        } else {
                                            setComposerStep(1);
                                        }
                                        setIsFormExpanded(true); 
                                    }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0 whitespace-nowrap"
                                >
                                    <PaperclipIcon size={15} /> Adjuntar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* EXPANDED DRAWER (Fluid accordion expansion with CSS max-height transition) */}
                    <div 
                        className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                            isFormExpanded 
                                ? 'max-h-[8000px] opacity-100 p-4 sm:p-5' 
                                : 'max-h-0 opacity-0 p-0 pointer-events-none'
                        }`}
                    >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                {teacherPic ? (
                                    <img 
                                        src={teacherPic} 
                                        alt={loggedInName} 
                                        className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm shrink-0" 
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#AD3333] to-[#8a2828] text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                                        {loggedInName?.charAt(0) || 'G'}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-sm leading-tight text-gray-900 dark:text-gray-100">{loggedInName}</h3>
                                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Crear contenido docente</p>
                                </div>
                            </div>

                            <button 
                                type="button" 
                                onClick={() => setIsFormExpanded(false)} 
                                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer" 
                                title="Minimizar formulario"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Barra de Pasos Minimalista (Stepper) */}
                        <div className="w-full py-2.5 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between gap-1 sm:gap-2 max-w-xl mx-auto select-none">
                                {/* Paso 1: Grupo */}
                                <button
                                    type="button"
                                    onClick={() => setComposerStep(1)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        composerStep === 1 
                                            ? 'bg-blue-600 text-white shadow-xs' 
                                            : postTargetGroup 
                                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100' 
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                    }`}
                                >
                                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border border-current">
                                        {postTargetGroup && composerStep > 1 ? <CheckLine size={10} className="text-current" /> : '1'}
                                    </span>
                                    <span className="hidden sm:inline">1. Grupo</span>
                                </button>

                                <div className={`flex-1 h-0.5 rounded-full transition-colors ${composerStep > 1 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`} />

                                {/* Paso 2: Contenido */}
                                <button
                                    type="button"
                                    disabled={!postTargetGroup}
                                    onClick={() => postTargetGroup && setComposerStep(2)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                                        composerStep === 2 
                                            ? 'bg-blue-600 text-white shadow-xs' 
                                            : (taskTitle || taskDesc || composerStep > 2) 
                                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100' 
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                    }`}
                                >
                                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border border-current">
                                        {(taskTitle || taskDesc) && composerStep > 2 ? <CheckLine size={10} className="text-current" /> : '2'}
                                    </span>
                                    <span className="hidden sm:inline">2. Contenido</span>
                                </button>

                                <div className={`flex-1 h-0.5 rounded-full transition-colors ${composerStep > 2 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`} />

                                {/* Paso 3: Adjuntos */}
                                <button
                                    type="button"
                                    disabled={!postTargetGroup}
                                    onClick={() => postTargetGroup && setComposerStep(3)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                                        composerStep === 3 
                                            ? 'bg-blue-600 text-white shadow-xs' 
                                            : composerStep > 3 
                                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100' 
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                    }`}
                                >
                                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border border-current">
                                        {hasAttachments ? <CheckLine size={10} className="text-current" /> : '3'}
                                    </span>
                                    <span className="hidden sm:inline">3. Adjuntos</span>
                                </button>

                                <div className={`flex-1 h-0.5 rounded-full transition-colors ${composerStep > 3 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`} />

                                {/* Paso 4: Confirmación */}
                                <button
                                    type="button"
                                    disabled={!postTargetGroup || (!taskTitle && !taskDesc && postType !== 'kahoot' && postType !== 'book3d')}
                                    onClick={() => {
                                        const cleanTitle = (taskTitle || '').trim();
                                        const cleanDesc = (taskDesc || '').trim();
                                        if (postType !== 'kahoot' && postType !== 'book3d' && postType !== 'poll' && !cleanTitle && !cleanDesc) {
                                            return showMessage("Ingresa al menos un título o descripción antes de continuar a la confirmación.");
                                        }
                                        setComposerStep(4);
                                    }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                                        composerStep === 4 
                                            ? 'bg-emerald-600 text-white shadow-xs' 
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                    }`}
                                >
                                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border border-current">
                                        4
                                    </span>
                                    <span className="hidden sm:inline">4. Confirmar</span>
                                </button>
                            </div>
                        </div>

                        {/* PASO 1: SELECCIÓN OBLIGATORIA DE MATERIA O GRUPO */}
                        {composerStep === 1 && (
                            <div className="space-y-3 pt-2 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <span>¿A qué materia va dirigida la publicación?</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">Obligatorio</span>
                                        </h4>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                            Selecciona el grupo específico para evitar confusiones entre estudiantes.
                                        </p>
                                    </div>
                                </div>

                                {fixedTargetGroup ? (
                                    <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-500/50 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                                                <Book size={16} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 block">
                                                    Materia fijada actualmente
                                                </span>
                                                <h5 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                                                    {academicGroups?.find(g => String(g?.id || '').replace(/^acad_/i, '').toLowerCase() === String(fixedTargetGroup || '').replace(/^acad_/i, '').toLowerCase())?.name || 'Materia seleccionada'}
                                                </h5>
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-2.5 py-0.5 rounded-full">
                                            Canal activo
                                        </span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {/* Cuadrícula de materias específicas */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {academicGroups && academicGroups.length > 0 ? (
                                                academicGroups.map((g) => {
                                                    const isSelected = postTargetGroup === g.id;
                                                    return (
                                                        <div
                                                            key={g.id}
                                                            onClick={() => setPostTargetGroup(g.id)}
                                                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-2.5 ${
                                                                isSelected
                                                                    ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-600 shadow-xs'
                                                                    : 'bg-gray-50/60 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-white dark:hover:bg-gray-800'
                                                            }`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 transition-colors ${
                                                                isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                            }`}>
                                                                <Book size={15} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h5 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                                                                    {g.name}
                                                                </h5>
                                                                {g.code && (
                                                                    <p className="text-[10px] text-gray-400 truncate">
                                                                        {g.code}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                                                isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 dark:border-gray-600'
                                                            }`}>
                                                                {isSelected && <CheckLine size={10} className="text-white" />}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="col-span-full p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                                                    No tienes materias registradas aún en el Directorio. Selecciona la opción General para continuar.
                                                </div>
                                            )}
                                        </div>

                                        {/* Opción General (Strictly at the bottom, compact) */}
                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                                            <div
                                                onClick={() => setPostTargetGroup('all')}
                                                className={`p-2.5 sm:p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                                                    postTargetGroup === 'all'
                                                        ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 shadow-xs'
                                                        : 'bg-gray-50/40 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 hover:border-amber-400'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                                                        postTargetGroup === 'all' ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                    }`}>
                                                        <Globe size={15} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                                                                Todas las materias (General)
                                                            </span>
                                                            <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 shrink-0">
                                                                Público
                                                            </span>
                                                        </div>
                                                        <p className="text-[10.5px] text-gray-500 dark:text-gray-400">
                                                            Visible para todos los estudiantes de cualquier curso
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                    postTargetGroup === 'all' ? 'border-amber-500 bg-amber-500 text-white' : 'border-gray-300 dark:border-gray-600'
                                                }`}>
                                                    {postTargetGroup === 'all' && <CheckLine size={10} className="text-white" />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Barra de navegación de Paso 1 */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setIsFormExpanded(false)}
                                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                    >
                                        Cancelar
                                    </button>

                                    <div className="flex items-center gap-2.5">
                                        {!postTargetGroup && (
                                            <span className="text-[11px] font-bold text-red-500 dark:text-red-400 flex items-center gap-1 animate-pulse">
                                                <AlertTriangle size={12} /> Selecciona un grupo
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            disabled={!postTargetGroup}
                                            onClick={() => {
                                                if (!postTargetGroup) return showMessage("⚠️ Por favor selecciona a qué materia o grupo deseas dirigir la publicación.");
                                                setComposerStep(2);
                                            }}
                                            className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                        >
                                            <span>Siguiente: Contenido</span>
                                            <ArrowRightIcon size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PASO 2: REDACCIÓN DEL CONTENIDO */}
                        {composerStep === 2 && (
                            <div className="space-y-3 pt-2 animate-in fade-in duration-200">
                                {/* Barra superior compacta de materia */}
                                <div className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/40 text-xs">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">Dirigido a:</span>
                                        <span className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1 truncate">
                                            {postTargetGroup === 'all' ? <Globe size={13} className="text-amber-500 shrink-0" /> : <Book size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                                            <span className="truncate">{currentGroupName}</span>
                                        </span>
                                    </div>
                                    {!fixedTargetGroup && (
                                        <button
                                            type="button"
                                            onClick={() => setComposerStep(1)}
                                            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-2 cursor-pointer"
                                        >
                                            Cambiar
                                        </button>
                                    )}
                                </div>

                                {/* Selector de Tipo de Publicación (Sleek Pills) */}
                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase shrink-0">Tipo:</span>
                                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-0.5 rounded-xl border border-gray-200 dark:border-gray-700 shrink-0">
                                        <button 
                                            type="button" 
                                            onClick={() => setPostType('task')} 
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${postType === 'task' ? 'bg-white dark:bg-gray-900 shadow-2xs text-[#AD3333]' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                                        >
                                            <NavNotebook size={13} /> Tarea
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setPostType('forum')} 
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${postType === 'forum' ? 'bg-white dark:bg-gray-900 shadow-2xs text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                                        >
                                            <MessageCircle size={13} /> Foro
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setPostType('post')} 
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${postType === 'post' ? 'bg-white dark:bg-gray-900 shadow-2xs text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                                        >
                                            <BookOpen size={13} /> Publicación
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setPostType('poll')} 
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${postType === 'poll' ? 'bg-white dark:bg-gray-900 shadow-2xs text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                                        >
                                            <BarChart2 size={13} /> Encuesta
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setPostType('kahoot')} 
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${postType === 'kahoot' ? 'bg-white dark:bg-gray-900 shadow-2xs text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                                        >
                                            <Gamepad2 size={13} /> Kahoot
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setPostType('book3d')} 
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${postType === 'book3d' ? 'bg-white dark:bg-gray-900 shadow-2xs text-orange-700 dark:text-orange-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                                        >
                                            <Book size={13} /> Libro
                                        </button>
                                        {typeof onOpenEvaluationsTab === 'function' && (
                                            <button 
                                                type="button" 
                                                onClick={() => onOpenEvaluationsTab(
                                                    activeComposerGroupObj?.id || fixedTargetGroup || 'all',
                                                    activeComposerGroupObj?.name || 'Todos los estudiantes (Global)'
                                                )} 
                                                className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:bg-white dark:hover:bg-gray-900 cursor-pointer"
                                            >
                                                <ClipboardList size={13} /> Evaluación
                                            </button>
                                        )}
                                        {typeof onOpenReviewsTab === 'function' && (
                                            <button 
                                                type="button" 
                                                onClick={() => onOpenReviewsTab({
                                                    openCreate: true,
                                                    targetGroupId: activeComposerGroupObj?.id || fixedTargetGroup || 'all',
                                                    targetGroupName: activeComposerGroupObj?.name || 'Todos los estudiantes (Global)'
                                                })} 
                                                className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 text-amber-700 dark:text-amber-300 hover:bg-white dark:hover:bg-gray-900 cursor-pointer"
                                            >
                                                <NavSlides size={13} /> Diapositivas
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Editor con diseño despejado */}
                                <div className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/60 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all">
                                    <input 
                                        value={taskTitle} 
                                        onChange={(e) => setTaskTitle(e.target.value)} 
                                        placeholder={postType === 'task' ? "Título claro de la tarea..." : postType === 'forum' ? "Tema central del debate..." : postType === 'poll' ? "Pregunta de la encuesta..." : postType === 'kahoot' ? "Título del Kahoot..." : postType === 'book3d' ? "Título del libro..." : "Título de la publicación..."} 
                                        className="w-full text-sm font-bold bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 pb-2 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100" 
                                        required 
                                    />
                                    <div className="mt-2">
                                        <RichVisualEditor 
                                            value={taskDesc}
                                            onChange={setTaskDesc}
                                            placeholder={postType === 'forum' ? "Escribe la pregunta detonante, pautas o tema de discusión..." : postType === 'poll' ? "Detalles o contexto de la encuesta (opcional)..." : postType === 'kahoot' ? "Descripción o instrucciones (opcional)..." : postType === 'book3d' ? "Descripción (opcional)..." : "Escribe las instrucciones detalladas o contenido..."}
                                            isDarkMode={isDarkMode}
                                            minHeight="110px"
                                        />
                                    </div>
                                </div>

                                {/* Barra de IA (Compacta y bien alineada) */}
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button 
                                            type="button" 
                                            onClick={async () => {
                                                if (!taskDesc && !taskTitle) return showMessage("Escribe una idea en el título o descripción primero.");
                                                setPrevTaskTitle(taskTitle); setPrevTaskDesc(taskDesc); setIsAiLoading(true);
                                                try {
                                                    const prompt = `Eres una pedagoga experta en educación e idiomas. Enriquece y redacta de manera excelente la siguiente publicación para estudiantes:
Título original: ${taskTitle || 'Sin título'}
Descripción original: ${taskDesc || 'Sin descripción'}

INSTRUCCIÓN CRÍTICA:
1. NO uses asteriscos (** ni *) en ninguna palabra, título, viñeta ni frase. Escribe texto limpio sin formato markdown de asteriscos.
2. Devuelve ÚNICAMENTE en este formato exacto:
TITULO: [Título mejorado, atractivo y profesional]
DESCRIPCION: [Instrucciones claras, motivadoras y bien estructuradas]`;

                                                    const result = await callGemini(prompt);
                                                    if (!result) { 
                                                        setIsAiLoading(false); 
                                                        return showMessage("No se pudo conectar con la IA. Intenta de nuevo."); 
                                                    }

                                                    const cleanText = (str) => (str || '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
                                                    const titleMatch = result.match(/(?:T[IÍ]TULO|TITLE)\s*[:\-]?\s*\*?\*?\s*(.*)/i);
                                                    const descMatch = result.match(/(?:DESCRIPCI[OÓ]N|DESCRIPTION)\s*[:\-]?\s*\*?\*?\s*([\s\S]*)/i);

                                                    if (titleMatch && descMatch && titleMatch[1].trim()) {
                                                        setTaskTitle(cleanText(titleMatch[1]));
                                                        setTaskDesc(cleanText(descMatch[1]));
                                                    } else {
                                                        setTaskDesc(cleanText(result));
                                                    }
                                                    setHasAiModified(true);
                                                    showMessage("Publicación potenciada con IA.");
                                                } catch (err) {
                                                    console.error("Error al potenciar con IA:", err);
                                                    showMessage("Error al procesar con IA.");
                                                } finally {
                                                    setIsAiLoading(false);
                                                }
                                            }} 
                                            disabled={isAiLoading} 
                                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                        >
                                            {isAiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                            <span>Potenciar con IA</span>
                                        </button>
                                        
                                        <button 
                                            type="button" 
                                            onClick={async () => {
                                                if (!taskDesc && !taskTitle) return showMessage("Escribe algo en la descripción o título para corregir.");
                                                setPrevTaskTitle(taskTitle); setPrevTaskDesc(taskDesc); setIsAiLoading(true);
                                                try {
                                                    const cleanText = (str) => (str || '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
                                                    if (taskTitle && taskDesc) {
                                                        const prompt = `Corrige la ortografía y gramática manteniendo el idioma original del siguiente título y descripción.
REGLA ESTRICTA: NO uses asteriscos (* o **) ni markdown. Devuelve texto limpio.

Devuelve ÚNICAMENTE en este formato exacto:
TITULO: [Título corregido]
DESCRIPCION: [Descripción corregida]

Título original: ${taskTitle}
Descripción original: ${taskDesc}`;
                                                        const result = await callGemini(prompt);
                                                        if (!result) { 
                                                            setIsAiLoading(false); 
                                                            return showMessage("No se pudo corregir con IA."); 
                                                        }
                                                        const titleMatch = result.match(/(?:T[IÍ]TULO|TITLE)\s*[:\-]?\s*\*?\*?\s*(.*)/i);
                                                        const descMatch = result.match(/(?:DESCRIPCI[OÓ]N|DESCRIPTION)\s*[:\-]?\s*\*?\*?\s*([\s\S]*)/i);
                                                        if (titleMatch && descMatch && titleMatch[1].trim()) {
                                                            setTaskTitle(cleanText(titleMatch[1]));
                                                            setTaskDesc(cleanText(descMatch[1]));
                                                        } else {
                                                            setTaskDesc(cleanText(result));
                                                        }
                                                    } else if (taskTitle) {
                                                        const result = await callGemini(`Corrige la ortografía y gramática del siguiente título manteniendo el idioma original. REGLA ESTRICTA: NO uses asteriscos (* o **). Devuelve SÓLO el texto corregido en texto limpio:\n\n${taskTitle}`);
                                                        if (!result) { 
                                                            setIsAiLoading(false); 
                                                            return showMessage("No se pudo corregir con IA."); 
                                                        }
                                                        setTaskTitle(cleanText(result));
                                                    } else {
                                                        const result = await callGemini(`Corrige la ortografía y gramática del siguiente texto manteniendo el idioma original. REGLA ESTRICTA: NO uses asteriscos (* o **). Devuelve SÓLO el texto corregido en texto limpio:\n\n${taskDesc}`);
                                                        if (!result) { 
                                                            setIsAiLoading(false); 
                                                            return showMessage("No se pudo corregir con IA."); 
                                                        }
                                                        setTaskDesc(cleanText(result));
                                                    }
                                                    setHasAiModified(true);
                                                    showMessage("Ortografía y gramática corregidas.");
                                                } catch (err) {
                                                    console.error("Error al corregir con IA:", err);
                                                    showMessage("Error al corregir.");
                                                } finally {
                                                    setIsAiLoading(false);
                                                }
                                            }} 
                                            disabled={isAiLoading} 
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-1 disabled:opacity-50 shadow-2xs cursor-pointer"
                                        >
                                            {isAiLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                                            <span>Corregir</span>
                                        </button>

                                        <button type="button" onClick={() => handleAiTranslate('Inglés')} disabled={isAiLoading} className="px-2 py-1 rounded-lg text-xs font-bold border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-2xs flex items-center gap-1 cursor-pointer" title="Traducir a inglés"><Globe size={12} /> Inglés</button>
                                        <button type="button" onClick={() => handleAiTranslate('Francés')} disabled={isAiLoading} className="px-2 py-1 rounded-lg text-xs font-bold border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-2xs flex items-center gap-1 cursor-pointer" title="Traducir a francés"><Globe size={12} /> Francés</button>

                                        {hasAiModified && (
                                            <button type="button" onClick={() => { setTaskTitle(prevTaskTitle); setTaskDesc(prevTaskDesc); setHasAiModified(false); }} className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
                                                <Undo2 size={13} /> Deshacer
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Configuración de Encuesta */}
                                {postType === 'poll' && (
                                    <div className="p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3 mt-2 animate-in fade-in duration-200">
                                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-200/60 dark:border-indigo-800/40">
                                            <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                                                <BarChart2 size={15} className="text-indigo-600 dark:text-indigo-400" />
                                                Modalidad de voto
                                            </span>
                                            <div className="flex items-center gap-1 bg-white dark:bg-gray-900 p-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsMultipleChoice(false)}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                                        !isMultipleChoice ? 'bg-indigo-600 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-400'
                                                    }`}
                                                >
                                                    Única
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsMultipleChoice(true)}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                                        isMultipleChoice ? 'bg-indigo-600 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-400'
                                                    }`}
                                                >
                                                    Múltiple
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                                Opciones (mín. 2, máx. 8):
                                            </label>
                                            {pollOptions.map((opt, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                        {idx + 1}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={(e) => {
                                                            const next = [...pollOptions];
                                                            next[idx] = e.target.value;
                                                            setPollOptions(next);
                                                        }}
                                                        placeholder={`Opción ${idx + 1}...`}
                                                        className="flex-1 py-1.5 px-3 text-xs font-medium rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                    {pollOptions.length > 2 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                                            className="p-1 text-gray-400 hover:text-red-500 rounded cursor-pointer"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {pollOptions.length < 8 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPollOptions([...pollOptions, ""])}
                                                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                                                >
                                                    <Plus size={13} /> Añadir opción
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Kahoot Builder */}
                                {postType === 'kahoot' && (
                                    <div className="mt-2 animate-in fade-in duration-200">
                                        <KahootBuilder
                                            questions={kahootQuestions}
                                            setQuestions={setKahootQuestions}
                                            taskTitle={taskTitle}
                                            taskDesc={taskDesc}
                                            callGemini={callGemini}
                                            showMessage={showMessage}
                                            isDarkMode={isDarkMode}
                                            isDemoMode={isDemoMode}
                                        />
                                    </div>
                                )}

                                {/* Crear o subir libro */}
                                {postType === 'book3d' && (
                                    <div className="p-3.5 rounded-2xl border border-orange-200 dark:border-orange-800/60 bg-orange-50/40 dark:bg-orange-950/20 space-y-3 mt-2 animate-in fade-in duration-200">
                                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-orange-200/60 dark:border-orange-800/40">
                                            <div className="inline-flex rounded-lg bg-orange-100/80 dark:bg-gray-900/80 p-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSwitchBook3dMode('create')}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                                        book3dMode === 'create'
                                                            ? 'bg-white dark:bg-gray-800 text-orange-700 dark:text-orange-300 shadow-2xs'
                                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                                    }`}
                                                >
                                                    Crear libro
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSwitchBook3dMode('upload')}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                                        book3dMode === 'upload'
                                                            ? 'bg-white dark:bg-gray-800 text-orange-700 dark:text-orange-300 shadow-2xs'
                                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                                    }`}
                                                >
                                                    Subir libro
                                                </button>
                                            </div>
                                            {typeof onOpenBooksTab === 'function' && (
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenBooksTab()}
                                                    className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-white dark:bg-gray-900 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 transition-colors cursor-pointer"
                                                >
                                                    Ver libros
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                            {book3dMode === 'upload' ? (
                                                <div
                                                    onClick={() => !isRenderingBook3d && book3dFileInputRef.current?.click()}
                                                    className={`p-3.5 rounded-xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-1 ${
                                                        book3dPages.length > 0
                                                            ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                                                            : 'border-orange-300 dark:border-orange-700/70 hover:border-orange-500 bg-white/80 dark:bg-gray-900/60'
                                                    }`}
                                                >
                                                    <input
                                                        ref={book3dFileInputRef}
                                                        type="file"
                                                        accept=".pdf,application/pdf"
                                                        onChange={handleSelectBook3dPdf}
                                                        className="hidden"
                                                    />
                                                    {isRenderingBook3d ? (
                                                        <>
                                                            <Loader2 size={20} className="animate-spin text-orange-600" />
                                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                                Procesando PDF ({book3dProgress.currentPage}/{book3dProgress.totalPages || '?'})...
                                                            </span>
                                                        </>
                                                    ) : book3dPages.length > 0 ? (
                                                        <>
                                                            <UploadCloud size={18} className="text-emerald-600" />
                                                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                                                {book3dPdfFile?.name || 'PDF listo'} ({book3dPages.length} págs)
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UploadCloud size={20} className="text-orange-600 dark:text-orange-400" />
                                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                                Seleccionar PDF
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="p-3 rounded-xl border border-orange-200/80 dark:border-orange-800/50 bg-white/85 dark:bg-gray-900/60 flex flex-col justify-between gap-2">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-0.5">Páginas</label>
                                                            <select
                                                                value={book3dPageCount}
                                                                onChange={(e) => setBook3dPageCount(Number(e.target.value) || 6)}
                                                                className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold"
                                                            >
                                                                <option value={5}>5 págs</option>
                                                                <option value={6}>6 págs</option>
                                                                <option value={8}>8 págs</option>
                                                                <option value={10}>10 págs</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-0.5">Idioma</label>
                                                            <select
                                                                value={book3dLanguage}
                                                                onChange={(e) => setBook3dLanguage(e.target.value)}
                                                                className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold"
                                                            >
                                                                <option value="Inglés">Inglés</option>
                                                                <option value="Bilingüe">Bilingüe</option>
                                                                <option value="Español">Español</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        disabled={isGeneratingBook3d}
                                                        onClick={handleGenerateBook3dPages}
                                                        className="w-full py-1.5 px-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                                    >
                                                        {isGeneratingBook3d ? (
                                                            <>
                                                                <Loader2 size={13} className="animate-spin" />
                                                                <span>Creando páginas...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <BookOpen size={13} />
                                                                <span>{book3dPages.length > 0 ? `Actualizar páginas (${book3dPages.length})` : 'Generar páginas'}</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <input
                                                    ref={book3dCoverInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleSelectBook3dCustomCover}
                                                    className="hidden"
                                                />
                                                <div className="flex items-center justify-between gap-2 text-xs">
                                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Portada personalizada</span>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => book3dCoverInputRef.current?.click()}
                                                            className="px-2 py-0.5 rounded bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-[11px] font-bold inline-flex items-center gap-1 hover:bg-orange-50 cursor-pointer"
                                                        >
                                                            <ImageIcon size={11} />
                                                            <span>{book3dCustomCover ? 'Cambiar' : 'Subir'}</span>
                                                        </button>
                                                        {book3dCustomCover && (
                                                            <button
                                                                type="button"
                                                                onClick={handleClearBook3dCustomCover}
                                                                className="p-0.5 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Color</span>
                                                    <div className="flex items-center gap-1.5">
                                                        {Object.values(BOOK_THEMES).map((th) => (
                                                            <button
                                                                key={th.id}
                                                                type="button"
                                                                onClick={() => handleSelectBook3dTheme(th.id)}
                                                                title={th.name}
                                                                aria-label={th.name}
                                                                className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                                                                    book3dTheme === th.id ? 'border-white ring-2 ring-[#AD3333] scale-110' : 'opacity-70 hover:opacity-100'
                                                                }`}
                                                                style={{ background: `linear-gradient(135deg, ${th.coverBg}, ${th.accentColor})` }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Música de fondo */}
                                                <div className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-orange-200/80 dark:border-orange-800/60 space-y-2">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                                            <Music size={12} className="text-emerald-500" />
                                                            Música de fondo
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={handleToggleBook3dPreviewAmbient}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                                                                    book3dPreviewingAmbient ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                                                }`}
                                                            >
                                                                {book3dPreviewingAmbient ? <Square size={9} className="fill-white" /> : <Play size={9} />}
                                                                <span>{book3dPreviewingAmbient ? 'Detener' : 'Probar'}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setBook3dAmbientEnabled((v) => !v)}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                                                    book3dAmbientEnabled ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                                                }`}
                                                            >
                                                                {book3dAmbientEnabled ? 'On' : 'Off'}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {book3dAmbientEnabled && (
                                                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100 dark:border-gray-800 text-xs">
                                                            <select
                                                                value={book3dAmbientTrack}
                                                                onChange={(e) => setBook3dAmbientTrack(e.target.value)}
                                                                className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 text-xs font-medium"
                                                            >
                                                                {READING_AUDIO_PRESETS.map((p) => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                            <div className="flex items-center gap-1.5">
                                                                <Volume2 size={12} className="text-gray-400 shrink-0" />
                                                                <input
                                                                    type="range"
                                                                    min="0.04"
                                                                    max="0.65"
                                                                    step="0.02"
                                                                    value={book3dAmbientVolume}
                                                                    onChange={(e) => setBook3dAmbientVolume(parseFloat(e.target.value))}
                                                                    className="w-full accent-emerald-500 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {book3dMode === 'create' && book3dOutline.length > 0 && (
                                            <div className="pt-2">
                                                <BookWordEditor
                                                    outline={book3dOutline}
                                                    pages={book3dPages}
                                                    themeId={book3dTheme}
                                                    onChangeOutline={handleBook3dOutlineChange}
                                                    uploadImageFn={uploadImageToStorage}
                                                    isDemoMode={isDemoMode}
                                                    confirmAction={confirmAction}
                                                    onOpenPagePreview={(pageIdx) =>
                                                        setBook3dPreviewModal({
                                                            book: {
                                                                id: 'wall_preview_book',
                                                                title: (taskTitle || '').trim() || 'Vista previa',
                                                                description: stripBookHtml(taskDesc || ''),
                                                                theme: book3dTheme,
                                                                category: 'textbook',
                                                                aspectRatio: book3dAspectRatio || 0.707,
                                                                bookPages: book3dPages,
                                                                pageTexts: book3dPageTexts,
                                                                pageCount: book3dPages.length,
                                                                ambientAudio: {
                                                                    enabled: Boolean(book3dAmbientEnabled),
                                                                    trackId: book3dAmbientTrack || 'piano-calm',
                                                                    customUrl: (book3dAmbientUrl || '').trim(),
                                                                    volume: clampReadingVolume(book3dAmbientVolume),
                                                                    title: getReadingAudioPreset(book3dAmbientTrack)?.name
                                                                }
                                                            },
                                                            initialPage: pageIdx
                                                        })
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* AJUSTES DE ENTREGA Y VISIBILIDAD (UNIFICADO, ULTRA-COMPACTO Y EN EL MISMO LUGAR) */}
                                <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/80 space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
                                        {(postType === 'task' || postType === 'forum' || postType === 'poll') && (
                                            <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-bold text-gray-700 dark:text-gray-200">
                                                <input 
                                                    type="checkbox" 
                                                    checked={hasDueDate} 
                                                    onChange={(e) => setHasDueDate(e.target.checked)} 
                                                    className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer" 
                                                />
                                                <span>
                                                    {postType === 'forum' ? 'Límite de cierre' : postType === 'poll' ? 'Límite de votación' : 'Fecha límite de entrega'}
                                                </span>
                                            </label>
                                        )}

                                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-bold text-gray-700 dark:text-gray-200">
                                            <input 
                                                type="checkbox" 
                                                checked={hidePublicationDate} 
                                                onChange={(e) => setHidePublicationDate(e.target.checked)} 
                                                className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer" 
                                            />
                                            <span>Ocultar fecha de publicación</span>
                                        </label>
                                    </div>

                                    {hasDueDate && (postType === 'task' || postType === 'forum' || postType === 'poll') && (
                                        <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex flex-wrap items-center gap-2.5 animate-in fade-in">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Fecha:</span>
                                                <input 
                                                    type="date" 
                                                    value={taskDate} 
                                                    onChange={(e) => setTaskDate(e.target.value)} 
                                                    className="py-1 px-2 text-xs font-bold rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none" 
                                                    required={hasDueDate} 
                                                />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Hora:</span>
                                                <input 
                                                    type="time" 
                                                    value={taskTime} 
                                                    onChange={(e) => setTaskTime(e.target.value)} 
                                                    className="py-1 px-2 text-xs font-bold rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none" 
                                                    required={hasDueDate} 
                                                />
                                            </div>
                                            {postType !== 'poll' && (
                                                <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold text-gray-600 dark:text-gray-300 ml-auto sm:ml-2">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={allowLate} 
                                                        onChange={(e) => setAllowLate(e.target.checked)} 
                                                        className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer" 
                                                    />
                                                    <span>{postType === 'forum' ? 'Aportes tardíos' : 'Entregas tardías'}</span>
                                                </label>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Barra de navegación de Paso 2 */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setComposerStep(1)}
                                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <ArrowLeftIcon size={14} />
                                        <span>Cambiar grupo</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const cleanTitle = (taskTitle || '').trim();
                                            const cleanDesc = (taskDesc || '').trim();
                                            if (postType === 'book3d') {
                                                if (book3dMode === 'upload' && (book3dPages.length === 0 || !book3dPdfFile)) {
                                                    return showMessage("⚠️ Selecciona un archivo PDF para el libro.");
                                                }
                                                if (book3dMode === 'create' && book3dPages.length === 0) {
                                                    return showMessage("⚠️ Genera las páginas del libro antes de continuar.");
                                                }
                                            }
                                            if (postType === 'kahoot') {
                                                if (!cleanTitle) return showMessage("Ingresa un título para el Kahoot.");
                                                if (kahootQuestions.length === 0) return showMessage("Añade al menos una pregunta al Kahoot.");
                                            }
                                            if (postType === 'poll') {
                                                if (!cleanTitle) return showMessage("Ingresa la pregunta de la encuesta.");
                                                const validOpts = pollOptions.filter(o => o.trim().length > 0);
                                                if (validOpts.length < 2) return showMessage("Ingresa al menos 2 opciones de respuesta válidas.");
                                            }
                                            if (postType !== 'kahoot' && postType !== 'book3d' && postType !== 'poll' && !cleanTitle && !cleanDesc) {
                                                return showMessage("Ingresa un título o una descripción para tu publicación.");
                                            }
                                            setComposerStep(3);
                                        }}
                                        className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                    >
                                        <span>Siguiente: Adjuntos</span>
                                        <ArrowRightIcon size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* PASO 3: ADJUNTOS Y RECURSOS MULTIMEDIA (MINIMALISTA) */}
                        {composerStep === 3 && (
                            <div className="space-y-3 pt-2 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <span>Adjuntar archivos o recursos</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">Opcional</span>
                                        </h4>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                            Agrega material de apoyo si lo requieres o continúa directamente al siguiente paso.
                                        </p>
                                    </div>
                                </div>

                                {/* Barra de Acciones de Adjuntos (Sleek Grid) */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <label className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-500 hover:bg-blue-50/20 cursor-pointer transition-all flex items-center gap-2.5 group shadow-2xs">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                            <ImageIcon size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block truncate">Imagen</span>
                                            <span className="text-[10px] text-gray-400 block truncate">Hasta 4 fotos</span>
                                        </div>
                                        <input type="file" multiple accept="image/*,.heic,.heif,image/heic,image/heif" className="hidden" onChange={(e) => handlePostLocalFileUpload(e)} />
                                    </label>

                                    <label className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-500 hover:bg-emerald-50/20 cursor-pointer transition-all flex items-center gap-2.5 group shadow-2xs">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                            <PaperclipIcon size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block truncate">Documento</span>
                                            <span className="text-[10px] text-gray-400 block truncate">PDF o Word</span>
                                        </div>
                                        <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" className="hidden" onChange={(e) => handlePostLocalFileUpload(e)} />
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => setShowVideoInput(prev => !prev)}
                                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer group shadow-2xs ${
                                            showVideoInput || postVideoUrl 
                                                ? 'border-red-400 bg-red-50/30 dark:bg-red-950/30' 
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-red-400 hover:bg-red-50/20'
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                            <Play size={16} />
                                        </div>
                                        <div className="min-w-0 text-left">
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block truncate">Video</span>
                                            <span className="text-[10px] text-gray-400 block truncate">YouTube / Link</span>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { recPub ? stopPub() : startPub(); }}
                                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer group shadow-2xs ${
                                            recPub || audioPub 
                                                ? 'border-purple-400 bg-purple-50/30 dark:bg-purple-950/30' 
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-400 hover:bg-purple-50/20'
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                            {recPub ? <Square size={16} className="text-red-500 animate-pulse" /> : <Mic size={16} />}
                                        </div>
                                        <div className="min-w-0 text-left">
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block truncate">
                                                {recPub ? 'Grabando...' : 'Nota de voz'}
                                            </span>
                                            <span className="text-[10px] text-gray-400 block truncate">
                                                {recPub ? 'Detener' : 'Grabar audio'}
                                            </span>
                                        </div>
                                    </button>
                                </div>

                                {/* Píldoras secundarias */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setShowGeniallyInput(prev => !prev)}
                                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                        <Sparkles size={12} className="text-purple-500" /> Genially
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowImageInput(prev => !prev)}
                                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                        <Link2 size={12} /> Enlace imagen
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            window.openGifPicker?.((url) => {
                                                if (typeof setPostImageUrls === 'function') {
                                                    setPostImageUrls(prev => {
                                                        const base = (Array.isArray(prev) && prev.length > 0) ? prev : (postImageUrl ? [postImageUrl] : []);
                                                        const next = [...base, url].slice(0, 4);
                                                        setPostImageUrl(next[0] || url);
                                                        return next;
                                                    });
                                                } else {
                                                    setPostImageUrl(url);
                                                }
                                            });
                                        }}
                                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                        <span className="font-black border border-current px-0.5 rounded text-[8.5px] h-3 flex items-center">GIF</span> GIF
                                    </button>
                                </div>

                                {/* Inputs desplegables */}
                                {showImageInput && (
                                    <div className="flex gap-2 items-center p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 animate-in fade-in">
                                        <input 
                                            value={postImageUrl} 
                                            onChange={(e) => {
                                                setPostImageUrl(e.target.value);
                                                if (typeof setPostImageUrls === 'function') {
                                                    setPostImageUrls(e.target.value ? [e.target.value] : []);
                                                }
                                            }} 
                                            placeholder="Enlace directo de la imagen (.jpg, .png, .gif)..." 
                                            className="flex-1 py-1 px-2.5 text-xs rounded-lg bg-transparent text-gray-900 dark:text-gray-100 outline-none" 
                                        />
                                        <button type="button" onClick={() => setShowImageInput(false)} className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"><X size={15}/></button>
                                    </div>
                                )}

                                {showVideoInput && (
                                    <div className="flex gap-2 items-center p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 animate-in fade-in">
                                        <input 
                                            value={postVideoUrl} 
                                            onChange={(e) => setPostVideoUrl(e.target.value)} 
                                            placeholder="Enlace de YouTube o video directo (.mp4)..." 
                                            className="flex-1 py-1 px-2.5 text-xs rounded-lg bg-transparent text-gray-900 dark:text-gray-100 outline-none" 
                                        />
                                        <button type="button" onClick={() => setShowVideoInput(false)} className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"><X size={15}/></button>
                                    </div>
                                )}

                                {showGeniallyInput && (
                                    <div className="flex gap-2 items-center p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 animate-in fade-in">
                                        <input 
                                            value={postGeniallyUrl} 
                                            onChange={(e) => setPostGeniallyUrl(e.target.value)} 
                                            placeholder="Enlace de Genially..." 
                                            className="flex-1 py-1 px-2.5 text-xs rounded-lg bg-transparent text-gray-900 dark:text-gray-100 outline-none" 
                                        />
                                        <button type="button" onClick={() => setShowGeniallyInput(false)} className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"><X size={15}/></button>
                                    </div>
                                )}

                                {/* Previsualización de adjuntos */}
                                {((Array.isArray(postImageUrls) && postImageUrls.length > 0) || postImageUrl || postVideoUrl || postGeniallyUrl || postFileUrl || audioPub) && (
                                    <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/50 space-y-2.5 animate-in fade-in">
                                        {/* Carrusel de fotos */}
                                        {(() => {
                                            const currentImgs = (Array.isArray(postImageUrls) && postImageUrls.length > 0)
                                                ? postImageUrls
                                                : (postImageUrl ? [postImageUrl] : []);
                                            
                                            if (currentImgs.length === 0) return null;

                                            return (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                                        <span>Fotos adjuntas ({currentImgs.length}/4)</span>
                                                        {currentImgs.length > 1 && (
                                                            <span className="text-blue-500 font-semibold">Carrusel tipo Instagram</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        {currentImgs.map((url, idx) => (
                                                            <div key={idx} className="relative group/thumb">
                                                                <UniversalImage 
                                                                    src={url} 
                                                                    alt={`Preview ${idx + 1}`} 
                                                                    className="h-20 w-20 object-cover rounded-xl border border-gray-200 dark:border-gray-700 bg-black/5 shadow-2xs" 
                                                                />
                                                                <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                                    {idx + 1}
                                                                </span>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => {
                                                                        if (!isDemoMode && url) deleteFileFromStorage(url).catch(() => {});
                                                                        const updated = currentImgs.filter((_, i) => i !== idx);
                                                                        if (typeof setPostImageUrls === 'function') setPostImageUrls(updated);
                                                                        if (typeof setPostImageUrl === 'function') setPostImageUrl(updated[0] || '');
                                                                    }} 
                                                                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition shadow cursor-pointer"
                                                                    title="Eliminar foto"
                                                                >
                                                                    <X size={11}/>
                                                                </button>
                                                            </div>
                                                        ))}

                                                        {currentImgs.length < 4 && (
                                                            <label className="h-20 w-20 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors text-gray-400 hover:text-blue-500 bg-gray-50/50 dark:bg-gray-800/40" title="Añadir otra foto">
                                                                <Plus size={18} />
                                                                <span className="text-[9px] font-bold">{currentImgs.length}/4</span>
                                                                <input 
                                                                    type="file" 
                                                                    multiple 
                                                                    accept="image/*,.heic,.heif,image/heic,image/heif" 
                                                                    className="hidden" 
                                                                    onChange={(e) => handlePostLocalFileUpload(e)} 
                                                                />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {postVideoUrl && (
                                            <div className="relative max-w-sm my-1 rounded-xl overflow-hidden shadow-sm">
                                                <CustomVideoPlayer src={postVideoUrl} isDarkMode={isDarkMode} />
                                                <button type="button" onClick={() => setPostVideoUrl("")} className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition shadow z-10 cursor-pointer"><X size={12}/></button>
                                            </div>
                                        )}

                                        {postGeniallyUrl && (
                                            <div className="relative max-w-full my-1">
                                                <GeniallyEmbedPlayer url={postGeniallyUrl} isDarkMode={isDarkMode} onRemove={() => setPostGeniallyUrl("")} />
                                            </div>
                                        )}

                                        {postFileUrl && (
                                            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300 w-fit">
                                                <PaperclipIcon size={14} /> {postFileName || 'Documento adjunto'}
                                                <button type="button" onClick={() => { if (!isDemoMode && postFileUrl) deleteFileFromStorage(postFileUrl).catch(() => {}); setPostFileUrl(""); setPostFileName(""); }} className="text-red-500 hover:text-red-700 ml-1.5 cursor-pointer"><X size={13}/></button>
                                            </div>
                                        )}

                                        {audioPub && (
                                            <div className="mt-1">
                                                <AudioPlayer src={audioPub} title="Nota de voz adjunta" onDelete={cancelPub} isDarkMode={isDarkMode} />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {upPub && <p className="text-xs text-purple-600 dark:text-purple-400 italic pt-1">Subiendo audio adjunto...</p>}
                                {recPub && (
                                    <div className="pt-1">
                                        <AudioRecordingVisualizer 
                                            recordingTime={recTimePub} 
                                            onStop={stopPub} 
                                            onCancel={cancelPub} 
                                            isDarkMode={isDarkMode} 
                                        />
                                    </div>
                                )}

                                {/* Barra de navegación de Paso 3 */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setComposerStep(2)}
                                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <ArrowLeftIcon size={14} />
                                        <span>Volver a contenido</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (recPub) return showMessage("Detén la grabación de voz antes de continuar.");
                                            if (upPub) return showMessage("Espera a que termine de subir la nota de voz...");
                                            setComposerStep(4);
                                        }}
                                        className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                    >
                                        <span>Siguiente: Confirmar</span>
                                        <ArrowRightIcon size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* PASO 4: CONFIRMACIÓN FINAL Y PUBLICAR (MINIMALISTA) */}
                        {composerStep === 4 && (
                            <div className="space-y-3 pt-2 animate-in fade-in duration-200">
                                {/* Aviso conciso */}
                                {postTargetGroup === 'all' ? (
                                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold shadow-2xs">
                                            <AlertTriangle size={17} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">Público General</span>
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400">• Todas las materias</span>
                                            </div>
                                            <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                                                Esta publicación será visible para <strong>todos los estudiantes</strong> de cualquier curso.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold shadow-2xs">
                                            <CheckCircle2 size={17} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">Exclusivo para</span>
                                                <span className="text-xs font-black text-gray-900 dark:text-gray-100 truncate">{currentGroupName}</span>
                                            </div>
                                            <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                                                Solo los estudiantes de <strong>{currentGroupName}</strong> verán esta actividad.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Resumen compacto */}
                                <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-1.5 text-xs">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="text-gray-500 dark:text-gray-400 shrink-0 font-medium">Destino:</span>
                                            <span className="font-bold text-blue-700 dark:text-blue-300 truncate">{currentGroupName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 dark:text-gray-400 shrink-0 font-medium">Tipo:</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-200">
                                                {postType === 'task' ? '📝 Tarea' : postType === 'forum' ? '💬 Foro' : postType === 'poll' ? '📊 Encuesta' : postType === 'kahoot' ? '🎮 Kahoot' : postType === 'book3d' ? '📚 Libro' : '📢 Publicación'}
                                            </span>
                                        </div>
                                        <div className="col-span-full flex items-start gap-2">
                                            <span className="text-gray-500 dark:text-gray-400 shrink-0 font-medium">Título:</span>
                                            <span className="font-bold text-gray-900 dark:text-gray-100 truncate">
                                                {taskTitle || (postType === 'kahoot' ? 'Kahoot' : postType === 'book3d' ? 'Libro' : 'Sin título')}
                                            </span>
                                        </div>
                                        {hasDueDate && (postType === 'task' || postType === 'forum' || postType === 'poll') && (
                                            <div className="col-span-full flex items-center gap-2">
                                                <span className="text-gray-500 dark:text-gray-400 shrink-0 font-medium">Límite:</span>
                                                <span className="font-bold text-blue-600 dark:text-blue-400">
                                                    {taskDate ? `${taskDate} a las ${taskTime || '23:59'}` : 'Sin fecha límite'}
                                                </span>
                                            </div>
                                        )}
                                        <div className="col-span-full flex items-center gap-2">
                                            <span className="text-gray-500 dark:text-gray-400 shrink-0 font-medium">Adjuntos:</span>
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                                                {(() => {
                                                    const items = [];
                                                    const currentImgs = (Array.isArray(postImageUrls) && postImageUrls.length > 0) ? postImageUrls : (postImageUrl ? [postImageUrl] : []);
                                                    if (currentImgs.length > 0) items.push(`${currentImgs.length} foto(s)`);
                                                    if (postVideoUrl) items.push('1 video');
                                                    if (postFileUrl) items.push(`1 doc (${postFileName || 'archivo'})`);
                                                    if (audioPub) items.push('1 audio');
                                                    if (postGeniallyUrl) items.push('1 Genially');
                                                    return items.length > 0 ? items.join(', ') : 'Ninguno';
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Barra de navegación de Paso 4 */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setComposerStep(3)}
                                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <ArrowLeftIcon size={14} />
                                        <span>Modificar</span>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isPublishing || upPub || isRenderingBook3d || isGeneratingBook3d}
                                        onClick={executePublishTask}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-black shadow-md hover:scale-102 transition-all flex items-center gap-2 text-white cursor-pointer ${
                                            isPublishing ? 'opacity-70 cursor-not-allowed' : ''
                                        } ${
                                            postTargetGroup === 'all'
                                                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                                        }`}
                                    >
                                        {isPublishing ? (
                                            <>
                                                <Loader2 size={15} className="animate-spin" />
                                                <span>Publicando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckLine size={15} className="text-white" />
                                                <span>Confirmar y Publicar</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}




            {wallSearchTerm.trim() && (
                <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-blue-500/10 border border-blue-400/20 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-3 animate-in fade-in">
                    <span className="flex items-center gap-1.5 truncate">
                        <SearchIcon size={14} className="shrink-0" />
                        <span>Filtrando por: <strong>"{wallSearchTerm.trim()}"</strong></span>
                    </span>
                    <button type="button" onClick={() => setWallSearchTerm("")} className="underline hover:opacity-75 shrink-0 ml-2">
                        Quitar filtro
                    </button>
                </div>
            )}

            {tasksLoading ? (
                <div className="space-y-4">{[0,1,2].map(i => <SkeletonCard key={i} isDarkMode={isDarkMode} />)}</div>
            ) : regularTasksToRender.length === 0 && filteredPinnedTasks.length === 0 && wallSearchTerm.trim() ? (
                <div className="text-center py-8 text-sm text-gray-500 italic">
                    No se encontraron publicaciones que coincidan con "{wallSearchTerm}".
                </div>
            ) : visibleTasks.length === 0 && visiblePinnedTasks.length === 0 ? (
                <EmptyState 
                    icon={BookOpen} 
                    title={role === 'student' && myEnrolledGroups.length === 0 ? "Sin materias asignadas" : "Todavía no hay publicaciones"} 
                    message={role === 'student' && myEnrolledGroups.length === 0 ? "Aún no tienes ningún grupo asignado. Tu docente te asignará a tu materia pronto." : "Cuando el docente publique una tarea o aviso, aparecerá aquí."} 
                    isDarkMode={isDarkMode} 
                />
            ) : null}
            {/* Sección de publicaciones y tareas fijadas (Pinned Posts) */}
            {filteredPinnedTasks.length > 0 && (
                <div className="space-y-4 mb-5 transition-all duration-500 ease-out">
                    {filteredPinnedTasks.map(task => (
                        <div key={'pinned-' + task.id} className="transition-all duration-500 ease-out transform animate-in fade-in slide-in-from-top-4 content-auto-feed">
                            <TaskCard 
                                task={{...task, type: task.type || 'task', isPinned: true}} 
                                role={role} 
                                isDemoMode={isDemoMode}
                                setTasks={setTasks}
                                db={db} 
                                appId={appId} 
                                academicGroups={academicGroups}
                                glassCard={glassCard} 
                                glassInput={glassInput} 
                                callGemini={callGemini} 
                                currentUser={user} 
                                showMessage={showMessage} 
                                loggedInName={loggedInName} 
                                myChatId={myChatId}
                                isDarkMode={isDarkMode} 
                                themeMode={themeMode}
                                confirmAction={confirmAction} 
                                handleOpenProfileByName={handleOpenProfileByName} 
                                setFullScreenImage={setFullScreenImage} 
                                userMappings={userMappings} 
                                evaluations={evaluations}
                                grades={grades}
                                reviews={reviews}
                                books={books}
                                onStartEvaluation={onStartEvaluation}
                                onOpenEvaluationResults={onOpenEvaluationResults}
                                onOpenImmediateFeedback={onOpenImmediateFeedback}
                                onRetryDemoEvaluation={onRetryDemoEvaluation}
                                onOpenEvaluationsTab={onOpenEvaluationsTab}
                                onOpenReviewsTab={onOpenReviewsTab}
                                onOpenBooksTab={onOpenBooksTab}
                                activePostModalId={activePostModalId}
                                setActivePostModalId={setActivePostModalId}
                                setUserPosts={setUserPosts}
                                chatGroups={chatGroups}
                                students={students}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Publicaciones y tareas regulares */}
            <div className="space-y-4 transition-all duration-300">
                {regularTasksToRender.map(task => (
                    <div key={task.id} className="transition-all duration-300 ease-out content-auto-feed">
                        <TaskCard 
                            task={{...task, type: task.type || 'task'}} 
                            role={role} 
                            isDemoMode={isDemoMode}
                            setTasks={setTasks}
                            db={db} 
                            appId={appId} 
                            academicGroups={academicGroups}
                            glassCard={glassCard} 
                            glassInput={glassInput} 
                            callGemini={callGemini} 
                            currentUser={user} 
                            showMessage={showMessage} 
                            loggedInName={loggedInName} 
                            myChatId={myChatId}
                            isDarkMode={isDarkMode} 
                            themeMode={themeMode}
                            confirmAction={confirmAction} 
                            handleOpenProfileByName={handleOpenProfileByName} 
                            setFullScreenImage={setFullScreenImage} 
                            userMappings={userMappings} 
                            evaluations={evaluations}
                            grades={grades}
                            reviews={reviews}
                            books={books}
                            onStartEvaluation={onStartEvaluation}
                            onOpenEvaluationResults={onOpenEvaluationResults}
                            onOpenImmediateFeedback={onOpenImmediateFeedback}
                            onRetryDemoEvaluation={onRetryDemoEvaluation}
                            onOpenEvaluationsTab={onOpenEvaluationsTab}
                            onOpenReviewsTab={onOpenReviewsTab}
                            onOpenBooksTab={onOpenBooksTab}
                            activePostModalId={activePostModalId}
                            setActivePostModalId={setActivePostModalId}
                            setUserPosts={setUserPosts}
                            chatGroups={chatGroups}
                            students={students}
                        />
                    </div>
                ))}
            </div>

            {/* TaskCard standalone si el post compartido no está visible en el feed actual (filtro/paginación) */}
            {modalStandaloneTask && !regularTasksToRender.some(t => String(t.id) === String(modalStandaloneTask.id)) && !filteredPinnedTasks.some(t => String(t.id) === String(modalStandaloneTask.id)) && (
                <div key={`modal-standalone-${modalStandaloneTask.id}`} style={{ display: 'none' }}>
                    <TaskCard 
                        task={{...modalStandaloneTask, type: modalStandaloneTask.type || 'task'}} 
                        role={role} 
                        isDemoMode={isDemoMode}
                        setTasks={setTasks}
                        db={db} 
                        appId={appId} 
                        academicGroups={academicGroups}
                        glassCard={glassCard} 
                        glassInput={glassInput} 
                        callGemini={callGemini} 
                        currentUser={user} 
                        showMessage={showMessage} 
                        loggedInName={loggedInName} 
                        myChatId={myChatId}
                        isDarkMode={isDarkMode} 
                        themeMode={themeMode}
                        confirmAction={confirmAction} 
                        handleOpenProfileByName={handleOpenProfileByName} 
                        setFullScreenImage={setFullScreenImage} 
                        userMappings={userMappings} 
                        evaluations={evaluations}
                        grades={grades}
                        reviews={reviews}
                        books={books}
                        onStartEvaluation={onStartEvaluation}
                        onOpenEvaluationResults={onOpenEvaluationResults}
                        onOpenImmediateFeedback={onOpenImmediateFeedback}
                        onRetryDemoEvaluation={onRetryDemoEvaluation}
                        onOpenEvaluationsTab={onOpenEvaluationsTab}
                        onOpenReviewsTab={onOpenReviewsTab}
                        onOpenBooksTab={onOpenBooksTab}
                        activePostModalId={activePostModalId}
                        setActivePostModalId={setActivePostModalId}
                        setUserPosts={setUserPosts}
                        chatGroups={chatGroups}
                        students={students}
                    />
                </div>
            )}
            {/* Sentinel y controles de carga de publicaciones anteriores (Scroll infinito + botón de respaldo) */}
            {hasMoreTasks && (
                <div className="w-full flex flex-col items-center justify-center py-4">
                    <div ref={loadMoreSentinelRef} className="h-4 w-full pointer-events-none" aria-hidden="true" />
                    
                    {isLoadingMoreTasks ? (
                        <div className="flex items-center gap-2.5 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 animate-in fade-in">
                            <Loader2 size={18} className="animate-spin text-[#AD3333]" />
                            <span>Cargando publicaciones anteriores...</span>
                        </div>
                    ) : (
                        <button 
                            type="button" 
                            onClick={loadMoreTasks} 
                            className="px-5 py-2.5 rounded-2xl border font-bold text-xs flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
                        >
                            <Plus size={15} className="text-[#AD3333]" />
                            <span>Cargar más publicaciones</span>
                        </button>
                    )}
                </div>
            )}

            {!hasMoreTasks && regularTasksToRender.length > 0 && !tasksLoading && (
                <div className="w-full flex items-center justify-center py-6 text-center text-xs text-gray-400 dark:text-gray-500 select-none">
                    <span className="flex items-center gap-1.5 opacity-80 font-medium">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>Has llegado al final de las publicaciones</span>
                    </span>
                </div>
            )}

            {book3dPreviewModal?.book && (
                <Flipbook3DModal
                    book={book3dPreviewModal.book}
                    initialPage={book3dPreviewModal.initialPage || 0}
                    onClose={() => setBook3dPreviewModal(null)}
                    isTeacher={role === 'teacher'}
                    onEditBook={null}
                    userId={myChatId || user?.uid || user?.email || loggedInName || role}
                />
            )}
        </div>
    );
});

export default TasksTab
