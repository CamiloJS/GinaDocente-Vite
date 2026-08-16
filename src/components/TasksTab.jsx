// src/components/TasksTab.jsx
import React, { useState } from 'react'
import {
  Book, BookOpen, CheckCheck, ChevronRight, Globe, ImageIcon, Mic, PaperclipIcon, Plus, SearchIcon, Sparkles, Square, Target, Undo2, X,
} from './Icons.jsx'
import TaskCard from './TaskCard.jsx'
import EmptyState from './EmptyState.jsx'
import SkeletonCard from './SkeletonCard.jsx'
import { useVoiceRecorder } from '../utils/useVoiceRecorder.js'
import { collection, addDoc } from '../firebase/config.js'

const TasksTab = React.memo(({
    role, glassCard, glassInput, redButton, postType, setPostType, taskTitle, setTaskTitle,
    taskDesc, setTaskDesc, showImageInput, setShowImageInput, postImageUrl, setPostImageUrl,
    postFileUrl, setPostFileUrl, postFileName, setPostFileName, showPostAttachmentMenu,
    setShowPostAttachmentMenu, handlePostLocalFileUpload, isAiLoading, setIsAiLoading,
    prevTaskTitle, setPrevTaskTitle, prevTaskDesc, setPrevTaskDesc, hasAiModified,
    setHasAiModified, callGemini, showMessage, handleAiTranslate, taskDate, setTaskDate,
    taskTime, setTaskTime, allowLate, setAllowLate, db, appId, loggedInName, getToday,
    tasks, user, isDarkMode, confirmAction, setFullScreenImage, handleOpenProfileByName,
    academicGroups, myChatId, tasksLoading, taskLimit, loadMoreTasks
}) => {

    // ESTADOS DEL MENÚ LIQUID GLASS
    const [postTargetGroup, setPostTargetGroup] = useState("");
    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
    const [wallSearchTerm, setWallSearchTerm] = useState("");
    const { isRecording: recPub, audioUrl: audioPub, isUploading: upPub, setAudioUrl: setAudioPub, startRecording: startPub, stopRecording: stopPub, cancelRecording: cancelPub } = useVoiceRecorder('tasks_audios', showMessage);

    // FILTRO: ¿Qué ve el estudiante?
    const visibleTasks = role === 'teacher' ? tasks : tasks.filter(t => {
        if (!t.targetGroupId || t.targetGroupId === 'all') return true; 
        const group = academicGroups?.find(g => g.id === t.targetGroupId);
        return group && group.members.includes(myChatId);
    });

    // Buscador de publicaciones
    const filteredTasks = wallSearchTerm.trim()
        ? visibleTasks.filter(t => {
            const hay = (t.title || '') + ' ' + (t.description || '');
            return hay.toLowerCase().includes(wallSearchTerm.trim().toLowerCase());
          })
        : visibleTasks;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2 drop-shadow-sm"><BookOpen className="text-[#AD3333]" /> Muro de Clase</h2>
            
            {role === 'teacher' && (
                <div className={`${glassCard} !p-4 mb-5 flex flex-col gap-2.5`}>
                    <div className="flex gap-1 mb-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit border border-gray-200 dark:border-gray-700">
                        <button onClick={() => setPostType('task')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${postType === 'task' ? 'bg-white shadow-sm text-[#AD3333]' : 'text-gray-600 hover:text-gray-900'}`}>Tarea nueva</button>
                        <button onClick={() => setPostType('post')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${postType === 'post' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>Nueva publicación</button>
                    </div>

                    <div className="relative z-[60] mb-2">
    <button type="button" onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)} className={`w-full flex justify-between items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 font-bold transition-all shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${postTargetGroup ? (isDarkMode ? 'text-blue-400' : 'text-blue-700') : (isDarkMode ? 'text-gray-300' : 'text-gray-700')}`}>
        <span className="flex items-center gap-2">
            {postTargetGroup === 'all' ? <><Globe size={18}/> Todos los estudiantes</> : (postTargetGroup ? <><Book size={18}/> {academicGroups?.find(g => g.id === postTargetGroup)?.name}</> : <><Target size={18}/> Seleccionar Materia / Grupo (Obligatorio)</>)}
        </span>
        <ChevronRight size={18} className={`transition-transform duration-300 ${isGroupDropdownOpen ? 'rotate-90' : ''}`} />
    </button>
    
    <div className={`absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-2xl overflow-hidden transition-all duration-200 origin-top ${isGroupDropdownOpen ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 pointer-events-none'}`}>
        <div className="max-h-48 overflow-y-auto p-2 flex flex-col gap-1">
            <button type="button" onClick={() => { setPostTargetGroup('all'); setIsGroupDropdownOpen(false); }} className={`px-4 py-3 flex items-center gap-2 rounded-xl font-bold transition-all ${postTargetGroup === 'all' ? 'bg-blue-500 text-white shadow-md' : (isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-100')}`}><Globe size={18}/> Todos los estudiantes</button>
            {academicGroups?.length === 0 && <p className="text-xs text-gray-500 p-3 italic">No hay materias creadas. Créalas en el Directorio.</p>}
            {academicGroups?.map(g => (
                <button type="button" key={g.id} onClick={() => { setPostTargetGroup(g.id); setIsGroupDropdownOpen(false); }} className={`px-4 py-3 flex items-center gap-2 rounded-xl font-bold transition-all ${postTargetGroup === g.id ? 'bg-blue-500 text-white shadow-md' : (isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-100')}`}><Book size={18}/> {g.name}</button>
            ))}
        </div>
    </div>
</div>

<input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder={postType === 'task' ? "Título de la tarea..." : "Título de la publicación..."} className={`${glassInput} !py-2`} required />
                    <textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} placeholder="Instrucciones detalladas o escribe una idea y usa la IA para potenciarla..." className={`${glassInput} min-h-[80px] resize-y`} required />
                    
                    {(showImageInput || postImageUrl) && (
                        <div className="animate-in fade-in slide-in-from-top-2 relative">
                            {showImageInput && (
                                <input 
                                    value={postImageUrl} 
                                    onChange={(e) => setPostImageUrl(e.target.value)} 
                                    placeholder="Pega el enlace directo de la imagen aquí..." 
                                    className={glassInput} 
                                />
                            )}
                            {postImageUrl && (
                                <div className="relative w-fit mt-3">
                                    <img src={postImageUrl} alt="Preview" loading="lazy" className="h-32 object-cover rounded-xl border border-white/50 bg-black/5 shadow-sm" onError={(e) => e.target.style.display = 'none'} />
                                    <button type="button" onClick={() => setPostImageUrl("")} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition shadow-md"><X size={14}/></button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 mb-1.5 items-center">
                        <button type="button" onClick={async () => {
                            if (!taskDesc && !taskTitle) return showMessage("Escribe una idea en la descripción primero.");
                            setPrevTaskTitle(taskTitle); setPrevTaskDesc(taskDesc); setIsAiLoading(true);
                            const result = await callGemini(`Mejora esta publicación: Título: ${taskTitle}\nDescripción: ${taskDesc}\nDevuelve SÓLO en formato:\nTITULO: [Título nuevo]\nDESCRIPCION: [Descripción detallada]`);
                            if (!result) { setIsAiLoading(false); return; }
                            const titleMatch = result.match(/(?:T[IÍ]TULO|TITLE|TITULO)\s*[:\-]?\s*\*?\*?\s*(.*)/i);
                            const descMatch = result.match(/(?:DESCRIPCI[OÓ]N|DESCRIPTION|DESCRIPCION)\s*[:\-]?\s*\*?\*?\s*([\s\S]*)/i);
                            if (titleMatch && descMatch) { setTaskTitle(titleMatch[1].replace(/\*/g, '').trim()); setTaskDesc(descMatch[1].trim()); } else { setTaskDesc(result); }
                            setHasAiModified(true); setIsAiLoading(false);
                        }} disabled={isAiLoading} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"><Sparkles size={16} /> Potenciar</button>
                        
                        <button type="button" onClick={async () => {
                            if (!taskDesc) return showMessage("Escribe algo en la descripción para corregir.");
                            setPrevTaskTitle(taskTitle); setPrevTaskDesc(taskDesc); setIsAiLoading(true);
                            const result = await callGemini(`Corrige la ortografía y gramática manteniendo el idioma original. Devuelve SÓLO el texto corregido:\n\n${taskDesc}`);
                            if (!result) { setIsAiLoading(false); return; }
                            setTaskDesc(result); setHasAiModified(true); setIsAiLoading(false);
                        }} disabled={isAiLoading} className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 disabled:opacity-50"><CheckCheck size={16} /> Corregir</button>
                        
                        <button type="button" onClick={() => handleAiTranslate('Inglés')} disabled={isAiLoading} className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-xl text-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50">🇺🇸</button>
                        <button type="button" onClick={() => handleAiTranslate('Francés')} disabled={isAiLoading} className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-xl text-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50">🇫🇷</button>

                        <div className="relative z-[9999]">
                            <button type="button" onClick={() => setShowPostAttachmentMenu(!showPostAttachmentMenu)} className={`bg-transparent px-2 py-1.5 rounded-full text-sm font-bold hover:text-blue-600 transition-colors flex items-center gap-1 ${showImageInput || showPostAttachmentMenu ? 'text-blue-600' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} title="Adjuntar">
                                <Plus size={18} /> Adjuntar
                            </button>
                            
                            {showPostAttachmentMenu && (
                                <div className={`absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl p-2 flex flex-col gap-1 z-[9999] animate-in fade-in zoom-in duration-200`}>
                                    <button type="button" onClick={() => { recPub ? stopPub() : startPub(); setShowPostAttachmentMenu(false); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors w-full text-left ${recPub ? 'text-red-500 animate-pulse' : (isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700')}`}>
                                        {recPub ? <Square size={16} /> : <Mic size={16} />} {recPub ? 'Detener grabación...' : 'Nota de voz'}
                                    </button>
                                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                                        <ImageIcon size={16} /> Imagen
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { handlePostLocalFileUpload(e); setShowPostAttachmentMenu(false); }} />
                                    </label>
                                    <button type="button" onClick={() => { window.openGifPicker((url) => setPostImageUrl(url)); setShowPostAttachmentMenu(false); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors w-full text-left ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                                        <span className="font-black border border-current px-1 rounded text-[10px] flex items-center justify-center h-4">GIF</span> GIF
                                    </button>
                                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                                        <PaperclipIcon size={16} /> Adjuntar Documento
                                        <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" className="hidden" onChange={(e) => { handlePostLocalFileUpload(e); setShowPostAttachmentMenu(false); }} />
                                    </label>
                                </div>
                            )}
                        </div>

                        {hasAiModified && <button type="button" onClick={() => { setTaskTitle(prevTaskTitle); setTaskDesc(prevTaskDesc); setHasAiModified(false); }} className="bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-1 ml-auto"><Undo2 size={16} /> Deshacer</button>}
                    </div>

                    {audioPub && (
                        <div className="flex items-center gap-2 animate-in fade-in">
                            <audio src={audioPub} controls className="h-10 max-w-[220px] outline-none" />
                            <button type="button" onClick={cancelPub} className="text-red-500 hover:text-red-700 p-1" title="Quitar audio"><X size={16} /></button>
                        </div>
                    )}
                    {upPub && <p className="text-sm text-gray-500 italic">Subiendo audio...</p>}
                    <div className="flex flex-wrap gap-4 items-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                        {postType === 'task' && (
                            <>
                                <div><label className="text-xs font-bold text-gray-700 block">Fecha límite</label><input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} className={`${glassInput} py-2`} required /></div>
                                <div><label className="text-xs font-bold text-gray-700 block">Hora límite</label><input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} className={`${glassInput} py-2`} required /></div>
                                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={allowLate} onChange={(e) => setAllowLate(e.target.checked)} className="w-4 h-4 accent-[#AD3333]" /><span className="text-xs font-bold text-gray-800">Permitir entregas tardías</span></label>
                            </>
                        )}
                        
                        <button type="button" onClick={async () => {
    if(!postTargetGroup) return showMessage("⚠️ Debes seleccionar una Materia o Grupo para publicar.");
    if(taskTitle && taskDesc) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), { 
            type: postType, title: taskTitle, description: taskDesc, 
            authorName: loggedInName, 
            targetGroupId: postTargetGroup, // <-- Guardamos el grupo aquí
            imageUrl: postImageUrl.trim(), fileUrl: postFileUrl, fileName: postFileName, audioUrl: audioPub,
            dueDate: postType === 'task' ? taskDate : null, dueTime: postType === 'task' ? taskTime : null, allowLate: postType === 'task' ? allowLate : true, createdAt: Date.now(), comments: [], reactions: {} 
        });
        setTaskTitle(""); setTaskDesc(""); setPostImageUrl(""); setPostFileUrl(""); setPostFileName(""); setAudioPub(""); setShowImageInput(false); setShowPostAttachmentMenu(false); setTaskDate(getToday()); setTaskTime("23:59"); setHasAiModified(false); setAllowLate(false); setPostTargetGroup("");
    } else showMessage("Llena título y descripción.");
}} className={`${redButton} ml-auto`}>Publicar</button>
                    </div>
                </div>
            )}
            {tasksLoading ? (
                <div className="space-y-4">{[0,1,2].map(i => <SkeletonCard key={i} isDarkMode={isDarkMode} />)}</div>
            ) : (
                <div className="mb-4 relative">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border focus-within:ring-2 transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 focus-within:ring-blue-500/50' : 'bg-gray-50 border-gray-300 focus-within:ring-blue-400/50'}`}>
                        <SearchIcon size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                        <input value={wallSearchTerm} onChange={e => setWallSearchTerm(e.target.value)} placeholder="Buscar publicaciones..." className={`flex-1 bg-transparent border-none outline-none text-sm font-medium ${isDarkMode ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-500'}`} />
                        {wallSearchTerm && <button onClick={() => setWallSearchTerm("")} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>}
                    </div>
                    {filteredTasks.length === 0 && <p className="text-gray-500 italic text-sm mt-2">No se encontraron publicaciones con ese término.</p>}
                </div>
            )}
            {tasksLoading ? (
                <div className="space-y-4">{[0,1,2].map(i => <SkeletonCard key={i} isDarkMode={isDarkMode} />)}</div>
            ) : visibleTasks.length === 0 ? <EmptyState icon={BookOpen} title="Todavía no hay publicaciones" message="Cuando la profesora publique una tarea o aviso, aparecerá aquí." isDarkMode={isDarkMode} /> : null}
{filteredTasks.map(task => <TaskCard key={task.id} task={{...task, type: task.type || 'task'}} role={role} db={db} appId={appId} glassCard={glassCard} glassInput={glassInput} callGemini={callGemini} currentUser={user} showMessage={showMessage} loggedInName={loggedInName} isDarkMode={isDarkMode} confirmAction={confirmAction} handleOpenProfileByName={handleOpenProfileByName} setFullScreenImage={setFullScreenImage} />)}
{!tasksLoading && tasks.length >= taskLimit && (
    <button type="button" onClick={loadMoreTasks} className="w-full py-3 mt-6 rounded-xl border-2 border-dashed font-bold transition-all text-sm flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
        <Plus size={18} /> Cargar publicaciones anteriores
    </button>
)}
        </div>
    );
});

export default TasksTab
