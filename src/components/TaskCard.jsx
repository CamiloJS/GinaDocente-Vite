// src/components/TaskCard.jsx
import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import confetti from 'canvas-confetti'
import {
  CheckCheck, CheckLine, Clock, Edit3, FileDocIcon, FileText, ImageIcon, Loader2, Lock, MessageSquareText, Mic, PaperclipIcon, Plus, ReplyIcon, Send, SmileIcon, Square, Star, Pin, Trash2, X, XLine, Volume2, Languages, UserIcon, BookOpen, NavNotebook, Play, Pause
} from './Icons.jsx'
import {
  compressImage, containsBadWords, checkBadWordsAsync, uploadImageToStorage, uploadRawFileToStorage, TEACHER_NAME, COMMENT_EMOJIS, REACTION_EMOJIS, speakText
} from '../utils/helpers.js'
import { glassCard, glassInput } from '../utils/styles.js'
import { useClickOutside } from '../utils/hooks.js'
import LinkifyText from './LinkifyText.jsx'
import { useVoiceRecorder } from '../utils/useVoiceRecorder.js'
import { doc, setDoc, updateDoc, deleteDoc } from '../firebase/config.js'
import AudioPlayer, { AudioRecordingVisualizer } from './AudioPlayer.jsx'

const TaskCard = React.memo(({ task, role, db, appId, glassInput: propGlassInput, callGemini, currentUser, showMessage, loggedInName, isDarkMode, confirmAction, handleOpenProfileByName }) => {
    const [isEditingTask, setIsEditingTask] = useState(false);
    const [editTaskData, setEditTaskData] = useState({ title: task.title, description: task.description, dueDate: task.dueDate || '', dueTime: task.dueTime || '', allowLate: task.allowLate || false });
    const [commentText, setCommentText] = useState("");
    const [commentImageUrl, setCommentImageUrl] = useState("");
    const [commentFileUrl, setCommentFileUrl] = useState("");
    const [commentFileName, setCommentFileName] = useState("");
    const [showCommentImageInput, setShowCommentImageInput] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

    const handleTranslateText = async (text) => {
        showMessage("⏳ Traduciendo...");
        const result = await callGemini(`Traduce este texto al español de forma natural. Devuelve ÚNICAMENTE la traducción:\n\n${text}`);
        if (result) {
            alert(`🌐 Traducción:\n\n${result.replace(/```json/gi, '').replace(/```/gi, '').trim()}`);
        } else {
            showMessage("❌ No se pudo traducir.");
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
    const [fullScreenImage, setFullScreenImage] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [gradingCid, setGradingCid] = useState(null);
    const [gradeValue, setGradeValue] = useState("");
    const [gradeFeedback, setGradeFeedback] = useState("");

    const { isRecording: recCom, audioUrl: audioCom, isUploading: upCom, recordingTime: recTimeCom, setAudioUrl: setAudioCom, startRecording: startCom, stopRecording: stopCom, cancelRecording: cancelCom } = useVoiceRecorder('comments_audios', showMessage);
    const emojiPickerRef = React.useRef(null);
    const attachmentMenuRef = React.useRef(null);
    useClickOutside(emojiPickerRef, () => setShowEmojiPicker(false));
    useClickOutside(attachmentMenuRef, () => setShowAttachmentMenu(false));
    React.useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') {
                setShowEmojiPicker(false);
                setShowAttachmentMenu(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const isTaskType = task.type !== 'post';
    const deadline = task.dueDate ? new Date(`${task.dueDate}T${task.dueTime || '23:59'}`) : null;
    const isExpired = deadline ? new Date() > deadline : false;
    const isLocked = isTaskType && isExpired && !task.allowLate;

    const handleTranslate = async (lang) => {
        if (!commentText) return;
        setIsProcessing(true);
        const result = await callGemini(`Traduce el siguiente comentario al ${lang} de forma profesional y natural. Devuelve ÚNICAMENTE la traducción, sin explicaciones ni comillas:\n\n${commentText}`);
        if (result) setCommentText(result);
        setIsProcessing(false);
    };

    const toggleReaction = async (type) => {
        if (isLocked || !currentUser) return;
        const newReactions = { ...(task.reactions || {}) };
        const currentReactionData = newReactions[currentUser.uid];
        const currentType = typeof currentReactionData === 'object' ? currentReactionData.type : currentReactionData;
        if (currentType === type) delete newReactions[currentUser.uid];
        else newReactions[currentUser.uid] = { type: type, name: loggedInName };
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { ...task, reactions: newReactions });
    };

    const toggleCommentReaction = async (commentId, emoji) => {
        if (isLocked || !currentUser) return;
        const updatedComments = (task.comments || []).map((c, i) => {
            const currentCid = c.id || `old-${i}`; 
            if (currentCid === commentId) {
                const reactions = { ...(c.reactions || {}) };
                const currentReact = reactions[currentUser.uid];
                const currentEmoji = typeof currentReact === 'object' ? currentReact.emoji : currentReact;
                if (currentEmoji === emoji) delete reactions[currentUser.uid];
                else reactions[currentUser.uid] = { emoji: emoji, name: loggedInName };
                return { ...c, reactions };
            }
            return c; 
        });
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { ...task, comments: updatedComments });
    };

    const saveGradeComment = async (cid, i) => {
        const grade = parseFloat(gradeValue);
        if (isNaN(grade) || grade < 0 || grade > 5) return showMessage("Nota inválida (0-5).");
        const updatedComments = (task.comments || []).map((c, idx) => {
            const currentCid = c.id || `old-${idx}`;
            if (currentCid === cid) return { ...c, grade, feedback: gradeFeedback.trim() };
            return c;
        });
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { ...task, comments: updatedComments });
        setGradingCid(null); setGradeValue(""); setGradeFeedback("");
        showMessage("✅ Calificación guardada");
    };

    const togglePin = async () => {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { ...task, isPinned: !task.isPinned });
        showMessage(task.isPinned ? "Publicación desfijada" : "✅ Publicación fijada al inicio del muro");
    };

    const handleDeleteComment = async (commentId, authorName) => {
        let updatedComments;
        const currentComments = task.comments || [];
        if (role === 'teacher') updatedComments = currentComments.filter((c, i) => (c.id || `old-${i}`) !== commentId);
        else updatedComments = currentComments.map((c, i) => (c.id || `old-${i}`) === commentId ? { ...c, isDeleted: true } : c);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { ...task, comments: updatedComments });
    };

    const handleSaveEditedTask = async () => {
        if (!editTaskData.title.trim() || !editTaskData.description.trim()) return showMessage("El título y la descripción no pueden estar vacíos.");
        try {
            const updates = { title: editTaskData.title.trim(), description: editTaskData.description.trim() };
            if (task.type !== 'post') { updates.dueDate = editTaskData.dueDate; updates.dueTime = editTaskData.dueTime; updates.allowLate = editTaskData.allowLate; }
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), updates);
            setIsEditingTask(false); showMessage("✅ Publicación actualizada.");
        } catch (error) { showMessage("Hubo un error al actualizar."); }
    };

    const saveEditedComment = async () => {
        if (!editCommentText.trim()) return;
        const currentComments = task.comments || [];
        const updatedComments = currentComments.map((c, i) => {
            const cid = c.id || `old-${i}`;
            if (cid === editingCommentId) {
                const history = c.editHistory || [];
                return { ...c, text: editCommentText.trim(), isEdited: true, editHistory: [{ text: c.text, date: Date.now() }, ...history] };
            }
            return c;
        });
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { ...task, comments: updatedComments });
        setEditingCommentId(null);
    };

    const handleLocalFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            setIsProcessing(true);
            if (file.type.startsWith('image/') && file.type !== 'image/gif') {
                const compressed = await compressImage(file, 800, 800, 0.6);
                setCommentImageUrl(await uploadImageToStorage(compressed, 'comments'));
            } else {
                const firebaseURL = await uploadRawFileToStorage(file, 'comments');
                if (file.type.startsWith('image/')) setCommentImageUrl(firebaseURL);
                else { setCommentFileUrl(firebaseURL); setCommentFileName(file.name); }
            }
            setIsProcessing(false);
        } catch (error) { showMessage("Hubo un error al subir el archivo."); setIsProcessing(false); }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if(!commentText.trim() && !commentImageUrl && !commentFileUrl && !audioCom) return;
        setIsProcessing(true);
        if (commentText.trim() && await checkBadWordsAsync(commentText)) { showMessage("⚠️ Comentario bloqueado: Lenguaje inapropiado."); setIsProcessing(false); return; }

        const newComment = { 
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5), 
            author: role === 'teacher' ? TEACHER_NAME : loggedInName, 
            text: commentText.trim(), imageUrl: commentImageUrl.trim(), fileUrl: commentFileUrl, fileName: commentFileName, audioUrl: audioCom, isDeleted: false, reactions: {},
            replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text || '', author: replyingTo.author || '', imageUrl: replyingTo.imageUrl || '' } : null
        };
        
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { ...task, comments: [...(task.comments || []), newComment] });
        
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setCommentText(""); setCommentImageUrl(""); setCommentFileUrl(""); setCommentFileName(""); setAudioCom("");
        setShowCommentImageInput(false); setShowAttachmentMenu(false); setShowEmojiPicker(false); setReplyingTo(null); setIsProcessing(false);
    };

    const renderReactions = () => {
        const counts = { like: 0, love: 0, sad: 0, happy: 0, wow: 0 };
        const namesByType = { like: [], love: [], sad: [], happy: [], wow: [] };
        Object.values(task.reactions || {}).forEach(r => { 
            const rType = typeof r === 'object' ? r.type : r;
            let rName = typeof r === 'object' ? r.name : 'Un usuario';
            if (rName === 'Profesora' || rName === 'La profe') rName = TEACHER_NAME;
            if (counts[rType] !== undefined) { counts[rType]++; namesByType[rType].push(rName); } 
        });
        return (
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            {Object.entries(REACTION_EMOJIS).map(([key, emoji]) => {
              const rData = task.reactions?.[currentUser?.uid];
              const isSelected = (typeof rData === 'object' ? rData.type : rData) === key;
              const hoverText = namesByType[key].length > 0 ? `${namesByType[key].join(', ')} reaccionó así` : "";
              return (
                <button 
                  key={key} 
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
        <div className={`rounded-3xl border transition-all duration-200 p-4 sm:p-5 mb-4 shadow-xs hover:shadow-md ${
            isDarkMode 
                ? 'bg-gray-850 bg-gray-800/90 border-gray-700/80 text-gray-100' 
                : 'bg-white border-gray-200/90 text-gray-800'
        } ${task.isPinned ? 'ring-2 ring-amber-400/60 dark:ring-amber-500/50 border-amber-300 dark:border-amber-600' : ''}`}>
            
            {/* Header: Autor, Badges y Acciones */}
            <div className="flex justify-between items-start gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <button 
                        onClick={() => handleOpenProfileByName(task.authorName)} 
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-[#AD3333] to-[#8a2828] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 border border-white/20 hover:scale-105 transition-transform"
                    >
                        {task.authorName ? task.authorName.charAt(0) : 'G'}
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <button 
                                onClick={() => handleOpenProfileByName(task.authorName)} 
                                className="font-bold text-sm hover:underline truncate text-left text-gray-900 dark:text-gray-100 leading-tight"
                            >
                                {task.authorName || TEACHER_NAME}
                            </button>
                            
                            {/* Badges */}
                            {isTaskType ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/50 text-[#AD3333] dark:text-red-400 border border-red-200 dark:border-red-800/60">
                                    <NavNotebook size={11} /> Tarea
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                                    <BookOpen size={11} /> Publicación
                                </span>
                            )}

                            {task.isPinned && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                                    <Pin size={10} /> Fijado
                                </span>
                            )}
                        </div>

                        {/* Fecha de creación o fecha límite */}
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                            {task.createdAt ? new Date(task.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                        </p>
                    </div>
                </div>

                {/* Acciones de docente (Editar, Fijar, Borrar) */}
                {role === 'teacher' && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        {isEditingTask ? (
                            <>
                                <button onClick={handleSaveEditedTask} className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 hover:scale-110 transition-transform shadow-xs" title="Guardar cambios">
                                    <CheckLine size={18}/>
                                </button>
                                <button onClick={() => { setIsEditingTask(false); setEditTaskData({title: task.title, description: task.description, dueDate: task.dueDate || '', dueTime: task.dueTime || '', allowLate: task.allowLate || false}); }} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-red-500 hover:scale-110 transition-transform shadow-xs" title="Cancelar">
                                    <XLine size={18}/>
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={togglePin} className={`p-1.5 rounded-lg transition-colors ${task.isPinned ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`} title={task.isPinned ? 'Desfijar' : 'Fijar'}>
                                    <Pin size={16} />
                                </button>
                                <button onClick={() => setIsEditingTask(true)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Editar">
                                    <Edit3 size={16} />
                                </button>
                                <button onClick={() => confirmAction("¿Desea eliminar esta publicación definitivamente?", () => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id)))} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Eliminar">
                                    <Trash2 size={16} />
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Título de la Tarea / Publicación */}
            {isEditingTask ? (
                <input 
                    value={editTaskData.title} 
                    onChange={e => setEditTaskData({...editTaskData, title: e.target.value})} 
                    className="w-full text-base font-bold mb-2 p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Título de la publicación..." 
                />
            ) : (
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug mb-1.5 flex items-center gap-2">
                    {task.title} {isLocked && <Lock size={16} className="text-red-500 shrink-0" />}
                </h3>
            )}

            {/* Badge de Fecha Límite si es Tarea */}
            {isTaskType && (
                isEditingTask ? (
                    <div className="flex flex-wrap gap-2 mb-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 items-center text-xs">
                        <input type="date" value={editTaskData.dueDate} onChange={e => setEditTaskData({...editTaskData, dueDate: e.target.value})} className="py-1 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs" />
                        <input type="time" value={editTaskData.dueTime} onChange={e => setEditTaskData({...editTaskData, dueTime: e.target.value})} className="py-1 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs" />
                        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-700 dark:text-gray-300 ml-1">
                            <input type="checkbox" checked={editTaskData.allowLate} onChange={e => setEditTaskData({...editTaskData, allowLate: e.target.checked})} className="w-3.5 h-3.5 accent-[#AD3333]" />
                            Entregas tardías
                        </label>
                    </div>
                ) : (
                    <div className="mb-2.5 flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-xl border ${
                            isExpired 
                                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400' 
                                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                        }`}>
                            <Clock size={13} />
                            <span>Vence: {task.dueDate} • {task.dueTime || '23:59'}</span>
                            {isExpired && (
                                <span className="font-bold text-[10px] uppercase ml-1 px-1.5 py-0.2 rounded bg-red-200/50 dark:bg-red-900/60">
                                    {task.allowLate ? 'Tardía permitida' : 'Cerrado'}
                                </span>
                            )}
                        </span>
                    </div>
                )
            )}

            {/* Descripción / Contenido */}
            {isEditingTask ? (
                <textarea 
                    value={editTaskData.description} 
                    onChange={e => setEditTaskData({...editTaskData, description: e.target.value})} 
                    className="w-full min-h-[100px] resize-y p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Descripción..."
                />
            ) : (
                <div className="relative group/desc my-2">
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        <LinkifyText text={task.description} />
                    </p>
                    <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover/desc:opacity-100 transition-opacity">
                        <button onClick={() => handleTranslateText(task.description)} className="p-1 rounded-md text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Traducir">
                            <Languages size={14} />
                        </button>
                        <button onClick={() => speakText(task.description)} className="p-1 rounded-md text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Escuchar">
                            <Volume2 size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Audio adjunto */}
            {task.audioUrl && (
                <div className="mt-2.5">
                    <AudioPlayer src={task.audioUrl} title="Audio adjunto" isDarkMode={isDarkMode} />
                </div>
            )}

            {/* Imagen adjunta */}
            {task.imageUrl && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-700/80 shadow-xs max-w-full bg-gray-50 dark:bg-gray-900">
                    <img 
                        src={task.imageUrl} 
                        loading="lazy" 
                        decoding="async" 
                        alt="Adjunto de publicación" 
                        onClick={() => setFullScreenImage(task.imageUrl)} 
                        className="w-full h-auto max-h-96 object-contain cursor-pointer hover:opacity-95 transition-opacity" 
                        onError={(e) => e.target.style.display = 'none'} 
                    />
                </div>
            )}

            {/* Archivo adjunto */}
            {task.fileUrl && (
                <a 
                    href={task.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`flex items-center gap-3 p-3 rounded-2xl border mt-3 w-fit max-w-full transition-all shadow-xs ${
                        isDarkMode ? 'bg-gray-900/80 border-gray-700 hover:bg-gray-800' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                >
                    <div className="p-2 bg-red-100 dark:bg-red-950/60 rounded-xl shrink-0">
                        <FileDocIcon size={22} className="text-[#AD3333]" />
                    </div>
                    <div className="flex flex-col min-w-0 pr-2">
                        <span className={`text-xs font-bold truncate max-w-[220px] md:max-w-[320px] ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {task.fileName || 'Documento adjunto'}
                        </span>
                        <span className="text-[10px] text-gray-500">Clic para abrir o descargar</span>
                    </div>
                </a>
            )}

            {/* Reacciones */}
            {renderReactions()}

            {/* Botón de Comentarios y Respuestas */}
            <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60">
                <button 
                    onClick={() => setShowCommentModal(true)} 
                    className={`w-full py-2 px-3 bg-gray-50 dark:bg-gray-900/60 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700/70 shadow-xs rounded-xl text-xs font-bold transition-all flex justify-between items-center gap-2 text-gray-700 dark:text-gray-300`}
                >
                    <div className="flex items-center gap-2">
                        <MessageSquareText size={15} className="text-[#AD3333]" />
                        <span>{task.comments?.length > 0 ? `${task.comments.length} comentarios y entregas` : 'Comentar o enviar entrega'}</span>
                    </div>
                    <span className="text-[11px] text-blue-500 font-semibold hover:underline">Ver conversación ▾</span>
                </button>
            </div>

            {/* MODAL DE COMENTARIOS / ENTREGAS */}
            {showCommentModal && ReactDOM.createPortal(
                <div className={`fixed inset-0 z-[9999] flex justify-center items-end md:items-center bg-black/60 backdrop-blur-sm p-0 md:p-4 transition-all ${isDarkMode ? 'dark' : ''}`}>
                    <div className={`w-full max-w-2xl h-[90vh] md:h-[80vh] flex flex-col p-4 md:p-6 rounded-t-[2rem] md:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-6 fade-in duration-200 overflow-hidden ${
                        isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
                    }`}>
                        
                        {/* Cabecera del modal */}
                        <div className={`flex justify-between items-center mb-3 border-b pb-3 shrink-0 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                            <div>
                                <h3 className={`text-lg font-extrabold flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                    <FileText className="text-[#AD3333]" size={20} /> Comentarios y entregas
                                </h3>
                                <p className={`text-xs font-medium mt-0.5 truncate max-w-[240px] md:max-w-md ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {task.title}
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowCommentModal(false)} 
                                className={`p-2 rounded-full transition-all shadow-xs ${
                                    isDarkMode ? 'text-gray-400 hover:text-red-400 bg-gray-800' : 'text-gray-500 hover:text-red-500 bg-gray-100'
                                }`}
                            >
                                <X size={18}/>
                            </button>
                        </div>

                        {/* Lista de comentarios */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 mb-3 scroll-smooth">
                          {task.comments?.map((c, i) => {
                            const cid = c.id || `old-${i}`; 
                            const isOwner = c.author === loggedInName || (role === 'teacher' && (c.author === TEACHER_NAME || c.author === 'Profesora' || c.author === 'La profe'));
                            const isEditing = editingCommentId === cid;
                            
                            if (c.isDeleted) {
                                if (role === 'teacher' || isOwner) {
                                    return (
                                        <div key={cid} className={`p-2.5 rounded-xl text-xs italic border flex flex-col gap-1.5 ${isDarkMode ? 'bg-gray-800/50 border-gray-700 text-gray-500' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                                            <div className="flex justify-between items-center">
                                                <span>{c.author} eliminó este comentario.</span>
                                                {role === 'teacher' && (
                                                    <div className="flex gap-2 items-center">
                                                        <button onClick={() => setRevealedComments(prev => ({...prev, [cid]: !prev[cid]}))} className="font-bold text-[11px] text-blue-500 hover:underline">
                                                            {revealedComments[cid] ? "Ocultar" : "Revelar"}
                                                        </button>
                                                        <button onClick={() => confirmAction("¿Desea borrar este registro definitivamente?", () => handleDeleteComment(cid, c.author))} className="text-red-500 hover:text-red-600" title="Eliminar registro">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {role === 'teacher' && revealedComments[cid] && (
                                              <div className="flex flex-col gap-1.5 mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                                                  {c.text && <p className="line-through not-italic">{<LinkifyText text={c.text} />}</p>}
                                              </div>
                                            )}
                                        </div>
                                    );
                                }
                                return null; 
                            }

                            return (
                                <div key={cid} className={`p-3.5 rounded-2xl text-xs border shadow-xs group/comment transition-all ${
                                    isDarkMode ? 'bg-gray-800/80 border-gray-700/80 hover:bg-gray-800' : 'bg-gray-50/80 border-gray-200 hover:bg-gray-100/70'
                                }`}>
                                    {c.replyTo && (
                                        <div className={`mb-2 pl-2.5 border-l-2 py-1 ${isDarkMode ? 'border-blue-500 bg-gray-900/60 text-gray-300' : 'border-blue-400 bg-blue-50/60 text-gray-600'} text-[11px] rounded-r-lg`}>
                                            <p className="font-bold text-blue-500">{c.replyTo.author}</p>
                                            <p className="truncate opacity-80">{c.replyTo.text || (c.replyTo.imageUrl ? '📷 Imagen' : 'Archivo adjunto')}</p>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleOpenProfileByName(c.author)} className={`font-bold text-xs hover:underline text-left ${c.author === TEACHER_NAME || c.author === 'Profesora' ? 'text-[#AD3333]' : (isDarkMode ? 'text-gray-100' : 'text-gray-800')}`}>
                                                {c.author}
                                            </button>
                                            {c.isEdited && !isEditing && (
                                                <span className="text-[10px] text-gray-400 italic">(editado)</span>
                                            )}
                                        </div>
                                        
                                        <div className="hidden group-hover/comment:flex items-center gap-1.5">
                                            {!isEditing && <button onClick={() => setReplyingTo(c)} className="p-1 rounded-lg text-gray-400 hover:text-blue-500 transition-colors" title="Responder"><ReplyIcon size={14}/></button>}
                                            {isOwner && !isEditing && (
                                                <button onClick={() => {setEditingCommentId(cid); setEditCommentText(c.text);}} className="p-1 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"><Edit3 size={14}/></button>
                                            )}
                                            {(role === 'teacher' || isOwner) && !isEditing && (
                                                <button onClick={() => confirmAction("¿Desea borrar este comentario?", () => handleDeleteComment(cid, c.author))} className="p-1 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                            )}
                                        </div>
                                    </div>

                                    {isEditing ? (
                                        <div className="mt-2 flex gap-1.5 items-center">
                                            <input className="py-1.5 px-2.5 text-xs flex-1 rounded-xl outline-none border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" value={editCommentText} onChange={e => setEditCommentText(e.target.value)} />
                                            <button onClick={saveEditedComment} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"><CheckCheck size={16}/></button>
                                            <button onClick={() => setEditingCommentId(null)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><X size={16}/></button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2 mt-1.5">
                                            {c.text && <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{<LinkifyText text={c.text} />}</p>}
                                            {c.imageUrl && <img src={c.imageUrl} loading="lazy" decoding="async" alt="Adjunto" onClick={() => setFullScreenImage(c.imageUrl)} className="w-20 h-20 rounded-xl border object-cover shadow-xs cursor-pointer hover:opacity-80 transition-opacity" onError={(e) => e.target.style.display = 'none'} />}
                                            {c.audioUrl && <div className="mt-1"><AudioPlayer src={c.audioUrl} title="Nota de voz" isDarkMode={isDarkMode} compact={true} /></div>}
                                            {c.fileUrl && (
                                                <a href={c.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-xl border w-fit text-[11px] font-medium transition-colors bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                                                    <FileDocIcon size={18} className="text-[#AD3333]" />
                                                    <span className="truncate max-w-[160px]">{c.fileName || 'Documento'}</span>
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* Calificación */}
                                    {c.grade !== undefined && c.grade !== null && (
                                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                                            <Star size={12} className="text-amber-500" />
                                            <span className="text-xs font-black text-amber-700 dark:text-amber-400">{Number(c.grade).toFixed(1)} / 5</span>
                                            {c.feedback && <span className="text-[10px] text-gray-500 ml-1 italic">- {c.feedback}</span>}
                                        </div>
                                    )}

                                    {/* Calificar por parte del docente */}
                                    {role === 'teacher' && isTaskType && c.grade === undefined && (
                                        <div className="mt-2">
                                            {gradingCid === cid ? (
                                                <div className="flex flex-col gap-2 p-2.5 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-[11px] font-bold">Nota (0-5):</label>
                                                        <input type="number" min="0" max="5" step="0.1" value={gradeValue} onChange={e => setGradeValue(e.target.value)} className="w-16 py-1 px-2 rounded-lg border border-gray-300 dark:border-gray-700 text-xs" placeholder="5.0" />
                                                    </div>
                                                    <textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} placeholder="Retroalimentación (opcional)..." className="w-full p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs min-h-[40px]" />
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => setGradingCid(null)} className="text-[11px] font-bold text-gray-500 hover:text-gray-700 px-2 py-1">Cancelar</button>
                                                        <button onClick={() => saveGradeComment(cid)} className="text-[11px] font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg transition">Guardar</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setGradingCid(cid); setGradeValue(""); setGradeFeedback(""); }} className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-700 px-2.5 py-1 rounded-full transition">
                                                    <Star size={11} /> Calificar
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Reacciones de comentario */}
                                    <div className="mt-2.5 flex gap-1.5 items-center flex-wrap">
                                        {Object.entries(c.reactions || {}).reduce((acc, [uid, rData]) => {
                                            const emoji = typeof rData === 'object' ? rData.emoji : rData;
                                            let name = typeof rData === 'object' ? rData.name : 'Un usuario';
                                            if (name === 'Profesora') name = TEACHER_NAME;
                                            const existing = acc.find(item => item.emoji === emoji);
                                            if (existing) { existing.count++; existing.names.push(name); } 
                                            else { acc.push({ emoji, count: 1, names: [name] }); }
                                            return acc;
                                        }, []).map((r, idx) => (
                                            <span key={idx} title={`${r.names.join(', ')}`} className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                                                {r.emoji} {r.count}
                                            </span>
                                        ))}
                                        
                                        {!isLocked && (
                                            <div className="flex items-center gap-1 ml-1">
                                                <button onClick={() => setActiveReactionCommentId(activeReactionCommentId === cid ? null : cid)} className="rounded-full p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                                    <Plus size={12}/>
                                                </button>
                                                {activeReactionCommentId === cid && (
                                                    <div className="flex gap-1.5 rounded-full px-2.5 py-1 border shadow-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 animate-in fade-in">
                                                        {['❤️','👍','😂','😲'].map(emj => (
                                                            <button key={emj} onClick={() => { toggleCommentReaction(cid, emj); setActiveReactionCommentId(null); }} className="hover:scale-125 transition-transform text-sm">{emj}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                          })}
                          {(!task.comments || task.comments.length === 0) && <p className="text-xs text-gray-400 italic text-center mt-8">No hay comentarios aún. ¡Escribe el primero!</p>}
                        </div>
                        
                        {/* Caja de nuevo comentario */}
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

                            <div className={`flex gap-1.5 items-center rounded-2xl px-2 py-1.5 border focus-within:ring-2 ${isDarkMode ? 'bg-gray-800 border-gray-700 focus-within:ring-blue-500/50' : 'bg-gray-50 border-gray-200 focus-within:ring-blue-400/50'}`}>
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
                                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { handleLocalFileUpload(e); setShowAttachmentMenu(false); }} />
                                          </label>
                                          <button type="button" onClick={() => { window.openGifPicker((url) => setCommentImageUrl(url)); setShowAttachmentMenu(false); }} className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 text-left">
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
                                  placeholder="Escribe un comentario o entrega..." 
                                  className="min-w-0 flex-1 bg-transparent border-none outline-none py-1.5 px-2 text-xs font-medium placeholder-gray-400" 
                              />
                              
                              <button type="submit" disabled={isProcessing} className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center">
                                  {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                              </button>
                            </div>

                            {/* Previews de audio y adjuntos */}
                            {(audioCom || upCom) && (
                                <div className="flex items-center gap-2 pt-1">
                                    {upCom && <p className="text-[11px] text-gray-500 italic">Subiendo nota de voz...</p>}
                                    {audioCom && (
                                        <AudioPlayer 
                                            src={audioCom} 
                                            title="Nota de voz" 
                                            onDelete={cancelCom} 
                                            isDarkMode={isDarkMode} 
                                            compact={true} 
                                        />
                                    )}
                                </div>
                            )}
                            {(showCommentImageInput || commentImageUrl) && (
                                <div className="pt-1">
                                    {showCommentImageInput && (
                                        <input 
                                            value={commentImageUrl} onChange={e => setCommentImageUrl(e.target.value)} 
                                            placeholder="URL directa de imagen (.jpg, .png, etc.)..." 
                                            className="w-full rounded-xl px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" 
                                        />
                                    )}
                                    {commentImageUrl && (
                                        <div className="relative w-fit mt-1">
                                            <img src={commentImageUrl} alt="Preview" loading="lazy" className="h-16 w-16 object-cover rounded-xl border" onError={(e) => e.target.style.display = 'none'} />
                                            <button type="button" onClick={() => setCommentImageUrl("")} className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5"><X size={12}/></button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {role === 'teacher' && (
                              <div className="flex gap-1.5 justify-start pt-1">
                                <button type="button" onClick={() => handleTranslate('Inglés')} disabled={isProcessing} className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">🇺🇸 Traducir a inglés</button>
                                <button type="button" onClick={() => handleTranslate('Francés')} disabled={isProcessing} className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">🇫🇷 Traducir a francés</button>
                              </div>
                            )}
                          </form>
                        ) : (
                          <p className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 dark:border-red-900/50 text-center">
                            🔒 Las entregas e interacciones para esta tarea están cerradas.
                          </p>
                        )}
                    </div>
                </div>
            , document.body)}

            {/* FULLSCREEN IMAGE MODAL */}
            {fullScreenImage && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setFullScreenImage(null)}>
                    <button className="absolute top-4 md:top-8 right-4 md:right-8 text-white/70 hover:text-white bg-black/50 hover:bg-red-600 p-2 rounded-full transition-all shadow-lg"><X size={28}/></button>
                    <img src={fullScreenImage} loading="lazy" className="w-auto h-auto max-w-[95vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
                </div>
            , document.body)}
        </div>
    );
});

export default TaskCard
