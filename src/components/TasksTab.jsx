// src/components/TasksTab.jsx
import React, { useState, useRef } from 'react'
import {
  Book, BookOpen, CheckCheck, ChevronRight, Globe, ImageIcon, Mic, NavNotebook, PaperclipIcon, Plus, SearchIcon, Sparkles, Square, Target, Loader2, Undo2, X, Play, Pause, MessageCircle, BarChart2, Vote
} from './Icons.jsx'
import TaskCard from './TaskCard.jsx'
import EmptyState from './EmptyState.jsx'
import SkeletonCard from './SkeletonCard.jsx'
import RichTextToolbar from './RichTextToolbar.jsx'
import RichVisualEditor from './RichVisualEditor.jsx'
import { useVoiceRecorder } from '../utils/useVoiceRecorder.js'
import { auth, signInAnonymously, db as defaultDb, appId as defaultAppId, collection, addDoc } from '../firebase/config.js'
import AudioPlayer, { AudioRecordingVisualizer } from './AudioPlayer.jsx'
import CustomVideoPlayer from './CustomVideoPlayer.jsx'
import GeniallyEmbedPlayer, { extractGeniallyUrl } from './GeniallyEmbedPlayer.jsx'
import { getTeacherDynamicPlaceholder } from '../utils/teacherPlaceholders.js'

const TasksTab = React.memo(({

    role, glassCard, glassInput, redButton, postType, setPostType, taskTitle, setTaskTitle,
    taskDesc, setTaskDesc, showImageInput, setShowImageInput, postImageUrl, setPostImageUrl, postImageUrls = [], setPostImageUrls,
    postFileUrl, setPostFileUrl, postFileName, setPostFileName, showPostAttachmentMenu,
    setShowPostAttachmentMenu, handlePostLocalFileUpload, isAiLoading, setIsAiLoading,
    prevTaskTitle, setPrevTaskTitle, prevTaskDesc, setPrevTaskDesc, hasAiModified,
    setHasAiModified, callGemini, showMessage, handleAiTranslate, taskDate, setTaskDate,
    taskTime, setTaskTime, allowLate, setAllowLate, db, appId, loggedInName, getToday,
    tasks, user, isDarkMode, confirmAction, setFullScreenImage, handleOpenProfileByName,
    academicGroups, myChatId, userMappings, tasksLoading, taskLimit, loadMoreTasks, pinnedTasks,
    filterType, setFilterType, selectedGroupFilter, setSelectedGroupFilter, onTogglePin,
    taskSortOrder, setTaskSortOrder, wallSearchTerm: propWallSearchTerm, setWallSearchTerm: propSetWallSearchTerm,
    isFormExpanded: propIsFormExpanded, setIsFormExpanded: propSetIsFormExpanded,
    postTargetGroup: propPostTargetGroup, setPostTargetGroup: propSetPostTargetGroup,
    fixedTargetGroup, isGroupChannelMode = false,
}) => {

    // ESTADOS DEL MENÚ LIQUID GLASS
    const [localIsFormExpanded, setLocalIsFormExpanded] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const isPublishingRef = useRef(false);
    const [localPostTargetGroup, setLocalPostTargetGroup] = useState(fixedTargetGroup || "all");
    const isFormExpanded = propIsFormExpanded !== undefined ? propIsFormExpanded : localIsFormExpanded;
    const setIsFormExpanded = propSetIsFormExpanded || setLocalIsFormExpanded;
    const postTargetGroup = propPostTargetGroup !== undefined ? propPostTargetGroup : localPostTargetGroup;
    const setPostTargetGroup = propSetPostTargetGroup || setLocalPostTargetGroup;
    const [hasDueDate, setHasDueDate] = useState(true);
    const [hidePublicationDate, setHidePublicationDate] = useState(false);
    const [postVideoUrl, setPostVideoUrl] = useState("");
    const [showVideoInput, setShowVideoInput] = useState(false);
    const [postGeniallyUrl, setPostGeniallyUrl] = useState("");
    const [showGeniallyInput, setShowGeniallyInput] = useState(false);
    const [localWallSearchTerm, setLocalWallSearchTerm] = useState("");
    const taskDescRef = useRef(null);
    const [dynamicPlaceholder, setDynamicPlaceholder] = useState(() => getTeacherDynamicPlaceholder(loggedInName));
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [isMultipleChoice, setIsMultipleChoice] = useState(false);
    const wallSearchTerm = propWallSearchTerm !== undefined ? propWallSearchTerm : localWallSearchTerm;
    const setWallSearchTerm = propSetWallSearchTerm || setLocalWallSearchTerm;
    const { isRecording: recPub, audioUrl: audioPub, isUploading: upPub, recordingTime: recTimePub, setAudioUrl: setAudioPub, startRecording: startPub, stopRecording: stopPub, cancelRecording: cancelPub } = useVoiceRecorder('tasks_audios', showMessage);

    // Rotar o recalcular el placeholder dinámico al cambiar de usuario o periódicamente
    React.useEffect(() => {
        setDynamicPlaceholder(getTeacherDynamicPlaceholder(loggedInName));
        const interval = setInterval(() => {
            setDynamicPlaceholder(getTeacherDynamicPlaceholder(loggedInName));
        }, 180000); // Cada 3 minutos rota sutilmente
        return () => clearInterval(interval);
    }, [loggedInName]);

    // Sincronizar postTargetGroup si cambia fixedTargetGroup
    React.useEffect(() => {
        if (fixedTargetGroup) {
            setPostTargetGroup(fixedTargetGroup);
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
        if (!group || !group.members) return false;
        const membersList = Array.isArray(group.members)
            ? group.members
            : (typeof group.members === 'object' ? Object.keys(group.members) : []);
        if (membersList.length === 0 || studentIdentifiers.size === 0) return false;
        return membersList.some(m => {
            if (!m) return false;
            const cleanM = String(m).toLowerCase().replace('@', '').trim();
            return cleanM && studentIdentifiers.has(cleanM);
        });
    }, [studentIdentifiers]);

    // 3. Materias / grupos en los que está inscrito el estudiante
    const myEnrolledGroups = React.useMemo(() => {
        if (role === 'teacher') return academicGroups || [];
        return (academicGroups || []).filter(isStudentInGroup);
    }, [academicGroups, isStudentInGroup, role]);

    // 4. Verificador estricto de visibilidad de publicaciones y tareas
    const isTaskVisibleForUser = React.useCallback((t) => {
        if (!t) return false;

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

        // Buscar si coincide con alguna materia existente en la plataforma
        const matchingGroupInSystem = (academicGroups || []).find(g => {
            if (!g) return false;
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

            // Si tienen grupo, solo ven publicaciones de sus materias inscritas
            return myEnrolledGroups.some(g => {
                const gClean = String(g.id || '').trim().replace(/^acad_/i, '');
                const gName = (g.name || '').toLowerCase().trim();
                return (
                    (cleanTaskGrpId && (gClean.toLowerCase() === cleanTaskGrpId.toLowerCase() || gName === cleanTaskGrpId.toLowerCase())) ||
                    (hasSpecificGroupName && gName && gName === taskGrpName) ||
                    (matchingGroupInSystem && String(matchingGroupInSystem.id || '').trim().replace(/^acad_/i, '').toLowerCase() === gClean.toLowerCase())
                );
            });
        }

        // Publicación auténticamente Global / Para todos los estudiantes
        return true;
    }, [role, fixedTargetGroup, academicGroups, myEnrolledGroups]);

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

    // Publicaciones regulares filtradas y deduplicadas
    const visibleTasks = React.useMemo(() => {
        return deduplicateTasks((tasks || []).filter(isTaskVisibleForUser));
    }, [tasks, isTaskVisibleForUser, deduplicateTasks]);

    // Publicaciones fijadas (Pinned Posts) con el MISMO filtro estricto y deduplicadas
    const visiblePinnedTasks = React.useMemo(() => {
        return deduplicateTasks((pinnedTasks || []).filter(isTaskVisibleForUser));
    }, [pinnedTasks, isTaskVisibleForUser, deduplicateTasks]);

    // Buscador de publicaciones
    const filteredTasks = React.useMemo(() => {
        if (!wallSearchTerm.trim()) return visibleTasks;
        const term = wallSearchTerm.trim().toLowerCase();
        return visibleTasks.filter(t => {
            const hay = (t.title || '') + ' ' + (t.description || '');
            return hay.toLowerCase().includes(term);
        });
    }, [visibleTasks, wallSearchTerm]);

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

    const teacherPic = userMappings?.[myChatId]?.profilePicUrl;

    return (
        <div className="space-y-4">
            
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
                                    onClick={(e) => { e.stopPropagation(); setPostType('task'); setIsFormExpanded(true); }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-[#AD3333] hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors shrink-0 whitespace-nowrap"
                                >
                                    <NavNotebook size={15} /> Tarea
                                </button>
                                <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); setPostType('forum'); setIsFormExpanded(true); }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors shrink-0 whitespace-nowrap"
                                >
                                    <MessageCircle size={15} /> Foro
                                </button>
                                <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); setPostType('post'); setIsFormExpanded(true); }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors shrink-0 whitespace-nowrap"
                                >
                                    <BookOpen size={15} /> Publicación
                                </button>
                                <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); setPostType('poll'); setIsFormExpanded(true); }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors shrink-0 whitespace-nowrap"
                                >
                                    <BarChart2 size={15} /> Encuesta
                                </button>
                                <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); setIsFormExpanded(true); setShowPostAttachmentMenu(true); }} 
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
                                        onClick={() => setPostType('forum')} 
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${postType === 'forum' ? 'bg-white dark:bg-gray-900 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                                    >
                                        <MessageCircle size={14} /> Foro
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setPostType('post')} 
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${postType === 'post' ? 'bg-white dark:bg-gray-900 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                                    >
                                        <BookOpen size={14} /> Publicación
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setPostType('poll')} 
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${postType === 'poll' ? 'bg-white dark:bg-gray-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                                    >
                                        <BarChart2 size={14} /> Encuesta
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
                            {fixedTargetGroup ? (
                                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-2xs">
                                    <Book size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
                                    <span>Publicando exclusivamente en: <strong>{academicGroups?.find(g => String(g?.id || '').replace(/^acad_/i, '').toLowerCase() === String(fixedTargetGroup || '').replace(/^acad_/i, '').toLowerCase())?.name || 'Este grupo'}</strong></span>
                                </div>
                            ) : (
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
                            )}
                        </div>

                        {/* Editor unificado con colores perfectamente contrastados */}
                        <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-all focus-within:border-blue-500 dark:focus-within:border-blue-400">
                            <input 
                                value={taskTitle} 
                                onChange={(e) => setTaskTitle(e.target.value)} 
                                placeholder={postType === 'task' ? "Título claro de la tarea..." : postType === 'forum' ? "Tema central del foro de debate..." : postType === 'poll' ? "Pregunta de la encuesta (ej. ¿Cuál es tu horario preferido?)..." : "Título de la publicación..."} 
                                className="w-full text-base font-bold bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 pb-2 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100" 
                                required 
                            />
                            {/* Editor Visual Enriquecido (WYSIWYG con Formato en Tiempo Real) */}
                            <div className="mt-2">
                                <RichVisualEditor 
                                    value={taskDesc}
                                    onChange={setTaskDesc}
                                    placeholder={postType === 'forum' ? "Escribe la pregunta detonante, pautas o tema de discusión para el debate..." : postType === 'poll' ? "Detalles, contexto o indicaciones adicionales de la encuesta (opcional)..." : "Escribe las instrucciones detalladas, indicaciones o una idea general..."}
                                    isDarkMode={isDarkMode}
                                    minHeight="110px"
                                />
                            </div>

                            {/* Previsualización de adjuntos multimedia */}
                            {(showImageInput || showVideoInput || showGeniallyInput || postImageUrl || postVideoUrl || postGeniallyUrl || postFileUrl || audioPub) && (
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

                                    {showVideoInput && (
                                        <div className="flex gap-2 items-center">
                                            <input 
                                                value={postVideoUrl} 
                                                onChange={(e) => setPostVideoUrl(e.target.value)} 
                                                placeholder="Pega el enlace de YouTube o enlace directo de video (.mp4, etc.)..." 
                                                className="flex-1 py-2 px-3 text-xs rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500" 
                                            />
                                            <button type="button" onClick={() => setShowVideoInput(false)} className="p-2 text-gray-400 hover:text-red-500"><X size={16}/></button>
                                        </div>
                                    )}

                                    {showGeniallyInput && (
                                        <div className="flex gap-2 items-center">
                                            <input 
                                                value={postGeniallyUrl} 
                                                onChange={(e) => setPostGeniallyUrl(e.target.value)} 
                                                placeholder="Pega el enlace o código de inserción de Genially..." 
                                                className="flex-1 py-2 px-3 text-xs rounded-xl bg-white dark:bg-gray-900 border border-purple-300 dark:border-purple-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500" 
                                            />
                                            <button type="button" onClick={() => setShowGeniallyInput(false)} className="p-2 text-gray-400 hover:text-red-500"><X size={16}/></button>
                                        </div>
                                    )}

                                    {(() => {
                                        const currentImgs = (Array.isArray(postImageUrls) && postImageUrls.length > 0)
                                            ? postImageUrls
                                            : (postImageUrl ? [postImageUrl] : []);
                                        
                                        if (currentImgs.length === 0) return null;

                                        return (
                                            <div className="space-y-1.5 my-2">
                                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                                    <span>Imágenes adjuntas ({currentImgs.length}/4)</span>
                                                    {currentImgs.length > 1 && (
                                                        <span className="text-blue-500 dark:text-blue-400 font-semibold">Se mostrarán en carrusel tipo Instagram</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2.5 items-center">
                                                    {currentImgs.map((url, idx) => (
                                                        <div key={idx} className="relative group/thumb">
                                                            <img 
                                                                src={url} 
                                                                alt={`Preview ${idx + 1}`} 
                                                                loading="lazy" 
                                                                className="h-24 w-24 object-cover rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-black/5 shadow-xs" 
                                                                onError={(e) => e.target.style.display = 'none'} 
                                                            />
                                                            <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                                                                {idx + 1}
                                                            </span>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => {
                                                                    const updated = currentImgs.filter((_, i) => i !== idx);
                                                                    if (typeof setPostImageUrls === 'function') setPostImageUrls(updated);
                                                                    if (typeof setPostImageUrl === 'function') setPostImageUrl(updated[0] || '');
                                                                }} 
                                                                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition shadow-md cursor-pointer"
                                                                title="Eliminar imagen"
                                                            >
                                                                <X size={12}/>
                                                            </button>
                                                        </div>
                                                    ))}

                                                    {currentImgs.length < 4 && (
                                                        <label className="h-24 w-24 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-gray-400 hover:text-blue-500 bg-gray-50/50 dark:bg-gray-800/40" title="Añadir otra imagen (máximo 4)">
                                                            <Plus size={20} />
                                                            <span className="text-[10px] font-bold">{currentImgs.length}/4</span>
                                                            <input 
                                                                type="file" 
                                                                multiple 
                                                                accept="image/*" 
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
                                        <div className="relative max-w-md my-2 rounded-2xl overflow-hidden shadow-md">
                                            <CustomVideoPlayer src={postVideoUrl} isDarkMode={isDarkMode} />
                                            <button type="button" onClick={() => setPostVideoUrl("")} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition shadow-md z-10" title="Eliminar video"><X size={14}/></button>
                                        </div>
                                    )}

                                    {postGeniallyUrl && (
                                        <div className="relative max-w-full my-2">
                                            <GeniallyEmbedPlayer url={postGeniallyUrl} isDarkMode={isDarkMode} onRemove={() => setPostGeniallyUrl("")} />
                                        </div>
                                    )}

                                    {postFileUrl && (
                                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300 w-fit">
                                            <PaperclipIcon size={16} /> {postFileName || 'Documento adjunto'}
                                            <button type="button" onClick={() => { setPostFileUrl(""); setPostFileName(""); }} className="text-red-500 hover:text-red-700 ml-2"><X size={14}/></button>
                                        </div>
                                    )}

                                    {audioPub && (
                                        <div className="mt-2">
                                            <AudioPlayer src={audioPub} title="Nota de voz adjunta" onDelete={cancelPub} isDarkMode={isDarkMode} />
                                        </div>
                                    )}
                                </div>
                            )}
                            {upPub && <p className="text-xs text-purple-600 dark:text-purple-400 italic pt-2">Subiendo audio adjunto...</p>}
                            {recPub && (
                                <div className="pt-2">
                                    <AudioRecordingVisualizer 
                                        recordingTime={recTimePub} 
                                        onStop={stopPub} 
                                        onCancel={cancelPub} 
                                        isDarkMode={isDarkMode} 
                                    />
                                </div>
                            )}
                        </div>

                        {/* Barra de IA y adjuntos */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex flex-wrap items-center gap-2">
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
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {isAiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Potenciar con IA
                                </button>
                                
                                <button 
                                    type="button" 
                                    onClick={async () => {
                                        if (!taskDesc && !taskTitle) return showMessage("Escribe algo en la descripción o título para corregir.");
                                        setPrevTaskTitle(taskTitle); setPrevTaskDesc(taskDesc); setIsAiLoading(true);
                                        try {
                                            const cleanText = (str) => (str || '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
                                            const result = await callGemini(`Corrige la ortografía y gramática manteniendo el idioma original. REGLA ESTRICTA: NO uses asteriscos (* o **). Devuelve SÓLO el texto corregido en texto limpio:\n\n${taskDesc || taskTitle}`);
                                            if (!result) { 
                                                setIsAiLoading(false); 
                                                return showMessage("No se pudo corregir con IA."); 
                                            }
                                            if (taskDesc) setTaskDesc(cleanText(result));
                                            else setTaskTitle(cleanText(result));
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
                                    className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                                >
                                    {isAiLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />} Corregir
                                </button>
                                
                                <div className="flex flex-wrap gap-1.5">
                                    <button type="button" onClick={() => handleAiTranslate('Inglés')} disabled={isAiLoading} className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm flex items-center gap-1.5" title="Traducir a inglés"><Globe size={14} /> Traducir a inglés</button>
                                    <button type="button" onClick={() => handleAiTranslate('Francés')} disabled={isAiLoading} className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm flex items-center gap-1.5" title="Traducir a francés"><Globe size={14} /> Traducir a francés</button>
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
                                            <button type="button" onClick={() => { setShowVideoInput(true); setShowPostAttachmentMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors w-full text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                <Play size={16} className="text-red-500" /> Adjuntar video
                                            </button>
                                            <button type="button" onClick={() => { setShowGeniallyInput(true); setShowPostAttachmentMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors w-full text-left text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50">
                                                <Sparkles size={16} className="text-purple-500" /> Insertar Genially
                                            </button>
                                            <button type="button" onClick={() => { recPub ? stopPub() : startPub(); setShowPostAttachmentMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors w-full text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                {recPub ? <Square size={16} className="text-red-500 animate-pulse" /> : <Mic size={16} />} {recPub ? 'Detener grabación...' : 'Nota de voz'}
                                            </button>
                                            <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                <ImageIcon size={16} /> Subir imagen
                                                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => { handlePostLocalFileUpload(e); setShowPostAttachmentMenu(false); }} />
                                            </label>
                                            <button type="button" onClick={() => { window.openGifPicker?.((url) => setPostImageUrl(url)); setShowPostAttachmentMenu(false); }} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors w-full text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
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

                        {/* Configuración específica de Encuestas */}
                        {postType === 'poll' && (
                            <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3.5 mt-2 animate-in fade-in duration-200">
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-indigo-200/60 dark:border-indigo-800/40">
                                    <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                                        <BarChart2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                                        Modo de selección de la encuesta
                                    </span>
                                    <div className="flex items-center gap-1 bg-white dark:bg-gray-900 p-1 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                                        <button
                                            type="button"
                                            onClick={() => setIsMultipleChoice(false)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                !isMultipleChoice 
                                                    ? 'bg-indigo-600 text-white shadow-xs' 
                                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                            }`}
                                        >
                                            Selección única
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsMultipleChoice(true)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                isMultipleChoice 
                                                    ? 'bg-indigo-600 text-white shadow-xs' 
                                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                            }`}
                                        >
                                            Selección múltiple
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                        Opciones de respuesta <span className="text-red-500">*</span> (mínimo 2, máximo 8):
                                    </label>
                                    {pollOptions.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0">
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
                                                className="flex-1 py-2 px-3 text-xs font-medium rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            {pollOptions.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPollOptions(pollOptions.filter((_, i) => i !== idx));
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                                    title="Eliminar opción"
                                                >
                                                    <X size={15} />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {pollOptions.length < 8 && (
                                        <button
                                            type="button"
                                            onClick={() => setPollOptions([...pollOptions, ""])}
                                            className="mt-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1.5 py-1.5 px-3 rounded-xl hover:bg-indigo-100/60 dark:hover:bg-indigo-950/50 transition-colors"
                                        >
                                            <Plus size={14} /> Añadir otra opción
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Parámetros de Entrega y Cierre (Tareas, Foros y Encuestas) */}
                        {(postType === 'task' || postType === 'forum' || postType === 'poll') && (
                            <div className={`p-4 rounded-2xl border mt-2 space-y-3 ${
                                postType === 'forum' 
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60' 
                                    : postType === 'poll'
                                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60'
                                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                            }`}>
                                <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 dark:border-gray-700/60">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={hasDueDate} 
                                            onChange={(e) => setHasDueDate(e.target.checked)} 
                                            className={`w-4 h-4 rounded ${
                                                postType === 'forum' 
                                                    ? 'accent-emerald-600' 
                                                    : postType === 'poll'
                                                        ? 'accent-indigo-600'
                                                        : 'accent-[#AD3333]'
                                            }`} 
                                        />
                                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                            {postType === 'forum' 
                                                ? 'Establecer fecha límite de cierre' 
                                                : postType === 'poll'
                                                    ? 'Establecer fecha y hora límite de votación'
                                                    : 'Establecer fecha y hora límite de entrega'
                                            }
                                        </span>
                                    </label>
                                    {!hasDueDate && (
                                        <span className="text-[11px] font-semibold text-gray-400 italic">
                                            Abierto sin límite de tiempo
                                        </span>
                                    )}
                                </div>

                                {hasDueDate && (
                                    <div className="flex flex-wrap gap-4 items-center animate-in fade-in duration-200">
                                        <div>
                                            <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1">
                                                {postType === 'forum' ? 'Fecha de cierre' : postType === 'poll' ? 'Cierre de votación' : 'Fecha límite'}
                                            </label>
                                            <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} className="py-1.5 px-3 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500" required={hasDueDate} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1">
                                                {postType === 'forum' ? 'Hora de cierre' : postType === 'poll' ? 'Hora de cierre' : 'Hora límite'}
                                            </label>
                                            <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} className="py-1.5 px-3 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500" required={hasDueDate} />
                                        </div>
                                        {postType !== 'poll' && (
                                            <label className="flex items-center gap-2 cursor-pointer pt-4">
                                                <input 
                                                    type="checkbox" 
                                                    checked={allowLate} 
                                                    onChange={(e) => setAllowLate(e.target.checked)} 
                                                    className={`w-4 h-4 rounded ${postType === 'forum' ? 'accent-emerald-600' : 'accent-[#AD3333]'}`} 
                                                />
                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                    {postType === 'forum' ? 'Permitir aportes tardíos' : 'Permitir entregas tardías'}
                                                </span>
                                            </label>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Opción Docente: Ocultar fecha y hora de publicación */}
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 mt-1 mb-1">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={hidePublicationDate} 
                                    onChange={(e) => setHidePublicationDate(e.target.checked)} 
                                    className="w-4 h-4 rounded accent-[#AD3333]" 
                                />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                        Ocultar día, fecha y hora de la publicación
                                    </span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                        Los estudiantes no verán el momento en que se publicó esta tarea o contenido.
                                    </span>
                                </div>
                            </label>
                        </div>

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
                                disabled={isPublishing}
                                onClick={async () => {
                                    if (isPublishing || isPublishingRef.current) return;
                                    const cleanTitle = (taskTitle || '').trim();
                                    const cleanDesc = (taskDesc || '').trim();
                                    const rawMainImg = (postImageUrls && postImageUrls.length > 0 ? postImageUrls[0] : (postImageUrl || ''));
                                    const hasAttachments = Boolean(rawMainImg || postVideoUrl || postGeniallyUrl || postFileUrl || audioPub);
                                    if (!cleanTitle && !cleanDesc && !hasAttachments) {
                                        return showMessage("Por favor ingresa al menos un título o descripción para publicar.");
                                    }

                                    const currentPostType = postType || 'task';
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
                                    isPublishingRef.current = true;
                                    setIsPublishing(true);
                                    const finalTargetGroup = fixedTargetGroup || postTargetGroup || 'all';
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
                                        if (!auth.currentUser) {
                                            try {
                                                await Promise.race([
                                                    signInAnonymously(auth),
                                                    new Promise(r => setTimeout(r, 2500))
                                                ]);
                                            } catch (authErr) {
                                                console.warn("Auth initialization note:", authErr);
                                            }
                                        }

                                        const cleanMainImg = typeof rawMainImg === 'string' ? rawMainImg.trim() : '';
                                        const cleanImgList = (postImageUrls && postImageUrls.length > 0 ? postImageUrls : (postImageUrl ? [postImageUrl] : []))
                                            .filter(img => typeof img === 'string' && img.trim())
                                            .map(img => img.trim());

                                        const payload = { 
                                            type: currentPostType, 
                                            title: cleanTitle || (hasAttachments ? 'Publicación adjunta' : 'Sin título'), 
                                            description: cleanDesc, 
                                            authorName: loggedInName || 'Profesora', 
                                            targetGroupId: resolvedTargetGroupId,
                                            imageUrl: cleanMainImg,
                                            imageUrls: cleanImgList, 
                                            fileUrl: postFileUrl || '', 
                                            fileName: postFileName || '', 
                                            dueDate: (isTimed && taskDate) ? String(taskDate) : null, 
                                            dueTime: (isTimed && taskTime) ? String(taskTime) : null, 
                                            allowLate: (isTimed && currentPostType !== 'poll') ? Boolean(allowLate) : (currentPostType === 'poll' ? false : true),
                                            hideDate: Boolean(hidePublicationDate),
                                            createdAt: Date.now(), 
                                            comments: [], 
                                            reactions: {} 
                                        };

                                        if (validPoll) payload.poll = validPoll;
                                        if (postVideoUrl && postVideoUrl.trim()) payload.videoUrl = postVideoUrl.trim();
                                        if (postGeniallyUrl && postGeniallyUrl.trim()) payload.geniallyUrl = extractGeniallyUrl(postGeniallyUrl.trim());
                                        if (audioPub && typeof audioPub === 'string' && audioPub.trim()) payload.audioUrl = audioPub.trim();
                                        if (targetGroupName) payload.targetGroupName = targetGroupName;
                                        if (role) payload.authorRole = role;

                                        // Asegurar que no existan valores undefined en el documento
                                        Object.keys(payload).forEach(k => {
                                            if (payload[k] === undefined) {
                                                delete payload[k];
                                            }
                                        });

                                        try {
                                            await withTimeout(addDoc(collection(effectiveDb, 'artifacts', effectiveAppId, 'public', 'data', 'tasks'), payload));
                                        } catch (primaryErr) {
                                            console.warn("Retrying task creation with basic schema:", primaryErr);
                                            const basicPayload = {
                                                type: currentPostType,
                                                title: cleanTitle || (hasAttachments ? 'Publicación adjunta' : 'Sin título'),
                                                description: cleanDesc,
                                                authorName: loggedInName || 'Profesora',
                                                targetGroupId: resolvedTargetGroupId,
                                                imageUrl: cleanMainImg,
                                                imageUrls: cleanImgList,
                                                fileUrl: postFileUrl || '',
                                                fileName: postFileName || '',
                                                dueDate: isTimed && taskDate ? String(taskDate) : null,
                                                dueTime: isTimed && taskTime ? String(taskTime) : null,
                                                allowLate: (isTimed && currentPostType !== 'poll') ? Boolean(allowLate) : (currentPostType === 'poll' ? false : true),
                                                hideDate: Boolean(hidePublicationDate),
                                                createdAt: Date.now(),
                                                comments: [],
                                                reactions: {}
                                            };
                                            if (postGeniallyUrl && postGeniallyUrl.trim()) basicPayload.geniallyUrl = extractGeniallyUrl(postGeniallyUrl.trim());
                                            if (validPoll) basicPayload.poll = validPoll;
                                            await withTimeout(addDoc(collection(effectiveDb, 'artifacts', effectiveAppId, 'public', 'data', 'tasks'), basicPayload), 10000);
                                        }

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
                                        setPostTargetGroup(fixedTargetGroup || "all");
                                        showMessage(currentPostType === 'poll' ? "Encuesta publicada con éxito." : currentPostType === 'forum' ? "Foro de debate publicado con éxito." : currentPostType === 'task' ? "Tarea publicada con éxito." : "Publicación compartida con éxito.");
                                    } catch (err) {
                                        console.error("Error al publicar:", err);
                                        showMessage(`Error al publicar: ${err?.message || 'Intenta nuevamente.'}`);
                                    } finally {
                                        isPublishingRef.current = false;
                                        setIsPublishing(false);
                                    }
                                }} 
                                className={`!py-2.5 !px-6 text-xs font-bold shadow-lg transition-transform hover:scale-102 rounded-xl text-white flex items-center gap-2 ${
                                    isPublishing ? 'opacity-70 cursor-not-allowed' : ''
                                } ${
                                    postType === 'forum' 
                                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' 
                                        : postType === 'poll'
                                            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                                            : postType === 'post'
                                                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                                                : `${redButton} shadow-red-600/30`
                                }`}
                            >
                                {isPublishing && <Loader2 size={15} className="animate-spin" />}
                                <span>{postType === 'forum' ? 'Publicar foro' : postType === 'poll' ? 'Publicar encuesta' : 'Publicar ahora'}</span>
                            </button>
                        </div>
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
            ) : filteredTasks.length === 0 && wallSearchTerm.trim() ? (
                <div className="text-center py-8 text-sm text-gray-500 italic">
                    No se encontraron publicaciones que coincidan con "{wallSearchTerm}".
                </div>
            ) : visibleTasks.length === 0 && visiblePinnedTasks.length === 0 ? (
                <EmptyState 
                    icon={BookOpen} 
                    title={role === 'student' && myEnrolledGroups.length === 0 ? "Sin materias asignadas" : "Todavía no hay publicaciones"} 
                    message={role === 'student' && myEnrolledGroups.length === 0 ? "Aún no tienes ningún grupo asignado. Tu profesora te asignará a tu materia pronto." : "Cuando la profesora publique una tarea o aviso, aparecerá aquí."} 
                    isDarkMode={isDarkMode} 
                />
            ) : null}
            {/* Sección de publicaciones y tareas fijadas (Pinned Posts) */}
            {visiblePinnedTasks.length > 0 && (
                <div className="space-y-4 mb-5 transition-all duration-500 ease-out">
                    {visiblePinnedTasks.map(task => (
                        <div key={'pinned-' + task.id} className="transition-all duration-500 ease-out transform animate-in fade-in slide-in-from-top-4">
                            <TaskCard 
                                task={{...task, type: task.type || 'task', isPinned: true}} 
                                role={role} 
                                db={db} 
                                appId={appId} 
                                academicGroups={academicGroups}
                                glassCard={glassCard} 
                                glassInput={glassInput} 
                                callGemini={callGemini} 
                                currentUser={user} 
                                showMessage={showMessage} 
                                loggedInName={loggedInName} 
                                isDarkMode={isDarkMode} 
                                confirmAction={confirmAction} 
                                handleOpenProfileByName={handleOpenProfileByName} 
                                setFullScreenImage={setFullScreenImage} 
                                userMappings={userMappings} 
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Publicaciones y tareas regulares */}
            <div className="space-y-4 transition-all duration-300">
                {regularTasksToRender.map(task => (
                    <div key={task.id} className="transition-all duration-300 ease-out">
                        <TaskCard 
                            task={{...task, type: task.type || 'task'}} 
                            role={role} 
                            db={db} 
                            appId={appId} 
                            academicGroups={academicGroups}
                            glassCard={glassCard} 
                            glassInput={glassInput} 
                            callGemini={callGemini} 
                            currentUser={user} 
                            showMessage={showMessage} 
                            loggedInName={loggedInName} 
                            isDarkMode={isDarkMode} 
                            confirmAction={confirmAction} 
                            handleOpenProfileByName={handleOpenProfileByName} 
                            setFullScreenImage={setFullScreenImage} 
                            userMappings={userMappings} 
                        />
                    </div>
                ))}
            </div>
{!tasksLoading && (tasks?.length || 0) >= taskLimit && (
    <button type="button" onClick={loadMoreTasks} className="w-full py-3 mt-6 rounded-xl border-2 border-dashed font-bold transition-all text-sm flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
        <Plus size={18} /> Cargar publicaciones anteriores
    </button>
)}
        </div>
    );
});

export default TasksTab
