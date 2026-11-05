// src/components/TaskCard.jsx
import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import {
  CheckCheck, CheckCircle2, CheckLine, Clock, Edit3, EyeOff, FileDocIcon, FileText, ImageIcon, Loader2, Lock, Unlock, Share2, MessageSquareText, Mic, PaperclipIcon, Plus, ReplyIcon, Send, SmileIcon, Square, Star, Pin, Trash2, Upload, X, XLine, Volume2, VolumeX, Languages, UserIcon, BookOpen, NavNotebook, Play, Pause, Download, MessageCircle, BarChart2, Vote, Gamepad2, Trophy, Zap, Flame, NavSlides, ClipboardList, Shield, ShieldAlert, AlertTriangle, ChevronLeft, ChevronRight, Maximize2, Minimize2, ExternalLink, Layers, MonitorPlay, Globe, Sparkles, RotateCcw, Eye, ThumbsUp, Link2, Forward
} from './Icons.jsx'
import {
  compressImage, containsBadWords, checkBadWordsAsync, uploadImageToStorage, uploadRawFileToStorage, deleteFileFromStorage, deleteAllStorageFilesInObject, deleteReplacedStorageFiles, TEACHER_NAME, SECOND_TEACHER_NAME, SECOND_TEACHER_ID, isCamiloTeacher, isTeacherId, getCanonicalTeacherId, getTeacherDisplayName, getItemTeacherId, COMMENT_EMOJIS, REACTION_EMOJIS, FACEBOOK_REACTIONS, splitNameFirstAndLast, FALLBACK_MAP, format12HourTime, formatDateTime12H,
  isImageLikeFile, convertHeicToJpeg, resolveUserDisplayName, resolveUserPhoto
} from '../utils/helpers.js'
import UniversalImage from './UniversalImage.jsx'
import { glassCard, glassInput } from '../utils/styles.js'
import { useClickOutside } from '../utils/hooks.js'
import ImageCarousel from './ImageCarousel.jsx'
import LinkifyText from './LinkifyText.jsx'
import AppleEmoji from './AppleEmoji.jsx'
import RichTextToolbar from './RichTextToolbar.jsx'
import RichVisualEditor from './RichVisualEditor.jsx'
import { prepararNarracion, narrarSegmentos } from '../utils/narracion.js'
import DocumentPreviewModal from './DocumentPreviewModal.jsx'
import CustomVideoPlayer, { isDirectVideoUrl } from './CustomVideoPlayer.jsx'
import GeniallyEmbedPlayer, { extractGeniallyUrl } from './GeniallyEmbedPlayer.jsx'
import KahootLiveModal from './KahootLiveModal.jsx'
import KahootBuilder from './KahootBuilder.jsx'
import { validateKahootConfig, buildKahootLeaderboard, reconcileKahootParticipantsAfterEdit, canAccessKahootReview, buildPublicKahootUrl } from '../utils/kahootEngine.js'
import { SlideCanvasSurface, SlidePresenterViewer, exportReviewToPresentation, isCorruptedAnalyticsSlide, healCorruptedPresentationFromPptx } from './ReviewsModule.jsx'
import Flipbook3DModal from './Flipbook3DModal.jsx'
import {
    getBookTheme,
    normalizeBookRecord,
    buildBookSpreads,
    resolveSpreadDisplayState,
    calculateDragCurlState,
    playPageFlipSound,
    renderPdfToBookPages,
    buildFallbackBookPages,
    buildBookPagesFromOutline,
    buildIllustratedBookPageSvg,
    isCompactedOrFallbackBookPage,
    bookPagesNeedLivePdfRender,
    extractSvgExternalImageOverlay
} from '../utils/flipbookEngine.js'
import { useVoiceRecorder } from '../utils/useVoiceRecorder.js'
import { auth, signInAnonymously, doc, setDoc, updateDoc, deleteDoc } from '../firebase/config.js'
import { runTransaction, collection, addDoc } from 'firebase/firestore'
import AudioPlayer, { AudioRecordingVisualizer } from './AudioPlayer.jsx'
import { saveDemoSandboxItem, removeDemoSandboxItem, loadDemoChatMessages, saveDemoChatMessages } from '../utils/demoData.js'

const TaskCard = React.memo(({
    task,
    role,
    isDemoMode = false,
    setTasks,
    db,
    appId,
    academicGroups,
    glassInput: propGlassInput,
    callGemini,
    currentUser,
    showMessage,
    loggedInName,
    myChatId,
    isDarkMode,
    themeMode = 'light',
    confirmAction,
    handleOpenProfileByName,
    userMappings,
    evaluations = [],
    grades = [],
    reviews = [],
    books = [],
    onStartEvaluation,
    onOpenEvaluationResults,
    onOpenImmediateFeedback,
    onRetryDemoEvaluation,
    onOpenEvaluationsTab,
    onOpenReviewsTab,
    onOpenBooksTab,
    activePostModalId,
    setActivePostModalId,
    setUserPosts,
    chatGroups = [],
    students = []
}) => {
    const cardRef = React.useRef(null);
    const editTaskDescRef = React.useRef(null);
    const [isEditingTask, setIsEditingTask] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [activeFlipbookModal, setActiveFlipbookModal] = useState(null);
    const [bookPreviewSpreadIdx, setBookPreviewSpreadIdx] = useState(0);
    const [bookPreviewFlipAnim, setBookPreviewFlipAnim] = useState(null);
    const [bookPreviewDragState, setBookPreviewDragState] = useState(null);
    const [liveBookPages, setLiveBookPages] = useState(null);
    const [loadingBookPdf, setLoadingBookPdf] = useState(false);
    const [bookRenderProgress, setBookRenderProgress] = useState({ currentPage: 0, totalPages: 0, percent: 0 });
    const bookPreviewStageRef = useRef(null);
    const bookPreviewFlipTimerRef = useRef(null);
    const suppressPreviewClickRef = useRef(0);
    const lastPreviewCoverOpenAtRef = useRef(0);
    const [editTaskData, setEditTaskData] = useState({ title: task?.title || '', description: task?.description || '', dueDate: task?.dueDate || '', dueTime: task?.dueTime || '', allowLate: task?.allowLate || false, geniallyUrl: task?.geniallyUrl || '', hideDate: !!task?.hideDate });
    const [showKahootLiveModal, setShowKahootLiveModal] = useState(false);
    const [kahootModalStartInReview, setKahootModalStartInReview] = useState(false);
    const [isEditingKahootQuestions, setIsEditingKahootQuestions] = useState(false);
    const [editedKahootQuestions, setEditedKahootQuestions] = useState(() => task?.kahoot?.questions || []);
    const [slidePreviewIdx, setSlidePreviewIdx] = useState(0);
    const [showSlidePresenter, setShowSlidePresenter] = useState(false);
    // Narracion de la publicacion: voz de mujer y deteccion del idioma de cada parte.
    const narracionRef = useRef(null);
    const solicitudNarracionRef = useRef(0);
    const [narrando, setNarrando] = useState(false);
    const [preparandoNarracion, setPreparandoNarracion] = useState(false);
    const alternarNarracion = async () => {
        if (narrando || preparandoNarracion) {
            solicitudNarracionRef.current += 1; // invalida cualquier preparacion pendiente
            try { narracionRef.current?.detener?.(); } catch (e) { /* nada */ }
            narracionRef.current = null;
            setNarrando(false);
            setPreparandoNarracion(false);
            return;
        }
        const texto = showTranslated && translatedDescription ? translatedDescription : task.description;
        if (!texto) return;
        const ticket = ++solicitudNarracionRef.current;
        setPreparandoNarracion(true);
        try {
            const fragmentos = await prepararNarracion(texto, callGemini);
            // si mientras preparaba el usuario volvio a tocar, no arrancamos (evita voces encimadas)
            if (ticket !== solicitudNarracionRef.current || !fragmentos || !fragmentos.length) return;
            setNarrando(true);
            narracionRef.current = narrarSegmentos(fragmentos, {
                onFin: () => { setNarrando(false); narracionRef.current = null; },
            });
        } finally {
            if (ticket === solicitudNarracionRef.current) setPreparandoNarracion(false);
        }
    };
    const pinAnimCleanupRef = useRef(null);
    useEffect(() => () => {
        try { narracionRef.current?.detener?.(); } catch (e) { /* nada */ }
        try { pinAnimCleanupRef.current?.(); } catch (e) { /* nada */ }
        if (bookPreviewFlipTimerRef.current) clearTimeout(bookPreviewFlipTimerRef.current);
    }, []);


    const activeTeacherId = role === 'teacher' ? getCanonicalTeacherId(myChatId || loggedInName) : null;
    const currentUserId = role === 'teacher' 
        ? (activeTeacherId === SECOND_TEACHER_ID ? 'teacher_camilo' : 'teacher_gina') 
        : (currentUser?.uid ? `uid_${currentUser.uid}` : (loggedInName ? `name_${loggedInName.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'student_user'));

    const [showViewsModal, setShowViewsModal] = useState(false);

    // Registro automático de visualización para estudiantes (View tracker con clave canónica y anti-duplicados)
    useEffect(() => {
        if (role === 'teacher') return;
        const rawStudentKey = String(currentUserId || currentUser?.uid || loggedInName || '').trim();
        if (!rawStudentKey || isTeacherId(rawStudentKey) || rawStudentKey.toLowerCase().includes('teacher') || rawStudentKey.toLowerCase().includes('docente')) return;

        const cleanKey = rawStudentKey.toLowerCase().replace(/^@/, '');
        // Determinar clave canónica del estudiante desde userMappings
        const matchedEntry = Object.entries(userMappings || {}).find(([k, u]) => {
            const kClean = String(k).toLowerCase().replace(/^@/, '');
            return kClean === cleanKey || 
                   (currentUser?.uid && u?.uid === currentUser.uid) || 
                   (loggedInName && u?.fullName && u.fullName.trim().toLowerCase() === loggedInName.trim().toLowerCase());
        });
        const canonicalStudentId = matchedEntry ? matchedEntry[0].toLowerCase().replace(/^@/, '') : cleanKey;

        // Si ya está registrado en viewedBy bajo cualquier alias o identificador de este estudiante, evitar escrituras duplicadas
        const existingViews = task?.viewedBy && typeof task.viewedBy === 'object' ? task.viewedBy : null;
        if (existingViews) {
            if (existingViews[canonicalStudentId] || existingViews[rawStudentKey] || existingViews[cleanKey]) return;
            const alreadyRecorded = Object.entries(existingViews).some(([id, data]) => {
                const idClean = String(id).toLowerCase().replace(/^@/, '');
                if (idClean === canonicalStudentId || idClean === cleanKey || (currentUser?.uid && id === currentUser.uid)) return true;
                const dName = typeof data === 'object' ? (data.name || data.author) : String(data || '');
                return loggedInName && dName && dName.trim().toLowerCase() === loggedInName.trim().toLowerCase();
            });
            if (alreadyRecorded) return;
        }

        const timer = setTimeout(() => {
            try {
                const currentViews = task.viewedBy && typeof task.viewedBy === 'object' ? { ...task.viewedBy } : {};
                if (currentViews[canonicalStudentId] || currentViews[rawStudentKey] || currentViews[cleanKey]) return;

                const studentName = resolveUserDisplayName({ author: loggedInName, authorId: canonicalStudentId }, userMappings, loggedInName) || loggedInName || 'Estudiante';
                const studentAvatar = resolveUserPhoto({ id: canonicalStudentId, authorId: canonicalStudentId, authorName: studentName }, userMappings, currentUser?.photoURL || '');
                currentViews[canonicalStudentId] = {
                    id: canonicalStudentId,
                    name: studentName,
                    avatar: studentAvatar,
                    viewedAt: Date.now()
                };
                updateTaskDoc({ viewedBy: currentViews }).catch(() => {});
            } catch {
                // ignorar errores de red
            }
        }, 1200);

        return () => clearTimeout(timer);
    }, [task?.id, task?.viewedBy, role, currentUserId, currentUser, loggedInName, userMappings]);

    // Lista de estudiantes únicos que han visto esta publicación (sin duplicados, con avatar y marca de tiempo más reciente)
    const viewedStudents = React.useMemo(() => {
        if (!task?.viewedBy || typeof task.viewedBy !== 'object') return [];
        const studentMap = new Map();

        Object.entries(task.viewedBy).forEach(([id, data]) => {
            if (!data) return;
            const rawName = typeof data === 'object' ? (data.name || data.author) : String(data);
            const resolvedName = resolveUserDisplayName({ author: rawName, authorId: id }, userMappings, rawName) || rawName || 'Estudiante';
            const rawAvatar = typeof data === 'object' ? (data.avatar || data.photoURL || '') : '';
            const avatar = resolveUserPhoto({ id, authorId: id, author: rawName, name: rawName }, userMappings, rawAvatar);
            const viewedAt = typeof data === 'object' ? Number(data.viewedAt || 0) : 0;

            // Clave única canónica para deduplicar completamente
            const matchedUser = Object.entries(userMappings || {}).find(([k, u]) => {
                const kClean = String(k).toLowerCase().replace(/^@/, '');
                const idClean = String(id).toLowerCase().replace(/^@/, '');
                return kClean === idClean || (u?.fullName && u.fullName.trim().toLowerCase() === resolvedName.trim().toLowerCase());
            });
            const dedupeKey = matchedUser ? matchedUser[0].toLowerCase().replace(/^@/, '') : resolvedName.trim().toLowerCase();

            if (!studentMap.has(dedupeKey)) {
                studentMap.set(dedupeKey, {
                    id: matchedUser ? matchedUser[0] : id,
                    name: resolvedName,
                    avatar,
                    viewedAt
                });
            } else {
                const existing = studentMap.get(dedupeKey);
                studentMap.set(dedupeKey, {
                    id: existing.id || id,
                    name: existing.name || resolvedName,
                    avatar: (avatar && !avatar.includes('default')) ? avatar : (existing.avatar || avatar),
                    viewedAt: Math.max(existing.viewedAt || 0, viewedAt || 0)
                });
            }
        });

        return Array.from(studentMap.values()).sort((a, b) => (b.viewedAt || 0) - (a.viewedAt || 0));
    }, [task?.viewedBy, userMappings]);

    const [commentText, setCommentText] = useState("");
    const [commentImageUrl, setCommentImageUrl] = useState("");
    const [commentImageUrls, setCommentImageUrls] = useState([]);
    const [commentFileUrl, setCommentFileUrl] = useState("");
    const [commentFileName, setCommentFileName] = useState("");
    const [showCommentImageInput, setShowCommentImageInput] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [translatedDescription, setTranslatedDescription] = useState(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [showTranslated, setShowTranslated] = useState(false);
    const [hoverRating, setHoverRating] = useState(0);

    useEffect(() => {
        setTranslatedDescription(null);
        setShowTranslated(false);
    }, [task?.description]);

    const handleTranslateText = async (text) => {
        if (translatedDescription) {
            setShowTranslated(!showTranslated);
            return;
        }
        setIsTranslating(true);
        try {
            const result = await callGemini(`Traduce el siguiente texto al español de forma fluida, natural y pedagógica. Devuelve ÚNICAMENTE la traducción directa, sin comillas ni notas adicionales:\n\n${text}`);
            if (result) {
                const cleanResult = result.replace(/```json/gi, '').replace(/```/gi, '').trim();
                setTranslatedDescription(cleanResult);
                setShowTranslated(true);
            } else {
                showMessage("No se pudo traducir el contenido.");
            }
        } catch (err) {
            showMessage("Error al procesar la traducción.");
        } finally {
            setIsTranslating(false);
        }
    };
    const [isProcessing, setIsProcessing] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [activeReactionCommentId, setActiveReactionCommentId] = useState(null);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editCommentText, setEditCommentText] = useState("");
    const [revealedComments, setRevealedComments] = useState({}); 
    const [historyOpenCid, setHistoryOpenCid] = useState(null); 
    const [showCommentModal, setShowCommentModal] = useState(false); 
    const [isModalExpanded, setIsModalExpanded] = useState(() => {
        try {
            return localStorage.getItem('english_tech_task_modal_expanded') === 'true';
        } catch {
            return false;
        }
    });
    const toggleModalExpanded = () => {
        setIsModalExpanded(prev => {
            const next = !prev;
            try {
                localStorage.setItem('english_tech_task_modal_expanded', String(next));
            } catch {}
            return next;
        });
    };

    const [showReactionDock, setShowReactionDock] = useState(false);
    const reactionDockTimerRef = useRef(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareComment, setShareComment] = useState("");
    const [shareSearchTerm, setShareSearchTerm] = useState("");
    const [isSharing, setIsSharing] = useState(false);

    // Detección de enlace directo a esta publicación (#post/<id> o #task/<id>)
    useEffect(() => {
        if (activePostModalId && String(activePostModalId) === String(task.id)) {
            setShowCommentModal(true);
        }
    }, [activePostModalId, task.id]);

    useEffect(() => {
        try {
            const h = (window.location.hash || '').replace('#', '').replace(/^\/+/, '');
            if (h === `post/${task.id}` || h === `task/${task.id}`) {
                setShowCommentModal(true);
            }
        } catch (e) {}
    }, [task.id]);

    const handleOpenCommentModal = () => {
        setShowCommentModal(true);
        try {
            window.history.replaceState(null, '', `#post/${task.id}`);
        } catch (e) {
            window.location.hash = `post/${task.id}`;
        }
    };

    const handleCloseCommentModal = () => {
        setShowCommentModal(false);
        if (typeof setActivePostModalId === 'function') {
            setActivePostModalId(null);
        }
        try {
            const currentHash = window.location.hash || '';
            if (currentHash === `#post/${task.id}` || currentHash === `#task/${task.id}`) {
                window.history.replaceState(null, '', window.location.pathname + (window.location.search || ''));
            }
        } catch (e) {}
    };

    const handleCopyPostLink = (e) => {
        if (e) e.stopPropagation();
        try {
            const url = `${window.location.origin}${window.location.pathname}#post/${task.id}`;
            navigator.clipboard.writeText(url);
            showMessage("✅ ¡Enlace de la publicación copiado al portapapeles!");
        } catch (err) {
            showMessage("Enlace: " + window.location.origin + window.location.pathname + '#post/' + task.id);
        }
    };

    const shareRecipientsList = React.useMemo(() => {
        const list = [];
        if (role !== 'teacher') {
            list.push({ id: 'teacher', name: TEACHER_NAME, role: 'teacher', isGroup: false });
            list.push({ id: SECOND_TEACHER_ID, name: SECOND_TEACHER_NAME, role: 'teacher', isGroup: false });
        }
        const seen = new Set([myChatId, 'teacher', SECOND_TEACHER_ID, 'undefined', 'null']);
        if (Array.isArray(students)) {
            students.forEach(st => {
                const sId = st.id || st.username || st.email;
                if (!sId || seen.has(sId)) return;
                seen.add(sId);
                const sName = st.fullName || st.name || sId;
                if (!shareSearchTerm || sName.toLowerCase().includes(shareSearchTerm.toLowerCase())) {
                    list.push({ id: sId, name: sName, role: 'student', isGroup: false });
                }
            });
        }
        if (userMappings && typeof userMappings === 'object') {
            Object.entries(userMappings).forEach(([uid, uData]) => {
                if (!uid || seen.has(uid) || isTeacherId(uid)) return;
                seen.add(uid);
                const name = uData?.fullName || uData?.name || uid;
                if (!shareSearchTerm || name.toLowerCase().includes(shareSearchTerm.toLowerCase())) {
                    list.push({ id: uid, name, role: 'student', isGroup: false });
                }
            });
        }
        (academicGroups || []).forEach(g => {
            const grpName = g.name || 'Grupo';
            if (!shareSearchTerm || grpName.toLowerCase().includes(shareSearchTerm.toLowerCase())) {
                list.push({ id: `acad_${g.id}`, name: `Grupo: ${grpName}`, role: 'group', isGroup: true });
            }
        });
        (chatGroups || []).forEach(g => {
            const grpName = g.name || 'Grupo';
            if (!shareSearchTerm || grpName.toLowerCase().includes(shareSearchTerm.toLowerCase())) {
                list.push({ id: g.id, name: `Grupo: ${grpName}`, role: 'group', isGroup: true });
            }
        });
        return list.slice(0, 25);
    }, [userMappings, students, academicGroups, chatGroups, myChatId, role, shareSearchTerm]);

    const handleShareToProfile = async () => {
        if (isSharing) return;
        setIsSharing(true);
        try {
            const cleanMyId = String(myChatId || '').replace(/^@/, '');
            const studentFullName = userMappings?.[cleanMyId]?.fullName || userMappings?.[myChatId]?.fullName || loggedInName || 'Estudiante';
            const postAuthorPhoto = userMappings?.[cleanMyId]?.profilePicUrl || userMappings?.[myChatId]?.profilePicUrl || '';
            const authorRole = role === 'teacher' ? 'teacher' : 'student';

            const sharePayload = {
                authorId: role === 'teacher' ? (myChatId || 'teacher') : (currentUser?.uid || myChatId || 'user'),
                authorUsername: myChatId || '',
                authorName: role === 'teacher' ? (isCamiloTeacher(myChatId) ? SECOND_TEACHER_NAME : TEACHER_NAME) : studentFullName,
                author: role === 'teacher' ? (isCamiloTeacher(myChatId) ? SECOND_TEACHER_NAME : TEACHER_NAME) : studentFullName,
                authorRole: authorRole,
                authorPhoto: postAuthorPhoto,
                title: shareComment ? shareComment.slice(0, 100) : `Compartió una publicación`,
                text: shareComment ? shareComment : `Compartió: "${task.title}"`,
                imageUrl: '',
                sharedPost: {
                    id: task.id,
                    title: task.title,
                    author: task.authorName || getTeacherDisplayName(getItemTeacherId(task)),
                    authorRole: task.authorRole || 'teacher',
                    type: task.type || 'task',
                    description: (task.description || '').slice(0, 180),
                    imageUrl: task.imageUrl || (task.images && task.images[0]) || '',
                    link: `${window.location.origin}${window.location.pathname}#post/${task.id}`
                },
                comments: [],
                reactions: {},
                createdAt: Date.now()
            };

            if (isDemoMode) {
                const demoPost = { id: `demo_post_${Date.now()}`, ...sharePayload, isDemoCreated: true };
                saveDemoSandboxItem('userPosts', demoPost);
                if (typeof setUserPosts === 'function') {
                    setUserPosts(prev => [demoPost, ...prev]);
                }
            } else {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'userPosts'), sharePayload);
            }
            showMessage("✅ ¡Publicación compartida en tu perfil con éxito!");
            setShowShareModal(false);
            setShareComment("");
        } catch (err) {
            console.error("Error al compartir en perfil:", err);
            showMessage("❌ No se pudo compartir en el perfil. Intenta de nuevo.");
        } finally {
            setIsSharing(false);
        }
    };

    const handleShareViaMessage = async (recipient) => {
        try {
            const authorName = role === 'teacher' ? (isCamiloTeacher(myChatId) ? SECOND_TEACHER_NAME : TEACHER_NAME) : loggedInName;
            const targetChatId = recipient.isGroup 
                ? (recipient.id) 
                : `dm_${[myChatId, recipient.id].sort().join('_')}`;
            
            const shareUrl = `${window.location.origin}${window.location.pathname}#post/${task.id}`;
            const messageText = `📌 *${task.title}*\n${shareUrl}`;

            const nowTs = Date.now();
            if (isDemoMode) {
                const newDemoMsg = {
                    id: `demo_msg_${nowTs}`,
                    text: messageText,
                    author: authorName,
                    authorId: myChatId,
                    authorRole: role,
                    senderId: myChatId,
                    senderName: authorName,
                    uid: myChatId,
                    status: 'read',
                    reactions: {},
                    createdAt: nowTs,
                    timestamp: nowTs
                };
                const existing = loadDemoChatMessages(targetChatId);
                saveDemoChatMessages(targetChatId, [...existing, newDemoMsg]);
            } else {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chats', targetChatId, 'messages'), {
                    text: messageText,
                    author: authorName,
                    authorId: myChatId,
                    uid: currentUser?.uid || myChatId || '',
                    createdAt: nowTs,
                    timestamp: nowTs,
                    status: 'sent'
                });
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'lastMessages', targetChatId), {
                    text: `Compartió: ${task.title}`,
                    author: authorName,
                    authorId: myChatId,
                    authorRole: role,
                    createdAt: nowTs,
                    timestamp: nowTs
                }, { merge: true }).catch(() => {});
            }
            showMessage(`✅ Publicación enviada a ${recipient.name}.`);
            setShowShareModal(false);
        } catch (err) {
            console.error("Error al compartir por mensaje:", err);
            showMessage("❌ Error al enviar mensaje.");
        }
    };
    const [localFullScreenImage, setLocalFullScreenImage] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [gradingCid, setGradingCid] = useState(null);
    const [gradeValue, setGradeValue] = useState("");
    const [gradeFeedback, setGradeFeedback] = useState("");
    const [commentTitle, setCommentTitle] = useState("");
    const [ratingHover, setRatingHover] = useState({});

    const { isRecording: recCom, audioUrl: audioCom, isUploading: upCom, recordingTime: recTimeCom, setAudioUrl: setAudioCom, startRecording: startCom, stopRecording: stopCom, cancelRecording: cancelCom } = useVoiceRecorder('comments_audios', showMessage);
    const emojiPickerRef = React.useRef(null);
    const attachmentMenuRef = React.useRef(null);
    useClickOutside(emojiPickerRef, () => setShowEmojiPicker(false));
    useClickOutside(attachmentMenuRef, () => setShowAttachmentMenu(false));
    React.useEffect(() => {
        if (!showEmojiPicker && !showAttachmentMenu) return;
        const onKey = (e) => {
            if (e.key === 'Escape') {
                setShowEmojiPicker(false);
                setShowAttachmentMenu(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showEmojiPicker, showAttachmentMenu]);

    const isTask = task?.type === 'task';
    const isForum = task?.type === 'forum';
    const isPoll = task?.type === 'poll' || Boolean(task?.poll);
    const isKahoot = task?.type === 'kahoot' || Boolean(task?.kahoot);
    const isEvaluation = task?.type === 'evaluation' || Boolean(task?.evaluationId);
    const isSlides = task?.type === 'slides' || task?.type === 'review' || Boolean(task?.reviewId);
    const isBook3D = task?.type === 'book3d';
    const isPost = task?.type === 'post' || (!isTask && !isForum && !isPoll && !isKahoot && !isEvaluation && !isSlides && !isBook3D);
    const isTaskType = isTask || isForum;

    const linkedBook = React.useMemo(() => {
        if (!isBook3D) return null;
        const found = (books || []).find(b => String(b?.id) === String(task?.bookId));
        if (found) {
            const foundPages = Array.isArray(found.bookPages) && found.bookPages.length > 0 ? found.bookPages : [];
            const taskPages = Array.isArray(task?.bookPages) && task.bookPages.length > 0 ? task.bookPages : [];
            return normalizeBookRecord({
                ...found,
                title: task?.title || found.title || 'Libro',
                description: task?.description !== undefined && task?.description !== '' ? task.description : (found.description || ''),
                pdfUrl: found.pdfUrl || found.fileUrl || task?.pdfUrl || task?.fileUrl || '',
                fileUrl: found.fileUrl || found.pdfUrl || task?.fileUrl || task?.pdfUrl || '',
                bookPages: foundPages.length >= taskPages.length ? foundPages : taskPages,
                pageTexts: (Array.isArray(found.pageTexts) && found.pageTexts.length > 0)
                    ? found.pageTexts
                    : (Array.isArray(task?.pageTexts) ? task.pageTexts : []),
                bookOutline: (Array.isArray(found.bookOutline) && found.bookOutline.length > 0)
                    ? found.bookOutline
                    : (Array.isArray(task?.bookOutline) ? task.bookOutline : []),
                pageCount: Math.max(
                    Number(found.pageCount) || 0,
                    Number(task?.pageCount) || 0,
                    foundPages.length,
                    taskPages.length
                )
            });
        }
        return normalizeBookRecord(task);
    }, [isBook3D, books, task]);

    const bookIdentityKey = String(task?.bookId || linkedBook?.id || task?.id || '').replace(/^book_wall_/, '');
    const bookPagesSignature = React.useMemo(() => {
        const arr = Array.isArray(linkedBook?.bookPages) ? linkedBook.bookPages : [];
        return `${arr.length}:${String(arr[0] || '').slice(0, 64)}:${String(arr[arr.length - 1] || '').slice(0, 64)}`;
    }, [linkedBook?.bookPages]);

    useEffect(() => {
        setBookPreviewSpreadIdx(0);
        setBookPreviewFlipAnim(null);
        setBookPreviewDragState(null);
        lastPreviewCoverOpenAtRef.current = 0;
        return () => {
            if (bookPreviewFlipTimerRef.current) clearTimeout(bookPreviewFlipTimerRef.current);
        };
    }, [bookIdentityKey]);

    // Cargar / renderizar páginas en vivo desde pdfUrl cuando las páginas en Firestore fueron compactadas o truncadas
    useEffect(() => {
        if (!isBook3D || !linkedBook) return;
        let cancelled = false;
        const preRendered = Array.isArray(linkedBook.bookPages) && linkedBook.bookPages.length > 0
            ? linkedBook.bookPages
            : [];
        const pdfSourceUrl = linkedBook.pdfUrl || linkedBook.fileUrl || task?.pdfUrl || task?.fileUrl || '';
        const expectedCount = Math.max(
            preRendered.length,
            Number(linkedBook.pageCount) || 0,
            Number(task?.pageCount) || 0,
            Array.isArray(linkedBook.bookOutline) ? linkedBook.bookOutline.length : 0,
            Array.isArray(linkedBook.pageTexts) ? linkedBook.pageTexts.length : 0
        );

        const shouldRenderFromPdf = bookPagesNeedLivePdfRender(preRendered, {
            pdfUrl: pdfSourceUrl,
            expectedPageCount: expectedCount
        });

        if (!shouldRenderFromPdf || !pdfSourceUrl) {
            setLiveBookPages(null);
            setLoadingBookPdf(false);
            return () => {
                cancelled = true;
            };
        }

        setLoadingBookPdf(true);
        setBookRenderProgress({ currentPage: 0, totalPages: expectedCount, percent: 8 });

        renderPdfToBookPages(pdfSourceUrl, {
            maxPages: Math.max(60, expectedCount || 60),
            scale: 1.5,
            maxDimension: 1280,
            quality: 0.80,
            compressionLevel: 'light',
            customCoverUrl: linkedBook.customCoverUrl || '',
            fallbackTitle: linkedBook.title,
            themeId: linkedBook.theme,
            onProgress: (prog) => {
                if (!cancelled) setBookRenderProgress(prog);
            }
        })
            .then((res) => {
                if (cancelled) return;
                if (Array.isArray(res?.pages) && res.pages.length > 0) {
                    const mergedPages = res.pages.map((livePage, idx) => {
                        const existingPage = preRendered[idx];
                        if (existingPage && !isCompactedOrFallbackBookPage(existingPage)) {
                            return existingPage;
                        }
                        return livePage;
                    });
                    setLiveBookPages(mergedPages);
                }
                setLoadingBookPdf(false);
            })
            .catch(() => {
                if (!cancelled) {
                    setLoadingBookPdf(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [
        isBook3D,
        bookIdentityKey,
        linkedBook?.pdfUrl,
        linkedBook?.fileUrl,
        bookPagesSignature,
        linkedBook?.pageCount,
        linkedBook?.title,
        linkedBook?.theme,
        linkedBook?.customCoverUrl,
        task?.pdfUrl,
        task?.fileUrl,
        task?.pageCount
    ]);

    const effectiveBookPages = React.useMemo(() => {
        if (!isBook3D || !linkedBook) return [];
        const fallbackPages = buildFallbackBookPages({
            title: linkedBook.title,
            description: linkedBook.description,
            fileName: linkedBook.fileName,
            author: linkedBook.authorName || 'Docente',
            themeId: linkedBook.theme,
            customCoverUrl: linkedBook.customCoverUrl || ''
        });
        const basePages = Array.isArray(liveBookPages) && liveBookPages.length > 0
            ? liveBookPages
            : (Array.isArray(linkedBook.bookPages) && linkedBook.bookPages.length > 0
                ? linkedBook.bookPages
                : fallbackPages);

        const expectedCount = Math.max(
            basePages.length,
            Number(linkedBook.pageCount) || 0,
            Number(task?.pageCount) || 0,
            Array.isArray(linkedBook.bookOutline) ? linkedBook.bookOutline.length : 0,
            Array.isArray(linkedBook.pageTexts) ? linkedBook.pageTexts.length : 0
        );

        if (expectedCount > basePages.length) {
            const outlinePages = Array.isArray(linkedBook.bookOutline) && linkedBook.bookOutline.length > 0
                ? buildBookPagesFromOutline(linkedBook.bookOutline, {
                    themeId: linkedBook.theme,
                    author: linkedBook.authorName || 'Docente',
                    customCoverUrl: linkedBook.customCoverUrl || ''
                })
                : [];
            return Array.from({ length: expectedCount }, (_, idx) => {
                if (basePages[idx]) return basePages[idx];
                if (outlinePages[idx]) return outlinePages[idx];
                const rawSnippet = String(linkedBook.pageTexts?.[idx] || '').trim();
                return buildIllustratedBookPageSvg({
                    variant: idx === 0 ? 'cover' : idx === expectedCount - 1 && expectedCount >= 3 ? 'back-cover' : 'content',
                    chapter: idx === 0 ? 'LIBRO' : `PÁGINA ${idx + 1}`,
                    title: idx === 0 ? linkedBook.title : `${linkedBook.title} — Página ${idx + 1}`,
                    subtitle: '',
                    body: rawSnippet
                        ? [rawSnippet, 'Usa el botón PDF para abrir el documento completo.']
                        : [`Vista de la página ${idx + 1} de "${linkedBook.title}".`, 'Usa el botón PDF para abrir el documento completo.'],
                    pageNumber: idx + 1,
                    totalPages: expectedCount,
                    themeId: linkedBook.theme
                });
            });
        }
        if (basePages.length === 1 && fallbackPages.length > 1) {
            return [basePages[0], ...fallbackPages.slice(1)];
        }
        return basePages;
    }, [isBook3D, linkedBook, liveBookPages, task?.pageCount]);

    const bookSpreads = React.useMemo(
        () => (effectiveBookPages.length > 0 ? buildBookSpreads(effectiveBookPages, true) : []),
        [effectiveBookPages]
    );

    const linkedEvaluation = React.useMemo(() => {
        if (!isEvaluation) return null;
        const found = (evaluations || []).find(e => String(e?.id) === String(task?.evaluationId));
        if (found) {
            return {
                ...found,
                title: task?.title || found.title || 'Evaluación Académica',
                description: task?.description !== undefined && task?.description !== '' ? task.description : (found.description || ''),
                dueDate: task?.dueDate || found.dueDate || '',
                dueTime: task?.dueTime || found.dueTime || '23:59'
            };
        }
        return {
            id: task?.evaluationId || task?.id,
            title: task?.title || 'Evaluación Académica',
            description: task?.description || '',
            dueDate: task?.dueDate || '',
            dueTime: task?.dueTime || '23:59',
            timeLimit: task?.timeLimit || 30,
            strictAntiCheat: Boolean(task?.strictAntiCheat),
            immediateFeedback: Boolean(task?.immediateFeedback),
            questions: Array.isArray(task?.questions) ? task.questions : Array.from({ length: Number(task?.questionCount) || 1 }),
            targetGroupId: task?.targetGroupId || 'all',
            targetGroupName: task?.targetGroupName || 'General',
            isDemoCreated: Boolean(task?.isDemoCreated)
        };
    }, [isEvaluation, evaluations, task]);

    const linkedReview = React.useMemo(() => {
        if (!isSlides) return null;
        const found = (reviews || []).find(r => String(r?.id) === String(task?.reviewId));
        if (found) {
            return {
                ...found,
                topic: task?.title || found.topic || 'Presentación de Diapositivas',
                googleSlidesUrl: task?.googleSlidesUrl || found.googleSlidesUrl,
                googleSlidesOriginalUrl: task?.googleSlidesOriginalUrl || found.googleSlidesOriginalUrl,
                sourceType: task?.sourceType || found.sourceType,
                pptxUrl: task?.pptxUrl || found.pptxUrl,
                fileName: task?.fileName || found.fileName
            };
        }
        if ((Array.isArray(task?.slides) && task.slides.length > 0) || task?.googleSlidesUrl || task?.pptxUrl) {
            return {
                id: task?.reviewId || task?.id,
                topic: task?.title || 'Presentación de Diapositivas',
                language: task?.language || 'Inglés',
                theme: task?.theme || 'unipamplona',
                slides: task?.slides || [{ id: 1, layout: 'title', title: task?.title, subtitle: 'Presentación', googleSlidesUrl: task?.googleSlidesUrl }],
                slideCount: task?.slides?.length || task?.slideCount || 1,
                sourceType: task?.sourceType || (task?.googleSlidesUrl ? 'google_slides' : task?.pptxUrl ? 'pptx' : 'native'),
                googleSlidesUrl: task?.googleSlidesUrl,
                googleSlidesOriginalUrl: task?.googleSlidesOriginalUrl,
                pptxUrl: task?.pptxUrl,
                fileName: task?.fileName,
                fileSize: task?.fileSize,
                author: task?.authorName || task?.author || TEACHER_NAME,
                targetGroupId: task?.targetGroupId || 'all',
                targetGroupName: task?.targetGroupName || 'General',
                createdAt: task?.createdAt
            };
        }
        return null;
    }, [isSlides, reviews, task]);

    const [healedSlidesOverride, setHealedSlidesOverride] = useState(null);

    // Auto-sanación en caliente de diapositivas en el Muro si contienen imágenes corruptas por 'Analytics & Key Indicators'
    useEffect(() => {
        if (!isSlides || !linkedReview?.pptxUrl) return;
        const hasCorrupted = (linkedReview.slides || []).some(s => isCorruptedAnalyticsSlide(s) || s?._wasCorrupted);
        if (!hasCorrupted) return;

        let isCancelled = false;
        (async () => {
            try {
                const healed = await healCorruptedPresentationFromPptx(linkedReview);
                if (!healed || isCancelled) return;
                setHealedSlidesOverride(healed.slides);
            } catch {}
        })();
        return () => { isCancelled = true; };
    }, [isSlides, linkedReview]);

    const effectiveLinkedReview = React.useMemo(() => {
        if (!linkedReview) return null;
        if (healedSlidesOverride && Array.isArray(healedSlidesOverride)) {
            return {
                ...linkedReview,
                slides: healedSlidesOverride,
                slideCount: healedSlidesOverride.length
            };
        }
        return linkedReview;
    }, [linkedReview, healedSlidesOverride]);

    const [filterOnlyUngraded, setFilterOnlyUngraded] = useState(false);

    // Identificación de la entrega del estudiante actual
    const myDelivery = React.useMemo(() => {
        if (!task || !isTask || role === 'teacher') return null;
        const myName = (loggedInName || '').trim().toLowerCase();
        const myUid = (currentUser?.uid || '').trim().toLowerCase();
        const myUserKey = (currentUserId || '').trim().toLowerCase();
        const myEmailPrefix = (currentUser?.email ? currentUser.email.split('@')[0] : '').trim().toLowerCase();

        const myComments = (task.comments || []).filter(c => {
            if (c.isDeleted) return false;
            const authorLower = (c.author || '').trim().toLowerCase();
            const authorDisplayName = resolveUserDisplayName(c, userMappings, c.author).trim().toLowerCase();
            const authorIdLower = (c.authorId || '').trim().toLowerCase();
            const authorUsernameLower = (c.authorUsername || '').trim().toLowerCase();
            const cUidLower = (c.uid || '').trim().toLowerCase();

            return (myName && (authorLower === myName || authorDisplayName === myName)) ||
                   (myUid && (authorIdLower === myUid || cUidLower === myUid)) ||
                   (myUserKey && (authorIdLower === myUserKey || authorUsernameLower === myUserKey)) ||
                   (myEmailPrefix && (authorUsernameLower === myEmailPrefix || authorLower === myEmailPrefix));
        });
        return myComments.slice().reverse().find(c => c.grade !== undefined && c.grade !== null && c.grade !== '') || myComments[myComments.length - 1] || null;
    }, [task, isTask, role, loggedInName, currentUserId, currentUser, userMappings]);

    const myDeliveryIsLate = React.useMemo(() => {
        if (!myDelivery || !task?.dueDate) return false;
        const parsedDue = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
        if (isNaN(parsedDue.getTime()) || !myDelivery.createdAt) return false;
        return new Date(myDelivery.createdAt) > parsedDue;
    }, [myDelivery, task?.dueDate, task?.dueTime]);

    // Contador de entregas y pendientes por calificar para la docente
    const teacherDeliveryStats = React.useMemo(() => {
        if (!task || !isTask || role !== 'teacher') return { totalReceived: 0, pendingToGrade: 0 };
        const studentComments = (task.comments || []).filter(c => {
            if (c.isDeleted) return false;
            const authorLower = (c.author || '').trim().toLowerCase();
            const isTeacherAuthor = c.authorRole === 'teacher' || c.role === 'teacher' || isTeacherId(c.authorId) || isTeacherId(c.authorUsername) || isTeacherId(authorLower) || (c.author && (c.author.trim() === TEACHER_NAME || c.author.trim() === SECOND_TEACHER_NAME)) || authorLower === 'profesora' || authorLower === 'profesor' || authorLower === 'la profe' || authorLower === 'el profe' || authorLower === 'docente gina' || authorLower === 'profesora gina' || authorLower === 'docente camilo' || authorLower === 'profesor camilo';
            return !isTeacherAuthor;
        });

        const studentMap = new Map();
        studentComments.forEach(c => {
            const key = (c.authorId || c.authorUsername || c.uid || c.author || '').trim().toLowerCase();
            if (!studentMap.has(key)) {
                studentMap.set(key, c);
            } else {
                const prev = studentMap.get(key);
                if ((prev.grade === undefined || prev.grade === null || prev.grade === '') && (c.grade !== undefined && c.grade !== null && c.grade !== '')) {
                    studentMap.set(key, c);
                }
            }
        });

        const totalReceived = studentMap.size;
        const pendingToGrade = Array.from(studentMap.values()).filter(c => c.grade === undefined || c.grade === null || c.grade === '').length;
        return { totalReceived, pendingToGrade };
    }, [task, isTask, role]);

    const [isVoting, setIsVoting] = useState(false);
    const [activeVotersOptionId, setActiveVotersOptionId] = useState(null);

    if (!task) return null;

    const parsedDeadline = task.dueDate ? new Date(`${task.dueDate}T${task.dueTime || '23:59'}`) : null;
    const deadline = parsedDeadline && !isNaN(parsedDeadline.getTime()) ? parsedDeadline : null;
    const isExpired = deadline ? new Date() > deadline : false;
    const isAllowLate = Boolean(task.allowLate === true || task.allowLate === 'true' || task.allowLate === 1 || task.allowLate === '1');
    // Para encuestas, si expiró la fecha de cierre, se bloquea la votación
    const isLocked = isPoll ? isExpired : (isTask ? (isExpired && !isAllowLate) : (isExpired && !isAllowLate));

    const isDemoTask = Boolean(
        isDemoMode ||
        task?.isDemoCreated ||
        (task?.id && (String(task.id).startsWith('demo-') || String(task.id).startsWith('demo_'))) ||
        String(task?.evaluationId || '').startsWith('demo') ||
        String(task?.reviewId || '').startsWith('demo') ||
        String(task?.bookId || '').startsWith('demo')
    );

    const updateTaskDoc = async (updates) => {
        const { isSynthesizedFeedItem, ...cleanBase } = task;
        if (isDemoTask) {
            const nextTask = { ...cleanBase, ...updates };
            if (typeof setTasks === 'function') {
                setTasks(prev => {
                    const list = prev || [];
                    const exists = list.some(t => String(t.id) === String(task.id));
                    return exists
                        ? list.map(t => String(t.id) === String(task.id) ? nextTask : t)
                        : [nextTask, ...list];
                });
            }
            saveDemoSandboxItem('tasks', nextTask);
            return;
        }
        if (!auth?.currentUser) {
            try { await signInAnonymously(auth); } catch { /* continuar */ }
        }
        if (isSynthesizedFeedItem) {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { ...cleanBase, ...updates }, { merge: true });
        } else {
            try {
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), updates);
            } catch {
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { ...cleanBase, ...updates }, { merge: true });
            }
        }
        if (typeof setTasks === 'function') {
            setTasks(prev => {
                const list = prev || [];
                const exists = list.some(t => String(t.id) === String(task.id));
                return exists
                    ? list.map(t => String(t.id) === String(task.id) ? { ...cleanBase, ...updates } : t)
                    : [{ ...cleanBase, ...updates }, ...list];
            });
        }
    };

    const handleVote = async (optionId) => {
        if (isLocked) {
            showMessage("ℹ️ La votación para esta encuesta ya ha finalizado.");
            return;
        }
        if (isDemoTask) {
            const voterKey = currentUserId && currentUserId !== 'undefined' ? currentUserId : 'demo_guest';
            const freshPoll = task.poll || {};
            const freshOptions = freshPoll.options || [];
            const multiple = Boolean(freshPoll.isMultipleChoice);
            let updatedOptions;
            if (multiple) {
                updatedOptions = freshOptions.map((opt) => {
                    if (opt.id !== optionId) return opt;
                    const list = opt.voterIds || [];
                    const yaVoto = list.includes(voterKey);
                    return {
                        ...opt,
                        voterIds: yaVoto ? list.filter((id) => id !== voterKey) : [...list, voterKey]
                    };
                });
            } else {
                const alreadyVotedThis = (freshOptions.find((o) => o.id === optionId)?.voterIds || []).includes(voterKey);
                updatedOptions = freshOptions.map((opt) => {
                    const list = (opt.voterIds || []).filter((id) => id !== voterKey);
                    if (opt.id === optionId && !alreadyVotedThis) list.push(voterKey);
                    return { ...opt, voterIds: list };
                });
            }
            await updateTaskDoc({ poll: { ...freshPoll, options: updatedOptions } });
            showMessage("🗳️ Voto registrado en Modo Demo.");
            return;
        }
        if (!currentUserId || currentUserId === 'undefined') {
            showMessage("⚠️ Debes tener una sesión activa para votar.");
            return;
        }
        if (isVoting) return;
        setIsVoting(true);

        try {
            if (!auth.currentUser) {
                try { await signInAnonymously(auth); } catch (e) {}
            }

            // Transaccion: lee el dato mas reciente y escribe una sola vez,
            // asi dos estudiantes votando al mismo tiempo no se pisan el voto.
            const taskRef = doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id);
            await runTransaction(db, async (transaction) => {
                const snap = await transaction.get(taskRef);
                const freshPoll = snap.data()?.poll || {};
                const freshOptions = freshPoll.options || [];
                const multiple = Boolean(freshPoll.isMultipleChoice);
                let updatedOptions;

                if (multiple) {
                    updatedOptions = freshOptions.map((opt) => {
                        if (opt.id !== optionId) return opt;
                        const list = opt.voterIds || [];
                        const yaVoto = list.includes(currentUserId);
                        return {
                            ...opt,
                            voterIds: yaVoto ? list.filter((id) => id !== currentUserId) : [...list, currentUserId]
                        };
                    });
                } else {
                    const alreadyVotedThis = (freshOptions.find((o) => o.id === optionId)?.voterIds || []).includes(currentUserId);
                    updatedOptions = freshOptions.map((opt) => {
                        const list = (opt.voterIds || []).filter((id) => id !== currentUserId);
                        if (opt.id === optionId && !alreadyVotedThis) list.push(currentUserId);
                        return { ...opt, voterIds: list };
                    });
                }

                transaction.update(taskRef, { 'poll.options': updatedOptions });
            });
        } catch (err) {
            console.error("Error al registrar voto:", err);
            showMessage("❌ Error al registrar tu voto.");
        } finally {
            setIsVoting(false);
        }
    };

    const handleTranslate = async (lang) => {
        if (!commentText.trim()) {
            showMessage("ℹ️ Escribe primero un texto en el comentario para traducirlo.");
            return;
        }
        setIsProcessing(true);
        try {
            const prompt = `Traduce el siguiente comentario al ${lang} de forma profesional, fluida y natural manteniendo el contexto pedagógico. REGLA ESTRICTA: NO uses asteriscos (* o **). Devuelve ÚNICAMENTE la traducción directa sin comillas ni explicaciones adicionales:\n\n${commentText}`;
            let result = "";
            if (callGemini) {
                result = await callGemini(prompt);
            }
            if (!result) {
                if (auth && !auth.currentUser) {
                    try { await signInAnonymously(auth); } catch (e) { /* continuar */ }
                }
                const tokenIA = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
                const res = await fetch('/api/gemini', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(tokenIA ? { Authorization: 'Bearer ' + tokenIA } : {}) },
                    body: JSON.stringify({ promptText: prompt })
                });
                if (res.ok) {
                    const data = await res.json();
                    result = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                }
            }
            if (result && result.trim()) {
                const cleanResult = result.replace(/```json/gi, '').replace(/```/gi, '').replace(/\*\*/g, '').replace(/\*/g, '').trim().replace(/^["']|["']$/g, '');
                setCommentText(cleanResult);
                showMessage(`Traducido a ${lang}`);
            } else {
                showMessage(`No se pudo traducir a ${lang}.`);
            }
        } catch (err) {
            showMessage(`Error al conectar con el servicio de traducción.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleReaction = async (type) => {
        if (!currentUserId || currentUserId === 'undefined') return;
        try {
            if (!isDemoTask && !auth.currentUser) {
                try {
                    await signInAnonymously(auth);
                } catch (e) {}
            }
            const newReactions = { ...(task.reactions || {}) };
            
            // Limpiar cualquier residuo de bugs antiguos
            delete newReactions['undefined'];
            delete newReactions['null'];
            delete newReactions[''];
            delete newReactions['type'];

            const userKeysToCheck = role === 'teacher' 
                ? (activeTeacherId === SECOND_TEACHER_ID 
                    ? ['camilodocente', 'teacher_camilo', 'CamiloDocente', currentUserId, currentUser?.uid].filter(Boolean)
                    : ['teacher', 'teacher_gina', 'GinaDocente', currentUserId, currentUser?.uid].filter(Boolean))
                : [currentUserId, currentUser?.uid, loggedInName ? `name_${loggedInName.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : null].filter(Boolean);

            let existingKey = null;
            let existingType = null;

            for (const k of userKeysToCheck) {
                if (newReactions[k]) {
                    existingKey = k;
                    const rVal = newReactions[k];
                    existingType = typeof rVal === 'object' ? (rVal.type || rVal.emoji) : rVal;
                    break;
                }
            }

            if (existingType === type) {
                if (existingKey) delete newReactions[existingKey];
                delete newReactions[currentUserId];
            } else {
                if (existingKey) delete newReactions[existingKey];
                newReactions[currentUserId] = { type: type, name: loggedInName || (role === 'teacher' ? getTeacherDisplayName(activeTeacherId) : 'Estudiante'), timestamp: Date.now() };
            }

            await updateTaskDoc({ reactions: newReactions });
        } catch (err) {
            console.error("Error al reaccionar:", err);
        }
    };

    const toggleForumRating = async (score) => {
        if (!currentUserId || currentUserId === 'undefined') return;
        try {
            if (!isDemoTask && !auth.currentUser) {
                try {
                    await signInAnonymously(auth);
                } catch (e) {}
            }
            const newRatings = { ...(task.ratings || task.forumRatings || {}) };
            
            // Limpiar llaves residuales
            delete newRatings['undefined'];
            delete newRatings['null'];
            delete newRatings[''];
            delete newRatings['type'];

            const userKeysToCheck = role === 'teacher' 
                ? (activeTeacherId === SECOND_TEACHER_ID 
                    ? ['camilodocente', 'teacher_camilo', 'CamiloDocente', currentUserId, currentUser?.uid].filter(Boolean)
                    : ['teacher', 'teacher_gina', 'GinaDocente', currentUserId, currentUser?.uid].filter(Boolean))
                : [currentUserId, currentUser?.uid, loggedInName ? `name_${loggedInName.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : null].filter(Boolean);

            let existingKey = null;
            let existingScore = null;

            for (const k of userKeysToCheck) {
                if (newRatings[k] !== undefined) {
                    existingKey = k;
                    const rVal = newRatings[k];
                    existingScore = typeof rVal === 'object' ? (rVal.score || rVal.rating) : Number(rVal);
                    break;
                }
            }

            if (existingScore === score) {
                if (existingKey) delete newRatings[existingKey];
                delete newRatings[currentUserId];
                showMessage("Puntuación removida");
            } else {
                if (existingKey) delete newRatings[existingKey];
                newRatings[currentUserId] = { 
                    score: score, 
                    name: loggedInName || (role === 'teacher' ? getTeacherDisplayName(activeTeacherId) : 'Estudiante'), 
                    timestamp: Date.now() 
                };
                showMessage(`⭐ ¡Puntaje asignado: ${score} estrella${score > 1 ? 's' : ''}!`);
            }

            await updateTaskDoc({ 
                ratings: newRatings,
                forumRatings: newRatings 
            });
        } catch (err) {
            console.error("Error al calificar foro:", err);
            showMessage("No se pudo guardar la calificación del foro.");
        }
    };

    const toggleCommentReaction = async (commentId, emoji) => {
        if (!currentUserId) return;
        try {
            if (!isDemoTask && !auth.currentUser) {
                try {
                    await signInAnonymously(auth);
                } catch (e) {}
            }
            const updatedComments = (task.comments || []).map((c, i) => {
                const currentCid = c.id || `old-${i}`; 
                if (currentCid === commentId) {
                    const reactions = { ...(c.reactions || {}) };
                    const currentReact = reactions[currentUserId];
                    const currentEmoji = typeof currentReact === 'object' ? currentReact.emoji : currentReact;
                    if (currentEmoji === emoji) delete reactions[currentUserId];
                    else reactions[currentUserId] = { emoji: emoji, name: loggedInName };
                    return { ...c, reactions };
                }
                return c; 
            });
            await updateTaskDoc({ comments: updatedComments });
        } catch (err) {
            console.error("Error al reaccionar comentario:", err);
        }
    };

    const saveGradeComment = async (cid, i) => {
        const grade = parseFloat(String(gradeValue).replace(',', '.'));
        if (isNaN(grade) || grade < 0 || grade > 5) return showMessage("Nota inválida (0-5).");
        try {
            if (!isDemoTask && !auth.currentUser) {
                try {
                    await signInAnonymously(auth);
                } catch (e) {}
            }
            const updatedComments = (task.comments || []).map((c, idx) => {
                const currentCid = c.id || `old-${idx}`;
                if (currentCid === cid) return { ...c, grade, feedback: gradeFeedback.trim() };
                return c;
            });
            await updateTaskDoc({ comments: updatedComments });
            setGradingCid(null); setGradeValue(""); setGradeFeedback("");
            showMessage("Calificación guardada");
        } catch (err) {
            console.error("Error al guardar nota:", err);
            showMessage("No se pudo guardar la calificación.");
        }
    };

    const handleRateForumComment = async (cid, stars) => {
        if (!currentUserId) return;
        try {
            if (!isDemoTask && !auth.currentUser) {
                try {
                    await signInAnonymously(auth);
                } catch (e) {}
            }
            const updatedComments = (task.comments || []).map((c, idx) => {
                const currentCid = c.id || `old-${idx}`;
                if (currentCid === cid) {
                    const currentRatings = { ...(c.ratings || {}) };
                    currentRatings[currentUserId] = {
                        stars: stars,
                        name: loggedInName || (role === 'teacher' ? getTeacherDisplayName(activeTeacherId) : 'Estudiante'),
                        role: role,
                        timestamp: Date.now()
                    };
                    return { ...c, ratings: currentRatings };
                }
                return c;
            });
            await updateTaskDoc({ comments: updatedComments });
            showMessage(`Has valorado con ${stars} estrella${stars > 1 ? 's' : ''}`);
        } catch (err) {
            console.error("Error al valorar comentario:", err);
            showMessage("No se pudo registrar tu valoración.");
        }
    };

    const exportTaskToExcel = async () => {
        const XLSX = await import('xlsx').catch(() => null);
        if (!XLSX) { showMessage('No se pudo cargar el generador de Excel. Revisa tu conexi\u00f3n.'); return; }
        if (!task) return;

        // 1. Recopilar todos los estudiantes del curso o que hayan entregado
        const allStudentsMap = {};
        const cleanTaskGrp = String(task.targetGroupId || task.targetGroup || '').replace(/^acad_/i, '').trim().toLowerCase();
        const isGlobalTask = !cleanTaskGrp || cleanTaskGrp === 'all' || cleanTaskGrp === 'global';

        const taskOwnerId = getItemTeacherId(task);
        const matchingGroups = isGlobalTask
            ? (academicGroups || []).filter(g => isDemoMode || getItemTeacherId(g) === taskOwnerId)
            : (academicGroups || []).filter(g => {
                const gId = String(g?.id || '').replace(/^acad_/i, '').trim().toLowerCase();
                const gName = String(g?.name || '').trim().toLowerCase();
                return gId === cleanTaskGrp || gName === cleanTaskGrp;
            });

        const groupMemberKeys = new Set();
        matchingGroups.forEach(g => {
            const mList = Array.isArray(g?.members) ? g.members : (g?.members && typeof g.members === 'object' ? Object.keys(g.members) : []);
            mList.forEach(m => {
                if (m && !isTeacherId(m)) {
                    groupMemberKeys.add(String(m).toLowerCase().replace('@', '').trim());
                }
            });
        });

        // Estudiantes registrados en el directorio
        Object.entries(userMappings || {}).forEach(([username, data]) => {
            if (data?.role !== 'teacher' && !isTeacherId(username) && data?.fullName) {
                const cleanU = String(username).toLowerCase().replace('@', '').trim();
                const cleanUid = String(data.uid || '').toLowerCase().trim();
                const cleanEmail = String(data.email || '').toLowerCase().trim();
                const cleanPrefix = cleanEmail ? cleanEmail.split('@')[0] : '';
                const inTeacherGroup = groupMemberKeys.has(cleanU) || (cleanUid && groupMemberKeys.has(cleanUid)) || (cleanEmail && groupMemberKeys.has(cleanEmail)) || (cleanPrefix && groupMemberKeys.has(cleanPrefix));
                const cleanStudentGrp1 = String(data.academicGroupId || '').replace(/^acad_/i, '').trim().toLowerCase();
                const cleanStudentGrp2 = String(data.group || '').replace(/^acad_/i, '').trim().toLowerCase();
                const matchesDirectGroup = !isGlobalTask && ((cleanStudentGrp1 && cleanStudentGrp1 === cleanTaskGrp) || (cleanStudentGrp2 && cleanStudentGrp2 === cleanTaskGrp));

                if (inTeacherGroup || matchesDirectGroup) {
                    allStudentsMap[data.fullName.trim()] = {
                        name: data.fullName.trim(),
                        username: username,
                        uid: data.uid || '',
                        email: data.email || ''
                    };
                }
            }
        });

        const isTeacherComment = (c) => {
            if (!c || c.isDeleted) return true;
            if (c.authorRole === 'teacher' || c.userRole === 'teacher' || c.role === 'teacher') return true;
            const authStr = String(c.author || '').trim();
            if (!authStr) return true;
            if (authStr === TEACHER_NAME || authStr === SECOND_TEACHER_NAME || authStr === 'Profesora' || authStr === 'Profesor' || authStr === 'La profe') return true;
            if (isTeacherId(authStr) || isTeacherId(c.authorUsername) || isTeacherId(c.authorId)) return true;
            return false;
        };

        const normalizePersonKey = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

        const doesCommentMatchStudent = (c, st) => {
            if (!c || !st || isTeacherComment(c)) return false;
            const resolvedCAuthor = resolveUserDisplayName(c, userMappings, c.author);
            const cAuthorResolved = normalizePersonKey(resolvedCAuthor);
            const cAuthorRaw = normalizePersonKey(c.author);
            const stName = normalizePersonKey(st.name);
            if (cAuthorResolved && stName && cAuthorResolved === stName) return true;
            if (cAuthorRaw && stName && cAuthorRaw === stName) return true;
            const cUser = String(c.authorUsername || c.authorId || '').toLowerCase().replace('@', '').trim();
            const stUser = String(st.username || '').toLowerCase().replace('@', '').trim();
            const stUid = String(st.uid || '').toLowerCase().trim();
            if (cUser && ((stUser && cUser === stUser) || (stUid && cUser === stUid))) return true;

            const authorWords = cAuthorRaw.split(/\s+/).filter(w => w.length >= 3);
            if (authorWords.length >= 2 && authorWords.every(w => stName.includes(w))) return true;

            const partsC = splitNameFirstAndLast(resolvedCAuthor || c.author || '');
            const partsSt = splitNameFirstAndLast(st.name || '');
            const firstC = normalizePersonKey(partsC.first).split(/\s+/)[0];
            const firstSt = normalizePersonKey(partsSt.first).split(/\s+/)[0];
            const lastC = normalizePersonKey(partsC.last).split(/\s+/)[0];
            const lastSt = normalizePersonKey(partsSt.last).split(/\s+/)[0];
            if (firstC && firstSt && lastC && lastSt && firstC === firstSt && lastC === lastSt) return true;
            return false;
        };

        // Incluir a cualquier estudiante que haya hecho entrega en los comentarios
        (task.comments || []).forEach(c => {
            if (!isTeacherComment(c)) {
                const authorDisplayName = resolveUserDisplayName(c, userMappings, c.author ? c.author.trim() : '');
                const alreadyMatched = Object.values(allStudentsMap).some(st => doesCommentMatchStudent(c, st));
                if (!alreadyMatched && authorDisplayName && !allStudentsMap[authorDisplayName]) {
                    allStudentsMap[authorDisplayName] = {
                        name: authorDisplayName,
                        username: c.authorUsername || c.authorId || '',
                        uid: c.authorId || '',
                        email: ''
                    };
                }
            }
        });

        const studentsList = Object.values(allStudentsMap);

        // 2. Ordenar alfabéticamente por apellido (Apellido, Nombre)
        const sortedStudents = studentsList.sort((a, b) => {
            const partsA = splitNameFirstAndLast(a?.name || '');
            const partsB = splitNameFirstAndLast(b?.name || '');
            const lastA = partsA?.last ? `${partsA.last}, ${partsA.first}` : (partsA?.first || '');
            const lastB = partsB?.last ? `${partsB.last}, ${partsB.first}` : (partsB?.first || '');
            return String(lastA || '').localeCompare(String(lastB || ''), 'es', { sensitivity: 'base' });
        });

        // Fecha límite
        const rawDeadline = task.dueDate ? new Date(`${task.dueDate}T${task.dueTime || '23:59'}`) : null;
        const deadline = (rawDeadline && !isNaN(rawDeadline.getTime())) ? rawDeadline : null;

        // 3. Mapear filas
        let totalScoresSum = 0;
        let gradedCount = 0;

        const dataRows = sortedStudents.map((st, index) => {
            const parts = splitNameFirstAndLast(st.name);
            const displayName = parts.last ? `${parts.last}, ${parts.first}` : parts.first;

            const studentComments = (task.comments || []).filter(c => doesCommentMatchStudent(c, st));
            const lastSubmission = studentComments.slice().reverse().find(c => c.grade !== undefined && c.grade !== null && c.grade !== '') || (studentComments.length > 0 ? studentComments[studentComments.length - 1] : null);

            let estadoEntrega = 'Sin entrega';
            let fechaEntrega = '-';
            let notaStr = 'Sin calificar';
            let retroalimentacion = '-';

            if (lastSubmission) {
                const submissionDate = lastSubmission.createdAt ? new Date(lastSubmission.createdAt) : null;
                if (submissionDate && !isNaN(submissionDate.getTime())) {
                    const day = String(submissionDate.getDate()).padStart(2, '0');
                    const month = String(submissionDate.getMonth() + 1).padStart(2, '0');
                    const year = submissionDate.getFullYear();
                    fechaEntrega = `${day}/${month}/${year}`;
                    
                    if (deadline && submissionDate > deadline) {
                        estadoEntrega = 'Entregado fuera de tiempo';
                    } else {
                        estadoEntrega = 'Entregado';
                    }
                } else {
                    estadoEntrega = 'Entregado';
                }

                if (lastSubmission.grade !== undefined && lastSubmission.grade !== null && lastSubmission.grade !== '') {
                    const numGrade = Number(String(lastSubmission.grade).replace(',', '.'));
                    if (!isNaN(numGrade)) {
                        notaStr = numGrade.toFixed(1);
                        totalScoresSum += numGrade;
                        gradedCount++;
                    }
                }

                if (lastSubmission.feedback) {
                    retroalimentacion = lastSubmission.feedback;
                }
            }

            return {
                'N°': index + 1,
                'Estudiante (Apellidos, Nombres)': displayName,
                'Estado de Entrega': estadoEntrega,
                'Fecha de Entrega': fechaEntrega,
                'Calificación / Nota (0.0 - 5.0)': notaStr,
                'Observaciones': retroalimentacion
            };
        });

        // 4. Promedio general del grupo
        const promedio = gradedCount > 0 ? (totalScoresSum / gradedCount).toFixed(2) : '0.00';

        const summaryRow = {
            'N°': '',
            'Estudiante (Apellidos, Nombres)': 'PROMEDIO GENERAL DEL GRUPO',
            'Estado de Entrega': `Entregas: ${dataRows.filter(r => r['Estado de Entrega'] !== 'Sin entrega').length} de ${dataRows.length}`,
            'Fecha de Entrega': '',
            'Calificación / Nota (0.0 - 5.0)': `${promedio} / 5.0`,
            'Observaciones': `Calificados: ${gradedCount} de ${dataRows.length}`
        };

        const finalRows = [...dataRows, summaryRow];

        // 5. Construcción de la hoja con encabezados informativos
        const grupoName = task.targetGroupName || 'Todos los estudiantes';
        const rawDueDate = task.dueDate ? new Date(`${task.dueDate}T12:00:00`) : new Date();
        const validDueDate = !isNaN(rawDueDate.getTime()) ? rawDueDate : new Date();
        const formattedDueDate = `${String(validDueDate.getDate()).padStart(2, '0')}/${String(validDueDate.getMonth() + 1).padStart(2, '0')}/${validDueDate.getFullYear()}`;

        const headerRows = [
            ['ENGLISH TECH - UNIVERSIDAD DE PAMPLONA'],
            [`PLANILLA DE CALIFICACIONES - ${grupoName.toUpperCase()}`],
            [`Tarea / Asignación: ${task.title}`],
            [`Fecha de Entrega / Corte: ${formattedDueDate}`],
            []
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(headerRows);
        XLSX.utils.sheet_add_json(worksheet, finalRows, { origin: 'A6' });

        worksheet['!cols'] = [
            { wch: 6 },
            { wch: 38 },
            { wch: 26 },
            { wch: 18 },
            { wch: 30 },
            { wch: 40 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Calificaciones');
        
        const safeTaskTitle = (task.title || 'tarea').replace(/[^a-zA-Z0-9_\u00C0-\u017F]/g, '_').toLowerCase();
        try {
        XLSX.writeFile(workbook, `calificaciones_${safeTaskTitle}_${grupoName.replace(/\s+/g, '_')}.xlsx`);
        } catch (errExcel) {
            console.error("Error al descargar la planilla:", errExcel);
            showMessage("No se pudo descargar la planilla. Revisa tu conexi\\u00f3n.");
        }
        showMessage("Planilla descargada en Excel (.xlsx)");
    };

    const togglePin = async () => {
        try {
            const nextPinned = !task.isPinned;
            
            // Si vamos a fijar la tarjeta, reproducimos la animación física de despegue y vuelo hacia la cima
            if (nextPinned && cardRef.current) {
                try { pinAnimCleanupRef.current?.(); } catch (e) { /* nada */ }
                const rect = cardRef.current.getBoundingClientRect();
                const clone = cardRef.current.cloneNode(true);
                clone.style.position = 'fixed';
                clone.style.top = `${rect.top}px`;
                clone.style.left = `${rect.left}px`;
                clone.style.width = `${rect.width}px`;
                clone.style.height = `${rect.height}px`;
                clone.style.zIndex = '99999';
                clone.style.pointerEvents = 'none';
                clone.style.boxShadow = '0 25px 50px -12px rgba(245, 158, 11, 0.5), 0 0 30px rgba(245, 158, 11, 0.35)';
                clone.style.border = '2px solid rgba(245, 158, 11, 0.95)';
                clone.style.borderRadius = '1.5rem';
                clone.style.transition = 'transform 750ms cubic-bezier(0.16, 1, 0.3, 1), opacity 750ms ease, filter 750ms ease, box-shadow 750ms ease';
                clone.style.transformOrigin = 'center center';
                
                document.body.appendChild(clone);
                
                if (cardRef.current) {
                    cardRef.current.style.opacity = '0.2';
                    cardRef.current.style.filter = 'blur(1px)';
                }
                
                // Forzar lectura de estilos para activar la animación
                clone.getBoundingClientRect();
                
                // Desplazamiento de cámara súper suave hacia la cima del muro
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
                const targetY = 90 - rect.top;
                clone.style.transform = `translateY(${targetY}px) scale(0.98)`;
                clone.style.opacity = '0.95';
                
                let t2 = null;
                const t1 = setTimeout(() => {
                    clone.style.opacity = '0';
                    clone.style.filter = 'blur(4px)';
                    clone.style.transform = `translateY(${targetY - 15}px) scale(0.95)`;
                    t2 = setTimeout(() => {
                        if (clone.parentNode) clone.parentNode.removeChild(clone);
                        if (cardRef.current) {
                            cardRef.current.style.opacity = '';
                            cardRef.current.style.filter = '';
                        }
                        pinAnimCleanupRef.current = null;
                    }, 300);
                }, 680);

                pinAnimCleanupRef.current = () => {
                    clearTimeout(t1);
                    if (t2) clearTimeout(t2);
                    if (clone.parentNode) clone.parentNode.removeChild(clone);
                    if (cardRef.current) {
                        cardRef.current.style.opacity = '';
                        cardRef.current.style.filter = '';
                    }
                    pinAnimCleanupRef.current = null;
                };
            }

            await updateTaskDoc({ isPinned: nextPinned });
            showMessage(nextPinned ? "Publicación fijada al inicio del muro" : "Publicación desfijada");
        } catch (err) {
            if (!isDemoTask) {
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { ...task, isPinned: !task.isPinned }, { merge: true });
            }
            showMessage(task.isPinned ? "Publicación desfijada" : "Publicación fijada al inicio del muro");
        }
    };

    // Resolver foto de perfil del autor de la publicación o tarea (priorizando siempre userMappings actualizado)
    const resolveAuthorPhoto = () => {
        return resolveUserPhoto(task, userMappings, task.authorPhoto || '');
    };
    const authorPhoto = resolveAuthorPhoto();

    const handleDeleteComment = async (commentId, authorName, forcePermanent = false) => {
        let updatedComments;
        const currentComments = task.comments || [];
        let targetCommentToPurge = null;
        if (role === 'teacher' || forcePermanent) {
            targetCommentToPurge = currentComments.find((c, i) => (c.id || `old-${i}`) === commentId) || null;
            updatedComments = currentComments.filter((c, i) => (c.id || `old-${i}`) !== commentId);
        } else {
            updatedComments = currentComments.map((c, i) => {
                if ((c.id || `old-${i}`) === commentId) {
                    const isPlaceholder = (s) => (s || '').toLowerCase().includes('mensaje fue eliminado') || (s || '').toLowerCase().includes('mensaje eliminado') || (s || '').toLowerCase().includes('comentario eliminado');
                    let preservedText = '';
                    if (c.originalText && !isPlaceholder(c.originalText)) {
                        preservedText = c.originalText;
                    } else if (c.text && !isPlaceholder(c.text)) {
                        preservedText = c.text;
                    } else if (c.editHistory && c.editHistory.length > 0) {
                        const good = c.editHistory.find(h => h?.text && !isPlaceholder(h.text));
                        if (good) preservedText = good.text;
                    } else {
                        preservedText = c.originalText || c.text || '';
                    }

                    const preservedImgUrls = Array.isArray(c.originalImageUrls) && c.originalImageUrls.length > 0
                        ? c.originalImageUrls
                        : (Array.isArray(c.imageUrls) && c.imageUrls.length > 0 ? c.imageUrls : (c.imageUrl ? [c.imageUrl] : null));
                    const preservedImgUrl = c.originalImageUrl || c.imageUrl || (preservedImgUrls && preservedImgUrls[0]) || null;

                    return {
                        ...c,
                        isDeleted: true,
                        deletedAt: Date.now(),
                        deletedBy: 'student',
                        originalText: preservedText,
                        originalMedia: c.originalMedia || c.media || null,
                        originalImageUrl: preservedImgUrl,
                        originalImageUrls: preservedImgUrls,
                        imageUrl: null,
                        imageUrls: []
                    };
                }
                return c;
            });
        }
        try {
            if (!isDemoTask && targetCommentToPurge) {
                await deleteAllStorageFilesInObject(targetCommentToPurge);
            }
            await updateTaskDoc({ comments: updatedComments });
        } catch (err) {
            console.error("Error al eliminar comentario:", err);
            showMessage("Hubo un error al eliminar el comentario.");
        }

    };

    const handleSaveEditedTask = async () => {
        if (!editTaskData.title.trim() || (!isKahoot && !isPoll && !isEvaluation && !isSlides && !isBook3D && !editTaskData.description.trim())) return showMessage("El título y la descripción no pueden estar vacíos.");
        try {
            const updates = { 
                title: editTaskData.title.trim(), 
                description: editTaskData.description.trim(),
                geniallyUrl: editTaskData.geniallyUrl ? extractGeniallyUrl(editTaskData.geniallyUrl.trim()) : '',
                hideDate: Boolean(editTaskData.hideDate)
            };
            if (task.type !== 'post' && task.type !== 'kahoot' && !isSlides && !isBook3D) { updates.dueDate = editTaskData.dueDate; updates.dueTime = editTaskData.dueTime; updates.allowLate = editTaskData.allowLate; }
            if (isKahoot && isEditingKahootQuestions) {
                const validation = validateKahootConfig(editedKahootQuestions);
                if (!validation.valid) {
                    return showMessage(`⚠️ ${validation.error}`);
                }
                const currentKahoot = task.kahoot || {};
                const reconciledParticipants = reconcileKahootParticipantsAfterEdit(
                    currentKahoot.participants || {},
                    validation.normalizedQuestions
                );
                const clampedQIdx = Math.max(
                    0,
                    Math.min(
                        Number(currentKahoot.currentQuestionIndex) || 0,
                        Math.max(0, validation.normalizedQuestions.length - 1)
                    )
                );
                updates.kahoot = {
                    ...currentKahoot,
                    questions: validation.normalizedQuestions,
                    participants: reconciledParticipants,
                    currentQuestionIndex: clampedQIdx,
                    musicEnabled: currentKahoot.musicEnabled !== false,
                    allowNicknameChange: currentKahoot.allowNicknameChange !== false,
                    updatedAt: Date.now()
                };
            }
            if (!isDemoTask) {
                deleteReplacedStorageFiles(
                    { description: task.description, kahoot: task.kahoot },
                    { description: updates.description, kahoot: updates.kahoot || task.kahoot }
                ).catch(() => {});
            }
            await updateTaskDoc(updates);
            setIsEditingTask(false);
            if (isEditingKahootQuestions) setIsEditingKahootQuestions(false);
            showMessage("Publicación actualizada.");
        } catch (error) { showMessage("Hubo un error al actualizar."); }
    };

    const saveEditedComment = async () => {
        if (!editCommentText.trim()) return;
        if (await checkBadWordsAsync(editCommentText)) {
            showMessage("Comentario bloqueado: Lenguaje inapropiado.");
            return;
        }
        const currentComments = task.comments || [];
        const updatedComments = currentComments.map((c, i) => {
            const cid = c.id || `old-${i}`;
            if (cid === editingCommentId) {
                const history = c.editHistory || [];
                return { ...c, text: editCommentText.trim(), isEdited: true, editHistory: [{ text: c.text || '', date: Date.now() }, ...history] };
            }
            return c;
        });
        try {
            await updateTaskDoc({ comments: updatedComments });
        } catch (err) {
            console.error("Error al guardar comentario editado:", err);
            showMessage("Error al guardar edición del comentario.");
        } finally {
            setEditingCommentId(null);
        }
    };

    const handleLocalFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        try {
            setIsProcessing(true);
            const imageFiles = files.filter(f => isImageLikeFile(f));
            const docFiles = files.filter(f => !isImageLikeFile(f));

            if (imageFiles.length > 0) {
                const baseImages = (Array.isArray(commentImageUrls) && commentImageUrls.length > 0)
                    ? commentImageUrls
                    : (commentImageUrl ? [commentImageUrl] : []);
                const currentTotal = baseImages.length;
                const remainingSlots = Math.max(0, 4 - currentTotal);
                if (remainingSlots <= 0) {
                    showMessage("Puedes subir hasta un máximo de 4 imágenes.");
                } else {
                    if (imageFiles.length > remainingSlots && currentTotal > 0) {
                        showMessage(`Máximo 4 imágenes. Se añadirán ${remainingSlots} imagen(es).`);
                    } else if (imageFiles.length > 4) {
                        showMessage("Puedes subir hasta un máximo de 4 imágenes.");
                    }
                    const filesToUpload = imageFiles.slice(0, remainingSlots);
                    const uploadedUrls = [];

                    for (const rawFile of filesToUpload) {
                        const file = await convertHeicToJpeg(rawFile);
                        if (file.type !== 'image/gif') {
                            const compressed = await compressImage(file, 1200, 1200, 0.75);
                            const firebaseURL = await uploadImageToStorage(compressed, 'comments');
                            if (firebaseURL) uploadedUrls.push(firebaseURL);
                        } else {
                            const firebaseURL = await uploadRawFileToStorage(file, 'comments');
                            if (firebaseURL) uploadedUrls.push(firebaseURL);
                        }
                    }

                    setCommentImageUrls(prev => {
                        const prevBase = (Array.isArray(prev) && prev.length > 0)
                            ? prev
                            : (commentImageUrl ? [commentImageUrl] : []);
                        const combined = [...prevBase, ...uploadedUrls].slice(0, 4);
                        setCommentImageUrl(combined[0] || '');
                        return combined;
                    });
                }
            }

            if (docFiles.length > 0) {
                const rawDoc = docFiles[0];
                const docFile = isImageLikeFile(rawDoc) ? await convertHeicToJpeg(rawDoc) : rawDoc;
                const prevFileUrl = commentFileUrl;
                const firebaseURL = await uploadRawFileToStorage(docFile, 'comments');
                if (prevFileUrl && prevFileUrl !== firebaseURL) {
                    deleteFileFromStorage(prevFileUrl).catch(() => {});
                }
                setCommentFileUrl(firebaseURL);
                setCommentFileName(docFile.name);
            }
            setIsProcessing(false);
        } catch (error) { 
            showMessage("Hubo un error al subir los archivos."); 
            setIsProcessing(false); 
        } finally {
            if (e.target) e.target.value = '';
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        const hasText = Boolean(commentText && commentText.trim());
        const hasTitle = Boolean(commentTitle && commentTitle.trim());
        const hasMedia = Boolean((commentImageUrls && commentImageUrls.length > 0) || (commentImageUrl && commentImageUrl.trim()) || commentFileUrl || audioCom);
        if (!hasText && !hasTitle && !hasMedia) {
            return showMessage("Ingresa un mensaje o adjunta un archivo para publicar.");
        }
        setIsProcessing(true);
        try {
            if ((hasText && await checkBadWordsAsync(commentText)) || (hasTitle && await checkBadWordsAsync(commentTitle))) { 
                showMessage("Comentario bloqueado: Lenguaje inapropiado."); 
                return; 
            }

            const newComment = { 
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5), 
                author: role === 'teacher' ? (loggedInName || getTeacherDisplayName(activeTeacherId)) : resolveUserDisplayName(loggedInName, userMappings, loggedInName), 
                authorUsername: role === 'teacher' ? (activeTeacherId || 'teacher') : (currentUser?.email ? currentUser.email.split('@')[0] : (currentUserId || '')),
                authorId: role === 'teacher' ? (activeTeacherId || 'teacher') : (currentUserId || currentUser?.uid || ''),
                authorRole: role,
                createdAt: Date.now(),
                title: isForum ? (commentTitle || '').trim().toUpperCase() : '',
                text: (commentText || '').trim(), 
                imageUrl: (commentImageUrls && commentImageUrls.length > 0 ? commentImageUrls[0] : (commentImageUrl || '').trim()), 
                imageUrls: (commentImageUrls && commentImageUrls.length > 0 ? commentImageUrls : ((commentImageUrl || '').trim() ? [(commentImageUrl || '').trim()] : [])), 
                fileUrl: commentFileUrl || '', 
                fileName: commentFileName || '', 
                audioUrl: audioCom || '', 
                isDeleted: false, 
                reactions: {},
                ratings: {},
                replyTo: replyingTo ? { 
                    id: replyingTo.id, 
                    text: replyingTo.text || '', 
                    author: resolveUserDisplayName(replyingTo, userMappings, replyingTo.author || ''), 
                    authorUsername: replyingTo.authorUsername || replyingTo.authorId || '',
                    authorId: replyingTo.authorId || replyingTo.uid || '',
                    imageUrl: replyingTo.imageUrl || '' 
                } : null
            };
            
            const withTimeout = (promise, ms = 12000) => Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error("La conexión con el servidor tardó demasiado")), ms))
            ]);

            await withTimeout(updateTaskDoc({ comments: [...(task.comments || []), newComment] }));
            
            setCommentTitle(""); setCommentText(""); setCommentImageUrl(""); setCommentImageUrls([]); setCommentFileUrl(""); setCommentFileName(""); setAudioCom("");
            setShowCommentImageInput(false); setShowAttachmentMenu(false); setShowEmojiPicker(false); setReplyingTo(null);
            showMessage(isDemoTask ? "💬 Comentario añadido en Modo Demo." : (isForum ? "Aporte publicado en el foro." : isTask && role !== 'teacher' ? "Tarea entregada con éxito." : "Comentario publicado."));
        } catch (err) {
            console.error("Error al publicar comentario:", err);
            showMessage(`Error al publicar: ${err?.message || 'Verifica tu conexión.'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const renderForumStarRating = () => {
        const ratingsMap = task.ratings || task.forumRatings || {};
        const myValidKeys = role === 'teacher' 
            ? (activeTeacherId === SECOND_TEACHER_ID 
                ? ['camilodocente', 'teacher_camilo', 'CamiloDocente', currentUserId, currentUser?.uid].filter(Boolean)
                : ['teacher', 'teacher_gina', 'GinaDocente', currentUserId, currentUser?.uid].filter(Boolean))
            : [currentUserId, currentUser?.uid, loggedInName ? `name_${loggedInName.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : null].filter(Boolean);

        let myCurrentScore = null;
        let totalVotes = 0;
        let sumScores = 0;
        const voterNames = [];

        if (ratingsMap && typeof ratingsMap === 'object') {
            Object.entries(ratingsMap).forEach(([uidKey, rVal]) => {
                if (!uidKey || uidKey === 'undefined' || uidKey === 'null' || uidKey === 'type') return;
                const score = typeof rVal === 'object' ? (rVal.score || rVal.rating) : Number(rVal);
                let vName = typeof rVal === 'object' ? rVal.name : 'Un usuario';
                if (vName === 'Profesora' || vName === 'La profe') vName = TEACHER_NAME;

                if (typeof score === 'number' && score >= 1 && score <= 5) {
                    totalVotes++;
                    sumScores += score;
                    voterNames.push(`${vName}: ${score}★`);
                    if (myValidKeys.includes(uidKey)) {
                        myCurrentScore = score;
                    }
                }
            });
        }

        const average = totalVotes > 0 ? (sumScores / totalVotes) : 0;
        const hasVoted = myCurrentScore !== null;
        const displayRating = hoverRating || myCurrentScore || 0;

        return (
            <div className="flex flex-wrap items-center gap-2.5 pt-2 select-none">
                {/* Selector de 5 estrellas */}
                <div 
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all ${
                        hasVoted 
                            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60 ring-2 ring-amber-400/20' 
                            : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700'
                    }`}
                    onMouseLeave={() => setHoverRating(0)}
                >
                    {[1, 2, 3, 4, 5].map((starValue) => {
                        const isStarActive = displayRating >= starValue;
                        return (
                            <button
                                key={starValue}
                                type="button"
                                onClick={() => toggleForumRating(starValue)}
                                onMouseEnter={() => setHoverRating(starValue)}
                                className="p-0.5 transition-all transform hover:scale-125 focus:outline-none cursor-pointer active:scale-90"
                                title={`Puntuar con ${starValue} estrella${starValue > 1 ? 's' : ''}`}
                            >
                                <Star
                                    size={18}
                                    fill={isStarActive ? "#FBBF24" : "transparent"}
                                    stroke={isStarActive ? "#F59E0B" : (isDarkMode ? "#6B7280" : "#D1D5DB")}
                                    className={`transition-all ${
                                        isStarActive ? 'text-amber-400 drop-shadow-xs' : 'text-gray-300 dark:text-gray-600'
                                    }`}
                                />
                            </button>
                        );
                    })}

                    {/* Tu valoración activa */}
                    {hasVoted && (
                        <span className="ml-1 text-[11px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/60 px-1.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-700/50">
                            {myCurrentScore} ★
                        </span>
                    )}
                </div>

                {/* Promedio de puntuación e indicador */}
                <div className="flex items-center gap-2 text-xs">
                    {totalVotes > 0 ? (
                        <div 
                            className="flex items-center gap-1.5"
                            title={voterNames.length > 0 ? `Valoraciones (${totalVotes}):\n${voterNames.join('\n')}` : ""}
                        >
                            <div className="flex items-center gap-1 font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-300/80 dark:border-amber-800/60 shadow-2xs">
                                <Star size={13} fill="#FBBF24" stroke="#F59E0B" />
                                <span>{average.toFixed(1)}</span>
                                <span className="text-[10px] text-gray-400 font-normal">/ 5.0</span>
                            </div>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
                                ({totalVotes} {totalVotes === 1 ? 'voto' : 'votos'})
                            </span>
                        </div>
                    ) : (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 italic">
                            Califica este foro (1 a 5 estrellas)
                        </span>
                    )}
                </div>

                {/* Contador de Vistas por Estudiantes exclusivo para Docentes */}
                {role === 'teacher' && (
                    <button
                        type="button"
                        onClick={() => setShowViewsModal(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border bg-slate-50 dark:bg-gray-800/80 border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-750 text-slate-700 dark:text-gray-300 ml-auto shadow-2xs hover:scale-105 cursor-pointer"
                        title={`Visto por ${viewedStudents.length} estudiante${viewedStudents.length === 1 ? '' : 's'}`}
                    >
                        <Eye size={13} className="text-blue-500" />
                        <span className="text-[11px] font-extrabold">{viewedStudents.length}</span>
                    </button>
                )}
            </div>
        );
    };

    const renderReactions = (isInsideModal = false) => {
        if (isForum) {
            return renderForumStarRating();
        }

        const counts = { like: 0, love: 0, care: 0, happy: 0, wow: 0, sad: 0, angry: 0 };
        const namesByType = { like: [], love: [], care: [], happy: [], wow: [], sad: [], angry: [] };

        // Normalizador de tipos y emojis
        const normalizeReactionType = (raw) => {
            if (!raw) return 'like';
            const s = String(raw).trim();
            if (s === '👍' || s === 'like') return 'like';
            if (s === '❤️' || s === 'love') return 'love';
            if (s === '🥰' || s === '🤗' || s === 'care') return 'care';
            if (s === '😆' || s === '😃' || s === '😂' || s === 'happy') return 'happy';
            if (s === '😮' || s === '😲' || s === 'wow') return 'wow';
            if (s === '😢' || s === 'sad') return 'sad';
            if (s === '😡' || s === 'angry') return 'angry';
            return counts[s] !== undefined ? s : 'like';
        };

        // Llaves válidas para identificar inequívocamente al usuario actual
        const myValidKeys = role === 'teacher' 
            ? (activeTeacherId === SECOND_TEACHER_ID 
                ? ['camilodocente', 'teacher_camilo', 'CamiloDocente', currentUserId, currentUser?.uid].filter(Boolean)
                : ['teacher', 'teacher_gina', 'GinaDocente', currentUserId, currentUser?.uid].filter(Boolean))
            : [currentUserId, currentUser?.uid, loggedInName ? `name_${loggedInName.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : null].filter(Boolean);

        let mySelectedReactionType = null;
        let totalReactions = 0;

        if (task.reactions && typeof task.reactions === 'object') {
            Object.entries(task.reactions).forEach(([uidKey, r]) => {
                // Ignorar llaves inválidas o corruptas de versiones antiguas
                if (!uidKey || uidKey === 'undefined' || uidKey === 'null' || uidKey === 'type' || uidKey === 'count' || uidKey === 'name') return;

                const rawType = typeof r === 'object' ? (r.type || r.emoji) : r;
                let rName = typeof r === 'object' ? r.name : 'Un usuario';
                if (rName === 'Profesora' || rName === 'La profe') rName = TEACHER_NAME;

                const rType = normalizeReactionType(rawType);
                if (rType && counts[rType] !== undefined) {
                    counts[rType]++;
                    totalReactions++;
                    namesByType[rType].push(rName);

                    // Sólo marcar como seleccionada si esta reacción fue registrada explícitamente por el usuario en sesión
                    if (myValidKeys.includes(uidKey)) {
                        mySelectedReactionType = rType;
                    }
                }
            });
        }

        const topReactions = (FACEBOOK_REACTIONS || [])
            .filter(r => counts[r.key] > 0)
            .sort((a, b) => counts[b.key] - counts[a.key]);

        const myReactionObj = (FACEBOOK_REACTIONS || []).find(r => r.key === mySelectedReactionType);

        const allVoterNames = Object.values(namesByType).flat();
        const tooltipVoterText = allVoterNames.length > 0 
            ? (allVoterNames.length <= 3 
                ? allVoterNames.join(', ') 
                : `${allVoterNames.slice(0, 2).join(', ')} y ${allVoterNames.length - 2} más`)
            : 'Reacciones';

        return (
          <div className="relative pt-2 w-full select-none">
            {/* Dock flotante de reacciones estilo Facebook con Apple Emojis sin bordes individuales */}
            {showReactionDock && !isLocked && (
              <div 
                className="absolute bottom-full left-0 mb-2 z-50 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full shadow-2xl bg-white dark:bg-gray-800 border border-gray-200/90 dark:border-gray-700 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                onMouseEnter={() => {
                  if (reactionDockTimerRef.current) clearTimeout(reactionDockTimerRef.current);
                  setShowReactionDock(true);
                }}
                onMouseLeave={() => {
                  reactionDockTimerRef.current = setTimeout(() => setShowReactionDock(false), 250);
                }}
              >
                {(FACEBOOK_REACTIONS || []).map((r) => {
                  const isThisSelected = mySelectedReactionType === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReaction(r.key);
                        setShowReactionDock(false);
                      }}
                      title={r.label}
                      className={`p-1 transition-all duration-150 cursor-pointer origin-bottom border-none bg-transparent outline-none flex items-center justify-center hover:scale-135 ${
                        isThisSelected ? 'scale-115 -translate-y-0.5' : ''
                      }`}
                    >
                      <AppleEmoji emoji={r.emoji} size="28px" className="pointer-events-none" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Barra de Interacción Estilo Facebook: Like | Comentar | Compartir ------ Stacked Emojis */}
            <div className="flex items-center justify-between gap-1.5 w-full">
              {/* Botones de acción a la izquierda */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* Botón Reaccionar / Me gusta */}
                <div 
                  className="relative"
                  onMouseEnter={() => {
                    if (reactionDockTimerRef.current) clearTimeout(reactionDockTimerRef.current);
                    setShowReactionDock(true);
                  }}
                  onMouseLeave={() => {
                    reactionDockTimerRef.current = setTimeout(() => setShowReactionDock(false), 300);
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (mySelectedReactionType) {
                        toggleReaction(mySelectedReactionType);
                      } else {
                        toggleReaction('like');
                      }
                    }}
                    disabled={isLocked}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      mySelectedReactionType
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-300 shadow-2xs'
                        : 'bg-gray-50/90 dark:bg-gray-800/70 border-gray-200/90 dark:border-gray-700/80 hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300'
                    } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                    title={myReactionObj ? myReactionObj.label : "Me gusta"}
                  >
                    {myReactionObj ? (
                      <AppleEmoji emoji={myReactionObj.emoji} size="16px" className="shrink-0" />
                    ) : (
                      <ThumbsUp size={14} className="shrink-0 text-gray-500 dark:text-gray-400" />
                    )}
                    <span>{myReactionObj ? myReactionObj.label : (totalReactions > 0 ? totalReactions : 'Me gusta')}</span>
                  </button>
                </div>

                {/* Botón Comentar (abre la publicación completa y sus comentarios) */}
                <button
                  type="button"
                  onClick={handleOpenCommentModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border bg-gray-50/90 dark:bg-gray-800/70 border-gray-200/90 dark:border-gray-700/80 hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 cursor-pointer active:scale-95"
                  title="Abrir publicación completa y comentarios"
                >
                  <MessageCircle size={14} className="shrink-0 text-gray-500 dark:text-gray-400" />
                  <span>{task.comments?.length > 0 ? `${task.comments.length}` : 'Comentar'}</span>
                </button>

                {/* Botón Compartir (en perfil, mensaje o copiar enlace) */}
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border bg-gray-50/90 dark:bg-gray-800/70 border-gray-200/90 dark:border-gray-700/80 hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 cursor-pointer active:scale-95"
                  title="Compartir publicación"
                >
                  <Share2 size={14} className="shrink-0 text-gray-500 dark:text-gray-400" />
                  <span className="hidden sm:inline">Compartir</span>
                </button>
              </div>

              {/* Lado derecho: Emojis superpuestos estilo Facebook y Contador de vistas docente */}
              <div className="flex items-center gap-2 ml-auto shrink-0">
                {/* Burbujas superpuestas de reacciones estilo Facebook */}
                {topReactions.length > 0 && (
                  <div 
                    onClick={handleOpenCommentModal}
                    className="flex items-center gap-1.5 cursor-pointer px-1 py-0.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
                    title={tooltipVoterText}
                  >
                    <div className="flex items-center -space-x-1.5 py-0.5">
                      {topReactions.slice(0, 3).map((r, i) => (
                        <div
                          key={r.key}
                          className="w-5 h-5 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 border border-white dark:border-gray-900 shadow-2xs shrink-0 select-none"
                          style={{ zIndex: 10 - i }}
                        >
                          <AppleEmoji emoji={r.emoji} size="13px" />
                        </div>
                      ))}
                    </div>
                    {totalReactions > 0 && (
                      <span className="text-[11.5px] font-bold text-gray-600 dark:text-gray-300">
                        {totalReactions}
                      </span>
                    )}
                  </div>
                )}

                {/* Contador de Vistas por Estudiantes exclusivo para Docentes */}
                {role === 'teacher' && (
                  <button
                    type="button"
                    onClick={() => setShowViewsModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border bg-slate-50 dark:bg-gray-800/80 border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-750 text-slate-700 dark:text-gray-300 shrink-0 shadow-2xs hover:scale-105 cursor-pointer"
                    title={`Visto por ${viewedStudents.length} estudiante${viewedStudents.length === 1 ? '' : 's'}`}
                  >
                    <Eye size={13} className="text-blue-500" />
                    <span className="text-[11px] font-extrabold">{viewedStudents.length}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
    };

    return (
        <div ref={cardRef} className={`rounded-3xl border transition-all duration-300 p-4 sm:p-5 mb-4 shadow-xs hover:shadow-md relative overflow-hidden group ${
            isDarkMode 
                ? 'bg-gray-850 border-gray-700/80 text-gray-100' 
                : 'bg-white border-gray-200/90 text-gray-800'
        } ${task.isPinned ? 'ring-2 ring-amber-400/60 dark:ring-amber-500/50 border-amber-300 dark:border-amber-600' : ''}`}>
            
            {/* Header: Autor, Badges y Acciones */}
            <div className="flex items-start gap-3 mb-3 pt-0.5">
                {/* Avatar con barra indicadora lateral */}
                <div className="relative shrink-0 pt-0.5">
                    {/* Barra lateral izquierda compacta y sutil perfectamente centrada en el eje vertical del avatar */}
                    <div 
                        aria-hidden="true" 
                        className={`absolute -left-4 sm:-left-5 top-1/2 -translate-y-1/2 h-7 sm:h-8 w-[3.5px] rounded-r-full ${
                            isForum 
                                ? 'bg-emerald-500 dark:bg-emerald-600' 
                                : isKahoot
                                    ? 'bg-fuchsia-500 dark:bg-fuchsia-600'
                                    : isEvaluation
                                        ? 'bg-rose-600 dark:bg-rose-500'
                                        : isSlides
                                            ? 'bg-amber-500 dark:bg-amber-400'
                                            : isBook3D
                                                ? 'bg-indigo-600 dark:bg-indigo-500'
                                                : isTask 
                                                    ? 'bg-[#AD3333] dark:bg-[#c93b3b]' 
                                                    : 'bg-blue-500 dark:bg-blue-600'
                        }`} 
                    />
                    <button 
                        onClick={() => handleOpenProfileByName(task.authorName, task.authorUsername || task.authorId)} 
                        className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 border-2 border-white dark:border-gray-700 overflow-hidden hover:scale-105 transition-transform bg-gradient-to-br from-[#AD3333] to-[#8a2828]"
                    >
                        {authorPhoto ? (
                            <img loading="lazy" decoding="async" src={authorPhoto} alt={task.authorName || 'Autor'} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                            task.authorName ? task.authorName.charAt(0).toUpperCase() : 'G'
                        )}
                    </button>
                </div>

                {/* Bloque central y derecho (Nombre, Acciones y Metadatos) */}
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                    {/* Fila 1: Nombre del docente + Pin Badge + Botones de Acción */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <button 
                                onClick={() => handleOpenProfileByName(task.authorName, task.authorUsername || task.authorId)} 
                                className="font-bold text-sm hover:underline truncate text-left text-gray-900 dark:text-gray-100 leading-tight"
                            >
                                {task.authorName || getTeacherDisplayName(getItemTeacherId(task))}
                            </button>

                            {task.isPinned && (
                                <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60 shrink-0 whitespace-nowrap">
                                    <Pin size={9} className="shrink-0" /> Fijado
                                </span>
                            )}

                            {isPoll && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 shrink-0 whitespace-nowrap">
                                    <BarChart2 size={10} className="shrink-0" />
                                    {task.poll?.isMultipleChoice ? 'Encuesta múltiple' : 'Encuesta'}
                                </span>
                            )}

                            {isKahoot && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-200 dark:border-fuchsia-800/60 shrink-0 whitespace-nowrap">
                                    <Gamepad2 size={10} className="shrink-0" />
                                    Kahoot
                                </span>
                            )}

                            {isEvaluation && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 shrink-0 whitespace-nowrap">
                                    <ClipboardList size={10} className="shrink-0" />
                                    Evaluación
                                </span>
                            )}

                            {isSlides && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shrink-0 whitespace-nowrap">
                                    <NavSlides size={10} className="shrink-0" />
                                    Diapositivas
                                </span>
                            )}

                            {isBook3D && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shrink-0 whitespace-nowrap">
                                    <BookOpen size={10} className="shrink-0" />
                                    Libro
                                </span>
                            )}

                            {task.isDemoCreated && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/60 shrink-0 whitespace-nowrap">
                                    <span>Demo</span>
                                </span>
                            )}
                        </div>

                        {/* Acciones de docente (Editar, Fijar, Borrar) */}
                        {role === 'teacher' && (
                            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                                {isEditingTask ? (
                                    <>
                                        <button onClick={handleSaveEditedTask} className="p-1 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 hover:scale-110 transition-transform shadow-xs" title="Guardar cambios">
                                            <CheckLine size={16}/>
                                        </button>
                                        <button onClick={() => { setIsEditingTask(false); setIsEditingKahootQuestions(false); setEditedKahootQuestions([]); setEditTaskData({title: task.title, description: task.description, dueDate: task.dueDate || '', dueTime: task.dueTime || '', allowLate: task.allowLate || false, geniallyUrl: task.geniallyUrl || '', hideDate: !!task.hideDate}); }} className="p-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-red-500 hover:scale-110 transition-transform shadow-xs" title="Cancelar">
                                            <XLine size={16}/>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={togglePin} className={`p-1 rounded-lg transition-colors ${task.isPinned ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`} title={task.isPinned ? 'Desfijar' : 'Fijar'}>
                                            <Pin size={15} />
                                        </button>
                                        <button onClick={() => {
                                            setEditTaskData({
                                                title: task?.title || '',
                                                description: task?.description || '',
                                                dueDate: task?.dueDate || '',
                                                dueTime: task?.dueTime || '',
                                                allowLate: task?.allowLate || false,
                                                geniallyUrl: task?.geniallyUrl || '',
                                                hideDate: !!task?.hideDate
                                            });
                                            if (isKahoot && task.kahoot) {
                                                setEditedKahootQuestions(Array.isArray(task.kahoot.questions) ? task.kahoot.questions : []);
                                                setIsEditingKahootQuestions(true);
                                            }
                                            setIsEditingTask(true);
                                        }} className="p-1 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Editar">
                                            <Edit3 size={15} />
                                        </button>
                                        <button onClick={() => confirmAction("¿Desea eliminar esta publicación definitivamente?", async () => {
                                            try {
                                                if (isEvaluation || isSlides || isBook3D) {
                                                    if (!isDemoTask && Array.isArray(task.comments) && task.comments.length > 0) {
                                                        await deleteAllStorageFilesInObject(task.comments);
                                                    }
                                                    await updateTaskDoc({ isDeletedFromWall: true, isPinned: false });
                                                    showMessage("✅ Publicación retirada del muro.");
                                                    return;
                                                }
                                                if (isDemoTask) {
                                                    removeDemoSandboxItem('tasks', task.id);
                                                    if (typeof setTasks === 'function') {
                                                        setTasks(prev => (prev || []).filter(t => String(t.id) !== String(task.id)));
                                                    }
                                                    showMessage("✅ Publicación eliminada del entorno Demo.");
                                                    return;
                                                }
                                                await deleteAllStorageFilesInObject(task);
                                                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id));
                                                showMessage("✅ Publicación eliminada.");
                                            } catch (e) {
                                                console.error("Error al eliminar publicación:", e);
                                                showMessage("❌ Error al eliminar la publicación.");
                                            }
                                        })} className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Eliminar">
                                            <Trash2 size={15} />
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Fila 2: Fila de metadatos limpia, fluida y compacta */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-1">
                        {/* Etiqueta del grupo asignado (sólo si no es 'Global' o 'Todos') */}
                        {(() => {
                            const grpName = task.targetGroupName || academicGroups?.find(g => String(g?.id || '').replace(/^acad_/i, '').toLowerCase() === String(task.targetGroupId || '').replace(/^acad_/i, '').toLowerCase())?.name;
                            if (!grpName || grpName.toLowerCase() === 'global' || grpName.toLowerCase() === 'todos' || task.targetGroupId === 'all' || !task.targetGroupId) {
                                return null;
                            }
                            return (
                                <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700/80 shrink-0 whitespace-nowrap">
                                    {grpName}
                                </span>
                            );
                        })()}

                        {!task.hideDate && (
                            <span className="shrink-0 whitespace-nowrap">
                                {task.createdAt ? formatDateTime12H(task.createdAt) : 'Reciente'}
                            </span>
                        )}

                        {task.dueDate && (
                            <>
                                <span className="text-gray-300 dark:text-gray-600 font-bold shrink-0">•</span>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border shrink-0 whitespace-nowrap ${
                                    isExpired 
                                        ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400' 
                                        : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                                }`}>
                                    <Clock size={9} className="shrink-0" />
                                    <span>Cierre: {task.dueDate}{task.dueTime ? ` • ${format12HourTime(task.dueTime)}` : ''}</span>
                                    {isExpired && (
                                        <span className="font-bold text-[8px] uppercase ml-0.5 px-1 py-0.5 rounded bg-red-200/60 dark:bg-red-900/60 whitespace-nowrap">
                                            {task.allowLate ? 'Tardía' : 'Cerrado'}
                                        </span>
                                    )}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Título de la Tarea / Publicación y Botones de Traducir/Escuchar */}
            {isEditingTask ? (
                <input 
                    value={editTaskData.title} 
                    onChange={e => setEditTaskData({...editTaskData, title: e.target.value})} 
                    className="w-full text-base font-bold mb-2 p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Título de la publicación..." 
                />
            ) : (
                <div className="flex items-start justify-between gap-3 mb-2 w-full">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug flex-1">
                        <LinkifyText text={task.title} isDarkMode={isDarkMode} embedVideos={false} /> {isLocked && <Lock size={16} className="text-red-500 inline shrink-0 ml-1" />}
                    </h3>

                    {/* Botón de Traducir y Escuchar arriba del texto (invisible hasta pasar mouse o tocar) */}
                    {task.description && (
                        <div className={`flex items-center gap-1 bg-gray-100/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl p-0.5 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs shrink-0 self-start transition-opacity duration-200 ${
                            showTranslated || isTranslating 
                                ? 'opacity-100' 
                                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 active:opacity-100'
                        }`}>
                            <button 
                                type="button"
                                onClick={() => handleTranslateText(task.description)} 
                                disabled={isTranslating}
                                className={`p-1.5 rounded-lg transition-colors ${showTranslated ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50' : 'text-gray-400 hover:text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`} 
                                title={showTranslated ? "Ver texto original" : "Traducir al español"}
                            >
                                <Languages size={14} />
                            </button>
                            <button 
                                type="button"
                                onClick={alternarNarracion}
                                disabled={preparandoNarracion} 
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" 
                                title="Escuchar pronunciación"
                            >
                                {narrando ? <VolumeX size={14} /> : <Volume2 size={14} />}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Edición de Fecha Límite en modo edición */}
            {(isTaskType || isEvaluation) && isEditingTask && (
                <div className="flex flex-wrap gap-2 mb-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 items-center text-xs">
                    <input type="date" value={editTaskData.dueDate} onChange={e => setEditTaskData({...editTaskData, dueDate: e.target.value})} className="py-1 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs" />
                    <input type="time" value={editTaskData.dueTime} onChange={e => setEditTaskData({...editTaskData, dueTime: e.target.value})} className="py-1 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs" />
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-700 dark:text-gray-300 ml-1">
                        <input type="checkbox" checked={editTaskData.allowLate} onChange={e => setEditTaskData({...editTaskData, allowLate: e.target.checked})} className="w-3.5 h-3.5 accent-[#AD3333]" />
                        Entregas tardías
                    </label>
                </div>
            )}

            {/* Opción Docente: Ocultar día/fecha/hora en edición */}
            {role === 'teacher' && isEditingTask && (
                <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 dark:text-gray-300 select-none">
                        <input 
                            type="checkbox" 
                            checked={Boolean(editTaskData.hideDate)} 
                            onChange={e => setEditTaskData(prev => ({ ...prev, hideDate: e.target.checked }))} 
                            className="w-4 h-4 rounded accent-[#AD3333]" 
                        />
                        <span className="flex items-center gap-1.5">
                            <EyeOff size={13} className="text-amber-500" />
                            Ocultar día, fecha y hora de la publicación
                        </span>
                    </label>
                </div>
            )}

            {/* Descripción / Contenido con ancho 100% natural */}
            {isEditingTask ? (
                <div className="my-2 w-full">
                    <RichVisualEditor 
                        value={editTaskData.description} 
                        onChange={newDesc => setEditTaskData(prev => ({ ...prev, description: newDesc }))} 
                        placeholder="Descripción..."
                        isDarkMode={isDarkMode}
                        minHeight="100px"
                    />
                </div>
            ) : (
                <div className="my-2 w-full">
                    {showTranslated && translatedDescription ? (
                        <div className="space-y-1.5 animate-in fade-in duration-300 w-full">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg w-fit border border-blue-200/60 dark:border-blue-800/40">
                                <span className="flex items-center gap-1"><Languages size={12} /> Traducido al español</span>
                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                <button 
                                    type="button"
                                    onClick={() => setShowTranslated(false)} 
                                    className="text-[11px] text-blue-700 dark:text-blue-300 underline font-semibold hover:opacity-80"
                                >
                                    Ver original
                                </button>
                            </div>
                            <div className={`text-sm leading-relaxed whitespace-pre-wrap w-full ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                <LinkifyText text={translatedDescription} isDarkMode={isDarkMode} colapsable embedVideos={!isEvaluation && !task.videoUrl && !task.imageUrl && !task.fileUrl && !task.audioUrl} />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1.5 w-full">
                            {translatedDescription && !showTranslated && (
                                <button 
                                    type="button"
                                    onClick={() => setShowTranslated(true)} 
                                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline mb-1"
                                >
                                    <Languages size={12} /> Ver traducción al español
                                </button>
                            )}
                            <div className={`text-sm leading-relaxed whitespace-pre-wrap w-full ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                <LinkifyText text={task.description} isDarkMode={isDarkMode} colapsable embedVideos={!isEvaluation && !task.videoUrl && !task.imageUrl && !task.fileUrl && !task.audioUrl} />
                            </div>
                        </div>
                    )}

                    {isTranslating && (
                        <div className="flex items-center gap-2 text-xs text-blue-500 italic mt-1.5 animate-pulse">
                            <Loader2 size={13} className="animate-spin" /> Traduciendo al español...
                        </div>
                    )}
                </div>
            )}

            {/* Módulo Interactivo de Encuesta (Poll) */}
            {isPoll && task.poll?.options?.length > 0 && (() => {
                const poll = task.poll;
                const isMultiple = Boolean(poll.isMultipleChoice);
                const options = poll.options || [];

                // Conjunto de todos los votantes únicos
                const allVotersSet = new Set();
                options.forEach(opt => (opt.voterIds || []).forEach(uid => allVotersSet.add(uid)));
                const totalVoters = allVotersSet.size;
                const hasUserVoted = allVotersSet.has(currentUserId);

                return (
                    <div className="my-3 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-indigo-950/20 dark:via-gray-900/40 dark:to-purple-950/10 shadow-xs space-y-3">
                        {/* Cabecera de la encuesta */}
                        <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-indigo-100/80 dark:border-indigo-900/40">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                                    <BarChart2 size={16} />
                                </div>
                                <div>
                                    <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
                                        {isMultiple ? "Encuesta • Selección múltiple" : "Encuesta • Selección única"}
                                    </span>
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium">
                                        {totalVoters} {totalVoters === 1 ? 'estudiante ha participado' : 'estudiantes han participado'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                {isLocked ? (
                                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-900/50">
                                        Votación cerrada
                                    </span>
                                ) : hasUserVoted ? (
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-1">
                                        <CheckCheck size={11} /> Voto registrado
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/50">
                                        Abierta
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Lista de opciones de votación */}
                        <div className="space-y-2">
                            {options.map((opt) => {
                                const voteCount = opt.voterIds?.length || 0;
                                const pct = totalVoters > 0 ? Math.round((voteCount / totalVoters) * 100) : 0;
                                const isSelectedByMe = (opt.voterIds || []).includes(currentUserId);
                                const showVoters = activeVotersOptionId === opt.id;

                                return (
                                    <div key={opt.id} className="space-y-1">
                                        <div 
                                            onClick={() => !isLocked && handleVote(opt.id)}
                                            className={`relative overflow-hidden rounded-xl border transition-all duration-200 select-none ${
                                                isLocked ? 'cursor-default' : 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600'
                                            } ${
                                                isSelectedByMe 
                                                    ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs' 
                                                    : 'border-gray-200/90 dark:border-gray-700/80 bg-white/80 dark:bg-gray-800/60'
                                            }`}
                                        >
                                            {/* Barra de progreso de fondo */}
                                            <div 
                                                className={`absolute top-0 bottom-0 left-0 transition-all duration-700 ease-out ${
                                                    isSelectedByMe 
                                                        ? 'bg-indigo-500/20 dark:bg-indigo-500/30' 
                                                        : 'bg-gray-200/50 dark:bg-gray-700/40'
                                                }`}
                                                style={{ width: `${pct}%` }} 
                                            />

                                            {/* Contenido de la opción */}
                                            <div className="relative z-10 p-3 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {isMultiple ? (
                                                        <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                                                            isSelectedByMe 
                                                                ? 'bg-indigo-600 border-indigo-600 text-white' 
                                                                : 'border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-900'
                                                        }`}>
                                                            {isSelectedByMe && <CheckCheck size={11} />}
                                                        </div>
                                                    ) : (
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                                                            isSelectedByMe 
                                                                ? 'border-indigo-600 bg-indigo-600' 
                                                                : 'border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-900'
                                                        }`}>
                                                            {isSelectedByMe && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                        </div>
                                                    )}

                                                    <span className={`text-xs font-bold leading-snug break-words ${
                                                        isSelectedByMe ? 'text-indigo-950 dark:text-indigo-100 font-extrabold' : 'text-gray-800 dark:text-gray-200'
                                                    }`}>
                                                        {opt.text}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0 text-right">
                                                    <span className={`text-xs font-black ${
                                                        isSelectedByMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        {pct}%
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">
                                                        ({voteCount})
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Vista detallada de votantes para el docente */}
                                        {role === 'teacher' && voteCount > 0 && (
                                            <div className="px-1 text-[11px]">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveVotersOptionId(showVoters ? null : opt.id);
                                                    }}
                                                    className="text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                                >
                                                    {showVoters ? "▾ Ocultar votantes" : `▸ Ver quiénes votaron (${voteCount})`}
                                                </button>

                                                {showVoters && (
                                                    <div className="flex flex-wrap gap-1 mt-1.5 p-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 animate-in fade-in duration-150">
                                                        {(opt.voterIds || []).map(uid => {
                                                            const isCamiloVoter = isCamiloTeacher(uid) || uid === 'teacher_camilo';
                                                            const isGinaVoter = !isCamiloVoter && (uid === 'teacher' || uid === 'teacher_gina' || isTeacherId(uid) || (typeof uid === 'string' && uid.startsWith('teacher')));
                                                            const studentName = isCamiloVoter
                                                                ? (SECOND_TEACHER_NAME || 'Camilo Jaimes')
                                                                : isGinaVoter 
                                                                    ? (TEACHER_NAME || 'Prof. Gina Quintana')
                                                                    : (userMappings?.[uid]?.fullName || userMappings?.[uid]?.name || String(uid || '').replace(/^uid_|^name_/, ''));
                                                            return (
                                                                <span key={uid} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 text-indigo-800 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-700/60 shadow-2xs">
                                                                    <UserIcon size={10} /> {studentName}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pie de encuesta / Indicación */}
                        <div className="pt-1 text-center">
                            {!isLocked && (
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">
                                    {isMultiple 
                                        ? "💡 Puedes seleccionar una o más opciones. Vuelve a pulsar sobre una opción para desmarcarla." 
                                        : "💡 Puedes cambiar tu voto haciendo clic sobre otra opción en cualquier momento."}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Módulo Interactivo de Kahoot (Live + Repaso Permanente) */}
            {isKahoot && task.kahoot && (() => {
                const kahoot = task.kahoot;
                const questions = Array.isArray(kahoot.questions) ? kahoot.questions : [];
                const status = kahoot.status || 'live';
                const { leaderboard = [], totalParticipants = 0 } = buildKahootLeaderboard(kahoot.participants || {}, kahoot.currentQuestionIndex);
                const topThree = leaderboard.slice(0, 3);
                const rawPin = String(kahoot.pin || '482915');
                const formattedPin = rawPin.length === 6 ? `${rawPin.slice(0, 3)} ${rawPin.slice(3)}` : rawPin;
                const isReviewEnabled = Boolean(kahoot.reviewEnabled);
                const canReview = canAccessKahootReview(kahoot, role);

                return (
                    <div className="my-3 rounded-2xl border border-fuchsia-200 dark:border-fuchsia-800/60 bg-gradient-to-br from-purple-950 via-indigo-950 to-fuchsia-950 text-white shadow-lg overflow-hidden">
                        {/* Cabecera del Kahoot */}
                        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-fuchsia-600/20 via-purple-600/15 to-indigo-600/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg shadow-fuchsia-600/30 shrink-0">
                                    <Gamepad2 size={20} className="text-white" />
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-black uppercase tracking-wider text-fuchsia-200">
                                        Kahoot
                                    </span>
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200">
                                        {questions.length} {questions.length === 1 ? 'pregunta' : 'preguntas'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="text-right px-3 py-1.5 rounded-xl bg-white/10 border border-white/15">
                                    <span className="text-[9px] uppercase tracking-wider text-purple-300 font-bold block">Participantes</span>
                                    <span className="text-sm font-black text-white">{totalParticipants}</span>
                                </div>
                            </div>
                        </div>

                        {/* Cuerpo: Podio / Ranking en vivo + Botones de acción */}
                        <div className="p-4 sm:p-5 space-y-4">
                            {/* Mini Podio / Top 3 si hay participantes */}
                            {topThree.length > 0 && (
                                <div className="p-3 rounded-xl bg-black/25 border border-white/10 space-y-2">
                                    <div className="flex items-center justify-between text-[11px] font-extrabold text-amber-300 uppercase tracking-wider">
                                        <span className="flex items-center gap-1.5"><Trophy size={13} /> Posiciones</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {topThree.map((p, idx) => (
                                            <div key={p.id || idx} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border ${
                                                idx === 0
                                                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-100'
                                                    : idx === 1
                                                        ? 'bg-slate-400/15 border-slate-300/30 text-slate-100'
                                                        : 'bg-amber-700/20 border-amber-600/30 text-amber-200'
                                            }`}>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-sm font-black shrink-0">
                                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                                    </span>
                                                    <span className="text-sm shrink-0">{p.avatar || '🦊'}</span>
                                                    <span className="text-xs font-extrabold truncate">{p.displayName || p.nickname}</span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {p.streak >= 2 && (
                                                        <span className="text-[10px] font-black text-orange-300 flex items-center" title={`Racha de ${p.streak}`}>
                                                            <Flame size={10} />{p.streak}
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-black">{(Number(p.score) || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Botón Principal */}
                            <div className="pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setKahootModalStartInReview(false);
                                        setShowKahootLiveModal(true);
                                    }}
                                    className="w-full py-3 px-6 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 hover:from-fuchsia-400 hover:via-purple-400 hover:to-indigo-400 text-white shadow-lg shadow-fuchsia-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                                >
                                    <Gamepad2 size={18} />
                                    <span>
                                        {status === 'finished'
                                            ? (canReview ? 'Volver a jugar' : 'Ver resultados')
                                            : role === 'teacher'
                                                ? 'Iniciar Kahoot'
                                                : 'Unirse al Kahoot'}
                                    </span>
                                </button>
                            </div>

                            {/* Editor en línea de preguntas del Kahoot para el docente */}
                            {role === 'teacher' && isEditingKahootQuestions && (
                                <div className="mt-3 p-3 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-fuchsia-300 dark:border-fuchsia-700 space-y-3 animate-in fade-in duration-200">
                                    <KahootBuilder
                                        questions={editedKahootQuestions}
                                        setQuestions={setEditedKahootQuestions}
                                        taskTitle={isEditingTask ? editTaskData.title : task.title}
                                        taskDesc={isEditingTask ? editTaskData.description : task.description}
                                        callGemini={callGemini}
                                        showMessage={showMessage}
                                        isDarkMode={isDarkMode}
                                        isDemoMode={isDemoTask}
                                    />
                                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditingKahootQuestions(false);
                                                if (isEditingTask) setIsEditingTask(false);
                                            }}
                                            className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (isEditingTask && !editTaskData.title.trim()) {
                                                    return showMessage("El título no puede estar vacío.");
                                                }
                                                const validation = validateKahootConfig(editedKahootQuestions);
                                                if (!validation.valid) {
                                                    return showMessage(`⚠️ ${validation.error}`);
                                                }
                                                try {
                                                    const reconciledParticipants = reconcileKahootParticipantsAfterEdit(
                                                        kahoot.participants || {},
                                                        validation.normalizedQuestions
                                                    );
                                                    const clampedQIdx = Math.max(
                                                        0,
                                                        Math.min(
                                                            Number(kahoot.currentQuestionIndex) || 0,
                                                            Math.max(0, validation.normalizedQuestions.length - 1)
                                                        )
                                                    );
                                                    const updates = {
                                                        kahoot: {
                                                            ...kahoot,
                                                            questions: validation.normalizedQuestions,
                                                            participants: reconciledParticipants,
                                                            currentQuestionIndex: clampedQIdx,
                                                            musicEnabled: kahoot.musicEnabled !== false,
                                                            allowNicknameChange: kahoot.allowNicknameChange !== false,
                                                            updatedAt: Date.now()
                                                        }
                                                    };
                                                    if (isEditingTask) {
                                                        updates.title = editTaskData.title.trim();
                                                        updates.description = editTaskData.description.trim();
                                                        updates.geniallyUrl = editTaskData.geniallyUrl ? extractGeniallyUrl(editTaskData.geniallyUrl.trim()) : '';
                                                        updates.hideDate = Boolean(editTaskData.hideDate);
                                                    }
                                                    await updateTaskDoc(updates);
                                                    setIsEditingKahootQuestions(false);
                                                    if (isEditingTask) setIsEditingTask(false);
                                                    showMessage("Cambios guardados.");
                                                } catch (err) {
                                                    showMessage("No se pudieron guardar los cambios.");
                                                }
                                            }}
                                            className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white shadow-md"
                                        >
                                            Guardar cambios
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Módulo Interactivo de Evaluación Académica (Publicación en el Muro) */}
            {isEvaluation && linkedEvaluation && (() => {
                const ev = linkedEvaluation;
                const evalGrades = (grades || []).filter(g => String(g?.evaluationId) === String(ev.id));
                const myNameClean = (loggedInName || '').trim().toLowerCase();
                const myChatClean = (myChatId || '').trim().toLowerCase().replace('@', '');
                const myUidClean = (currentUser?.uid || currentUserId || '').trim().toLowerCase();
                const myEmailClean = (currentUser?.email || '').trim().toLowerCase();

                const myEvalGrade = role !== 'teacher' ? evalGrades.find(g => {
                    const gStudentId = String(g.studentId || '').trim().toLowerCase().replace('@', '');
                    const gEmail = String(g.studentEmail || '').trim().toLowerCase();
                    const gUser = String(g.studentUsername || '').trim().toLowerCase().replace('@', '');
                    const gName = String(g.studentName || '').trim().toLowerCase();
                    const gUid = String(g.uid || g.studentUid || '').trim().toLowerCase();
                    if (myUidClean && (gStudentId === myUidClean || gUid === myUidClean)) return true;
                    if (myChatClean && (gStudentId === myChatClean || gUser === myChatClean)) return true;
                    if (myEmailClean && (gEmail === myEmailClean || gStudentId === myEmailClean)) return true;
                    if (myNameClean && gName && gName === myNameClean) return true;
                    if (myNameClean && gName) {
                        const p1 = splitNameFirstAndLast(myNameClean);
                        const p2 = splitNameFirstAndLast(gName);
                        if (p1.first && p1.last && p1.first === p2.first && p1.last === p2.last) return true;
                    }
                    return false;
                }) : null;

                const isEvalCheated = Boolean(myEvalGrade?.cheated || myEvalGrade?.status === 'cancelled_tab_change');

                const evDueStr = task.dueDate || ev.dueDate;
                const evTimeStr = task.dueTime || ev.dueTime || '23:59';
                const evDeadline = evDueStr ? new Date(`${evDueStr}T${evTimeStr}`) : null;
                const isEvExpired = evDeadline && !isNaN(evDeadline.getTime()) ? new Date() > evDeadline : false;
                const hasRealQuestions = Boolean(Array.isArray(ev.questions) && ev.questions.length > 0 && ev.questions[0]?.text);
                const questionTotal = Array.isArray(ev.questions) && ev.questions.length > 0
                    ? ev.questions.length
                    : (Number(task.questionCount) || 0);
                const timeLimitMin = Math.max(1, parseInt(ev.timeLimit || task.timeLimit, 10) || 30);
                const hasStrictAntiCheat = Boolean(ev.strictAntiCheat ?? task.strictAntiCheat);
                const hasImmediateFeedback = Boolean(ev.immediateFeedback ?? task.immediateFeedback);
                const avgScore = evalGrades.length > 0
                    ? (evalGrades.reduce((acc, g) => acc + (parseFloat(g.score) || 0), 0) / evalGrades.length).toFixed(1)
                    : null;

                return (
                    <div className="my-3 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/60 via-white to-orange-50/30 dark:from-rose-950/25 dark:via-gray-900/60 dark:to-orange-950/15 shadow-xs overflow-hidden">
                        {/* Cabecera de la Evaluación */}
                        <div className="p-3.5 sm:p-4 border-b border-rose-100/80 dark:border-rose-900/40 flex flex-wrap items-center justify-between gap-2.5 bg-gradient-to-r from-rose-500/5 via-transparent to-orange-500/5">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#AD3333] to-rose-700 text-white flex items-center justify-center shadow-sm shrink-0">
                                    <ClipboardList size={18} />
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-2xs">
                                        <Clock size={11} className="text-[#AD3333] dark:text-rose-400" />
                                        {timeLimitMin} min
                                    </span>
                                    {questionTotal > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-2xs">
                                            <FileText size={11} className="text-blue-500" />
                                            {questionTotal} {questionTotal === 1 ? 'pregunta' : 'preguntas'}
                                        </span>
                                    )}

                                </div>
                            </div>

                            {/* Pill de Estado (Estudiante vs Docente) */}
                            <div className="flex items-center gap-1.5">
                                {role === 'teacher' ? (
                                    <>
                                        <span className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-[#AD3333] dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                                            {evalGrades.length} {evalGrades.length === 1 ? 'entrega' : 'entregas'}
                                        </span>
                                        {avgScore !== null && (
                                            <span className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                                Promedio: {avgScore} / 5.0
                                            </span>
                                        )}
                                    </>
                                ) : myEvalGrade ? (
                                    isEvalCheated ? (
                                        <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
                                            <AlertTriangle size={11} /> Anulada por anti-trampas
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                            <CheckCircle2 size={11} /> Evaluación completada
                                        </span>
                                    )
                                ) : isEvExpired ? (
                                    <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700">
                                        <Lock size={11} /> Plazo vencido
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        <Clock size={11} /> Evaluación pendiente
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Cuerpo de la tarjeta de evaluación */}
                        <div className="p-3.5 sm:p-4 space-y-3">
                            {role === 'teacher' ? (
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                                        {evalGrades.length > 0
                                            ? `Han respondido ${evalGrades.length} ${evalGrades.length === 1 ? 'estudiante' : 'estudiantes'} con un promedio de ${avgScore} / 5.0.`
                                            : 'Aún no se registran entregas para esta evaluación.'}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (typeof onOpenEvaluationResults === 'function') {
                                                    onOpenEvaluationResults(ev);
                                                } else if (typeof onOpenEvaluationsTab === 'function') {
                                                    onOpenEvaluationsTab();
                                                }
                                            }}
                                            className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#AD3333] hover:bg-[#932828] text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                        >
                                            <BarChart2 size={14} />
                                            <span>Ver resultados y entregas ({evalGrades.length})</span>
                                        </button>
                                        {typeof onOpenEvaluationsTab === 'function' && (
                                            <button
                                                type="button"
                                                onClick={() => onOpenEvaluationsTab()}
                                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 transition-all cursor-pointer"
                                            >
                                                <ClipboardList size={14} />
                                                <span>Gestionar evaluaciones</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : myEvalGrade ? (
                                <div className="space-y-2.5">
                                    <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                                        isEvalCheated
                                            ? 'bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-900/60'
                                            : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                                    }`}>
                                        <div className="space-y-0.5">
                                            <span className={`text-xs font-extrabold flex items-center gap-1.5 ${
                                                isEvalCheated ? 'text-red-700 dark:text-red-300' : 'text-emerald-800 dark:text-emerald-200'
                                            }`}>
                                                {isEvalCheated ? '🚫 Evaluación anulada por cambio de pestaña / anti-trampas' : '✅ Ya presentaste esta evaluación'}
                                            </span>
                                            {myEvalGrade.teacherFeedback && (
                                                <p className="text-[11px] text-gray-600 dark:text-gray-300 italic mt-1">
                                                    Nota docente: &ldquo;{myEvalGrade.teacherFeedback}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-xl font-black text-sm border ${
                                            isEvalCheated
                                                ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 border-red-300 dark:border-red-800'
                                                : 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-2xs'
                                        }`}>
                                            Nota: {Number(myEvalGrade.score || 0).toFixed(1)} <span className="text-[11px] font-semibold opacity-75">/ 5.0</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {(hasImmediateFeedback || isEvExpired) && typeof onOpenImmediateFeedback === 'function' && (
                                            <button
                                                type="button"
                                                onClick={() => onOpenImmediateFeedback(ev, myEvalGrade)}
                                                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                                            >
                                                <Sparkles size={14} />
                                                <span>Ver retroalimentación detallada</span>
                                            </button>
                                        )}
                                        {(isDemoMode || ev.isDemoCreated) && typeof onRetryDemoEvaluation === 'function' && (
                                            <button
                                                type="button"
                                                onClick={() => onRetryDemoEvaluation(ev)}
                                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                                            >
                                                <RotateCcw size={13} />
                                                <span>Reintentar (Demo)</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : isEvExpired ? (
                                <div className="p-3 rounded-xl bg-gray-100/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                    <span className="flex items-center gap-1.5">
                                        <Lock size={14} className="text-red-500 shrink-0" />
                                        El plazo para presentar esta evaluación venció el {evDueStr}{evTimeStr ? ` a las ${format12HourTime(evTimeStr)}` : ''}.
                                    </span>
                                </div>
                            ) : (
                                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-800/50 flex flex-wrap items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="text-xs font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                            <Clock size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                            <span>Tienes esta evaluación pendiente por presentar</span>
                                        </div>
                                        <div className="text-[11.5px] text-gray-600 dark:text-gray-300 font-medium">
                                            Dispones de <strong className="text-gray-900 dark:text-white">{timeLimitMin} minutos</strong> para responder {questionTotal > 0 ? <strong className="text-gray-900 dark:text-white">{questionTotal} {questionTotal === 1 ? 'pregunta' : 'preguntas'}</strong> : 'el cuestionario'}{evDueStr ? ` • Cierra el ${evDueStr}${evTimeStr ? ` a las ${format12HourTime(evTimeStr)}` : ''}` : ''}.
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (hasRealQuestions && typeof onStartEvaluation === 'function') {
                                                onStartEvaluation(ev);
                                            } else if (typeof onOpenEvaluationsTab === 'function') {
                                                onOpenEvaluationsTab();
                                            }
                                        }}
                                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-[#AD3333] to-rose-700 hover:from-[#932828] hover:to-rose-800 text-white shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                                    >
                                        <Play size={14} />
                                        <span>Presentar evaluación</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Módulo Interactivo de Diapositivas (Publicación de Presentación en el Muro) */}
            {isSlides && (effectiveLinkedReview || task.slideCount) && (() => {
                const rev = effectiveLinkedReview;
                const slidesArr = Array.isArray(rev?.slides) ? rev.slides : [];
                const totalSlidesCount = slidesArr.length || Number(task.slideCount) || 0;
                const safeSlideIdx = slidesArr.length > 0 ? Math.min(slidePreviewIdx, slidesArr.length - 1) : 0;
                const currentPreviewSlide = slidesArr[safeSlideIdx] || null;
                const deckLanguage = rev?.language || task.language || 'Inglés';
                const isGoogleDeck = Boolean(rev?.googleSlidesUrl || rev?.sourceType === 'google_slides');
                const isPptxDeck = Boolean(rev?.pptxUrl || rev?.sourceType === 'pptx');

                return (
                    <div className="my-3 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/50 via-white to-red-50/30 dark:from-gray-900 dark:via-gray-900/95 dark:to-amber-950/20 shadow-sm overflow-hidden">
                        {/* Lienzo o iframe en vivo de la diapositiva con controles rápidos */}
                        {rev?.googleSlidesUrl ? (
                            <div className="relative aspect-video w-full bg-black overflow-hidden group/slidecard">
                                <iframe
                                    src={rev.googleSlidesUrl}
                                    title={rev.topic || "Google Slides"}
                                    className="w-full h-full border-0"
                                    allowFullScreen
                                    loading="lazy"
                                />
                                <div className="absolute top-2.5 right-2.5 z-20">
                                    <button
                                        type="button"
                                        onClick={() => setShowSlidePresenter(true)}
                                        className="px-2.5 py-1 rounded-lg bg-black/75 hover:bg-black/90 backdrop-blur-md text-white text-[10px] font-extrabold border border-white/20 flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                                        title="Abrir en pantalla completa interactiva"
                                    >
                                        <Maximize2 size={11} />
                                        <span>Pantalla completa</span>
                                    </button>
                                </div>
                            </div>
                        ) : rev && currentPreviewSlide ? (
                            <div
                                onClick={() => setShowSlidePresenter(true)}
                                className="relative group/slidecard cursor-pointer overflow-hidden bg-slate-950 border-b border-amber-100/80 dark:border-gray-800"
                                title="Clic para abrir la presentación en pantalla completa"
                            >
                                <SlideCanvasSurface
                                    presentation={rev}
                                    slide={currentPreviewSlide}
                                    slideIdx={safeSlideIdx}
                                    totalSlides={slidesArr.length}
                                    appThemeMode={themeMode || (isDarkMode ? 'dark' : 'light')}
                                    mode="card"
                                />

                                {/* Botones Anterior / Siguiente para hojear las diapositivas desde el muro */}
                                {slidesArr.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSlidePreviewIdx(prev => (prev <= 0 ? slidesArr.length - 1 : prev - 1));
                                            }}
                                            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center shadow-lg transition-all hover:scale-110 z-20 cursor-pointer"
                                            title="Diapositiva anterior"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSlidePreviewIdx(prev => (prev >= slidesArr.length - 1 ? 0 : prev + 1));
                                            }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center shadow-lg transition-all hover:scale-110 z-20 cursor-pointer"
                                            title="Siguiente diapositiva"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </>
                                )}

                                {/* Botón flotante superior derecho para pantalla completa */}
                                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-md text-white text-[10px] font-extrabold border border-white/20 flex items-center gap-1.5 opacity-90 group-hover/slidecard:opacity-100 transition-opacity z-20">
                                    <Maximize2 size={11} />
                                    <span>Pantalla completa</span>
                                </div>
                            </div>
                        ) : null}

                        {/* Barra de acciones de la presentación */}
                        <div className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-2.5">
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                {rev ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowSlidePresenter(true)}
                                        className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#AD3333] to-amber-700 hover:from-[#932828] hover:to-amber-800 text-white shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
                                        title="Ver presentación"
                                    >
                                        <Play size={14} />
                                        <span>Ver</span>
                                    </button>
                                ) : (
                                    typeof onOpenReviewsTab === 'function' && (
                                        <button
                                            type="button"
                                            onClick={() => onOpenReviewsTab()}
                                            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#AD3333] to-amber-700 hover:from-[#932828] hover:to-amber-800 text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                                            title="Ver presentación"
                                        >
                                            <Play size={14} />
                                            <span>Ver</span>
                                        </button>
                                    )
                                )}

                                {rev && (
                                    rev.pptxUrl ? (
                                        <a
                                            href={rev.pptxUrl}
                                            download={rev.fileName || `${rev.topic || 'presentacion'}.pptx`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                            title="Descargar archivo PowerPoint (.pptx)"
                                        >
                                            <Download size={14} className="text-orange-500" />
                                            <span>Descargar</span>
                                        </a>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => exportReviewToPresentation(rev)}
                                            className="px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                            title="Descargar archivo PowerPoint (.pptx)"
                                        >
                                            <Download size={14} className="text-[#AD3333] dark:text-amber-400" />
                                            <span>Descargar</span>
                                        </button>
                                    )
                                )}

                                {rev?.googleSlidesOriginalUrl && (
                                    <a
                                        href={rev.googleSlidesOriginalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                        title="Abrir en Google Slides (pestaña nueva)"
                                    >
                                        <ExternalLink size={13} />
                                        <span>Google Slides</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Publicación de Libro en el Muro */}
            {isBook3D && linkedBook && (() => {
                const bk = linkedBook;
                const bkTheme = getBookTheme(bk.theme);
                const pagesArr = effectiveBookPages;
                const totalPagesCount = pagesArr.length || Number(bk.pageCount) || 1;
                const spreadState = resolveSpreadDisplayState(bookSpreads, bookPreviewSpreadIdx, totalPagesCount);
                const safeSpreadIdx = Number.isInteger(spreadState.safeSpreadIdx)
                    ? spreadState.safeSpreadIdx
                    : spreadState.spreadIndex;
                const totalSpreads = spreadState.totalSpreads;
                const canGoPrevPreview = safeSpreadIdx > 0;
                const canGoNextPreview = safeSpreadIdx < totalSpreads - 1;
                const currentSpread = spreadState.spread;
                const leftPageIdx = spreadState.leftPageIdx;
                const rightPageIdx = spreadState.rightPageIdx;
                const closedPageIdx = spreadState.closedPageIdx;
                const isCoverClosed = spreadState.isCoverClosed;
                const isBackClosed = spreadState.isBackClosed;
                const isOpenDoubleSpread = spreadState.isOpenDoubleSpread;
                const primaryPreviewPageIdx = spreadState.primaryPageIndex;
                const spreadBadgeLabel = spreadState.badgeLabel;
                const pdfSourceUrl = bk.pdfUrl || bk.fileUrl || task.fileUrl || '';

                const goToPreviewSpread = (targetIdx, direction = 'next', initialAngleDeg = null) => {
                    const numericTarget = Number(targetIdx);
                    if (!Number.isFinite(numericTarget)) return;
                    const bounded = Math.max(0, Math.min(totalSpreads - 1, Math.floor(numericTarget)));
                    if (bounded === safeSpreadIdx || bookPreviewFlipAnim) return;
                    playPageFlipSound({ muted: false, direction });
                    const targetSpread = bookSpreads[bounded] || currentSpread;
                    const defaultStartAngle = direction === 'next' ? -8 : 8;
                    const startAngleDeg = Number.isFinite(initialAngleDeg) && Math.abs(initialAngleDeg) > 4
                        ? initialAngleDeg
                        : defaultStartAngle;
                    const remainingRatio = Math.max(0.28, 1 - Math.min(1, Math.abs(startAngleDeg) / 180));
                    const durationMs = Math.max(160, Math.round(340 * remainingRatio));
                    if (safeSpreadIdx === 0 && bounded > 0) {
                        lastPreviewCoverOpenAtRef.current = Date.now() + durationMs + 20;
                    }
                    if (bookPreviewFlipTimerRef.current) clearTimeout(bookPreviewFlipTimerRef.current);
                    setBookPreviewFlipAnim({
                        direction,
                        fromSpread: currentSpread,
                        toSpread: targetSpread,
                        startAngleDeg,
                        durationMs,
                        progress: 0
                    });
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            setBookPreviewFlipAnim(prev => (prev ? { ...prev, progress: 1 } : null));
                        });
                    });
                    bookPreviewFlipTimerRef.current = setTimeout(() => {
                        setBookPreviewSpreadIdx(bounded);
                        setBookPreviewFlipAnim(null);
                    }, durationMs + 20);
                };

                const handlePrevPreviewSpread = (e) => {
                    if (e) e.stopPropagation();
                    if (totalSpreads <= 1 || safeSpreadIdx <= 0) return;
                    goToPreviewSpread(safeSpreadIdx - 1, 'prev');
                };

                const handleNextPreviewSpread = (e) => {
                    if (e) e.stopPropagation();
                    if (totalSpreads <= 1 || safeSpreadIdx >= totalSpreads - 1) return;
                    goToPreviewSpread(safeSpreadIdx + 1, 'next');
                };

                const handlePreviewPointerDown = (e) => {
                    if (e.button !== undefined && e.button !== 0) return;
                    if (e.target && typeof e.target.closest === 'function' && e.target.closest('button, a')) return;
                    if (bookPreviewFlipAnim || totalSpreads <= 1 || !bookPreviewStageRef.current) return;
                    const rect = bookPreviewStageRef.current.getBoundingClientRect();
                    const relX = (e.clientX - rect.left) / Math.max(1, rect.width);
                    const justOpenedCover =
                        safeSpreadIdx === 1 &&
                        Date.now() - Number(lastPreviewCoverOpenAtRef.current || 0) < 750 &&
                        relX >= 0.22;
                    let direction = null;
                    if (isCoverClosed) {
                        direction = safeSpreadIdx < totalSpreads - 1 ? 'next' : null;
                    } else if (isBackClosed) {
                        direction = safeSpreadIdx > 0 ? 'prev' : null;
                    } else if ((relX >= 0.5 || justOpenedCover) && safeSpreadIdx < totalSpreads - 1) {
                        direction = 'next';
                    } else if (relX < 0.5 && !justOpenedCover && safeSpreadIdx > 0) {
                        direction = 'prev';
                    }
                    if (!direction) return;
                    const targetIdx = direction === 'next' ? safeSpreadIdx + 1 : safeSpreadIdx - 1;
                    const leafWidth = isOpenDoubleSpread
                        ? Math.min(260, Math.max(180, rect.width * 0.42))
                        : Math.min(220, Math.max(180, rect.width * 0.38));
                    setBookPreviewDragState({
                        pointerId: e.pointerId,
                        captured: false,
                        startTime: Date.now(),
                        direction,
                        startX: e.clientX,
                        currentX: e.clientX,
                        containerWidth: leafWidth,
                        containerHeight: Math.max(180, rect.height),
                        fromSpread: currentSpread,
                        toSpread: bookSpreads[targetIdx] || currentSpread,
                        targetIdx
                    });
                };

                const handlePreviewPointerMove = (e) => {
                    if (!bookPreviewDragState) return;
                    const dx = e.clientX - bookPreviewDragState.startX;
                    const movedPx = Math.abs(dx);
                    let nextDir = bookPreviewDragState.direction;
                    if (dx <= -14 && safeSpreadIdx < totalSpreads - 1) {
                        nextDir = 'next';
                    } else if (dx >= 14 && safeSpreadIdx > 0 && !isCoverClosed) {
                        nextDir = 'prev';
                    }
                    const nextTargetIdx = nextDir === 'next'
                        ? Math.min(totalSpreads - 1, safeSpreadIdx + 1)
                        : Math.max(0, safeSpreadIdx - 1);
                    if (movedPx > 6 && !bookPreviewDragState.captured && bookPreviewStageRef.current) {
                        try {
                            bookPreviewStageRef.current.setPointerCapture?.(bookPreviewDragState.pointerId);
                        } catch {
                            // Ignore pointer capture errors
                        }
                    }
                    setBookPreviewDragState(prev => (prev ? {
                        ...prev,
                        direction: nextDir,
                        targetIdx: nextTargetIdx,
                        toSpread: bookSpreads[nextTargetIdx] || currentSpread,
                        captured: prev.captured || movedPx > 6,
                        currentX: e.clientX
                    } : null));
                };

                const handlePreviewPointerUp = (e) => {
                    if (!bookPreviewDragState) return;
                    if (bookPreviewDragState.captured && bookPreviewStageRef.current && bookPreviewDragState.pointerId !== undefined) {
                        try {
                            bookPreviewStageRef.current.releasePointerCapture?.(bookPreviewDragState.pointerId);
                        } catch {
                            // Ignore release errors
                        }
                    }
                    if (e?.type === 'pointercancel') {
                        setBookPreviewDragState(null);
                        return;
                    }
                    suppressPreviewClickRef.current = Date.now() + 450;

                    const endX = (typeof e?.clientX === 'number' && (e.clientX !== 0 || e.clientY !== 0))
                        ? e.clientX
                        : bookPreviewDragState.currentX;
                    const dx = endX - bookPreviewDragState.startX;
                    const travel = Math.abs(dx);
                    let direction = bookPreviewDragState.direction;
                    if (dx <= -14 && safeSpreadIdx < totalSpreads - 1) {
                        direction = 'next';
                    } else if (dx >= 14 && safeSpreadIdx > 0 && !isCoverClosed) {
                        direction = 'prev';
                    }
                    const targetIdx = direction === 'next'
                        ? Math.min(totalSpreads - 1, safeSpreadIdx + 1)
                        : Math.max(0, safeSpreadIdx - 1);
                    setBookPreviewDragState(null);
                    const rawDistance = direction === 'next' ? -dx : dx;
                    const isQuickTap = travel < 14 && rawDistance >= -6;
                    if (isQuickTap) {
                        goToPreviewSpread(targetIdx, direction);
                        return;
                    }
                    const curl = calculateDragCurlState({
                        startX: bookPreviewDragState.startX,
                        currentX: endX,
                        containerWidth: bookPreviewDragState.containerWidth,
                        containerHeight: bookPreviewDragState.containerHeight,
                        direction
                    });
                    const shouldTurnCover = isCoverClosed && travel >= 14 && rawDistance >= -12;
                    if (curl.shouldComplete || rawDistance >= 14 || shouldTurnCover) {
                        if (curl.progress >= 0.82) {
                            playPageFlipSound({ muted: false, direction });
                            if (safeSpreadIdx === 0 && targetIdx > 0) {
                                lastPreviewCoverOpenAtRef.current = Date.now();
                            }
                            setBookPreviewSpreadIdx(targetIdx);
                        } else {
                            goToPreviewSpread(targetIdx, direction, curl.angleDeg);
                        }
                    }
                };

                const activeDragCurl = bookPreviewDragState && Math.abs(bookPreviewDragState.currentX - bookPreviewDragState.startX) > 4
                    ? calculateDragCurlState({
                        startX: bookPreviewDragState.startX,
                        currentX: bookPreviewDragState.currentX,
                        containerWidth: bookPreviewDragState.containerWidth,
                        containerHeight: bookPreviewDragState.containerHeight,
                        direction: bookPreviewDragState.direction
                    })
                    : null;

                const renderPreviewPageSurface = (pageIdx, side = 'right') => {
                    if (!Number.isInteger(pageIdx) || pageIdx < 0) return null;
                    const pageNumber = pageIdx + 1;
                    const rawEntry = pagesArr[pageIdx];
                    const rawSrc = (typeof rawEntry === 'string'
                        ? rawEntry
                        : (rawEntry?.src || rawEntry?.imageUrl || ''))
                        || (pageIdx === 0 ? (bk.customCoverUrl || bk.coverUrl || '') : '');
                    const overlayInfo = extractSvgExternalImageOverlay(rawSrc);
                    const displaySrc = overlayInfo?.cleanedSvgDataUrl || rawSrc;
                    const isFallbackPlaceholder = !rawSrc || (loadingBookPdf && isCompactedOrFallbackBookPage(rawSrc) && pageIdx > 0);
                    const rawSnippet = String(bk.pageTexts?.[pageIdx] || '').trim();

                    const fallbackSvg = buildIllustratedBookPageSvg({
                        variant: pageIdx === 0 ? 'cover' : pageIdx === totalPagesCount - 1 && totalPagesCount >= 3 ? 'back-cover' : 'content',
                        chapter: pageIdx === 0 ? 'LIBRO' : `PÁGINA ${pageNumber}`,
                        title: pageIdx === 0 ? bk.title : `${bk.title} — Página ${pageNumber}`,
                        subtitle: pageIdx === 0 ? (bk.authorName || 'Docente') : '',
                        body: rawSnippet ? [rawSnippet] : [`Vista de la página ${pageNumber} de "${bk.title}".`],
                        pageNumber,
                        totalPages: totalPagesCount,
                        themeId: bk.theme
                    });

                    return (
                        <div className="relative w-full h-full bg-[#fdfbf7] overflow-hidden select-none">
                            <img loading="lazy" decoding="async"
                                src={displaySrc || fallbackSvg}
                                alt={`${bk.title} - Pág. ${pageNumber}`}
                                draggable={false}
                                onError={(e) => {
                                    if (e.currentTarget.src !== fallbackSvg) {
                                        e.currentTarget.src = fallbackSvg;
                                    }
                                }}
                                className="w-full h-full object-contain bg-[#fdfbf7] pointer-events-none"
                            />
                            {overlayInfo?.href && (
                                <img loading="lazy" decoding="async"
                                    src={overlayInfo.href}
                                    alt={bk.title}
                                    draggable={false}
                                    style={{
                                        left: `${overlayInfo.leftPct}%`,
                                        top: `${overlayInfo.topPct}%`,
                                        width: `${overlayInfo.widthPct}%`,
                                        height: `${overlayInfo.heightPct}%`,
                                        objectFit: overlayInfo.objectFit || 'contain'
                                    }}
                                    className="absolute rounded-md shadow-sm pointer-events-none"
                                />
                            )}
                            {isFallbackPlaceholder && (
                                <div className="absolute inset-x-2 bottom-2 px-2 py-1 rounded-lg bg-slate-900/80 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 backdrop-blur-xs">
                                    <Loader2 size={11} className="animate-spin text-indigo-300" />
                                    <span>Cargando pág. {pageNumber}...</span>
                                </div>
                            )}
                            {/* Sombra realista de pliegue hacia el lomo central */}
                            <div
                                className="absolute inset-y-0 pointer-events-none"
                                style={{
                                    width: '26px',
                                    ...(side === 'left'
                                        ? {
                                            right: 0,
                                            background: 'linear-gradient(270deg, rgba(15,23,42,0.28) 0%, rgba(15,23,42,0.08) 52%, transparent 100%)'
                                        }
                                        : {
                                            left: 0,
                                            background: 'linear-gradient(90deg, rgba(15,23,42,0.30) 0%, rgba(15,23,42,0.08) 52%, transparent 100%)'
                                        })
                                }}
                            />
                        </div>
                    );
                };

                const openModalAtCurrentSpread = (e) => {
                    if (e) e.stopPropagation();
                    const hasFullLivePages = Array.isArray(liveBookPages) && liveBookPages.length >= totalPagesCount;
                    const resolvedModalPages = hasFullLivePages
                        ? liveBookPages
                        : (pagesArr.length >= (Array.isArray(bk.bookPages) ? bk.bookPages.length : 0) ? pagesArr : bk.bookPages);
                    setActiveFlipbookModal({
                        book: {
                            ...bk,
                            bookPages: resolvedModalPages,
                            pageCount: totalPagesCount,
                            initialPage: primaryPreviewPageIdx
                        },
                        initialPage: primaryPreviewPageIdx
                    });
                };

                const activeTurnDirection = bookPreviewFlipAnim?.direction || bookPreviewDragState?.direction || null;
                const activeTargetSpread = bookPreviewFlipAnim?.toSpread || bookPreviewDragState?.toSpread || null;
                const stationaryLeftPageIdx = (activeTurnDirection === 'prev' && Number.isInteger(activeTargetSpread?.leftPage))
                    ? activeTargetSpread.leftPage
                    : leftPageIdx;
                const stationaryRightPageIdx = (activeTurnDirection === 'next' && Number.isInteger(activeTargetSpread?.rightPage))
                    ? activeTargetSpread.rightPage
                    : rightPageIdx;

                return (
                    <div className="my-3 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/50 bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/30 dark:from-gray-900 dark:via-gray-900/95 dark:to-indigo-950/25 shadow-sm overflow-hidden">
                        {/* Cabecera del Libro */}
                        <div className="px-4 py-2.5 border-b border-indigo-100/80 dark:border-indigo-900/40 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-indigo-500/10 via-transparent to-violet-500/10">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs shrink-0">
                                    <BookOpen size={15} />
                                </div>
                                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                    {totalPagesCount} {totalPagesCount === 1 ? 'página' : 'páginas'}
                                </span>
                                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hidden sm:inline">
                                    • {isCoverClosed ? 'Portada cerrada (clic para abrir)' : isBackClosed ? 'Contraportada' : 'Libro abierto a doble página'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {loadingBookPdf && (
                                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1">
                                        <Loader2 size={10} className="animate-spin" />
                                        <span>Renderizando PDF {bookRenderProgress.percent || 0}%</span>
                                    </span>
                                )}
                                {pagesArr.length > 0 && (
                                    <span className="text-[10.5px] font-extrabold text-indigo-800 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200/80 dark:border-indigo-800/60">
                                        {spreadBadgeLabel}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Escenario 3D Interactivo del Libro en el Muro (Portada cerrada -> Doble página abierta -> Contraportada) */}
                        <div
                            ref={bookPreviewStageRef}
                            onPointerDown={handlePreviewPointerDown}
                            onPointerMove={handlePreviewPointerMove}
                            onPointerUp={handlePreviewPointerUp}
                            onPointerCancel={() => setBookPreviewDragState(null)}
                            className="relative group/bookcard select-none overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 px-4 py-6 sm:px-8 sm:py-8 flex flex-col items-center justify-center border-b border-indigo-100/80 dark:border-gray-800"
                            style={{ perspective: '1600px' }}
                        >
                            {/* Botón flotante para pantalla completa sincronizado */}
                            <button
                                type="button"
                                onClick={openModalAtCurrentSpread}
                                className="absolute top-3 right-3 z-20 px-2.5 py-1.5 rounded-lg bg-black/55 hover:bg-indigo-600 text-white/90 hover:text-white border border-white/15 text-[10px] font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                                title="Abrir en pantalla completa"
                            >
                                <Maximize2 size={12} />
                                <span className="hidden sm:inline">Pantalla completa</span>
                            </button>

                            {isOpenDoubleSpread ? (
                                /* LIBRO ABIERTO A DOBLE PÁGINA CON LOMO CENTRAL Y HOJA GIRATORIA 3D */
                                <div
                                    className="relative flex items-stretch justify-center w-full max-w-[460px] sm:max-w-[540px] h-56 sm:h-72 transition-all duration-500"
                                    style={{ transformStyle: 'preserve-3d' }}
                                >
                                    {/* Tapa dura exterior bajo las hojas abiertas */}
                                    <div
                                        className="absolute -inset-x-2 -inset-y-1.5 rounded-xl pointer-events-none shadow-[0_24px_48px_-10px_rgba(0,0,0,0.85)] border border-white/15"
                                        style={{ backgroundColor: bkTheme.coverBg }}
                                    />

                                    {/* Canto de hojas apiladas izquierda */}
                                    <div
                                        className="w-2 sm:w-2.5 my-1 rounded-l-sm shrink-0 z-10 pointer-events-none"
                                        style={{
                                            background: 'repeating-linear-gradient(90deg, #e2e8f0 0px, #f8fafc 1.2px, #cbd5e1 2.4px)',
                                            boxShadow: '-3px 4px 10px rgba(0,0,0,0.45)'
                                        }}
                                    />

                                    {/* Página Izquierda (Verso) */}
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (Date.now() < Number(suppressPreviewClickRef.current || 0)) return;
                                            if (safeSpreadIdx === 1 && Date.now() - Number(lastPreviewCoverOpenAtRef.current || 0) < 750) return;
                                            handlePrevPreviewSpread(e);
                                        }}
                                        className="relative flex-1 h-full rounded-l-md overflow-hidden border-y border-l border-stone-300/80 z-10 cursor-pointer group/leftpage"
                                        title="Clic para volver a la página anterior"
                                    >
                                        {renderPreviewPageSurface(stationaryLeftPageIdx, 'left')}
                                        <span className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/55 text-white text-[9px] font-bold pointer-events-none">
                                            Pág. {(stationaryLeftPageIdx ?? 0) + 1}
                                        </span>
                                    </div>

                                    {/* Lomo / Pliegue Central 3D */}
                                    <div
                                        className="w-2.5 sm:w-3 h-full z-20 shrink-0 pointer-events-none"
                                        style={{
                                            background: 'linear-gradient(90deg, rgba(15,23,42,0.55) 0%, rgba(255,255,255,0.22) 50%, rgba(15,23,42,0.55) 100%)',
                                            boxShadow: 'inset 0 0 8px rgba(0,0,0,0.65)'
                                        }}
                                    />

                                    {/* Página Derecha (Recto) */}
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (Date.now() < Number(suppressPreviewClickRef.current || 0)) return;
                                            handleNextPreviewSpread(e);
                                        }}
                                        className="relative flex-1 h-full rounded-r-md overflow-hidden border-y border-r border-stone-300/80 z-10 cursor-pointer group/rightpage"
                                        title="Clic para pasar a la siguiente página"
                                    >
                                        {renderPreviewPageSurface(stationaryRightPageIdx, 'right')}
                                        <span className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded bg-black/55 text-white text-[9px] font-bold pointer-events-none">
                                            Pág. {(stationaryRightPageIdx ?? 0) + 1}
                                        </span>
                                        {/* Esquina interactiva para pasar hoja */}
                                        <div
                                            className="absolute bottom-0 right-0 w-7 h-7 pointer-events-none transition-all duration-300 group-hover/rightpage:w-9 group-hover/rightpage:h-9"
                                            style={{
                                                background: 'linear-gradient(135deg, transparent 48%, rgba(148,163,184,0.45) 50%, rgba(255,255,255,0.92) 62%, rgba(203,213,225,0.85) 100%)',
                                                boxShadow: '-2px -2px 6px rgba(0,0,0,0.18)'
                                            }}
                                        />
                                    </div>

                                    {/* Canto de hojas apiladas derecha */}
                                    <div
                                        className="w-2 sm:w-2.5 my-1 rounded-r-sm shrink-0 z-10 pointer-events-none"
                                        style={{
                                            background: 'repeating-linear-gradient(90deg, #f8fafc 0px, #cbd5e1 1.2px, #f1f5f9 2.4px)',
                                            boxShadow: '3px 4px 10px rgba(0,0,0,0.45)'
                                        }}
                                    />

                                    {/* Hoja 3D de doble cara en movimiento durante animación o arrastre con el puntero */}
                                    {(bookPreviewFlipAnim || activeDragCurl) && (() => {
                                        const isNext = activeTurnDirection === 'next';
                                        const animStartAngle = Number.isFinite(bookPreviewFlipAnim?.startAngleDeg)
                                            ? bookPreviewFlipAnim.startAngleDeg
                                            : (isNext ? -8 : 8);
                                        const angle = activeDragCurl
                                            ? activeDragCurl.angleDeg
                                            : (bookPreviewFlipAnim.progress === 1 ? (isNext ? -176 : 176) : animStartAngle);
                                        const animDurationMs = bookPreviewFlipAnim?.durationMs || 340;
                                        const frontLeafPageIdx = isNext
                                            ? (rightPageIdx ?? leftPageIdx)
                                            : (leftPageIdx ?? rightPageIdx);
                                        const backLeafPageIdx = isNext
                                            ? (Number.isInteger(activeTargetSpread?.leftPage) ? activeTargetSpread.leftPage : frontLeafPageIdx)
                                            : (Number.isInteger(activeTargetSpread?.rightPage) ? activeTargetSpread.rightPage : frontLeafPageIdx);

                                        return (
                                            <div
                                                className="absolute top-0 bottom-0 w-1/2 z-30 pointer-events-none rounded-md shadow-2xl"
                                                style={{
                                                    left: isNext ? '50%' : '0%',
                                                    transformOrigin: isNext ? 'left center' : 'right center',
                                                    transformStyle: 'preserve-3d',
                                                    transform: `rotateY(${angle}deg)`,
                                                    transition: activeDragCurl ? 'none' : `transform ${animDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
                                                }}
                                            >
                                                {/* Cara frontal de la hoja giratoria */}
                                                <div
                                                    className="absolute inset-0 overflow-hidden rounded-md"
                                                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                                                >
                                                    {renderPreviewPageSurface(frontLeafPageIdx, isNext ? 'right' : 'left')}
                                                </div>
                                                {/* Cara posterior de la hoja giratoria (reverso al voltear más de 90°) */}
                                                <div
                                                    className="absolute inset-0 overflow-hidden rounded-md"
                                                    style={{
                                                        backfaceVisibility: 'hidden',
                                                        WebkitBackfaceVisibility: 'hidden',
                                                        transform: 'rotateY(180deg)'
                                                    }}
                                                >
                                                    {renderPreviewPageSurface(backLeafPageIdx, isNext ? 'left' : 'right')}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                /* LIBRO CERRADO (Portada inicial en Spread 0 o Contraportada final) */
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (Date.now() < Number(suppressPreviewClickRef.current || 0)) return;
                                        if (isCoverClosed && totalSpreads > 1) {
                                            handleNextPreviewSpread(e);
                                        } else if (isBackClosed && totalSpreads > 1) {
                                            handlePrevPreviewSpread(e);
                                        } else {
                                            openModalAtCurrentSpread(e);
                                        }
                                    }}
                                    className="relative w-44 sm:w-52 h-60 sm:h-72 shrink-0 select-none cursor-pointer"
                                    style={{ perspective: '1200px' }}
                                    title={isCoverClosed ? 'Clic para abrir el libro' : 'Clic para volver a abrir el libro'}
                                >
                                    {/* Canto de hojas izquierdas cuando está en la contraportada */}
                                    {isBackClosed && (
                                        <div
                                            className="absolute top-2 bottom-2 -left-2.5 w-2.5 rounded-l-sm pointer-events-none z-10"
                                            style={{
                                                background: 'repeating-linear-gradient(90deg, #e2e8f0 0px, #f8fafc 1.5px, #cbd5e1 3px)',
                                                boxShadow: '-4px 6px 14px rgba(0,0,0,0.45)'
                                            }}
                                        />
                                    )}

                                    <div
                                        className={`relative w-full h-full ${isBackClosed ? 'rounded-l-2xl rounded-r-sm' : 'rounded-r-2xl rounded-l-sm'} ${!(bookPreviewFlipAnim || activeDragCurl) ? (isBackClosed ? 'group-hover/bookcard:[transform:rotateY(14deg)_translateY(-3px)] transition-transform duration-500' : 'group-hover/bookcard:[transform:rotateY(-14deg)_translateY(-3px)] transition-transform duration-500') : ''} shadow-[18px_22px_38px_-8px_rgba(0,0,0,0.75)] border border-white/20`}
                                        style={{
                                            backgroundColor: bkTheme.coverBg,
                                            transformStyle: 'preserve-3d',
                                            transformOrigin: isBackClosed ? 'right center' : 'left center',
                                            ...((bookPreviewFlipAnim || activeDragCurl) ? (() => {
                                                const animStartAngle = Number.isFinite(bookPreviewFlipAnim?.startAngleDeg)
                                                    ? bookPreviewFlipAnim.startAngleDeg
                                                    : (isBackClosed ? 12 : -12);
                                                const closedAngle = activeDragCurl
                                                    ? activeDragCurl.angleDeg
                                                    : (bookPreviewFlipAnim.progress === 1 ? (isBackClosed ? 156 : -156) : animStartAngle);
                                                const animDurationMs = bookPreviewFlipAnim?.durationMs || 340;
                                                return {
                                                    transform: `rotateY(${closedAngle}deg)`,
                                                    transition: activeDragCurl ? 'none' : `transform ${animDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
                                                };
                                            })() : {})
                                        }}
                                    >
                                        {/* Cara exterior de la portada / contraportada */}
                                        <div
                                            className={`absolute inset-0 overflow-hidden ${isBackClosed ? 'rounded-l-2xl rounded-r-sm' : 'rounded-r-2xl rounded-l-sm'}`}
                                            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                                        >
                                            {/* Lomo físico de encuadernación */}
                                            <div
                                                className={`absolute inset-y-0 ${isBackClosed ? 'right-0' : 'left-0'} w-4 z-10 pointer-events-none`}
                                                style={{
                                                    background: 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(255,255,255,0.24) 45%, rgba(0,0,0,0.35) 100%)'
                                                }}
                                            />
                                            {renderPreviewPageSurface(
                                                closedPageIdx,
                                                isBackClosed ? 'left' : 'right'
                                            )}
                                        </div>

                                        {/* Cara interior de la tapa al girar más de 90° (muestra la primera o última página interior) */}
                                        <div
                                            className={`absolute inset-0 overflow-hidden ${isBackClosed ? 'rounded-r-2xl rounded-l-sm' : 'rounded-l-2xl rounded-r-sm'}`}
                                            style={{
                                                backfaceVisibility: 'hidden',
                                                WebkitBackfaceVisibility: 'hidden',
                                                transform: 'rotateY(180deg)'
                                            }}
                                        >
                                            {renderPreviewPageSurface(
                                                isBackClosed
                                                    ? (Number.isInteger(activeTargetSpread?.rightPage) ? activeTargetSpread.rightPage : Math.max(0, (closedPageIdx ?? 1) - 1))
                                                    : (Number.isInteger(activeTargetSpread?.leftPage) ? activeTargetSpread.leftPage : Math.min(totalPagesCount - 1, 1)),
                                                isBackClosed ? 'right' : 'left'
                                            )}
                                        </div>
                                    </div>

                                    {/* Canto de hojas derechas cuando está en la portada cerrada */}
                                    {!isBackClosed && (
                                        <div
                                            className="absolute top-2 bottom-2 -right-2.5 w-2.5 rounded-r-sm pointer-events-none"
                                            style={{
                                                background: 'repeating-linear-gradient(90deg, #f8fafc 0px, #cbd5e1 1.5px, #f1f5f9 3px)',
                                                boxShadow: '4px 6px 14px rgba(0,0,0,0.45)'
                                            }}
                                        />
                                    )}
                                </div>
                            )}

                            {/* Controles de hojeo rápido en la tarjeta (Abren y pasan pliegos de páginas en 3D) */}
                            {totalSpreads > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handlePrevPreviewSpread}
                                        disabled={!canGoPrevPreview}
                                        className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/65 hover:bg-indigo-600 text-white border border-white/20 flex items-center justify-center shadow-lg transition-all hover:scale-110 z-30 cursor-pointer disabled:opacity-35 disabled:pointer-events-none"
                                        title="Pliego anterior"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNextPreviewSpread}
                                        disabled={!canGoNextPreview}
                                        className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/65 hover:bg-indigo-600 text-white border border-white/20 flex items-center justify-center shadow-lg transition-all hover:scale-110 z-30 cursor-pointer disabled:opacity-35 disabled:pointer-events-none"
                                        title="Siguiente pliego (abrir / pasar hoja)"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </>
                            )}

                            {/* Indicador inferior interactivo */}
                            <div className="mt-3 flex items-center gap-2 text-[10.5px] font-bold text-indigo-200/90">
                                <span>
                                    {isCoverClosed
                                        ? 'Haz clic en la portada o en la flecha derecha para abrir el libro'
                                        : isBackClosed
                                            ? 'Fin del libro • Haz clic para volver a hojear'
                                            : 'Haz clic en las páginas o arrastra la esquina para pasar de hoja'}
                                </span>
                            </div>
                        </div>

                        {/* Barra de acciones del Libro */}
                        <div className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-2.5">
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={openModalAtCurrentSpread}
                                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
                                >
                                    <BookOpen size={14} />
                                    <span>Abrir libro</span>
                                </button>

                                {pdfSourceUrl && (
                                    <a
                                        href={pdfSourceUrl}
                                        download={bk.fileName || `${bk.title || 'libro'}.pdf`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                        title="Descargar PDF"
                                    >
                                        <Download size={14} className="text-indigo-600 dark:text-indigo-400" />
                                        <span>Descargar PDF</span>
                                    </a>
                                )}

                                {typeof onOpenBooksTab === 'function' && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenBooksTab(role === 'teacher' ? bk : null)}
                                        className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                    >
                                        {role === 'teacher' ? <Edit3 size={13} /> : <BookOpen size={13} />}
                                        <span>{role === 'teacher' ? 'Editar' : 'Ver libros'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Audio adjunto */}
            {!isEvaluation && task.audioUrl && (
                <div className="mt-2.5">
                    <AudioPlayer src={task.audioUrl} title="Audio adjunto" isDarkMode={isDarkMode} />
                </div>
            )}

            {/* Carrusel de Imágenes estilo Instagram (1 a 4 imágenes) */}
            {(task.imageUrls?.length > 0 || task.imageUrl) && (
                <div className="mt-3 w-full">
                    <ImageCarousel 
                        images={task.imageUrls?.length > 0 ? task.imageUrls : [task.imageUrl]} 
                        onImageClick={setLocalFullScreenImage} 
                        isDarkMode={isDarkMode} 
                    />
                </div>
            )}

            {/* Video adjunto (YouTube o Directo) - Se oculta en publicaciones de evaluaciones para evitar que los estudiantes vean el audio o hagan trampa antes de iniciar */}
            {!isEvaluation && task.videoUrl && (
                <div className="mt-3 rounded-2xl overflow-hidden shadow-sm">
                    <CustomVideoPlayer 
                        src={task.videoUrl} 
                        title={task.title || "Video"} 
                        isDarkMode={isDarkMode} 
                    />
                </div>
            )}

            {/* Actividad Interactiva Genially */}
            {!isEvaluation && task.geniallyUrl && (
                <div className="mt-3">
                    <GeniallyEmbedPlayer 
                        url={task.geniallyUrl} 
                        title={task.title || "Actividad Interactiva"} 
                        isDarkMode={isDarkMode} 
                    />
                </div>
            )}

            {/* Archivo adjunto o Video directo */}
            {!isBook3D && (task.fileUrl || task.pdfUrl) && (() => {
                const docUrl = task.fileUrl || task.pdfUrl;
                const cleanName = (task.fileName || '').trim().toLowerCase();
                const isPdfDoc = cleanName.endsWith('.pdf') || cleanName.includes('.pdf') || docUrl.toLowerCase().includes('.pdf') || docUrl.startsWith('data:application/pdf');
                if (isDirectVideoUrl(docUrl)) {
                    if (isEvaluation) return null;
                    return (
                        <div className="mt-3 rounded-2xl overflow-hidden shadow-sm">
                            <CustomVideoPlayer 
                                src={docUrl} 
                                title={task.fileName || task.title || "Video adjunto"} 
                                isDarkMode={isDarkMode} 
                            />
                        </div>
                    );
                }
                return (
                    <div 
                        onClick={() => setPreviewDoc({ url: docUrl, title: task.fileName || (isPdfDoc ? 'Documento PDF' : 'Documento adjunto') })}
                        className={`flex items-center justify-between gap-3 p-3 rounded-2xl border mt-3 w-fit max-w-full transition-all shadow-xs hover:border-blue-400 dark:hover:border-blue-500 hover:scale-[1.01] cursor-pointer select-none ${
                            isDarkMode ? 'bg-gray-800/90 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
                        }`}
                        title="Clic para abrir vista previa del documento"
                    >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-2xs">
                                <FileDocIcon size={22} className="text-[#AD3333] dark:text-red-400" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-black truncate max-w-[200px] sm:max-w-[320px]">
                                    {task.fileName || (isPdfDoc ? 'Documento PDF' : 'Documento adjunto')}
                                </span>
                                <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
                                    <span className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Ver documento</span>
                                    {isPdfDoc && (
                                        <>
                                            <span>•</span>
                                            <span className="text-gray-400">PDF</span>
                                        </>
                                    )}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <a 
                                href={docUrl} 
                                download={task.fileName || (isPdfDoc ? "documento.pdf" : "documento")}
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                title="Descargar archivo"
                            >
                                <Download size={15} />
                            </a>
                        </div>
                    </div>
                );
            })()}

            {/* Reacciones */}
            {renderReactions()}

            {/* Indicador de Entrega para Estudiante */}
            {role !== 'teacher' && isTask && (
                <div className="mt-3">
                    {myDelivery ? (
                        <div className={`px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs border ${
                            myDeliveryIsLate
                                ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                        }`}>
                            <div className="flex items-center gap-2 font-medium">
                                {myDeliveryIsLate ? (
                                    <Clock size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                ) : (
                                    <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                )}
                                <span className="font-bold">
                                    {myDeliveryIsLate ? "Entregado tarde" : "Entregado a tiempo"}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <button 
                            type="button"
                            onClick={() => setShowCommentModal(true)}
                            className="w-full py-2.5 px-4 rounded-xl bg-[#AD3333] hover:bg-[#932828] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                        >
                            <Upload size={14} className="text-white" />
                            <span>Entregar tarea</span>
                        </button>
                    )}
                </div>
            )}

            {/* Botón de Comentarios / Respuestas / Foros y Botón de Excel */}
            <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button 
                    onClick={() => setShowCommentModal(true)} 
                    className={`flex-1 py-2 px-3 bg-gray-50 dark:bg-gray-900/60 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700/70 shadow-xs rounded-xl text-xs font-bold transition-all flex justify-between items-center gap-2 text-gray-700 dark:text-gray-300`}
                >
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {isForum ? (
                            <MessageCircle size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : isPoll ? (
                            <BarChart2 size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                        ) : isTask ? (
                            <MessageSquareText size={15} className="text-[#AD3333] shrink-0" />
                        ) : (
                            <MessageSquareText size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        )}
                        <span>
                            {task.comments?.length > 0 
                                ? (isForum 
                                    ? `${task.comments.length} aporte${task.comments.length > 1 ? 's' : ''} en el foro` 
                                    : isTask 
                                        ? `${task.comments.length} comentario${task.comments.length > 1 ? 's' : ''} y entregas` 
                                        : `${task.comments.length} comentario${task.comments.length > 1 ? 's' : ''}`
                                  )
                                : (isForum 
                                    ? 'Participar en el foro de debate' 
                                    : isPoll 
                                        ? 'Comentar sobre la encuesta' 
                                        : isTask 
                                            ? (role === 'teacher' ? 'Ver entregas y comentarios' : 'Entregar tarea o comentar') 
                                            : 'Escribir un comentario'
                                  )
                            }
                        </span>

                        {role === 'teacher' && isTask && teacherDeliveryStats.pendingToGrade > 0 && (
                            <>
                                <span className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 self-center shrink-0" aria-hidden="true" />
                                <span 
                                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100/90 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 leading-none shrink-0"
                                    title={`${teacherDeliveryStats.pendingToGrade} ${teacherDeliveryStats.pendingToGrade === 1 ? 'entrega pendiente' : 'entregas pendientes'} por calificar`}
                                >
                                    {teacherDeliveryStats.pendingToGrade === 1 ? 'pendiente por calificar' : 'pendientes por calificar'}
                                </span>
                            </>
                        )}
                    </div>
                    <span className="text-[11px] text-blue-500 font-semibold hover:underline shrink-0">Ver conversación ▾</span>
                </button>

                {role === 'teacher' && isTask && (
                    <button 
                        type="button"
                        onClick={() => { exportTaskToExcel().catch((errExcel) => console.error('Error al exportar a Excel:', errExcel)); }}
                        className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                        title="Exportar planilla de calificaciones a Microsoft Excel (.xlsx)"
                    >
                        <Download size={14} className="text-white" />
                        <span>Convertir a Excel</span>
                    </button>
                )}
            </div>

            {/* MODAL DE COMENTARIOS / ENTREGAS / FOROS */}
            {showCommentModal && ReactDOM.createPortal(
                <div className={`fixed inset-0 z-[9999] flex justify-center items-end md:items-center bg-black/60 backdrop-blur-sm ${isModalExpanded ? 'p-0' : 'p-0 md:p-4'} transition-all ${isDarkMode ? 'dark' : ''}`}>
                    <div className={`w-full ${
                        isModalExpanded 
                            ? 'fixed inset-0 z-[9999] w-screen h-screen max-w-none rounded-none m-0 p-4 md:p-8' 
                            : 'max-w-2xl h-[90vh] md:h-[80vh] rounded-t-[2rem] md:rounded-3xl p-4 md:p-6'
                    } flex flex-col shadow-2xl transition-all duration-200 animate-in slide-in-from-bottom-6 fade-in overflow-hidden ${
                        isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
                    }`}>
                        
                        {/* Cabecera del modal */}
                        <div className={`flex justify-between items-center mb-3 border-b pb-3 shrink-0 gap-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                            <div className="min-w-0 flex-1">
                                <h3 className={`text-base sm:text-lg font-extrabold flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                    {isForum ? (
                                        <>
                                            <MessageCircle className="text-emerald-600 dark:text-emerald-400" size={20} />
                                            <span>Foro de debate</span>
                                        </>
                                    ) : isPoll ? (
                                        <>
                                            <BarChart2 className="text-indigo-600 dark:text-indigo-400" size={20} />
                                            <span>Comentarios de la encuesta</span>
                                        </>
                                    ) : isTask ? (
                                        <>
                                            <FileText className="text-[#AD3333]" size={20} />
                                            <span>Entregas y comentarios de la tarea</span>
                                        </>
                                    ) : (
                                        <>
                                            <MessageSquareText className="text-blue-600 dark:text-blue-400" size={20} />
                                            <span>Publicación completa y comentarios</span>
                                        </>
                                    )}
                                </h3>
                                <p className={`text-xs font-medium mt-0.5 truncate max-w-[200px] sm:max-w-md ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <LinkifyText text={task.title} isDarkMode={isDarkMode} embedVideos={false} />
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {role === 'teacher' && isTask && (
                                    <button 
                                        type="button"
                                        onClick={() => { exportTaskToExcel().catch((errExcel) => console.error('Error al exportar a Excel:', errExcel)); }} 
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                                        title="Exportar planilla de calificaciones a Excel (.xlsx)"
                                    >
                                        <Download size={13} className="text-white" />
                                        <span className="hidden sm:inline">Convertir a Excel</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleCopyPostLink}
                                    className={`p-2 rounded-xl transition-all shadow-xs cursor-pointer border ${
                                        isDarkMode 
                                            ? 'bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white border-gray-700' 
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border-gray-200'
                                    }`}
                                    title="Copiar enlace directo a esta publicación"
                                    aria-label="Copiar enlace directo a esta publicación"
                                >
                                    <Link2 size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowShareModal(true)}
                                    className={`p-2 rounded-xl transition-all shadow-xs cursor-pointer border ${
                                        isDarkMode 
                                            ? 'bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white border-gray-700' 
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border-gray-200'
                                    }`}
                                    title="Compartir publicación"
                                    aria-label="Compartir publicación"
                                >
                                    <Share2 size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleModalExpanded}
                                    className={`hidden md:inline-flex items-center justify-center p-2 rounded-xl transition-all shadow-xs cursor-pointer border ${
                                        isDarkMode 
                                            ? 'bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white border-gray-700' 
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border-gray-200'
                                    }`}
                                    title={isModalExpanded ? "Pantalla normal" : "Pantalla completa"}
                                    aria-label={isModalExpanded ? "Pantalla normal" : "Pantalla completa"}
                                >
                                    {isModalExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                                <button 
                                    onClick={handleCloseCommentModal} 
                                    className={`p-2 rounded-full transition-all shadow-xs ${
                                        isDarkMode ? 'text-gray-400 hover:text-red-400 bg-gray-800' : 'text-gray-500 hover:text-red-500 bg-gray-100'
                                    }`}
                                    title="Cerrar"
                                >
                                    <X size={18}/>
                                </button>
                            </div>
                        </div>

                        {/* Resumen de entregas y filtro para la docente dentro del modal */}
                        {role === 'teacher' && isTask && (
                            <div className="mb-3 px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                                    <FileText size={14} className="text-slate-500 shrink-0" />
                                    <span>
                                        {teacherDeliveryStats.totalReceived === 0
                                            ? "0 entregas recibidas"
                                            : `${teacherDeliveryStats.totalReceived} ${teacherDeliveryStats.totalReceived === 1 ? 'entrega recibida' : 'entregas recibidas'} • ${teacherDeliveryStats.pendingToGrade} ${teacherDeliveryStats.pendingToGrade === 1 ? 'pendiente' : 'pendientes'} de calificar`
                                        }
                                    </span>
                                </div>
                                {teacherDeliveryStats.totalReceived > 0 && (
                                    <button 
                                        type="button"
                                        onClick={() => setFilterOnlyUngraded(prev => !prev)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                            filterOnlyUngraded 
                                                ? 'bg-amber-600 text-white border-amber-600'
                                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        {filterOnlyUngraded ? "Mostrar todas" : "Ver solo pendientes"}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Contenedor desplazable que integra la Publicación Completa y los Comentarios */}
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 mb-3 scroll-smooth">
                            {/* Tarjeta de Publicación Completa */}
                            <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs ${
                                isDarkMode 
                                    ? 'bg-gray-800/70 border-gray-700 text-gray-100' 
                                    : 'bg-slate-50/80 border-gray-200 text-gray-800'
                            }`}>
                                <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-200/80 dark:border-gray-700/80 mb-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <button 
                                            type="button"
                                            onClick={() => handleOpenProfileByName(task.authorName, task.authorUsername || task.authorId)}
                                            className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 border-2 border-white dark:border-gray-700 overflow-hidden hover:scale-105 transition-transform bg-gradient-to-br from-[#AD3333] to-[#8a2828]"
                                        >
                                            {authorPhoto ? (
                                                <img loading="lazy" decoding="async" src={authorPhoto} alt={task.authorName || 'Autor'} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                            ) : (
                                                task.authorName ? task.authorName.charAt(0).toUpperCase() : 'G'
                                            )}
                                        </button>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <button 
                                                    type="button"
                                                    onClick={() => handleOpenProfileByName(task.authorName, task.authorUsername || task.authorId)}
                                                    className="font-extrabold text-sm hover:underline text-gray-900 dark:text-gray-100 text-left"
                                                >
                                                    {task.authorName || getTeacherDisplayName(getItemTeacherId(task))}
                                                </button>
                                                {task.targetGroupName && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                                        {task.targetGroupName}
                                                    </span>
                                                )}
                                            </div>
                                            {!task.hideDate && (
                                                <span className="text-[11px] text-gray-400 dark:text-gray-400 block mt-0.5">
                                                    {task.createdAt ? formatDateTime12H(task.createdAt) : 'Reciente'}
                                                    {task.dueDate && ` • Cierre: ${task.dueDate}${task.dueTime ? ` (${format12HourTime(task.dueTime)})` : ''}`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 leading-snug mb-2.5">
                                    <LinkifyText text={task.title} isDarkMode={isDarkMode} embedVideos={false} />
                                </h3>

                                {task.description && (
                                    <div className="mb-3 space-y-2">
                                        <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                            <LinkifyText text={showTranslated && translatedDescription ? translatedDescription : task.description} isDarkMode={isDarkMode} colapsable={false} embedVideos={!isEvaluation && !task.videoUrl && !task.imageUrl && !task.fileUrl && !task.audioUrl} />
                                        </div>
                                    </div>
                                )}

                                {(task.imageUrl || (task.images && task.images.length > 0)) && (
                                    <div className="my-3 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                        {task.images && task.images.length > 1 ? (
                                            <ImageCarousel images={task.images} isDarkMode={isDarkMode} onImageClick={(url) => setLocalFullScreenImage(url)} />
                                        ) : (
                                            <UniversalImage 
                                                src={task.imageUrl || task.images[0]} 
                                                alt={task.title} 
                                                onClick={() => setLocalFullScreenImage(task.imageUrl || task.images[0])}
                                                className="w-full max-h-[420px] object-contain bg-black/5 dark:bg-black/30 cursor-pointer" 
                                            />
                                        )}
                                    </div>
                                )}

                                {(task.fileUrl || (task.files && task.files.length > 0)) && (
                                    <div className="my-2.5 flex flex-wrap gap-2">
                                        {task.fileUrl && (
                                            <a 
                                                href={task.fileUrl} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 transition-colors"
                                            >
                                                <FileDocIcon size={14} className="text-blue-600 dark:text-blue-400" />
                                                <span className="truncate max-w-[200px]">{task.fileName || 'Descargar archivo'}</span>
                                                <Download size={13} className="shrink-0" />
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Barra de Reacciones en el Modal de Publicación Completa */}
                                <div className="pt-2 mt-2 border-t border-gray-200/80 dark:border-gray-700/80">
                                    {renderReactions(true)}
                                </div>
                            </div>

                            {/* Separador de Sección de Comentarios */}
                            <div className="flex items-center justify-between gap-2 pt-1 pb-1 border-b border-gray-200 dark:border-gray-800">
                                <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <MessageCircle size={14} className="text-blue-500" />
                                    Comentarios y Respuestas ({(task.comments || []).length})
                                </span>
                            </div>
                          {(() => {
                            const rawComments = task.comments || [];
                            const idMap = new Map();
                            const roots = [];
                            const childrenMap = new Map();

                            rawComments.forEach((c, idx) => {
                                const cid = c.id || `old-${idx}`;
                                idMap.set(cid, { ...c, _cid: cid });
                            });

                            rawComments.forEach((c, idx) => {
                                const cid = c.id || `old-${idx}`;
                                const parentId = c.replyTo?.id;

                                if (parentId && idMap.has(parentId) && parentId !== cid) {
                                    if (!childrenMap.has(parentId)) {
                                        childrenMap.set(parentId, []);
                                    }
                                    childrenMap.get(parentId).push({ ...c, _cid: cid });
                                } else {
                                    roots.push({ ...c, _cid: cid });
                                }
                            });

                            const renderCommentCard = (c, isReply = false) => {
                                const cid = c._cid || c.id; 
                                const authorDisplayName = resolveUserDisplayName(c, userMappings, c.author);
                                const authorDisplayNameLower = authorDisplayName.trim().toLowerCase();
                                const authorNameLower = (c.author || '').trim().toLowerCase();
                                const loggedInNameLower = (loggedInName || '').trim().toLowerCase();
                                const authorIdLower = (c.authorId || c.authorUsername || '').trim().toLowerCase();
                                const currentUserIdLower = (currentUserId || currentUser?.uid || '').trim().toLowerCase();
                                const isTeacherAuthor = c.authorRole === 'teacher' || c.role === 'teacher' || isTeacherId(authorIdLower) || authorIdLower === 'teacher_gina' || authorIdLower === 'teacher_camilo' || (c.author && (c.author.trim() === TEACHER_NAME || c.author.trim() === SECOND_TEACHER_NAME)) || authorNameLower === 'profesora' || authorNameLower === 'profesor' || authorNameLower === 'la profe' || authorNameLower === 'docente gina' || authorNameLower === 'profesora gina' || authorNameLower === 'docente camilo' || authorNameLower === 'profesor camilo';

                                const isOwner = (
                                    (loggedInNameLower && (authorNameLower === loggedInNameLower || authorDisplayNameLower === loggedInNameLower)) ||
                                    (currentUserIdLower && (authorIdLower === currentUserIdLower || (c.uid && currentUser?.uid && c.uid === currentUser.uid))) ||
                                    (role === 'teacher' && isTeacherAuthor)
                                );
                                const isEditing = editingCommentId === cid;
                                const isStudentAuthor = !isTeacherAuthor;
                                // Privacidad de entregas estricta SOLO para Tareas (los Foros son públicos para debate)
                                const isPrivateSubmission = isTask && isStudentAuthor && role !== 'teacher' && !isOwner;
                                
                                if (c.isDeleted) {
                                    if (role === 'teacher') {
                                        const wasRevealed = !!revealedComments[cid];
                                        return (
                                            <div key={cid} className={`p-3 rounded-2xl text-xs border transition-all ${isDarkMode ? 'bg-gray-800/60 border-red-900/40 text-gray-300' : 'bg-red-50/50 border-red-200/70 text-gray-800'}`}>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-gray-700 dark:text-gray-200">{authorDisplayName}</span>
                                                        <span className="italic text-gray-400 dark:text-gray-500">• Mensaje eliminado</span>
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setRevealedComments(prev => ({ ...prev, [cid]: !prev[cid] }))} 
                                                            className="font-bold text-[11px] text-blue-600 dark:text-blue-400 hover:underline px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40"
                                                        >
                                                            {wasRevealed ? "Ocultar" : "Ver qué decía"}
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => confirmAction("¿Deseas eliminar este comentario definitivamente?", () => handleDeleteComment(cid, c.author, true))} 
                                                            className="p-1 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors" 
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {wasRevealed && (
                                                    <div className="mt-2.5 pt-2 border-t border-gray-200/80 dark:border-gray-700/80 space-y-1.5 animate-in fade-in">
                                                        <span className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400 block">
                                                            Contenido original antes de ser eliminado:
                                                        </span>
                                                        {(c.originalText || c.text) && (
                                                            <div className={`text-xs leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                                <LinkifyText text={(() => {
                                                                    const isPlaceholder = (s) => (s || '').toLowerCase().includes('mensaje fue eliminado') || (s || '').toLowerCase().includes('mensaje eliminado') || (s || '').toLowerCase().includes('comentario eliminado');
                                                                    if (c.originalText && !isPlaceholder(c.originalText)) return c.originalText;
                                                                    if (c.editHistory && c.editHistory.length > 0) {
                                                                        const good = c.editHistory.find(h => h?.text && !isPlaceholder(h.text));
                                                                        if (good) return good.text;
                                                                    }
                                                                    if (c.text && !isPlaceholder(c.text)) return c.text;
                                                                    return c.originalText || c.text || '(Sin texto previo)';
                                                                })()} />
                                                            </div>
                                                        )}
                                                        {(c.originalImageUrls?.length > 0 || c.originalImageUrl) && (
                                                            <div className="mt-2 max-w-sm">
                                                                <ImageCarousel 
                                                                    images={c.originalImageUrls?.length > 0 ? c.originalImageUrls : [c.originalImageUrl]} 
                                                                    onImageClick={setLocalFullScreenImage} 
                                                                    isDarkMode={isDarkMode} 
                                                                    compact={true} 
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Para estudiantes: muestra "🚫 Mensaje eliminado"
                                    return (
                                        <div key={cid} className={`p-2.5 rounded-xl text-xs italic border flex items-center gap-1.5 ${isDarkMode ? 'bg-gray-800/30 border-gray-700/50 text-gray-500' : 'bg-gray-100/70 border-gray-200/60 text-gray-500'}`}>
                                            <span className="font-semibold">{authorDisplayName}:</span>
                                            <span>Mensaje eliminado</span>
                                        </div>
                                    );
                                }

                                // Vista de privacidad para otros estudiantes (Compañeros de clase en Tareas)
                                if (isPrivateSubmission) {
                                    const isLateC = Boolean(
                                        task.dueDate &&
                                        c.createdAt &&
                                        !isNaN(new Date(c.createdAt).getTime()) &&
                                        !isNaN(new Date(`${task.dueDate}T${task.dueTime || '23:59'}`).getTime()) &&
                                        new Date(c.createdAt) > new Date(`${task.dueDate}T${task.dueTime || '23:59'}`)
                                    );
                                    const subText = isLateC ? "Entregado tarde" : "Entregado a tiempo";

                                    return (
                                        <div key={cid} className={`p-3 rounded-2xl text-xs border shadow-xs transition-all ${
                                            isDarkMode ? 'bg-gray-800/60 border-gray-700/70' : 'bg-gray-50/80 border-gray-200/80'
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleOpenProfileByName(authorDisplayName, c.authorUsername || c.authorId)} className={`font-bold text-xs hover:underline text-left ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                                        {authorDisplayName}
                                                    </button>
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                        isLateC
                                                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                                                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                                    }`}>
                                                        {isLateC ? <Clock size={10} className="text-amber-600 dark:text-amber-400" /> : <CheckCircle2 size={10} className="text-emerald-600 dark:text-emerald-400" />}
                                                        <span>{subText}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-2 flex items-center gap-2 p-2.5 rounded-xl bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-700/60 text-gray-600 dark:text-gray-300 text-xs">
                                                <Lock size={13} className="text-gray-500 dark:text-gray-400 shrink-0" />
                                                <span className="font-semibold">{subText}</span>
                                            </div>
                                        </div>
                                    );
                                }

                                // Vista completa para la docente, foros públicos y autor de la entrega
                                return (
                                    <div key={cid} className={`rounded-2xl text-xs border shadow-2xs group/comment transition-all ${
                                        isReply 
                                            ? (isDarkMode ? 'p-2.5 sm:p-3 bg-gray-800/90 border-gray-700/70 hover:border-gray-600' : 'p-2.5 sm:p-3 bg-gray-50/90 border-gray-200/80 hover:bg-gray-100/70') 
                                            : (isDarkMode ? 'p-3.5 bg-gray-800/80 border-gray-700/80 hover:bg-gray-800' : 'p-3.5 bg-white border-gray-200/90 hover:bg-gray-50/70')
                                    }`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <button onClick={() => handleOpenProfileByName(authorDisplayName, c.authorUsername || c.authorId)} className={`font-bold text-xs hover:underline text-left ${isTeacherAuthor ? 'text-[#AD3333]' : (isDarkMode ? 'text-gray-100' : 'text-gray-800')}`}>
                                                    {authorDisplayName}
                                                </button>
                                                {isTask && isStudentAuthor && (() => {
                                                    const isLateC = Boolean(
                                                        task.dueDate &&
                                                        c.createdAt &&
                                                        !isNaN(new Date(c.createdAt).getTime()) &&
                                                        !isNaN(new Date(`${task.dueDate}T${task.dueTime || '23:59'}`).getTime()) &&
                                                        new Date(c.createdAt) > new Date(`${task.dueDate}T${task.dueTime || '23:59'}`)
                                                    );
                                                    const subText = isLateC ? "Entregado tarde" : "Entregado a tiempo";
                                                    return (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                            isLateC
                                                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                                                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                                        }`}>
                                                            {isLateC ? <Clock size={10} className="text-amber-600 dark:text-amber-400" /> : <CheckCircle2 size={10} className="text-emerald-600 dark:text-emerald-400" />}
                                                            <span>{subText}</span>
                                                        </span>
                                                    );
                                                })()}

                                                {/* Mención sutil y limpia en vez de bloque de cita gigante */}
                                                {isReply && c.replyTo?.author && (
                                                    <span className="text-[10.5px] text-gray-400 dark:text-gray-500 font-medium inline-flex items-center gap-0.5">
                                                        <span>respondió a</span>
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">@{String(resolveUserDisplayName(c.replyTo, userMappings, c.replyTo.author) || '').split(' ')[0]}</span>
                                                    </span>
                                                )}

                                                {c.isEdited && !isEditing && (
                                                    <span className="text-[10px] text-gray-400 italic">(editado)</span>
                                                )}
                                                {(!isTask || !isStudentAuthor) && c.createdAt && (
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        • {formatDateTime12H(c.createdAt)}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-1">
                                                {!isEditing && (
                                                    <button 
                                                        onClick={() => setReplyingTo(c)} 
                                                        className="p-1 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors flex items-center gap-1 text-[10.5px] font-semibold" 
                                                        title="Responder a este comentario"
                                                    >
                                                        <ReplyIcon size={13}/>
                                                        <span className="hidden sm:inline">Responder</span>
                                                    </button>
                                                )}
                                                {isOwner && !isEditing && (
                                                    <button onClick={() => {setEditingCommentId(cid); setEditCommentText(c.text);}} className="p-1 rounded-lg text-gray-400 hover:text-blue-500 transition-colors" title="Editar"><Edit3 size={13}/></button>
                                                )}
                                                {(role === 'teacher' || isOwner) && !isEditing && (
                                                    <button onClick={() => confirmAction("¿Desea borrar este comentario?", () => handleDeleteComment(cid, c.author))} className="p-1 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="Eliminar"><Trash2 size={13}/></button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Título del aporte (Foros principales) alineado y en MAYÚSCULAS */}
                                        {c.title && !isReply && (
                                            <div className="mt-1.5 pb-1 border-b border-emerald-500/20">
                                                <h5 className="font-extrabold text-xs uppercase tracking-wide text-emerald-800 dark:text-emerald-300 leading-snug">
                                                    {String(c.title || '').toUpperCase()}
                                                </h5>
                                            </div>
                                        )}

                                        {isEditing ? (
                                            <div className="mt-2 flex gap-1.5 items-center">
                                                <input className="py-1.5 px-2.5 text-xs flex-1 rounded-xl outline-none border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" value={editCommentText} onChange={e => setEditCommentText(e.target.value)} />
                                                <button onClick={saveEditedComment} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"><CheckCheck size={16}/></button>
                                                <button onClick={() => setEditingCommentId(null)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><X size={16}/></button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2 mt-1.5">
                                                {role === 'teacher' && revealedComments[`edit-${cid}`] && c.editHistory && c.editHistory.length > 0 && (
                                                    <div className="mb-2 p-2 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-[11px] text-gray-800 dark:text-gray-200 animate-in fade-in shadow-xs">
                                                        <span className="font-bold text-amber-700 dark:text-amber-400 block mb-0.5">Versión previa antes de editar:</span>
                                                        <p className="line-through opacity-90 whitespace-pre-wrap">{c.editHistory[0]?.text}</p>
                                                    </div>
                                                )}
                                                {c.text && <div className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{<LinkifyText text={c.text} />}</div>}
                                                {(() => {
                                                    const imgs = Array.isArray(c.imageUrls) && c.imageUrls.length > 0 ? c.imageUrls : (c.imageUrl ? [c.imageUrl] : []);
                                                    if (imgs.length === 0) return null;
                                                    return (
                                                        <div className="flex flex-wrap gap-2">
                                                            {imgs.map((imgSrc, imgIdx) => (
                                                                <UniversalImage 
                                                                    key={imgIdx} 
                                                                    src={imgSrc} 
                                                                    alt={`Adjunto ${imgIdx + 1}`} 
                                                                    onClick={() => setLocalFullScreenImage(imgSrc)} 
                                                                    className="w-24 h-24 rounded-xl border object-cover shadow-xs cursor-pointer hover:opacity-80 transition-opacity" 
                                                                />
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                                {c.audioUrl && <div className="mt-1"><AudioPlayer src={c.audioUrl} title="" isDarkMode={isDarkMode} compact={true} /></div>}
                                                {c.fileUrl && (
                                                    <div className="flex items-center gap-2 flex-wrap mt-1">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setPreviewDoc({ url: c.fileUrl, title: c.fileName || 'Documento adjunto' })}
                                                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left shadow-2xs hover:shadow-xs group/doc"
                                                            title="Clic para abrir vista previa"
                                                        >
                                                            <FileDocIcon size={18} className="text-[#AD3333] shrink-0" />
                                                            <span className="truncate max-w-[180px] text-gray-800 dark:text-gray-200 group-hover/doc:text-blue-600 dark:group-hover/doc:text-blue-400">{c.fileName || 'Documento adjunto'}</span>
                                                            <span className="ml-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">Abrir</span>
                                                        </button>
                                                        <a 
                                                            href={c.fileUrl} 
                                                            download={c.fileName || 'documento'} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-2xs"
                                                            title="Descargar archivo"
                                                        >
                                                            <Download size={15} />
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Visualización de Calificación Numérica (Docente en Tareas) */}
                                        {isTask && c.grade !== undefined && c.grade !== null && c.grade !== '' && (
                                            <div className="mt-2 flex items-center justify-between flex-wrap gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                                        <Star size={13} />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                                                            Nota: {!isNaN(Number(String(c.grade).replace(',', '.'))) ? Number(String(c.grade).replace(',', '.')).toFixed(1) : c.grade} / 5.0
                                                        </span>
                                                        {c.feedback && (
                                                            <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
                                                                {c.feedback}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {role === 'teacher' && (
                                                    <button 
                                                        onClick={() => { setGradingCid(cid); setGradeValue(c.grade !== undefined && c.grade !== null ? String(c.grade) : ""); setGradeFeedback(c.feedback || ""); }} 
                                                        className="p-1 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                                                        title="Modificar calificación"
                                                    >
                                                        <Edit3 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Módulo de Calificación In-line (Docente en Tareas) */}
                                        {role === 'teacher' && isTask && isStudentAuthor && (
                                            <div className="mt-2">
                                                {gradingCid === cid ? (
                                                    <div className="flex flex-col gap-2.5 p-3 rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm animate-in fade-in">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                                                <Star size={13} className="text-amber-500" /> Calificar a {authorDisplayName}
                                                            </span>
                                                            <button onClick={() => setGradingCid(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={14}/></button>
                                                        </div>

                                                        {/* Botones de calificación rápida */}
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase mr-1">Rápida:</span>
                                                            {['5.0', '4.5', '4.0', '3.5', '3.0', '2.0', '1.0'].map(score => (
                                                                <button
                                                                    key={score}
                                                                    type="button"
                                                                    onClick={() => setGradeValue(score)}
                                                                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all ${
                                                                        gradeValue === score 
                                                                            ? 'bg-emerald-600 text-white border-emerald-600' 
                                                                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                                                                    }`}
                                                                >
                                                                    {score}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400 shrink-0">Nota personalizada (0.0 - 5.0):</label>
                                                            <input 
                                                                type="number" 
                                                                min="0" 
                                                                max="5" 
                                                                step="0.1" 
                                                                value={gradeValue} 
                                                                onChange={e => setGradeValue(e.target.value)} 
                                                                className="w-20 py-1 px-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-center outline-none focus:ring-2 focus:ring-emerald-500/50" 
                                                                placeholder="5.0" 
                                                            />
                                                        </div>

                                                        <textarea 
                                                            value={gradeFeedback} 
                                                            onChange={e => setGradeFeedback(e.target.value)} 
                                                            placeholder="Retroalimentación pedagógica para el estudiante (opcional)..." 
                                                            className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs resize-none outline-none focus:ring-2 focus:ring-emerald-500/50" 
                                                            rows={2}
                                                        />

                                                        <div className="flex gap-2 justify-end">
                                                            <button 
                                                                type="button"
                                                                onClick={() => setGradingCid(null)} 
                                                                className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 px-3 py-1.5 rounded-xl transition"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={() => saveGradeComment(cid)} 
                                                                className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1"
                                                            >
                                                                <CheckCheck size={14} /> Guardar nota
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    (c.grade === undefined || c.grade === null || c.grade === '') && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => { setGradingCid(cid); setGradeValue(""); setGradeFeedback(""); }} 
                                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-700/80 px-3 py-1 rounded-xl transition shadow-2xs"
                                                        >
                                                            <Star size={13} className="text-amber-500" /> Calificar entrega
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        )}

                                        {/* Barra unificada e hipercompacta: Valorar (si es foro) + Reacciones estilo Slack/Discord */}
                                        <div className="mt-2 pt-1.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between flex-wrap gap-1.5">
                                            {/* Valoración por estrellas en Foros */}
                                            {isForum ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Valorar:</span>
                                                    <div className="flex items-center gap-0.5">
                                                        {[1, 2, 3, 4, 5].map(star => {
                                                            const rawUserRating = (c.ratings || {})[currentUserId];
                                                            const myRating = typeof rawUserRating === 'object' && rawUserRating !== null ? (rawUserRating.stars || 0) : (typeof rawUserRating === 'number' ? rawUserRating : 0);
                                                            const hoverVal = ratingHover[cid] || 0;
                                                            const isFilled = hoverVal ? star <= hoverVal : star <= myRating;
                                                            return (
                                                                <button
                                                                    key={star}
                                                                    type="button"
                                                                    onMouseEnter={() => setRatingHover(prev => ({ ...prev, [cid]: star }))}
                                                                    onMouseLeave={() => setRatingHover(prev => ({ ...prev, [cid]: 0 }))}
                                                                    onClick={() => handleRateForumComment(cid, star)}
                                                                    className={`p-0.5 transition-all duration-150 transform hover:scale-125 active:scale-90 ${
                                                                        isFilled ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]' : 'text-gray-300 dark:text-gray-600 hover:text-amber-300'
                                                                    }`}
                                                                    title={`Valorar con ${star} estrella${star > 1 ? 's' : ''}`}
                                                                >
                                                                    <Star size={13} fill={isFilled ? 'currentColor' : 'none'} />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Promedio y total de votos acumulativos */}
                                                    {(() => {
                                                        const ratingsObj = c.ratings || {};
                                                        const ratingValues = Object.values(ratingsObj).map(r => {
                                                            if (typeof r === 'object' && r !== null && typeof r.stars === 'number') return r.stars;
                                                            if (typeof r === 'number') return r;
                                                            const n = parseFloat(r);
                                                            return isNaN(n) ? null : n;
                                                        }).filter(v => v !== null && v >= 1 && v <= 5);

                                                        const count = ratingValues.length;
                                                        if (count === 0) return null;

                                                        const sum = ratingValues.reduce((acc, val) => acc + val, 0);
                                                        const avg = (sum / count).toFixed(1);

                                                        return (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[9.5px] font-bold">
                                                                <span className="text-amber-500">★</span>
                                                                <span>{avg}</span>
                                                                <span className="text-gray-400 text-[8.5px]">({count})</span>
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            ) : <div />}

                                            {/* Reacciones compactas estilo Slack/Discord en la misma línea */}
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {Object.entries(c.reactions || {}).reduce((acc, [uid, rData]) => {
                                                    const emoji = typeof rData === 'object' ? rData.emoji : rData;
                                                    let name = typeof rData === 'object' ? rData.name : 'Un usuario';
                                                    if (name === 'Profesora') name = TEACHER_NAME;
                                                    const hasUserReacted = uid === currentUserId || uid === currentUser?.uid;
                                                    const existing = acc.find(item => item.emoji === emoji);
                                                    if (existing) { 
                                                        existing.count++; 
                                                        existing.names.push(name); 
                                                        if (hasUserReacted) existing.hasReacted = true;
                                                    } else { 
                                                        acc.push({ emoji, count: 1, names: [name], hasReacted: hasUserReacted }); 
                                                    }
                                                    return acc;
                                                }, []).map((r, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => !isLocked && toggleCommentReaction(cid, r.emoji)}
                                                        title={`${r.names.join(', ')}`}
                                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-bold border transition-all duration-150 ${
                                                            r.hasReacted
                                                                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300 ring-1 ring-blue-400/30'
                                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                                                        } ${isLocked ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
                                                    >
                                                        <AppleEmoji emoji={r.emoji} size="14px" className="shrink-0" />
                                                        <span className="text-[9.5px]">{r.count}</span>
                                                    </button>
                                                ))}

                                                {/* Botón (+) compacto para añadir reacción */}
                                                {!isLocked && (
                                                    <div className="relative inline-flex items-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveReactionCommentId(activeReactionCommentId === cid ? null : cid)}
                                                            className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 transition-all"
                                                            title="Añadir reacción"
                                                        >
                                                            <Plus size={11} />
                                                        </button>
                                                        {activeReactionCommentId === cid && (
                                                            <div className="absolute bottom-full right-0 mb-1 z-30 flex items-center gap-1 rounded-full px-2 py-1 border shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95">
                                                                {['👍', '❤️', '🔥', '🎉', '😂', '😲'].map(emj => (
                                                                    <button
                                                                        key={emj}
                                                                        type="button"
                                                                        onClick={() => { toggleCommentReaction(cid, emj); setActiveReactionCommentId(null); }}
                                                                        className="hover:scale-130 transition-transform p-1 flex items-center justify-center cursor-pointer"
                                                                    >
                                                                        <AppleEmoji emoji={emj} size="18px" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            };

                            const displayedRoots = (filterOnlyUngraded && role === 'teacher' && isTask)
                                ? roots.filter(r => {
                                    if (r.isDeleted) return false;
                                    const authorLower = (r.author || '').trim().toLowerCase();
                                    const isTeacherAuthor = r.authorRole === 'teacher' || r.role === 'teacher' || isTeacherId(r.authorId) || isTeacherId(r.authorUsername) || isTeacherId(authorLower) || (r.author && (r.author.trim() === TEACHER_NAME || r.author.trim() === SECOND_TEACHER_NAME)) || authorLower === 'profesora' || authorLower === 'profesor' || authorLower === 'la profe' || authorLower === 'el profe' || authorLower === 'docente gina' || authorLower === 'profesora gina' || authorLower === 'docente camilo' || authorLower === 'profesor camilo';
                                    return !isTeacherAuthor && (r.grade === undefined || r.grade === null || r.grade === '');
                                })
                                : roots;

                            if (displayedRoots.length === 0) {
                                return (
                                    <p className="text-xs text-gray-400 italic text-center mt-8">
                                        {filterOnlyUngraded
                                            ? 'No hay entregas pendientes de calificar.'
                                            : (isForum ? 'No hay aportes en el foro aún. ¡Sé el primero en participar!' : 'No hay comentarios aún. ¡Escribe el primero!')
                                        }
                                    </p>
                                );
                            }

                            return displayedRoots.map((rootCmt) => (
                                <div key={rootCmt._cid} className="space-y-2">
                                    {renderCommentCard(rootCmt, false)}
                                    
                                    {/* Hilo anidado de respuestas directas (Estilo Reddit / Facebook) */}
                                    {childrenMap.has(rootCmt._cid) && (
                                        <div className="ml-3 sm:ml-6 pl-2.5 sm:pl-3.5 border-l-2 border-emerald-500/30 dark:border-emerald-500/30 space-y-2 mt-1.5">
                                            {childrenMap.get(rootCmt._cid).map((childCmt) => (
                                                <div key={childCmt._cid} className="space-y-2">
                                                    {renderCommentCard(childCmt, true)}

                                                    {/* Respuestas anidadas de 2do nivel */}
                                                    {childrenMap.has(childCmt._cid) && (
                                                        <div className="ml-2.5 sm:ml-5 pl-2 sm:pl-3 border-l-2 border-emerald-400/25 dark:border-emerald-400/20 space-y-2 mt-1">
                                                            {childrenMap.get(childCmt._cid).map(grandChild => (
                                                                renderCommentCard(grandChild, true)
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ));
                          })()}
                        </div>
                        
                        {/* Caja de nuevo comentario / entrega / aporte */}
                        {!isLocked ? (
                          <form onSubmit={handleAddComment} className={`pt-3 border-t flex flex-col gap-2 shrink-0 relative ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                            
                            {replyingTo && (
                                <div className={`flex justify-between items-center px-3 py-1.5 rounded-xl border-l-2 border-blue-500 text-xs ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-blue-50 text-gray-700'}`}>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-blue-500">Respondiendo a {resolveUserDisplayName(replyingTo, userMappings, replyingTo.author)}</span>
                                        <span className="truncate opacity-80 text-[10px]">{replyingTo.text || 'Archivo adjunto'}</span>
                                    </div>
                                    <button type="button" onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-red-500 p-0.5"><X size={14}/></button>
                                </div>
                            )}

                            {/* Campo de título adicional para Foros */}
                            {isForum && (
                                <input 
                                    value={commentTitle} 
                                    onChange={e => setCommentTitle(e.target.value)} 
                                    placeholder="Título o tema de tu aporte (opcional)..." 
                                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold border outline-none transition-all focus:ring-2 ${
                                        isDarkMode 
                                            ? 'bg-gray-800 border-gray-700 text-gray-100 focus:ring-emerald-500/50 placeholder-gray-500' 
                                            : 'bg-emerald-50/60 border-emerald-200 text-emerald-950 focus:ring-emerald-400/50 placeholder-emerald-800/50'
                                    }`} 
                                />
                            )}

                            {recCom && (
                                <div className="mb-1">
                                    <AudioRecordingVisualizer 
                                        recordingTime={recTimeCom} 
                                        onStop={stopCom} 
                                        onCancel={cancelCom} 
                                        isDarkMode={isDarkMode} 
                                    />
                                </div>
                            )}

                            <div className={`flex gap-1.5 items-center rounded-2xl px-2 py-1.5 border focus-within:ring-2 ${
                                isForum
                                    ? (isDarkMode ? 'bg-gray-800 border-gray-700 focus-within:ring-emerald-500/50' : 'bg-gray-50 border-gray-200 focus-within:ring-emerald-400/50')
                                    : (isDarkMode ? 'bg-gray-800 border-gray-700 focus-within:ring-blue-500/50' : 'bg-gray-50 border-gray-200 focus-within:ring-blue-400/50')
                            }`}>
                              <div className="relative" ref={emojiPickerRef}>
                                  <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                                      <SmileIcon size={18} />
                                  </button>
                                  {showEmojiPicker && (
                                      <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-2xl p-2 flex flex-wrap gap-1.5 w-48 z-[99999] animate-in fade-in zoom-in-95">
                                          {COMMENT_EMOJIS.map(emj => (
                                              <button key={emj} type="button" onClick={() => {setCommentText(prev => prev + emj); setShowEmojiPicker(false);}} className="p-1 hover:scale-125 transition-transform flex items-center justify-center cursor-pointer"><AppleEmoji emoji={emj} size="22px" /></button>
                                          ))}
                                      </div>
                                  )}
                              </div>

                              <button type="button" onClick={() => recCom ? stopCom() : startCom()} className={`p-1.5 transition-colors ${recCom ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-blue-500'}`} title={recCom ? 'Detener grabación' : 'Nota de voz'}>
                                  {recCom ? <Square size={16} /> : <Mic size={18} />}
                              </button>

                              <div className="relative" ref={attachmentMenuRef}>
                                  <button type="button" onClick={() => setShowAttachmentMenu(!showAttachmentMenu)} className={`p-1.5 transition-colors ${showAttachmentMenu ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`} title="Adjuntar">
                                      <Plus size={18} />
                                  </button>
                                  {showAttachmentMenu && (
                                      <div className="absolute bottom-full left-0 mb-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-2xl p-1.5 flex flex-col gap-1 z-[9999] animate-in fade-in zoom-in-95">
                                          <button type="button" onClick={() => { setShowCommentImageInput(!showCommentImageInput); setShowAttachmentMenu(false); }} className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 text-left">
                                              <ImageIcon size={15} /> URL imagen
                                          </button>
                                          <label className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-left">
                                              <ImageIcon size={15} /> Subir foto
                                              <input type="file" multiple accept="image/*,.heic,.heif,image/heic,image/heif" className="hidden" onChange={(e) => { handleLocalFileUpload(e); setShowAttachmentMenu(false); }} />
                                          </label>
                                          <button type="button" onClick={() => {
                                              window.openGifPicker?.((url) => {
                                                  setCommentImageUrls(prev => {
                                                      const base = (Array.isArray(prev) && prev.length > 0) ? prev : (commentImageUrl ? [commentImageUrl] : []);
                                                      const next = [...base, url].slice(0, 4);
                                                      setCommentImageUrl(next[0] || url);
                                                      return next;
                                                  });
                                              });
                                              setShowAttachmentMenu(false);
                                          }} className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 text-left">
                                              <span className="font-black border border-current px-1 rounded text-[8px]">GIF</span> GIF
                                          </button>
                                          <label className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-left">
                                              <PaperclipIcon size={15} /> Documento
                                              <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" className="hidden" onChange={(e) => { handleLocalFileUpload(e); setShowAttachmentMenu(false); }} />
                                          </label>
                                      </div>
                                  )}
                              </div>

                              <input 
                                  value={commentText} onChange={(e) => setCommentText(e.target.value)} 
                                  placeholder={
                                      isForum 
                                          ? "Escribe tu aporte o punto de vista..." 
                                          : isPoll
                                              ? "Escribe tu opinión sobre la encuesta..."
                                              : isTask && role !== 'teacher' 
                                                  ? "Escribe o adjunta tu entrega..." 
                                                  : "Escribe un comentario..."
                                  } 
                                  className="min-w-0 flex-1 bg-transparent border-none outline-none py-1.5 px-2 text-xs font-medium placeholder-gray-400" 
                              />
                              
                              {/* Botón de acción con texto dinámico según tipo */}
                              <button 
                                  type="submit" 
                                  disabled={isProcessing || (!commentText.trim() && !(commentImageUrls?.length > 0 || commentImageUrl) && !commentFileUrl && !audioCom && !commentTitle.trim())} 
                                  className={`py-2 px-3.5 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 font-bold text-xs shrink-0 text-white ${
                                      isForum 
                                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                                          : isPoll
                                              ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                                              : isTask && role !== 'teacher'
                                                  ? 'bg-[#AD3333] hover:bg-[#8a2828] shadow-red-700/20'
                                                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                                  }`}
                              >
                                  {isProcessing ? (
                                      <Loader2 className="animate-spin" size={15} />
                                  ) : isTask && role !== 'teacher' ? (
                                      <>
                                          <CheckCheck size={14} />
                                          <span className="hidden sm:inline">Enviar tarea</span>
                                          <span className="sm:hidden">Enviar</span>
                                      </>
                                  ) : isForum ? (
                                      <>
                                          <Send size={14} />
                                          <span className="hidden sm:inline">Publicar aporte</span>
                                          <span className="sm:hidden">Publicar</span>
                                      </>
                                  ) : (
                                      <>
                                          <Send size={14} />
                                          <span>Comentar</span>
                                      </>
                                  )}
                              </button>
                            </div>

                            {/* Previews de audio y adjuntos */}
                            {(audioCom || upCom) && (
                                <div className="flex items-center gap-2 pt-1">
                                    {upCom && <p className="text-[11px] text-gray-500 italic">Subiendo nota de voz...</p>}
                                    {audioCom && (
                                        <AudioPlayer 
                                            src={audioCom} 
                                            title="" 
                                            onDelete={cancelCom} 
                                            isDarkMode={isDarkMode} 
                                            compact={true} 
                                        />
                                    )}
                                </div>
                            )}
                            {((commentImageUrls && commentImageUrls.length > 0) || commentImageUrl || showCommentImageInput) && (
                                <div className="pt-1.5 space-y-1.5">
                                    {showCommentImageInput && (
                                        <input 
                                            value={commentImageUrl} onChange={e => {
                                                setCommentImageUrl(e.target.value);
                                                setCommentImageUrls(e.target.value ? [e.target.value] : []);
                                            }} 
                                            placeholder="URL directa de imagen (.jpg, .png, etc.)..." 
                                            className="w-full rounded-xl px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                        />
                                    )}
                                    {((commentImageUrls && commentImageUrls.length > 0) || commentImageUrl) && (
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {(commentImageUrls && commentImageUrls.length > 0 ? commentImageUrls : [commentImageUrl]).map((url, idx) => (
                                                <div key={idx} className="relative group/chip">
                                                    <UniversalImage src={url} alt={`Preview ${idx + 1}`} className="h-16 w-16 object-cover rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs" />
                                                    <span className="absolute bottom-0.5 left-0.5 bg-black/70 text-white text-[8px] font-bold px-1 rounded">
                                                        {idx + 1}
                                                    </span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            if (url) deleteFileFromStorage(url).catch(() => {});
                                                            const updated = (commentImageUrls && commentImageUrls.length > 0 ? commentImageUrls : [commentImageUrl]).filter((_, i) => i !== idx);
                                                            setCommentImageUrls(updated);
                                                            setCommentImageUrl(updated[0] || '');
                                                        }} 
                                                        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow-md hover:bg-red-700 transition cursor-pointer"
                                                        title="Eliminar imagen"
                                                    >
                                                        <X size={10}/>
                                                    </button>
                                                </div>
                                            ))}
                                            {(commentImageUrls && commentImageUrls.length > 0 ? commentImageUrls.length : (commentImageUrl ? 1 : 0)) < 4 && (
                                                <label className="h-16 w-16 border border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer text-gray-400 hover:text-blue-500 transition-colors" title="Añadir otra imagen (máximo 4)">
                                                    <Plus size={16} />
                                                    <span className="text-[9px] font-bold">{(commentImageUrls && commentImageUrls.length > 0 ? commentImageUrls.length : (commentImageUrl ? 1 : 0))}/4</span>
                                                    <input type="file" multiple accept="image/*,.heic,.heif,image/heic,image/heif" className="hidden" onChange={handleLocalFileUpload} />
                                                </label>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {role === 'teacher' && (
                              <div className="flex items-center gap-1.5 justify-start pt-1.5">
                                <button 
                                  type="button" 
                                  onClick={() => handleTranslate('Inglés')} 
                                  disabled={isProcessing} 
                                  className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                >
                                  {isProcessing ? <Loader2 size={11} className="animate-spin text-blue-500" /> : <span>🇺🇸</span>}
                                  <span>Traducir a inglés</span>
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => handleTranslate('Francés')} 
                                  disabled={isProcessing} 
                                  className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                >
                                  {isProcessing ? <Loader2 size={11} className="animate-spin text-blue-500" /> : <span>🇫🇷</span>}
                                  <span>Traducir a francés</span>
                                </button>
                              </div>
                            )}
                          </form>
                        ) : (
                          <p className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 dark:border-red-900/50 text-center">
                            Las entregas e interacciones para esta publicación están cerradas.
                          </p>
                        )}
                    </div>
                </div>
            , document.body)}

            {/* FULLSCREEN IMAGE MODAL */}
            {localFullScreenImage && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setLocalFullScreenImage(null)}>
                    <button className="absolute top-4 md:top-8 right-4 md:right-8 text-white/70 hover:text-white bg-black/50 hover:bg-red-600 p-2 rounded-full transition-all shadow-lg"><X size={28}/></button>
                    <UniversalImage src={localFullScreenImage} className="w-auto h-auto max-w-[95vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
                </div>
            , document.body)}

            {/* VISTA PREVIA INTEGRADA DE DOCUMENTOS (GOOGLE DRIVE STYLE) */}
            {previewDoc && (
                <DocumentPreviewModal 
                    documentUrl={previewDoc.url}
                    documentTitle={previewDoc.title}
                    onClose={() => setPreviewDoc(null)}
                    isDarkMode={isDarkMode}
                />
            )}

            {/* MODAL EN VIVO Y REPASO DE KAHOOT EN PANTALLA COMPLETA */}
            {showKahootLiveModal && isKahoot && (
                <KahootLiveModal
                    isOpen={showKahootLiveModal}
                    onClose={() => {
                        setShowKahootLiveModal(false);
                        setKahootModalStartInReview(false);
                    }}
                    task={task}
                    role={role}
                    currentUserId={currentUserId}
                    loggedInName={loggedInName}
                    isDemoMode={isDemoTask}
                    setTasks={setTasks}
                    db={db}
                    appId={appId}
                    showMessage={showMessage}
                    initialMode={kahootModalStartInReview ? 'review' : 'live'}
                />
            )}

            {/* VISOR INTERACTIVO DE DIAPOSITIVAS EN PANTALLA COMPLETA DESDE EL MURO */}
            {showSlidePresenter && effectiveLinkedReview && (
                <SlidePresenterViewer
                    presentation={effectiveLinkedReview}
                    onClose={() => setShowSlidePresenter(false)}
                    onEdit={role === 'teacher' && typeof onOpenReviewsTab === 'function' ? () => {
                        setShowSlidePresenter(false);
                        onOpenReviewsTab(effectiveLinkedReview);
                    } : undefined}
                    role={role}
                    themeMode={themeMode || (isDarkMode ? 'dark' : 'light')}
                />
            )}

            {/* VISOR INTERACTIVO DE LIBRO EN PANTALLA COMPLETA DESDE EL MURO */}
            {activeFlipbookModal && (
                <Flipbook3DModal
                    book={activeFlipbookModal.book}
                    initialPage={activeFlipbookModal.initialPage || 0}
                    onClose={() => setActiveFlipbookModal(null)}
                    isTeacher={role === 'teacher'}
                    onEditBook={role === 'teacher' && typeof onOpenBooksTab === 'function' ? (bk) => {
                        setActiveFlipbookModal(null);
                        onOpenBooksTab(bk);
                    } : null}
                    userId={myChatId || currentUser?.uid || currentUser?.email || loggedInName || currentUserId || role}
                />
            )}

            {/* MODAL DE VISTO POR ESTUDIANTES (EXCLUSIVO DOCENTES) */}
            {showViewsModal && role === 'teacher' && ReactDOM.createPortal(
                <div 
                    onClick={() => setShowViewsModal(false)}
                    className={`fixed inset-0 z-[99999] flex justify-center items-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150 ${isDarkMode ? 'dark' : ''}`}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md rounded-3xl p-5 sm:p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
                    >
                        {/* Cabecera */}
                        <div className="flex items-center justify-between pb-3.5 border-b border-gray-150 dark:border-gray-800 shrink-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                    <Eye size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm sm:text-base font-black text-gray-900 dark:text-gray-100 leading-tight">
                                        Visto por estudiantes
                                    </h4>
                                    <p className="text-[11.5px] font-semibold text-gray-500 dark:text-gray-400 truncate">
                                        {viewedStudents.length} {viewedStudents.length === 1 ? 'estudiante ha visto esta publicación' : 'estudiantes han visto esta publicación'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowViewsModal(false)}
                                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                                title="Cerrar"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Lista de estudiantes */}
                        <div className="flex-1 overflow-y-auto py-3 space-y-2 min-h-[140px] max-h-[50vh]">
                            {viewedStudents.length === 0 ? (
                                <div className="py-8 flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500">
                                    <EyeOff size={32} className="mb-2 opacity-50" />
                                    <p className="text-xs font-bold">Ningún estudiante ha visto esta publicación todavía.</p>
                                    <p className="text-[11px] opacity-75 mt-0.5">Aparecerán aquí automáticamente tan pronto como visualicen o abran la publicación en su muro.</p>
                                </div>
                            ) : (
                                viewedStudents.map((st, idx) => (
                                    <div
                                        key={st.id || idx}
                                        className="flex items-center justify-between gap-3 p-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/60 border border-gray-100 dark:border-gray-800/80 transition-all"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {st.avatar ? (
                                                <img
                                                    src={st.avatar}
                                                    alt={st.name}
                                                    className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                                    {(st.name || 'E').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">
                                                    {st.name}
                                                </p>
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                    {st.viewedAt ? formatDateTime12H(st.viewedAt) : 'Visto recientemente'}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 shrink-0">
                                            <CheckCheck size={11} /> Visto
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pie del modal */}
                        <div className="pt-3 border-t border-gray-150 dark:border-gray-800 flex justify-end shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowViewsModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL DE COMPARTIR PUBLICACIÓN (EN PERFIL, MENSAJE O COPIAR ENLACE) */}
            {showShareModal && ReactDOM.createPortal(
                <div 
                    className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setShowShareModal(false)}
                >
                    <div 
                        className={`max-w-md w-full rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 border relative animate-in zoom-in-95 duration-200 ${
                            isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                        }`}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Cabecera */}
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                                    <Share2 size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold leading-tight">Compartir publicación</h3>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Difunde este contenido en tu perfil o por mensaje</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowShareModal(false)} 
                                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Tarjeta previa de la publicación a compartir */}
                        <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-slate-50 border-gray-200'}`}>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                Publicación seleccionada
                            </span>
                            <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mt-0.5">
                                {task.title}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                Por {task.authorName || getTeacherDisplayName(getItemTeacherId(task))}
                            </p>
                        </div>

                        {/* Opciones de Compartir */}
                        <div className="space-y-3">
                            {/* 1. Compartir en mi perfil de estudiante / docente */}
                            <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50/70 border-gray-200'}`}>
                                <div className="flex items-center gap-2 mb-2 font-bold text-xs text-gray-800 dark:text-gray-200">
                                    <UserIcon size={14} className="text-emerald-500" />
                                    <span>Compartir en mi muro de perfil</span>
                                </div>
                                <textarea
                                    value={shareComment}
                                    onChange={(e) => setShareComment(e.target.value)}
                                    placeholder="¿Qué opinas sobre esta publicación? (opcional)..."
                                    rows={2}
                                    className={`w-full p-2.5 rounded-xl text-xs border outline-none resize-none transition-all ${
                                        isDarkMode 
                                            ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-emerald-500' 
                                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-emerald-500'
                                    }`}
                                />
                                <button
                                    type="button"
                                    disabled={isSharing}
                                    onClick={handleShareToProfile}
                                    className="mt-2 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {isSharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                                    <span>Publicar en mi perfil</span>
                                </button>
                            </div>

                            {/* 2. Enviar por mensaje directo o chat */}
                            <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50/70 border-gray-200'}`}>
                                <div className="flex items-center justify-between gap-2 mb-2 font-bold text-xs text-gray-800 dark:text-gray-200">
                                    <div className="flex items-center gap-2">
                                        <MessageSquareText size={14} className="text-blue-500" />
                                        <span>Compartir por mensaje</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-normal">Toca para enviar</span>
                                </div>
                                <input
                                    type="text"
                                    value={shareSearchTerm}
                                    onChange={(e) => setShareSearchTerm(e.target.value)}
                                    placeholder="Buscar contacto o grupo..."
                                    className={`w-full p-2 rounded-xl text-xs border outline-none mb-2 ${
                                        isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                    }`}
                                />
                                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                                    {shareRecipientsList.length === 0 ? (
                                        <p className="text-[11px] text-gray-400 text-center py-2">No se encontraron contactos</p>
                                    ) : (
                                        shareRecipientsList.map((rec) => (
                                            <button
                                                key={rec.id}
                                                type="button"
                                                onClick={() => handleShareViaMessage(rec)}
                                                className={`w-full p-2 rounded-xl flex items-center justify-between text-xs transition-colors text-left cursor-pointer ${
                                                    isDarkMode ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-100 text-gray-800'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                                        {rec.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-semibold truncate">{rec.name}</span>
                                                </div>
                                                <span className="text-[11px] font-bold text-blue-500 shrink-0 flex items-center gap-1">
                                                    Enviar <Send size={11} />
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* 3. Copiar enlace único */}
                            <button
                                type="button"
                                onClick={handleCopyPostLink}
                                className={`w-full py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    isDarkMode 
                                        ? 'bg-gray-800 hover:bg-gray-750 text-gray-200 border-gray-700' 
                                        : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300 shadow-2xs'
                                }`}
                            >
                                <Link2 size={14} className="text-blue-500" />
                                <span>Copiar enlace directo de esta publicación</span>
                            </button>
                        </div>
                    </div>
                </div>
            , document.body)}
        </div>
    );
});

export default TaskCard
