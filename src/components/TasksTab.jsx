// src/components/TasksTab.jsx
import React, { useState } from 'react'
import {
  Book, BookOpen, CheckCheck, ChevronRight, Globe, ImageIcon, Mic, NavNotebook, PaperclipIcon, Plus, SearchIcon, Sparkles, Square, Target, Undo2, X,
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
    academicGroups, myChatId, userMappings, tasksLoading, taskLimit, loadMoreTasks, pinnedTasks
}) => {

    // ESTADOS DEL MENÚ LIQUID GLASS
    const [isFormExpanded, setIsFormExpanded] = useState(false);
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

    const teacherPic = userMappings?.[myChatId]?.profilePicUrl;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2 drop-shadow-sm"><BookOpen className="text-[#AD3333]" /> Muro de clase</h2>
            
            {/* COMPOSER CARD (ALWAYS MOUNTED FOR FLUID 60FPS CSS ACCORDION EXPANSION) */}
            {role === 'teacher' && (
                <div className={`${glassCard} !p-0 mb-6 border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-xl rounded-3xl transition-all duration-300 overflow-hidden`}>
                    {/* TRIGGER BAR (Visible when collapsed) */}
                    <div 
                        onClick={() => setIsFormExpanded(true)} 
                        className={`p-4 cursor-pointer transition-all duration-300 ${!isFormExpanded ? 'block' : 'hidden'}`}
                    >
                        <div className="flex items-center gap-3">
                            {teacherPic ? (
                                <img 
                                    src={teacherPic} 
                                    alt={loggedInName} 
                                    className="w-11 h-11 rounded-full object-cover shadow-md border-2 border-white dark:border-gray-700 shrink-0" 
                                />
                            ) : (
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#AD3333] to-[#8a2828] text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0 border-2 border-white dark:border-gray-700">
                                    {loggedInName?.charAt(0) || 'G'}
                                </div>
                            )}
                            <div className={`flex-1 px-4 py-2.5 rounded-full border text-sm font-medium transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200/70'}`}>
                                ¿Qué deseas asignar o publicar hoy, {loggedInName?.split(' ')[0]}?
                            </div>
                            <button type="button" className="p-2.5 rounded-full bg-red-50 dark:bg-red-950/40 text-[#AD3333] hover:scale-110 transition-transform shadow-sm" title="Crear">
                                <Plus size={18} />
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400">
                            <div className="flex gap-2">
                                <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); setPostType('task'); setIsFormExpanded(true); }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-[#AD3333] hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors"
                                >
                                    <NavNotebook size={15} /> Tarea con fecha
                                </button>
                                <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); setPostType('post'); setIsFormExpanded(true); }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors"
                                >
                                    <BookOpen size={15} /> Publicación
                                </button>
                                <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); setIsFormExpanded(true); setShowPostAttachmentMenu(true); }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
                                ? 'max-h-[1600px] opacity-100 p-6' 
                                : 'max-h-0 opacity-0 p-0 pointer-events-none'
                        } flex flex-col gap-4 bg-white dark:bg-gray-900`}
                    >
                        {/* Cabecera */}
                        <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                {teacherPic ? (
                                    <img 
                                        src={teacherPic} 
                                        alt={loggedInName} 
                                        className="w-11 h-11 rounded-full object-cover shadow-md border-2 border-white dark:border-gray-700 shrink-0" 
                                    />
                                ) : (
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#AD3333] to-[#8a2828] text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                                        {loggedInName?.charAt(0) || 'G'}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-sm leading-tight text-gray-900 dark:text-gray-100">{loggedInName}</h3>
                                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Crear contenido docente</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <button 
                                        type="button" 
                                        onClick={() => setPostType('task')} 
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${postType === 'task' ? 'bg-white dark:bg-gray-900 shadow-sm text-[#AD3333]' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                                    >
                                        <NavNotebook size={14} /> Tarea
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setPostType('post')} 
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${postType === 'post' ? 'bg-white dark:bg-gray-900 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                                    >
                                        <BookOpen size={14} /> Publicación
                                    </button>
                                </div>
                                
                                <button 
                                    type="button" 
                                    onClick={() => setIsFormExpanded(false)} 
                                    className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors" 
                                    title="Minimizar formulario"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Chips materias */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">
                                Dirigido a <span className="text-red-500">*</span>:
                            </label>
                            <div className="flex flex-wrap gap-2 items-center">
                                <button
                                    type="button"
                                    onClick={() => setPostTargetGroup('all')}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                        postTargetGroup === 'all'
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-102'
                                            : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <Globe size={15} /> Todos los estudiantes
                                </button>
                                {academicGroups?.map(g => (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => setPostTargetGroup(g.id)}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                            postTargetGroup === g.id
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-102'
                                                : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <Book size={15} /> {g.name}
                                    </button>
                                ))}
                                {academicGroups?.length === 0 && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 italic">Crea materias en el Directorio para asignarlas individualmente.</span>
                                )}
                            </div>
                        </div>

                        {/* Editor unificado con colores perfectamente contrastados */}
                        <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-all focus-within:border-blue-500 dark:focus-within:border-blue-400">
                            <input 
                                value={taskTitle} 
                                onChange={(e) => setTaskTitle(e.target.value)} 
                                placeholder={postType === 'task' ? "Título claro de la tarea..." : "Título de la publicación..."} 
                                className="w-full text-base font-bold bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 pb-2 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100" 
                                required 
                            />
                            <textarea 
                                value={taskDesc} 
                                onChange={(e) => setTaskDesc(e.target.value)} 
                                placeholder="Escribe las instrucciones detalladas, indicaciones o una idea general..." 
                                className="w-full text-sm bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 pt-3 min-h-[95px] resize-y leading-relaxed text-gray-900 dark:text-gray-100" 
                                required 
                            />

                            {/* Previsualización de adjuntos multimedia */}
                            {(showImageInput || postImageUrl || postFileUrl || audioPub) && (
                                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2 animate-in fade-in">
                                    {showImageInput && (
                                        <div className="flex gap-2 items-center">
                                            <input 
                                                value={postImageUrl} 
                                                onChange={(e) => setPostImageUrl(e.target.value)} 
                                                placeholder="Pega el enlace directo de la imagen o GIF..." 
                                                className="flex-1 py-2 px-3 text-xs rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500" 
                                            />
                                            <button type="button" onClick={() => setShowImageInput(false)} className="p-2 text-gray-400 hover:text-red-500"><X size={16}/></button>
                                        </div>
                                    )}

                                    {postImageUrl && (
                                        <div className="relative w-fit">
                                            <img src={postImageUrl} alt="Preview" loading="lazy" className="h-32 object-cover rounded-xl border border-gray-200 dark:border-gray-700 bg-black/5 shadow-sm" onError={(e) => e.target.style.display = 'none'} />
                                            <button type="button" onClick={() => setPostImageUrl("")} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition shadow-md"><X size={12}/></button>
                                        </div>
                                    )}

                                    {postFileUrl && (
                                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300 w-fit">
                                            <PaperclipIcon size={16} /> {postFileName || 'Documento adjunto'}
                                            <button type="button" onClick={() => { setPostFileUrl(""); setPostFileName(""); }} className="text-red-500 hover:text-red-700 ml-2"><X size={14}/></button>
                                        </div>
                                    )}

                                    {audioPub && (
                                        <div className="flex items-center gap-2 p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 w-fit">
                                            <audio src={audioPub} controls className="h-8 max-w-[240px] outline-none" />
                                            <button type="button" onClick={cancelPub} className="text-red-500 hover:text-red-700 p-1" title="Quitar audio"><X size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {upPub && <p className="text-xs text-purple-600 dark:text-purple-400 italic pt-2">Subiendo audio adjunto...</p>}
                        </div>

                        {/* Barra de IA y adjuntos */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <button 
                                    type="button" 
                                    onClick={async () => {
                                        if (!taskDesc && !taskTitle) return showMessage("Escribe una idea en la descripción primero.");
                                        setPrevTaskTitle(taskTitle); setPrevTaskDesc(taskDesc); setIsAiLoading(true);
                                        const result = await callGemini(`Mejora esta publicación: Título: ${taskTitle}\nDescripción: ${taskDesc}\nDevuelve SÓLO en formato:\nTITULO: [Título nuevo]\nDESCRIPCION: [Descripción detallada]`);
                                        if (!result) { setIsAiLoading(false); return; }
                                        const titleMatch = result.match(/(?:T[IÍ]TULO|TITLE|TITULO)\s*[:\-]?\s*\*?\*?\s*(.*)/i);
                                        const descMatch = result.match(/(?:DESCRIPCI[OÓ]N|DESCRIPTION|DESCRIPCION)\s*[:\-]?\s*\*?\*?\s*([\s\S]*)/i);
                                        if (titleMatch && descMatch) { setTaskTitle(titleMatch[1].replace(/\*/g, '').trim()); setTaskDesc(descMatch[1].trim()); } else { setTaskDesc(result); }
                                        setHasAiModified(true); setIsAiLoading(false);
                                    }} 
                                    disabled={isAiLoading} 
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <Sparkles size={15} /> Potenciar con IA
                                </button>
                                
                                <button 
                                    type="button" 
                                    onClick={async () => {
                                        if (!taskDesc) return showMessage("Escribe algo en la descripción para corregir.");
                                        setPrevTaskTitle(taskTitle); setPrevTaskDesc(taskDesc); setIsAiLoading(true);
                                        const result = await callGemini(`Corrige la ortografía y gramática manteniendo el idioma original. Devuelve SÓLO el texto corregido:\n\n${taskDesc}`);
                                        if (!result) { setIsAiLoading(false); return; }
                                        setTaskDesc(result); setHasAiModified(true); setIsAiLoading(false);
                                    }} 
                                    disabled={isAiLoading} 
                                    className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                                >
                                    <CheckCheck size={15} /> Corregir
                                </button>
                                
                                <div className="flex gap-1">
                                    <button type="button" onClick={() => handleAiTranslate('Inglés')} disabled={isAiLoading} className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm" title="Traducir a Inglés">🇺🇸 EN</button>
                                    <button type="button" onClick={() => handleAiTranslate('Francés')} disabled={isAiLoading} className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm" title="Traducir a Francés">🇫🇷 FR</button>
                                </div>

                                {/* Dropdown adjuntos */}
                                <div className="relative z-[9999]">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPostAttachmentMenu(!showPostAttachmentMenu)} 
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                            showPostAttachmentMenu 
                                                ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950 dark:border-blue-700' 
                                                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm'
                                        }`}
                                    >
                                        <PaperclipIcon size={15} /> Adjuntar ▾
                                    </button>
                                    
                                    {showPostAttachmentMenu && (
                                        <div className="absolute bottom-full left-0 mb-2 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl p-2 flex flex-col gap-1 z-[9999] animate-in fade-in zoom-in-95 duration-200">
                                            <button type="button" onClick={() => { recPub ? stopPub() : startPub(); setShowPostAttachmentMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors w-full text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                {recPub ? <Square size={16} className="text-red-500 animate-pulse" /> : <Mic size={16} />} {recPub ? 'Detener grabación...' : 'Nota de voz'}
                                            </button>
                                            <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                <ImageIcon size={16} /> Subir imagen
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => { handlePostLocalFileUpload(e); setShowPostAttachmentMenu(false); }} />
                                            </label>
                                            <button type="button" onClick={() => { window.openGifPicker((url) => setPostImageUrl(url)); setShowPostAttachmentMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors w-full text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                <span className="font-black border border-current px-1 rounded text-[9px] flex items-center justify-center h-4">GIF</span> Insertar GIF
                                            </button>
                                            <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                <PaperclipIcon size={16} /> Adjuntar documento
                                                <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" className="hidden" onChange={(e) => { handlePostLocalFileUpload(e); setShowPostAttachmentMenu(false); }} />
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {hasAiModified && (
                                    <button type="button" onClick={() => { setTaskTitle(prevTaskTitle); setTaskDesc(prevTaskDesc); setHasAiModified(false); }} className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1">
                                        <Undo2 size={15} /> Deshacer IA
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Parámetros de Entrega (Tareas) */}
                        {postType === 'task' && (
                            <div className="flex flex-wrap gap-4 items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 mt-2">
                                <div className="flex flex-wrap gap-4 items-center">
                                    <div>
                                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1">Fecha límite</label>
                                        <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} className="py-1.5 px-3 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500" required />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1">Hora límite</label>
                                        <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} className="py-1.5 px-3 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500" required />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer pt-4">
                                        <input type="checkbox" checked={allowLate} onChange={(e) => setAllowLate(e.target.checked)} className="w-4 h-4 accent-[#AD3333] rounded" />
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Permitir entregas tardías</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Botones de acción inferiores */}
                        <div className="flex justify-end items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-800 mt-1">
                            <button 
                                type="button" 
                                onClick={() => setIsFormExpanded(false)} 
                                className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button" 
                                onClick={async () => {
                                    if(!postTargetGroup) return showMessage("⚠️ Debes seleccionar una materia o grupo para publicar.");
                                    if(taskTitle && taskDesc) {
                                        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), { 
                                            type: postType, title: taskTitle, description: taskDesc, 
                                            authorName: loggedInName, 
                                            targetGroupId: postTargetGroup,
                                            imageUrl: postImageUrl.trim(), fileUrl: postFileUrl, fileName: postFileName, audioUrl: audioPub,
                                            dueDate: postType === 'task' ? taskDate : null, dueTime: postType === 'task' ? taskTime : null, allowLate: postType === 'task' ? allowLate : true, createdAt: Date.now(), comments: [], reactions: {} 
                                        });
                                        setTaskTitle(""); setTaskDesc(""); setPostImageUrl(""); setPostFileUrl(""); setPostFileName(""); setAudioPub(""); setShowImageInput(false); setShowPostAttachmentMenu(false); setTaskDate(getToday()); setTaskTime("23:59"); setHasAiModified(false); setAllowLate(false); setPostTargetGroup("");
                                        setIsFormExpanded(false);
                                    } else showMessage("Llena título y descripción.");
                                }} 
                                className={`${redButton} !py-2.5 !px-6 text-xs font-bold shadow-lg shadow-red-600/30 hover:scale-102 transition-transform`}
                            >
                                Publicar ahora
                            </button>
                        </div>
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
{(pinnedTasks || []).map(task => <TaskCard key={task.id} task={{...task, type: task.type || 'task', isPinned: true}} role={role} db={db} appId={appId} glassCard={glassCard} glassInput={glassInput} callGemini={callGemini} currentUser={user} showMessage={showMessage} loggedInName={loggedInName} isDarkMode={isDarkMode} confirmAction={confirmAction} handleOpenProfileByName={handleOpenProfileByName} setFullScreenImage={setFullScreenImage} />)}
              {filteredTasks.filter(t => !(pinnedTasks || []).some(p => p.id === t.id)).map(task => <TaskCard key={task.id} task={{...task, type: task.type || 'task'}} role={role} db={db} appId={appId} glassCard={glassCard} glassInput={glassInput} callGemini={callGemini} currentUser={user} showMessage={showMessage} loggedInName={loggedInName} isDarkMode={isDarkMode} confirmAction={confirmAction} handleOpenProfileByName={handleOpenProfileByName} setFullScreenImage={setFullScreenImage} />)}
{!tasksLoading && tasks.length >= taskLimit && (
    <button type="button" onClick={loadMoreTasks} className="w-full py-3 mt-6 rounded-xl border-2 border-dashed font-bold transition-all text-sm flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
        <Plus size={18} /> Cargar publicaciones anteriores
    </button>
)}
        </div>
    );
});

export default TasksTab
