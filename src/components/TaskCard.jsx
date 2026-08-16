// src/components/TaskCard.jsx
import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import confetti from 'canvas-confetti'
import {
  CheckCheck, CheckLine, Clock, Edit3, FileDocIcon, FileText, ImageIcon, Loader2, Lock, MessageSquareText, Mic, PaperclipIcon, Plus, ReplyIcon, Send, SmileIcon, Square, Star, Pin, Trash2, X, XLine, Volume2
} from './Icons.jsx'
import {
  compressImage, containsBadWords, checkBadWordsAsync, uploadImageToStorage, uploadRawFileToStorage, TEACHER_NAME, COMMENT_EMOJIS, REACTION_EMOJIS, speakText
} from '../utils/helpers.js'
import { glassCard, glassInput } from '../utils/styles.js'
import { useClickOutside } from '../utils/hooks.js'
import LinkifyText from './LinkifyText.jsx'
import { useVoiceRecorder } from '../utils/useVoiceRecorder.js'
import { doc, setDoc, updateDoc, deleteDoc } from '../firebase/config.js'

const TaskCard = React.memo(({ task, role, db, appId, glassInput, callGemini, currentUser, showMessage, loggedInName, isDarkMode, confirmAction, handleOpenProfileByName }) => {
    const [isEditingTask, setIsEditingTask] = useState(false);
    const [editTaskData, setEditTaskData] = useState({ title: task.title, description: task.description, dueDate: task.dueDate || '', dueTime: task.dueTime || '', allowLate: task.allowLate || false });
    const [commentText, setCommentText] = useState("");
    const [commentImageUrl, setCommentImageUrl] = useState("");
    const [commentFileUrl, setCommentFileUrl] = useState("");
    const [commentFileName, setCommentFileName] = useState("");
    const [showCommentImageInput, setShowCommentImageInput] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
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

    const { isRecording: recCom, audioUrl: audioCom, isUploading: upCom, setAudioUrl: setAudioCom, startRecording: startCom, stopRecording: stopCom, cancelRecording: cancelCom } = useVoiceRecorder('comments_audios', showMessage);
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

    const deadline = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
    const isExpired = new Date() > deadline;
    const isLocked = task.type !== 'post' && isExpired && !task.allowLate;
    const cardStyle = isExpired && task.type !== 'post' ? "bg-red-900/10 backdrop-blur-sm border border-red-500/40 shadow-[0_4px_16px_0_rgba(220,38,38,0.12)] rounded-2xl p-5 transition-all duration-300" : glassCard;

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
        if (role === 'teacher') updatedComments = task.comments.filter((c, i) => (c.id || `old-${i}`) !== commentId);
        else updatedComments = task.comments.map((c, i) => (c.id || `old-${i}`) === commentId ? { ...c, isDeleted: true } : c);
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
        const updatedComments = task.comments.map((c, i) => {
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
        if(!commentText.trim() && !commentImageUrl && !commentFileUrl) return;
        setIsProcessing(true);
        if (await checkBadWordsAsync(commentText)) { showMessage("⚠️ Comentario bloqueado: Lenguaje inapropiado."); setIsProcessing(false); return; }

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
          <div className="flex flex-wrap gap-2 mt-2.5">
            {Object.entries(REACTION_EMOJIS).map(([key, emoji]) => {
              const rData = task.reactions?.[currentUser?.uid];
              const isSelected = (typeof rData === 'object' ? rData.type : rData) === key;
              const hoverText = namesByType[key].length > 0 ? `${namesByType[key].join(', ')} reaccionó así` : "";
              return (
                <button key={key} onClick={() => toggleReaction(key)} disabled={isLocked} title={hoverText} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold transition-all border ${isSelected ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400 shadow-sm scale-105' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {emoji} {counts[key] > 0 && <span className="text-gray-800">{counts[key]}</span>}
                </button>
              );
            })}
          </div>
        );
    };

    return (
        <div className={`${cardStyle} !p-4 group ${task.isPinned ? 'border-2 !border-yellow-400 dark:!border-yellow-500 shadow-[0_0_20px_rgba(250,204,21,0.15)]' : ''} ${!isLocked && 'hover:bg-white/30'}`}>
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                        {task.type !== 'post' && <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20">Tarea</span>}
                        {task.isPinned && <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/30 flex items-center gap-1"><Pin size={10} /> Fijado</span>}
                    </div>
                    {isEditingTask ? (
                        <input value={editTaskData.title} onChange={e => setEditTaskData({...editTaskData, title: e.target.value})} className={`${glassInput} text-xl font-bold mb-2 p-2`} placeholder="Título..." />
                    ) : (
                        <div className="flex flex-col">
                            <button onClick={() => handleOpenProfileByName(task.authorName)} className={`text-[11px] font-black uppercase tracking-wider mb-0.5 text-left hover:underline w-fit ${isDarkMode ? 'text-red-500' : 'text-blue-600'}`}>
                                {task.authorName || "Gina Marcela Quintana Delgado"}
                            </button>
                            <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                              {task.title} {isLocked && <Lock size={18} className="text-red-600" />}
                            </h3>
                        </div>
                    )}
                    {task.type !== 'post' && (
                        isEditingTask ? (
                            <div className="flex flex-wrap gap-2 mt-2 items-center">
                                <input type="date" value={editTaskData.dueDate} onChange={e => setEditTaskData({...editTaskData, dueDate: e.target.value})} className={`${glassInput} !py-1 px-2 text-sm w-auto`} />
                                <input type="time" value={editTaskData.dueTime} onChange={e => setEditTaskData({...editTaskData, dueTime: e.target.value})} className={`${glassInput} !py-1 px-2 text-sm w-auto`} />
                                <label className="flex items-center gap-1 cursor-pointer text-sm font-bold text-gray-700 ml-2">
                                    <input type="checkbox" checked={editTaskData.allowLate} onChange={e => setEditTaskData({...editTaskData, allowLate: e.target.checked})} className="w-4 h-4 accent-[#AD3333]" />
                                    Entregas tardías
                                </label>
                            </div>
                        ) : (
                            <p className={`text-sm font-bold mt-1 flex items-center gap-1 ${isExpired ? 'text-red-600' : 'text-[#AD3333]'}`}>
                              <Clock size={14} /> Vence: {task.dueDate} a las {task.dueTime || '23:59'} 
                              {isExpired && (task.allowLate ? " (Se aceptan entregas tardías)" : " (Cerrado)")}
                            </p>
                        )
                    )}
                </div>
                {role === 'teacher' && (
                    <div className="flex items-center gap-3 relative z-10 shrink-0">
                        {isEditingTask ? (
                            <>
                                <button onClick={handleSaveEditedTask} className="text-green-600 hover:text-green-700 hover:scale-110 transition-transform" title="Guardar"><CheckLine size={22}/></button>
                                <button onClick={() => { setIsEditingTask(false); setEditTaskData({title: task.title, description: task.description, dueDate: task.dueDate || '', dueTime: task.dueTime || '', allowLate: task.allowLate || false}); }} className="text-gray-400 hover:text-red-500 hover:scale-110 transition-transform" title="Cancelar"><XLine size={22}/></button>
                            </>
                        ) : (
                            <>
                                <button onClick={togglePin} className={`transition ${task.isPinned ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`} title={task.isPinned ? 'Desfijar' : 'Fijar al inicio del muro'}><Pin size={20} /></button>
                                <button onClick={() => setIsEditingTask(true)} className="text-gray-400 hover:text-blue-600 transition" title="Editar"><Edit3 size={20} /></button>
                                <button onClick={() => confirmAction("¿Desea eliminar esta publicación definitivamente?", () => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id)))} className="text-gray-400 hover:text-red-600 transition"><Trash2 size={20} /></button>
                            </>
                        )}
                    </div>
                )}
            </div>
            
            {isEditingTask ? (
                <textarea value={editTaskData.description} onChange={e => setEditTaskData({...editTaskData, description: e.target.value})} className={`${glassInput} mt-4 min-h-[120px] resize-y p-3`} placeholder="Descripción..."/>
            ) : (
                <div className="relative group/desc mt-2.5">
                    <p className={`whitespace-pre-wrap leading-relaxed pr-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{<LinkifyText text={task.description} />}</p>
                    <button onClick={() => speakText(task.description)} className={`absolute top-0 right-0 p-1.5 rounded-full opacity-0 group-hover/desc:opacity-100 transition-opacity ${isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'}`} title="Escuchar">
                        <Volume2 size={16} />
                    </button>
                </div>
            )}
            
            {task.audioUrl && <audio src={task.audioUrl} controls className="h-10 max-w-[240px] mt-2 outline-none" />}
            {task.imageUrl && (
                <div className="mt-2.5 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm max-w-full bg-gray-50 dark:bg-gray-800/50">
                    <img src={task.imageUrl} loading="lazy" decoding="async" alt="Adjunto" onClick={() => setFullScreenImage(task.imageUrl)} className="w-full h-auto max-h-96 object-contain bg-black/5 cursor-pointer hover:opacity-90 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
                </div>
            )}
            {task.fileUrl && (
                <a href={task.fileUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-4 rounded-2xl border mt-4 w-fit transition-colors shadow-sm ${isDarkMode ? 'bg-gray-800/50 border-gray-600 hover:bg-gray-800' : 'bg-white/60 border-gray-300 hover:bg-white'}`}>
                    <div className="p-2 bg-red-100 rounded-xl"><FileDocIcon size={28} className="text-red-600" /></div>
                    <div className="flex flex-col">
                        <span className={`text-sm font-bold truncate max-w-[200px] md:max-w-[300px] ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{task.fileName || 'Documento adjunto'}</span>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Haga clic para descargar</span>
                    </div>
                </a>
            )}
            
            {renderReactions()}

            <div className="mt-2.5 pt-2.5 border-t border-white/30">
                <button onClick={() => setShowCommentModal(true)} className={`w-full py-2.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl font-bold transition-all flex justify-center items-center gap-2 text-gray-700 dark:text-gray-300`}>
                    <FileText size={18} className="text-[#AD3333]" />
                    {task.comments?.length > 0 ? `Ver los ${task.comments.length} comentarios` : <span className="flex items-center gap-2">Sé el primero en comentar <MessageSquareText size={16}/></span>}
                </button>
            </div>

            {showCommentModal && ReactDOM.createPortal(
                <div className={`fixed inset-0 z-[9999] flex justify-center items-end md:items-center bg-black/60 backdrop-blur-sm p-0 md:p-4 transition-all ${isDarkMode ? 'dark' : ''}`}>
                    <div className={`w-full max-w-3xl h-[90vh] md:h-[85vh] flex flex-col p-4 md:p-6 rounded-t-[2rem] md:rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-hidden ${isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                        
                        <div className={`flex justify-between items-center mb-4 border-b pb-4 shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                            <div>
                                <h3 className={`text-xl font-extrabold flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                    <FileText className="text-[#AD3333]" /> Comentarios
                                </h3>
                                <p className={`text-xs font-medium mt-1 truncate max-w-[250px] md:max-w-md ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>De: {task.title}</p>
                            </div>
                            <button onClick={() => setShowCommentModal(false)} className={`p-2 rounded-full transition-all shadow-sm ${isDarkMode ? 'text-gray-400 hover:text-red-500 bg-gray-800 hover:bg-gray-700' : 'text-gray-500 hover:text-red-600 bg-white hover:bg-gray-100'}`}><X size={20}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scroll-smooth">
                          {task.comments?.map((c, i) => {
                            const cid = c.id || `old-${i}`; 
                            const isOwner = c.author === loggedInName || (role === 'teacher' && (c.author === TEACHER_NAME || c.author === 'Profesora' || c.author === 'La profe'));
                            const isEditing = editingCommentId === cid;
                            
                            if (c.isDeleted) {
                                if (role === 'teacher' || isOwner) {
                                    return (
                                        <div key={cid} className={`p-3 rounded-xl text-xs italic border flex flex-col gap-2 ${isDarkMode ? 'bg-gray-800/50 border-gray-700 text-gray-500' : 'bg-gray-200/50 border-gray-300 text-gray-500'}`}>
                                            <div className="flex justify-between items-center">
                                                <span>{c.author} borró el comentario.</span>
                                                {role === 'teacher' && (
                                                    <div className="flex gap-2 items-center">
                                                        <button onClick={() => setRevealedComments(prev => ({...prev, [cid]: !prev[cid]}))} className={`font-bold px-2 py-1 rounded shadow-sm transition-all ${isDarkMode ? 'bg-gray-700 text-blue-400 hover:text-blue-300' : 'bg-white text-blue-600 hover:text-blue-800'}`}>
                                                            {revealedComments[cid] ? "Ocultar" : "Revelar"}
                                                        </button>
                                                        <button onClick={() => confirmAction("¿Desea borrar este registro definitivamente de la base de datos?", () => handleDeleteComment(cid, c.author))} className={`font-bold p-1.5 rounded shadow-sm transition-all ${isDarkMode ? 'bg-gray-700 text-red-400 hover:text-red-300' : 'bg-white text-red-600 hover:text-red-800'}`} title="Borrar registro permanentemente">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {role === 'teacher' && revealedComments[cid] && (
                                              <div className="flex flex-col gap-2 mt-1">
                                                  {c.text && <p className={`p-2 rounded line-through not-italic ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-700'}`}>{<LinkifyText text={c.text} />}</p>}
                                                  {c.imageUrl && <img src={c.imageUrl} loading="lazy" decoding="async" alt="Adjunto" onClick={() => setFullScreenImage(c.imageUrl)} className={`w-20 h-20 rounded-xl border object-cover shadow-sm cursor-pointer hover:opacity-80 transition-opacity bg-black/5 opacity-70 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} onError={(e) => e.target.style.display = 'none'} />}
                                                  {c.fileUrl && <a href={c.fileUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-xl border w-fit transition-colors opacity-70 ${isDarkMode ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}><FileDocIcon size={20} className="text-red-500" /><span className={`text-xs font-medium truncate max-w-[150px] md:max-w-[200px] ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{c.fileName || 'Documento'}</span></a>}
                                              </div>
                                            )}
                                        </div>
                                    );
                                }
                                return null; 
                            }

                            return (
                                <div key={cid} id={`old-${cid}`} className={`p-4 rounded-2xl text-sm border shadow-sm group/comment transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700/80' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                    {c.replyTo && (
                                        <div className={`mb-3 pl-3 border-l-4 py-1.5 ${isDarkMode ? 'border-blue-500 bg-gray-900/50 text-gray-300' : 'border-blue-400 bg-gray-100 text-gray-600'} text-xs opacity-90 rounded-r-xl`}>
                                            <p className="font-bold text-blue-500 mb-0.5">{c.replyTo.author}</p>
                                            <p className="truncate">{c.replyTo.text || (c.replyTo.imageUrl ? '📷 Imagen' : 'Archivo adjunto')}</p>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleOpenProfileByName(c.author)} className={`font-bold text-base hover:underline text-left ${c.author === TEACHER_NAME || c.author === 'Profesora' || c.author === 'La profe' ? 'text-[#AD3333]' : (isDarkMode ? 'text-gray-200' : 'text-gray-800')}`}>{c.author}</button>
                                            {c.isEdited && !isEditing && (
                                                <div className="relative inline-block">
                                                    <button onClick={() => setHistoryOpenCid(historyOpenCid === cid ? null : cid)} className="text-[10px] text-gray-400 hover:text-blue-500 italic transition-colors mt-0.5">(Editado)</button>
                                                    {historyOpenCid === cid && (
                                                        <div className={`absolute top-full left-0 mt-1 backdrop-blur-xl border shadow-xl rounded-lg p-2 z-50 w-56 ${isDarkMode ? 'bg-gray-800/95 border-gray-600' : 'bg-white/95 border-gray-200'}`}>
                                                            <p className={`text-xs font-bold mb-2 border-b pb-1 ${isDarkMode ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'}`}>Historial de ediciones</p>
                                                            {c.editHistory?.map((h, hi) => (
                                                                <div key={hi} className={`mb-2 pb-2 border-b last:border-0 last:mb-0 last:pb-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                                                    <p className="text-[9px] text-gray-500 mb-0.5">{new Date(h.date).toLocaleString()}</p>
                                                                    <p className={`text-xs line-through ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{h.text}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="hidden group-hover/comment:flex items-center gap-2">
                                            {!isEditing && <button onClick={() => setReplyingTo(c)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:text-blue-400 bg-gray-700' : 'text-gray-400 hover:text-blue-600 bg-gray-100'}`} title="Responder"><ReplyIcon size={16}/></button>}
                                            {isOwner && !isEditing && (
                                                <button onClick={() => {setEditingCommentId(cid); setEditCommentText(c.text);}} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:text-blue-400 bg-gray-700' : 'text-gray-400 hover:text-blue-600 bg-gray-100'}`}><Edit3 size={16}/></button>
                                            )}
                                            {(role === 'teacher' || isOwner) && !isEditing && (
                                                <button onClick={() => confirmAction("¿Seguro que desea borrar este comentario?", () => handleDeleteComment(cid, c.author))} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:text-red-400 bg-gray-700' : 'text-gray-400 hover:text-red-600 bg-gray-100'}`}><Trash2 size={16}/></button>
                                            )}
                                        </div>
                                    </div>

                                    {isEditing ? (
                                        <div className="mt-3 flex gap-2 items-center">
                                            <input className={`py-2 px-3 text-sm flex-1 rounded-xl outline-none focus:ring-2 transition-all ${isDarkMode ? 'bg-gray-900 border border-gray-700 text-gray-100 focus:ring-blue-500/50' : 'bg-gray-100 border border-gray-300 text-gray-900 focus:ring-blue-400/50'}`} value={editCommentText} onChange={e => setEditCommentText(e.target.value)} />
                                            <button onClick={saveEditedComment} className={`p-2 rounded-xl shadow-sm ${isDarkMode ? 'text-green-400 bg-gray-700 hover:bg-gray-600' : 'text-green-700 bg-gray-100 hover:bg-gray-200'}`}><CheckCheck size={18}/></button>
                                            <button onClick={() => setEditingCommentId(null)} className={`p-2 rounded-xl shadow-sm ${isDarkMode ? 'text-red-400 bg-gray-700 hover:bg-gray-600' : 'text-red-600 bg-gray-100 hover:bg-gray-200'}`}><X size={18}/></button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3 mt-2">
                                            {c.text && <p className={`text-base leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{<LinkifyText text={c.text} />}</p>}
                                            {c.imageUrl && <img src={c.imageUrl} loading="lazy" decoding="async" alt="Adjunto" onClick={() => setFullScreenImage(c.imageUrl)} className={`w-20 h-20 rounded-xl border object-cover mt-1 shadow-sm cursor-pointer hover:opacity-80 transition-opacity bg-black/5 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} onError={(e) => e.target.style.display = 'none'} />}
            {c.audioUrl && <audio src={c.audioUrl} controls className="h-10 max-w-[200px] mt-2 outline-none" />}
                                            {c.fileUrl && <a href={c.fileUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-3 rounded-xl border mt-2 w-fit transition-colors ${isDarkMode ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}><FileDocIcon size={24} className="text-red-500" /><span className={`text-sm font-medium truncate max-w-[150px] md:max-w-[200px] ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{c.fileName || 'Documento'}</span></a>}
                                        </div>
                                    )}

                                    {c.grade !== undefined && c.grade !== null && (
                                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                                            <Star size={14} className="text-amber-500" />
                                            <span className="text-sm font-black text-amber-700 dark:text-amber-400">{Number(c.grade).toFixed(1)} / 5</span>
                                            {c.feedback && <span className="text-xs text-gray-600 dark:text-gray-300 ml-1 italic">- {c.feedback}</span>}
                                        </div>
                                    )}

                                    {role === 'teacher' && task.type !== 'post' && c.grade === undefined && (
                                        <div className="mt-3">
                                            {gradingCid === cid ? (
                                                <div className="flex flex-col gap-2 p-3 rounded-xl border bg-white/60 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700">
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Nota (0-5):</label>
                                                        <input type="number" min="0" max="5" step="0.1" value={gradeValue} onChange={e => setGradeValue(e.target.value)} className={`${glassInput} !py-1 w-20`} placeholder="5.0" />
                                                    </div>
                                                    <textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} placeholder="Retroalimentación (opcional)..." className={`${glassInput} !py-1 min-h-[50px] text-xs resize-y`} />
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => setGradingCid(null)} className="text-xs font-bold text-gray-500 hover:text-gray-700 px-3 py-1">Cancelar</button>
                                                        <button onClick={() => saveGradeComment(cid)} className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-4 py-1 rounded-lg transition">Guardar</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setGradingCid(cid); setGradeValue(""); setGradeFeedback(""); }} className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-700 px-3 py-1.5 rounded-full transition">
                                                    <Star size={12} /> Calificar
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-4 flex gap-1.5 items-center flex-wrap">
                                        {Object.entries(c.reactions || {}).reduce((acc, [uid, rData]) => {
                                            const emoji = typeof rData === 'object' ? rData.emoji : rData;
                                            let name = typeof rData === 'object' ? rData.name : 'Un usuario';
                                            if (name === 'Profesora' || name === 'La profe') name = TEACHER_NAME;
                                            const existing = acc.find(item => item.emoji === emoji);
                                            if (existing) { existing.count++; existing.names.push(name); } 
                                            else { acc.push({ emoji, count: 1, names: [name] }); }
                                            return acc;
                                        }, []).map((r, idx) => (
                                            <span key={idx} title={`${r.names.join(', ')} reaccionó así`} className={`px-2 py-1 rounded-full text-xs font-bold border cursor-help shadow-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>{r.emoji} {r.count}</span>
                                        ))}
                                        
                                        {!isLocked && (
                                            <div className="flex items-center gap-1 ml-1">
                                                <button onClick={() => setActiveReactionCommentId(activeReactionCommentId === cid ? null : cid)} className={`rounded-full p-1.5 transition-colors shadow-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-200 bg-gray-700 hover:bg-gray-600' : 'text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200'}`}><Plus size={14}/></button>
                                                {activeReactionCommentId === cid && (
                                                    <div className={`flex gap-1.5 rounded-full px-3 py-1 border shadow-md animate-in fade-in slide-in-from-left-2 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
                                                        {['❤️','👍','😂','😲'].map(emj => (
                                                            <button key={emj} onClick={() => { toggleCommentReaction(cid, emj); setActiveReactionCommentId(null); }} className="hover:scale-125 transition-transform text-base">{emj}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                          })}
                          {(!task.comments || task.comments.length === 0) && <p className="text-sm text-gray-500 italic text-center mt-10">Sé el primero en iniciar la conversación.</p>}
                        </div>
                        
                        {!isLocked ? (
                          <form onSubmit={handleAddComment} className={`pt-4 border-t flex flex-col gap-3 shrink-0 relative ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                            
                            {replyingTo && (
                                <div className={`flex justify-between items-center px-4 py-2 rounded-xl border-l-4 border-blue-500 text-sm shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-blue-500 truncate">Respondiendo a {replyingTo.author}</span>
                                        <span className="truncate opacity-80 text-xs">{replyingTo.text || 'Archivo adjunto'}</span>
                                    </div>
                                    <button type="button" onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-red-500 ml-3 p-1"><X size={16}/></button>
                                </div>
                            )}

                            <div className={`flex gap-2 items-center rounded-2xl px-3 py-2 transition-all shadow-inner border focus-within:ring-2 ${isDarkMode ? 'bg-gray-800 border-gray-700 focus-within:ring-blue-500/50' : 'bg-white border-gray-300 focus-within:ring-blue-400/50'}`}>
                              <div className="relative" ref={emojiPickerRef}>
                                  <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 bg-transparent transition-colors rounded-full ${showEmojiPicker ? 'text-blue-500' : (isDarkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600')}`}>
                                      <SmileIcon size={20} />
                                  </button>
                                  {showEmojiPicker && (
                                      <div className={`absolute bottom-full left-0 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl p-2 flex flex-col gap-1 z-[99999] animate-in fade-in zoom-in duration-200`}>
                                          {COMMENT_EMOJIS.map(emj => (
                                              <button key={emj} type="button" onClick={() => {setCommentText(prev => prev + emj); setShowEmojiPicker(false);}} className="text-2xl hover:scale-125 transition-transform">{emj}</button>
                                          ))}
                                      </div>
                                  )}
                              </div>

                              <div className="relative">
                                  <button type="button" onClick={() => recCom ? stopCom() : startCom()} className={`p-2 bg-transparent transition-colors rounded-full ${recCom ? 'text-red-500 animate-pulse' : (isDarkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600')}`} title={recCom ? 'Detener' : 'Nota de voz'}>
                                      {recCom ? <Square size={20} /> : <Mic size={20} />}
                                  </button>
                              </div>

                              <div className="relative" ref={attachmentMenuRef}>
                                  <button type="button" onClick={() => setShowAttachmentMenu(!showAttachmentMenu)} className={`p-2 bg-transparent transition-colors rounded-full ${(showCommentImageInput || showAttachmentMenu) ? 'text-blue-500' : (isDarkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600')}`} title="Adjuntar">
                                      <Plus size={20} />
                                  </button>
                                  {showAttachmentMenu && (
                                      <div className={`absolute bottom-full left-0 mb-4 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl p-2 flex flex-col gap-1 z-[9999] animate-in fade-in zoom-in duration-200`}>
                                          <button type="button" onClick={() => { setShowCommentImageInput(!showCommentImageInput); setShowAttachmentMenu(false); }} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors text-left ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                                              <ImageIcon size={16} /> Enlace de imagen
                                          </button>
                                          <label className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                                              <ImageIcon size={16} /> Imagen
                                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { handleLocalFileUpload(e); setShowAttachmentMenu(false); }} />
                                          </label>
                                          <button type="button" onClick={() => { window.openGifPicker((url) => setCommentImageUrl(url)); setShowAttachmentMenu(false); }} className={`flex w-full items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors text-left ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                                              <span className="font-black border border-current px-1 rounded text-[10px] flex items-center justify-center h-4">GIF</span> GIF
                                          </button>
                                          <label className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                                              <PaperclipIcon size={16} /> Documento
                                              <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" className="hidden" onChange={(e) => { handleLocalFileUpload(e); setShowAttachmentMenu(false); }} />
                                          </label>
                                      </div>
                                  )}
                              </div>

                              <input 
                                  value={commentText} onChange={(e) => setCommentText(e.target.value)} 
                                  placeholder="Escribe tu mensaje aquí..." 
                                  className={`min-w-0 flex-1 bg-transparent border-none outline-none py-2 px-2 text-base font-medium ${isDarkMode ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-500'}`} 
                              />
                              
                              <button type="submit" disabled={isProcessing} className="p-3 bg-blue-600 text-white hover:bg-blue-700 shadow-md rounded-xl transition-all disabled:opacity-50 flex items-center justify-center">
                                  {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                              </button>
                            </div>

                            {(audioCom || upCom) && (
                                <div className="px-1 animate-in fade-in">
                                    {upCom && <p className="text-xs text-gray-500 italic">Subiendo audio...</p>}
                                    {audioCom && (
                                        <div className="relative w-fit mt-3">
                                            <audio src={audioCom} controls className="h-10 max-w-[220px] outline-none" />
                                            <button type="button" onClick={cancelCom} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition shadow-md"><X size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {(showCommentImageInput || commentImageUrl) && (
                                <div className="px-1 animate-in fade-in slide-in-from-top-2 relative">
                                    {showCommentImageInput && (
                                        <input 
                                            value={commentImageUrl} onChange={e => setCommentImageUrl(e.target.value)} 
                                            placeholder="Enlace DIRECTO de imagen (ej. termina en .jpg o .png)..." 
                                            className={`w-full rounded-xl px-4 py-3 outline-none focus:ring-2 transition-all text-sm font-medium border shadow-inner ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:ring-blue-500/50' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-400/50'}`} 
                                        />
                                    )}
                                    {commentImageUrl && (
                                        <div className="relative w-fit mt-3">
                                            <img src={commentImageUrl} alt="Preview" loading="lazy" className={`h-24 w-24 object-cover rounded-xl border shadow-sm ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} onError={(e) => e.target.style.display = 'none'} />
                                            <button type="button" onClick={() => setCommentImageUrl("")} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition shadow-md"><X size={14}/></button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {role === 'teacher' && (
                              <div className="flex gap-2 justify-start mt-1">
                                <button type="button" onClick={() => handleTranslate('Inglés')} disabled={isProcessing} className={`px-4 py-1.5 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center disabled:opacity-50 border ${isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200'}`}>🇺🇸 Inglés</button>
                                <button type="button" onClick={() => handleTranslate('Francés')} disabled={isProcessing} className={`px-4 py-1.5 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center disabled:opacity-50 border ${isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200'}`}>🇫🇷 Francés</button>
                              </div>
                            )}
                          </form>
                        ) : (
                          <p className="text-sm font-bold text-red-600 bg-red-100/50 p-4 rounded-xl border border-red-200 text-center mt-2">🔒 La interacción para esta tarea ha sido bloqueada.</p>
                        )}
                    </div>
                </div>
            , document.body)}

            {fullScreenImage && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setFullScreenImage(null)}>
                    <button className="absolute top-4 md:top-8 right-4 md:right-8 text-white/70 hover:text-white bg-black/50 hover:bg-red-600 p-2 rounded-full transition-all shadow-lg"><X size={28}/></button>
                    <img src={fullScreenImage} loading="lazy" className="w-auto h-auto max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                </div>
            , document.body)}
        </div>
    );
});

export default TaskCard
