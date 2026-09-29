// src/components/TaskCard.jsx
import React, { useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import {
  CheckCheck, CheckCircle2, CheckLine, Clock, Edit3, EyeOff, FileDocIcon, FileText, ImageIcon, Loader2, Lock, MessageSquareText, Mic, PaperclipIcon, Plus, ReplyIcon, Send, SmileIcon, Square, Star, Pin, Trash2, Upload, X, XLine, Volume2, Languages, UserIcon, BookOpen, NavNotebook, Play, Pause, Download, MessageCircle, BarChart2, Vote
} from './Icons.jsx'
import {
  compressImage, containsBadWords, checkBadWordsAsync, uploadImageToStorage, uploadRawFileToStorage, TEACHER_NAME, COMMENT_EMOJIS, REACTION_EMOJIS, speakText, splitNameFirstAndLast, FALLBACK_MAP, format12HourTime, formatDateTime12H
} from '../utils/helpers.js'
import { glassCard, glassInput } from '../utils/styles.js'
import { useClickOutside } from '../utils/hooks.js'
import ImageCarousel from './ImageCarousel.jsx'
import LinkifyText from './LinkifyText.jsx'
import RichTextToolbar from './RichTextToolbar.jsx'
import RichVisualEditor from './RichVisualEditor.jsx'
import DocumentPreviewModal from './DocumentPreviewModal.jsx'
import CustomVideoPlayer, { isDirectVideoUrl } from './CustomVideoPlayer.jsx'
import GeniallyEmbedPlayer, { extractGeniallyUrl } from './GeniallyEmbedPlayer.jsx'
import { useVoiceRecorder } from '../utils/useVoiceRecorder.js'
import { auth, signInAnonymously, doc, setDoc, updateDoc, deleteDoc } from '../firebase/config.js'
import { runTransaction } from 'firebase/firestore'
import AudioPlayer, { AudioRecordingVisualizer } from './AudioPlayer.jsx'

const TaskCard = React.memo(({ task, role, db, appId, academicGroups, glassInput: propGlassInput, callGemini, currentUser, showMessage, loggedInName, isDarkMode, confirmAction, handleOpenProfileByName, userMappings }) => {
    const cardRef = React.useRef(null);
    const editTaskDescRef = React.useRef(null);
    const [isEditingTask, setIsEditingTask] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [editTaskData, setEditTaskData] = useState({ title: task?.title || '', description: task?.description || '', dueDate: task?.dueDate || '', dueTime: task?.dueTime || '', allowLate: task?.allowLate || false, geniallyUrl: task?.geniallyUrl || '', hideDate: !!task?.hideDate });

    const currentUserId = role === 'teacher' 
        ? 'teacher_gina' 
        : (currentUser?.uid ? `uid_${currentUser.uid}` : (loggedInName ? `name_${loggedInName.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'student_user'));
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

    if (!task) return null;

    const isTask = task?.type === 'task';
    const isForum = task?.type === 'forum';
    const isPoll = task?.type === 'poll' || Boolean(task?.poll);
    const isPost = task?.type === 'post' || (!isTask && !isForum && !isPoll);
    const isTaskType = isTask || isForum;

    const [filterOnlyUngraded, setFilterOnlyUngraded] = useState(false);

    // Identificación de la entrega del estudiante actual
    const myDelivery = React.useMemo(() => {
        if (!isTask || role === 'teacher') return null;
        const myName = (loggedInName || '').trim().toLowerCase();
        const myUid = (currentUser?.uid || '').trim().toLowerCase();
        const myUserKey = (currentUserId || '').trim().toLowerCase();
        const myEmailPrefix = (currentUser?.email ? currentUser.email.split('@')[0] : '').trim().toLowerCase();

        return (task.comments || []).find(c => {
            if (c.isDeleted) return false;
            const authorLower = (c.author || '').trim().toLowerCase();
            const authorIdLower = (c.authorId || '').trim().toLowerCase();
            const authorUsernameLower = (c.authorUsername || '').trim().toLowerCase();
            const cUidLower = (c.uid || '').trim().toLowerCase();

            return (myName && authorLower === myName) ||
                   (myUid && (authorIdLower === myUid || cUidLower === myUid)) ||
                   (myUserKey && (authorIdLower === myUserKey || authorUsernameLower === myUserKey)) ||
                   (myEmailPrefix && (authorUsernameLower === myEmailPrefix || authorLower === myEmailPrefix));
        });
    }, [isTask, role, loggedInName, currentUserId, currentUser, task.comments]);

    const myDeliveryIsLate = React.useMemo(() => {
        if (!myDelivery || !task.dueDate) return false;
        const parsedDue = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
        if (isNaN(parsedDue.getTime()) || !myDelivery.createdAt) return false;
        return new Date(myDelivery.createdAt) > parsedDue;
    }, [myDelivery, task.dueDate, task.dueTime]);

    // Contador de entregas y pendientes por calificar para la docente
    const teacherDeliveryStats = React.useMemo(() => {
        if (!isTask || role !== 'teacher') return { totalReceived: 0, pendingToGrade: 0 };
        const studentComments = (task.comments || []).filter(c => {
            if (c.isDeleted) return false;
            const authorLower = (c.author || '').trim().toLowerCase();
            const isTeacherAuthor = c.authorRole === 'teacher' || c.role === 'teacher' || c.authorId === 'teacher' || c.authorUsername === 'teacher' || authorLower === 'teacher' || (c.author && c.author.trim() === TEACHER_NAME) || authorLower === 'profesora' || authorLower === 'la profe' || authorLower === 'docente gina' || authorLower === 'profesora gina';
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
    }, [isTask, role, task.comments]);
    const parsedDeadline = task.dueDate ? new Date(`${task.dueDate}T${task.dueTime || '23:59'}`) : null;
        const deadline = parsedDeadline && !isNaN(parsedDeadline.getTime()) ? parsedDeadline : null;
    const isExpired = deadline ? new Date() > deadline : false;
    const isAllowLate = Boolean(task.allowLate === true || task.allowLate === 'true' || task.allowLate === 1 || task.allowLate === '1');
    // Para encuestas, si expiró la fecha de cierre, se bloquea la votación
    const isLocked = isPoll ? isExpired : (isTask ? (isExpired && !isAllowLate) : (isExpired && !isAllowLate));
    const [isVoting, setIsVoting] = useState(false);
    const [activeVotersOptionId, setActiveVotersOptionId] = useState(null);



    const handleVote = async (optionId) => {
        if (isLocked) {
            showMessage("ℹ️ La votación para esta encuesta ya ha finalizado.");
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
            if (!auth.currentUser) {
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
                ? ['teacher', 'teacher_gina', 'GinaDocente', currentUserId, currentUser?.uid].filter(Boolean)
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
                newReactions[currentUserId] = { type: type, name: loggedInName || (role === 'teacher' ? TEACHER_NAME : 'Estudiante'), timestamp: Date.now() };
            }

            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { reactions: newReactions });
        } catch (err) {
            console.error("Error al reaccionar:", err);
        }
    };

    const toggleForumRating = async (score) => {
        if (!currentUserId || currentUserId === 'undefined') return;
        try {
            if (!auth.currentUser) {
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
                ? ['teacher', 'teacher_gina', 'GinaDocente', currentUserId, currentUser?.uid].filter(Boolean)
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
                    name: loggedInName || (role === 'teacher' ? TEACHER_NAME : 'Estudiante'), 
                    timestamp: Date.now() 
                };
                showMessage(`⭐ ¡Puntaje asignado: ${score} estrella${score > 1 ? 's' : ''}!`);
            }

            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { 
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
            if (!auth.currentUser) {
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
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { comments: updatedComments });
        } catch (err) {
            console.error("Error al reaccionar comentario:", err);
        }
    };

    const saveGradeComment = async (cid, i) => {
        const grade = parseFloat(String(gradeValue).replace(',', '.'));
        if (isNaN(grade) || grade < 0 || grade > 5) return showMessage("Nota inválida (0-5).");
        try {
            if (!auth.currentUser) {
                try {
                    await signInAnonymously(auth);
                } catch (e) {}
            }
            const updatedComments = (task.comments || []).map((c, idx) => {
                const currentCid = c.id || `old-${idx}`;
                if (currentCid === cid) return { ...c, grade, feedback: gradeFeedback.trim() };
                return c;
            });
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { comments: updatedComments });
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
            if (!auth.currentUser) {
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
                        name: loggedInName || (role === 'teacher' ? TEACHER_NAME : 'Estudiante'),
                        role: role,
                        timestamp: Date.now()
                    };
                    return { ...c, ratings: currentRatings };
                }
                return c;
            });
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { comments: updatedComments });
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

        // Estudiantes registrados en el directorio
        Object.entries(userMappings || {}).forEach(([username, data]) => {
            if (data?.role !== 'teacher' && username !== 'teacher' && data?.fullName) {
                const cleanTaskGrp = String(task.targetGroupId || task.targetGroup || '').replace(/^acad_/i, '').trim().toLowerCase();
                const cleanStudentGrp1 = String(data.academicGroupId || '').replace(/^acad_/i, '').trim().toLowerCase();
                const cleanStudentGrp2 = String(data.group || '').replace(/^acad_/i, '').trim().toLowerCase();
                if (!cleanTaskGrp || cleanTaskGrp === 'all' || cleanTaskGrp === 'global' || (cleanStudentGrp1 && cleanStudentGrp1 === cleanTaskGrp) || (cleanStudentGrp2 && cleanStudentGrp2 === cleanTaskGrp)) {
                    allStudentsMap[data.fullName.trim()] = {
                        name: data.fullName.trim(),
                        username: username,
                        email: data.email || ''
                    };
                }
            }
        });

        // Incluir a cualquier estudiante que haya hecho entrega en los comentarios
        (task.comments || []).forEach(c => {
            if (c.author && c.author !== TEACHER_NAME && c.author !== 'Profesora' && c.author !== 'La profe' && !c.isDeleted) {
                if (!allStudentsMap[c.author.trim()]) {
                    allStudentsMap[c.author.trim()] = {
                        name: c.author.trim(),
                        username: '',
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

            const studentComments = (task.comments || []).filter(c => c.author?.trim() === st.name && !c.isDeleted);
            const lastSubmission = studentComments.length > 0 ? studentComments[studentComments.length - 1] : null;

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
                
                setTimeout(() => {
                    clone.style.opacity = '0';
                    clone.style.filter = 'blur(4px)';
                    clone.style.transform = `translateY(${targetY - 15}px) scale(0.95)`;
                    setTimeout(() => {
                        if (clone.parentNode) clone.parentNode.removeChild(clone);
                        if (cardRef.current) {
                            cardRef.current.style.opacity = '';
                            cardRef.current.style.filter = '';
                        }
                    }, 300);
                }, 680);
            }

            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { isPinned: nextPinned });
            showMessage(nextPinned ? "Publicación fijada al inicio del muro" : "Publicación desfijada");
        } catch (err) {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { ...task, isPinned: !task.isPinned }, { merge: true });
            showMessage(task.isPinned ? "Publicación desfijada" : "Publicación fijada al inicio del muro");
        }
    };

    // Resolver foto de perfil del autor de la publicación o tarea
    const resolveAuthorPhoto = () => {
        if (task.authorPhoto) return task.authorPhoto;
        if (task.authorId && userMappings?.[task.authorId]?.profilePicUrl) return userMappings[task.authorId].profilePicUrl;
        
        const authorNameLower = (task.authorName || '').trim().toLowerCase();
        const teacherNameLower = TEACHER_NAME.toLowerCase();
        
        if (!task.authorName || authorNameLower === teacherNameLower || authorNameLower.includes('gina') || authorNameLower.includes('profesora') || task.authorId === 'teacher' || (!task.authorId && role === 'teacher')) {
            return userMappings?.['teacher']?.profilePicUrl || FALLBACK_MAP?.['teacher']?.profilePicUrl || '';
        }
        
        const foundMapping = Object.values(userMappings || {}).find(u => (u.fullName || '').trim().toLowerCase() === authorNameLower);
        if (foundMapping?.profilePicUrl) return foundMapping.profilePicUrl;
        
        const foundFallback = Object.values(FALLBACK_MAP || {}).find(u => (u.name || '').trim().toLowerCase() === authorNameLower);
        if (foundFallback?.profilePicUrl) return foundFallback.profilePicUrl;
        
        return '';
    };
    const authorPhoto = resolveAuthorPhoto();

    const handleDeleteComment = async (commentId, authorName, forcePermanent = false) => {
        let updatedComments;
        const currentComments = task.comments || [];
        if (role === 'teacher' || forcePermanent) {
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
                        const good = c.editHistory.slice().reverse().find(h => h?.text && !isPlaceholder(h.text));
                        if (good) preservedText = good.text;
                    } else {
                        preservedText = c.originalText || c.text || '';
                    }

                    return {
                        ...c,
                        isDeleted: true,
                        deletedAt: Date.now(),
                        deletedBy: 'student',
                        originalText: preservedText,
                        originalMedia: c.originalMedia || c.media || null
                    };
                }
                return c;
            });
        }
        try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { comments: updatedComments });
        } catch (err) {
            console.error("Error al eliminar comentario:", err);
            showMessage("Hubo un error al eliminar el comentario.");
        }

    };

    const handleSaveEditedTask = async () => {
        if (!editTaskData.title.trim() || !editTaskData.description.trim()) return showMessage("El título y la descripción no pueden estar vacíos.");
        try {
            const updates = { 
                title: editTaskData.title.trim(), 
                description: editTaskData.description.trim(),
                geniallyUrl: editTaskData.geniallyUrl ? extractGeniallyUrl(editTaskData.geniallyUrl.trim()) : '',
                hideDate: Boolean(editTaskData.hideDate)
            };
            if (task.type !== 'post') { updates.dueDate = editTaskData.dueDate; updates.dueTime = editTaskData.dueTime; updates.allowLate = editTaskData.allowLate; }
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), updates);
            setIsEditingTask(false); showMessage("Publicación actualizada.");
        } catch (error) { showMessage("Hubo un error al actualizar."); }
    };

    const saveEditedComment = async () => {
        if (!editCommentText.trim()) return;
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
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { comments: updatedComments });
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
            const imageFiles = files.filter(f => f.type.startsWith('image/'));
            const docFiles = files.filter(f => !f.type.startsWith('image/'));

            if (imageFiles.length > 0) {
                const currentTotal = commentImageUrls.length;
                const remainingSlots = Math.max(0, 4 - currentTotal);
                if (imageFiles.length > remainingSlots && currentTotal > 0) {
                    showMessage(`Máximo 4 imágenes. Se añadirán ${remainingSlots} imagen(es).`);
                } else if (imageFiles.length > 4) {
                    showMessage("Puedes subir hasta un máximo de 4 imágenes.");
                }
                const filesToUpload = imageFiles.slice(0, remainingSlots > 0 ? remainingSlots : 4);
                const uploadedUrls = [];

                for (const file of filesToUpload) {
                    if (file.type !== 'image/gif') {
                        const compressed = await compressImage(file, 1200, 1200, 0.75);
                        const firebaseURL = await uploadImageToStorage(compressed, 'comments');
                        uploadedUrls.push(firebaseURL);
                    } else {
                        const firebaseURL = await uploadRawFileToStorage(file, 'comments');
                        uploadedUrls.push(firebaseURL);
                    }
                }

                setCommentImageUrls(prev => {
                    const combined = [...prev, ...uploadedUrls].slice(0, 4);
                    setCommentImageUrl(combined[0] || '');
                    return combined;
                });
            }

            if (docFiles.length > 0) {
                const docFile = docFiles[0];
                const firebaseURL = await uploadRawFileToStorage(docFile, 'comments');
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
            if (hasText && await checkBadWordsAsync(commentText)) { 
                showMessage("Comentario bloqueado: Lenguaje inapropiado."); 
                return; 
            }

            const newComment = { 
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5), 
                author: role === 'teacher' ? TEACHER_NAME : loggedInName, 
                authorUsername: role === 'teacher' ? 'teacher' : (currentUser?.email ? currentUser.email.split('@')[0] : (currentUserId || '')),
                authorId: role === 'teacher' ? 'teacher' : (currentUserId || currentUser?.uid || ''),
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
                replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text || '', author: replyingTo.author || '', imageUrl: replyingTo.imageUrl || '' } : null
            };
            
            const withTimeout = (promise, ms = 12000) => Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error("La conexión con el servidor tardó demasiado")), ms))
            ]);

            await withTimeout(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { comments: [...(task.comments || []), newComment] }));
            
            setCommentTitle(""); setCommentText(""); setCommentImageUrl(""); setCommentImageUrls([]); setCommentFileUrl(""); setCommentFileName(""); setAudioCom("");
            setShowCommentImageInput(false); setShowAttachmentMenu(false); setShowEmojiPicker(false); setReplyingTo(null);
            showMessage(isForum ? "Aporte publicado en el foro." : isTask && role !== 'teacher' ? "Tarea entregada con éxito." : "Comentario publicado.");
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
            ? ['teacher', 'teacher_gina', 'GinaDocente', currentUserId, currentUser?.uid].filter(Boolean)
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
            </div>
        );
    };

    const renderReactions = () => {
        if (isForum) {
            return renderForumStarRating();
        }

        const counts = { like: 0, love: 0, sad: 0, happy: 0, wow: 0 };
        const namesByType = { like: [], love: [], sad: [], happy: [], wow: [] };

        // Llaves válidas para identificar inequívocamente al usuario actual
        const myValidKeys = role === 'teacher' 
            ? ['teacher', 'teacher_gina', 'GinaDocente', currentUserId, currentUser?.uid].filter(Boolean)
            : [currentUserId, currentUser?.uid, loggedInName ? `name_${loggedInName.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : null].filter(Boolean);

        let mySelectedReactionType = null;

        if (task.reactions && typeof task.reactions === 'object') {
            Object.entries(task.reactions).forEach(([uidKey, r]) => {
                // Ignorar llaves inválidas o corruptas de versiones antiguas
                if (!uidKey || uidKey === 'undefined' || uidKey === 'null' || uidKey === 'type' || uidKey === 'count' || uidKey === 'name') return;

                const rType = typeof r === 'object' ? (r.type || r.emoji) : r;
                let rName = typeof r === 'object' ? r.name : 'Un usuario';
                if (rName === 'Profesora' || rName === 'La profe') rName = TEACHER_NAME;

                if (rType && counts[rType] !== undefined) {
                    counts[rType]++;
                    namesByType[rType].push(rName);

                    // Sólo marcar como seleccionada si esta reacción fue registrada explícitamente por el usuario en sesión
                    if (myValidKeys.includes(uidKey)) {
                        mySelectedReactionType = rType;
                    }
                }
            });
        }

        return (
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            {Object.entries(REACTION_EMOJIS).map(([key, emoji]) => {
              const isSelected = mySelectedReactionType === key;
              const hoverText = namesByType[key].length > 0 ? `${namesByType[key].join(', ')} reaccionó así` : "";
              return (
                <button 
                  key={key} 
                  type="button"
                  onClick={() => toggleReaction(key)} 
                  disabled={isLocked} 
                  title={hoverText} 
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all border ${
                    isSelected 
                      ? 'bg-red-50 dark:bg-red-900/30 border-red-400 text-red-600 dark:text-red-300 ring-2 ring-red-500/20 shadow-xs scale-105' 
                      : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span>{emoji}</span>
                  {counts[key] > 0 && <span className="font-semibold text-[11px]">{counts[key]}</span>}
                </button>
              );
            })}
          </div>
        );
    };

    return (
        <div ref={cardRef} className={`rounded-3xl border transition-all duration-300 p-4 sm:p-5 mb-4 shadow-xs hover:shadow-md relative overflow-hidden group ${
            isDarkMode 
                ? 'bg-gray-850 bg-gray-800/90 border-gray-700/80 text-gray-100' 
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
                            <img src={authorPhoto} alt={task.authorName || 'Autor'} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
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
                                {task.authorName || TEACHER_NAME}
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
                        </div>

                        {/* Acciones de docente (Editar, Fijar, Borrar) */}
                        {role === 'teacher' && (
                            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                                {isEditingTask ? (
                                    <>
                                        <button onClick={handleSaveEditedTask} className="p-1 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 hover:scale-110 transition-transform shadow-xs" title="Guardar cambios">
                                            <CheckLine size={16}/>
                                        </button>
                                        <button onClick={() => { setIsEditingTask(false); setEditTaskData({title: task.title, description: task.description, dueDate: task.dueDate || '', dueTime: task.dueTime || '', allowLate: task.allowLate || false, geniallyUrl: task.geniallyUrl || '', hideDate: !!task.hideDate}); }} className="p-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-red-500 hover:scale-110 transition-transform shadow-xs" title="Cancelar">
                                            <XLine size={16}/>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={togglePin} className={`p-1 rounded-lg transition-colors ${task.isPinned ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`} title={task.isPinned ? 'Desfijar' : 'Fijar'}>
                                            <Pin size={15} />
                                        </button>
                                        <button onClick={() => setIsEditingTask(true)} className="p-1 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Editar">
                                            <Edit3 size={15} />
                                        </button>
                                        <button onClick={() => confirmAction("¿Desea eliminar esta publicación definitivamente?", async () => {
                                            try {
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
                                <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700/80 shrink-0 whitespace-nowrap">
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
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded-md border shrink-0 whitespace-nowrap ${
                                    isExpired 
                                        ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400' 
                                        : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                                }`}>
                                    <Clock size={9} className="shrink-0" />
                                    <span>Cierre: {task.dueDate}{task.dueTime ? ` • ${format12HourTime(task.dueTime)}` : ''}</span>
                                    {isExpired && (
                                        <span className="font-bold text-[8px] uppercase ml-0.5 px-1 py-0.2 rounded bg-red-200/60 dark:bg-red-900/60 whitespace-nowrap">
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
                        {task.title} {isLocked && <Lock size={16} className="text-red-500 inline shrink-0 ml-1" />}
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
                                onClick={() => speakText(showTranslated && translatedDescription ? translatedDescription : task.description)} 
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" 
                                title="Escuchar pronunciación"
                            >
                                <Volume2 size={14} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Edición de Fecha Límite en modo edición */}
            {isTaskType && isEditingTask && (
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
                            <p className={`text-sm leading-relaxed whitespace-pre-wrap w-full ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                <LinkifyText text={translatedDescription} isDarkMode={isDarkMode} embedVideos={!task.videoUrl && !task.imageUrl && !task.fileUrl && !task.audioUrl} />
                            </p>
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
                            <p className={`text-sm leading-relaxed whitespace-pre-wrap w-full ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                <LinkifyText text={task.description} isDarkMode={isDarkMode} embedVideos={!task.videoUrl && !task.imageUrl && !task.fileUrl && !task.audioUrl} />
                            </p>
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
                                                            const isTeacher = uid === 'teacher' || uid === 'teacher_gina' || (typeof uid === 'string' && uid.startsWith('teacher'));
                                                            const studentName = isTeacher 
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

            {/* Audio adjunto */}
            {task.audioUrl && (
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

            {/* Video adjunto (YouTube o Directo) */}
            {task.videoUrl && (
                <div className="mt-3 rounded-2xl overflow-hidden shadow-sm">
                    <CustomVideoPlayer 
                        src={task.videoUrl} 
                        title={task.title || "Video"} 
                        isDarkMode={isDarkMode} 
                    />
                </div>
            )}

            {/* Actividad Interactiva Genially */}
            {task.geniallyUrl && (
                <div className="mt-3">
                    <GeniallyEmbedPlayer 
                        url={task.geniallyUrl} 
                        title={task.title || "Actividad Interactiva"} 
                        isDarkMode={isDarkMode} 
                    />
                </div>
            )}

            {/* Archivo adjunto o Video directo */}
            {task.fileUrl && (
                isDirectVideoUrl(task.fileUrl) ? (
                    <div className="mt-3 rounded-2xl overflow-hidden shadow-sm">
                        <CustomVideoPlayer 
                            src={task.fileUrl} 
                            title={task.fileName || task.title || "Video adjunto"} 
                            isDarkMode={isDarkMode} 
                        />
                    </div>
                ) : (
                    <div 
                        onClick={() => setPreviewDoc({ url: task.fileUrl, title: task.fileName || 'Documento adjunto' })}
                        className={`flex items-center gap-3.5 p-3 rounded-2xl border mt-3 w-fit max-w-full transition-all shadow-xs hover:scale-[1.01] cursor-pointer select-none ${
                            isDarkMode ? 'bg-gray-800/90 border-gray-700 hover:bg-gray-750 text-gray-100' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
                        }`}
                        title="Clic para abrir vista previa"
                    >
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-2xs">
                            <FileDocIcon size={22} className="text-[#AD3333] dark:text-red-400" />
                        </div>
                        <div className="flex flex-col min-w-0 pr-3">
                            <span className="text-xs font-black truncate max-w-[220px] sm:max-w-[320px]">
                                {task.fileName || (task.fileUrl.toLowerCase().includes('.pdf') ? 'Documento PDF' : 'Documento adjunto')}
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
                                <span className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Abrir</span>
                            </span>
                        </div>
                        <a 
                            href={task.fileUrl} 
                            download={task.fileName || "documento"}
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 shrink-0 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title="Descargar archivo"
                        >
                            <Download size={15} />
                        </a>
                    </div>
                )
            )}

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
                                    {myDeliveryIsLate ? "Tarea entregada -tarde-" : "Tarea entregada -a tiempo-"}
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

            {/* Contador de Entregas y Pendientes por Calificar para la Docente */}
            {role === 'teacher' && isTask && (
                <div className="mt-3 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2 font-medium">
                        <FileText size={14} className="text-slate-500 shrink-0" />
                        <span>
                            {teacherDeliveryStats.totalReceived === 0
                                ? "0 entregas recibidas"
                                : `${teacherDeliveryStats.totalReceived} ${teacherDeliveryStats.totalReceived === 1 ? 'entrega recibida' : 'entregas recibidas'} • ${teacherDeliveryStats.pendingToGrade} ${teacherDeliveryStats.pendingToGrade === 1 ? 'pendiente' : 'pendientes'} de calificar`
                            }
                        </span>
                    </div>
                    {teacherDeliveryStats.pendingToGrade > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                            Por calificar
                        </span>
                    )}
                </div>
            )}

            {/* Botón de Comentarios / Respuestas / Foros y Botón de Excel */}
            <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button 
                    onClick={() => setShowCommentModal(true)} 
                    className={`flex-1 py-2 px-3 bg-gray-50 dark:bg-gray-900/60 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700/70 shadow-xs rounded-xl text-xs font-bold transition-all flex justify-between items-center gap-2 text-gray-700 dark:text-gray-300`}
                >
                    <div className="flex items-center gap-2">
                        {isForum ? (
                            <MessageCircle size={15} className="text-emerald-600 dark:text-emerald-400" />
                        ) : isPoll ? (
                            <BarChart2 size={15} className="text-indigo-600 dark:text-indigo-400" />
                        ) : isTask ? (
                            <MessageSquareText size={15} className="text-[#AD3333]" />
                        ) : (
                            <MessageSquareText size={15} className="text-blue-600 dark:text-blue-400" />
                        )}
                        <span>
                            {task.comments?.length > 0 
                                ? (isForum 
                                    ? `${task.comments.length} aporte${task.comments.length > 1 ? 's' : ''} en el foro` 
                                    : isPoll 
                                        ? `${task.comments.length} comentario${task.comments.length > 1 ? 's' : ''}` 
                                        : `${task.comments.length} comentario${task.comments.length > 1 ? 's' : ''} y entregas`
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
                    </div>
                    <span className="text-[11px] text-blue-500 font-semibold hover:underline">Ver conversación ▾</span>
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
                <div className={`fixed inset-0 z-[9999] flex justify-center items-end md:items-center bg-black/60 backdrop-blur-sm p-0 md:p-4 transition-all ${isDarkMode ? 'dark' : ''}`}>
                    <div className={`w-full max-w-2xl h-[90vh] md:h-[80vh] flex flex-col p-4 md:p-6 rounded-t-[2rem] md:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-6 fade-in duration-200 overflow-hidden ${
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
                                            <span>Comentarios de la publicación</span>
                                        </>
                                    )}
                                </h3>
                                <p className={`text-xs font-medium mt-0.5 truncate max-w-[200px] sm:max-w-md ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {task.title}
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
                                    onClick={() => setShowCommentModal(false)} 
                                    className={`p-2 rounded-full transition-all shadow-xs ${
                                        isDarkMode ? 'text-gray-400 hover:text-red-400 bg-gray-800' : 'text-gray-500 hover:text-red-500 bg-gray-100'
                                    }`}
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

                        {/* Lista de comentarios y respuestas anidadas (Estilo Hilos Reddit/Facebook) */}
                        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 mb-3 scroll-smooth">
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
                                const authorNameLower = (c.author || '').trim().toLowerCase();
                                const loggedInNameLower = (loggedInName || '').trim().toLowerCase();
                                const authorIdLower = (c.authorId || c.authorUsername || '').trim().toLowerCase();
                                const currentUserIdLower = (currentUserId || currentUser?.uid || '').trim().toLowerCase();
                                const isTeacherAuthor = c.authorRole === 'teacher' || c.role === 'teacher' || authorIdLower === 'teacher' || authorIdLower === 'teacher_gina' || (c.author && c.author.trim() === TEACHER_NAME) || authorNameLower === 'profesora' || authorNameLower === 'la profe' || authorNameLower === 'docente gina' || authorNameLower === 'profesora gina';

                                const isOwner = (
                                    (loggedInNameLower && authorNameLower === loggedInNameLower) ||
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
                                            <div key={cid} className={`p-3 rounded-2xl text-xs border transition-all ${isDarkMode ? 'bg-gray-850/80 bg-gray-800/60 border-red-900/40 text-gray-300' : 'bg-red-50/50 border-red-200/70 text-gray-800'}`}>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-gray-700 dark:text-gray-200">{c.author}</span>
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
                                                            <p className={`text-xs leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                                <LinkifyText text={(() => {
                                                                    const isPlaceholder = (s) => (s || '').toLowerCase().includes('mensaje fue eliminado') || (s || '').toLowerCase().includes('mensaje eliminado') || (s || '').toLowerCase().includes('comentario eliminado');
                                                                    if (c.originalText && !isPlaceholder(c.originalText)) return c.originalText;
                                                                    if (c.editHistory && c.editHistory.length > 0) {
                                                                        const good = c.editHistory.slice().reverse().find(h => h?.text && !isPlaceholder(h.text));
                                                                        if (good) return good.text;
                                                                    }
                                                                    if (c.text && !isPlaceholder(c.text)) return c.text;
                                                                    return c.originalText || c.text || '(Sin texto previo)';
                                                                })()} />
                                                            </p>
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
                                            <span className="font-semibold">{c.author}:</span>
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
                                    const subText = isLateC ? "Tarea entregada -tarde-" : "Tarea entregada -a tiempo-";

                                    return (
                                        <div key={cid} className={`p-3 rounded-2xl text-xs border shadow-xs transition-all ${
                                            isDarkMode ? 'bg-gray-800/60 border-gray-700/70' : 'bg-gray-50/80 border-gray-200/80'
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleOpenProfileByName(c.author, c.authorUsername || c.authorId)} className={`font-bold text-xs hover:underline text-left ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                                        {c.author}
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
                                                <button onClick={() => handleOpenProfileByName(c.author, c.authorUsername || c.authorId)} className={`font-bold text-xs hover:underline text-left ${c.author === TEACHER_NAME || c.author === 'Profesora' ? 'text-[#AD3333]' : (isDarkMode ? 'text-gray-100' : 'text-gray-800')}`}>
                                                    {c.author}
                                                </button>
                                                {isTask && isStudentAuthor && (() => {
                                                    const isLateC = Boolean(
                                                        task.dueDate &&
                                                        c.createdAt &&
                                                        !isNaN(new Date(c.createdAt).getTime()) &&
                                                        !isNaN(new Date(`${task.dueDate}T${task.dueTime || '23:59'}`).getTime()) &&
                                                        new Date(c.createdAt) > new Date(`${task.dueDate}T${task.dueTime || '23:59'}`)
                                                    );
                                                    const subText = isLateC ? "Tarea entregada -tarde-" : "Tarea entregada -a tiempo-";
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
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">@{String(c.replyTo.author || '').split(' ')[0]}</span>
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
                                                {c.text && <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{<LinkifyText text={c.text} />}</p>}
                                                {c.imageUrl && <img src={c.imageUrl} loading="lazy" decoding="async" alt="Adjunto" onClick={() => setLocalFullScreenImage(c.imageUrl)} className="w-24 h-24 rounded-xl border object-cover shadow-xs cursor-pointer hover:opacity-80 transition-opacity" onError={(e) => e.target.style.display = 'none'} />}
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
                                                                <Star size={13} className="text-amber-500" /> Calificar a {c.author}
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
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[9.5px] font-bold">
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
                                                        <span>{r.emoji}</span>
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
                                                                        className="hover:scale-130 transition-transform p-0.5 text-xs"
                                                                    >
                                                                        {emj}
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
                                ? roots.filter(r => !r.isDeleted && (r.authorRole !== 'teacher' && r.authorId !== 'teacher') && (r.grade === undefined || r.grade === null || r.grade === ''))
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
                                        <span className="font-bold text-blue-500">Respondiendo a {replyingTo.author}</span>
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
                                              <button key={emj} type="button" onClick={() => {setCommentText(prev => prev + emj); setShowEmojiPicker(false);}} className="text-xl hover:scale-125 transition-transform">{emj}</button>
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
                                              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => { handleLocalFileUpload(e); setShowAttachmentMenu(false); }} />
                                          </label>
                                          <button type="button" onClick={() => { window.openGifPicker?.((url) => setCommentImageUrl(url)); setShowAttachmentMenu(false); }} className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 text-left">
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
                                  disabled={isProcessing || (!commentText.trim() && !commentImageUrl && !commentFileUrl && !audioCom && !commentTitle.trim())} 
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
                                                if (e.target.value) setCommentImageUrls([e.target.value]);
                                            }} 
                                            placeholder="URL directa de imagen (.jpg, .png, etc.)..." 
                                            className="w-full rounded-xl px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                        />
                                    )}
                                    {((commentImageUrls && commentImageUrls.length > 0) || commentImageUrl) && (
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {(commentImageUrls && commentImageUrls.length > 0 ? commentImageUrls : [commentImageUrl]).map((url, idx) => (
                                                <div key={idx} className="relative group/chip">
                                                    <img src={url} alt={`Preview ${idx + 1}`} loading="lazy" className="h-16 w-16 object-cover rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs" onError={(e) => e.target.style.display = 'none'} />
                                                    <span className="absolute bottom-0.5 left-0.5 bg-black/70 text-white text-[8px] font-bold px-1 rounded">
                                                        {idx + 1}
                                                    </span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
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
                                            {(commentImageUrls ? commentImageUrls.length : 1) < 4 && (
                                                <label className="h-16 w-16 border border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer text-gray-400 hover:text-blue-500 transition-colors" title="Añadir otra imagen (máximo 4)">
                                                    <Plus size={16} />
                                                    <span className="text-[9px] font-bold">{(commentImageUrls ? commentImageUrls.length : 1)}/4</span>
                                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleLocalFileUpload} />
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
                    <img src={localFullScreenImage} loading="lazy" className="w-auto h-auto max-w-[95vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
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
        </div>
    );
});

export default TaskCard
