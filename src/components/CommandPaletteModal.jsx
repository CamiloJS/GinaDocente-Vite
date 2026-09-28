// src/components/CommandPaletteModal.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  Search, FileText, BookOpen, CheckCheck, UsersIcon, UsersGroupIcon, X, ChevronRight, Clock
} from './Icons.jsx';

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export const CommandPaletteModal = ({
  isOpen,
  onClose,
  tasks = [],
  academicGroups = [],
  evaluations = [],
  userMappings = {},
  reviews = [],
  changeTab,
  handleOpenProfileByName,
  setSelectedGroupForFeed,
  isDarkMode = false,
  role = 'student'
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleGlobalKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (isOpen) {
          onClose?.();
        } else {
          window.dispatchEvent(new CustomEvent('open-command-palette'));
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isOpen, onClose]);

  const getMembersCount = (g) => Array.isArray(g?.members) ? g.members.length : (g?.members && typeof g.members === 'object' ? Object.keys(g.members).length : 0);

  const results = useMemo(() => {
    const q = norm(query);
    if (!q) {
      return {
        tasks: (tasks || []).slice(0, 3).map(t => ({
          id: t.id,
          title: t.title || 'Publicación',
          subtitle: t.targetGroupName || 'General',
          type: 'task',
          item: t
        })),
        academicGroups: (academicGroups || []).slice(0, 3).map(g => ({
          id: g.id,
          title: g.name,
          subtitle: `${getMembersCount(g)} integrantes`,
          type: 'group',
          item: g
        })),
        evaluations: (evaluations || []).slice(0, 3).map(e => ({
          id: e.id,
          title: e.title || 'Evaluación',
          subtitle: e.dueDate ? `Vence: ${e.dueDate}` : 'Sin fecha',
          type: 'evaluation',
          item: e
        })),
        students: role === 'teacher' ? Object.entries(userMappings || {}).slice(0, 3).filter(([k]) => k !== 'teacher').map(([k, u]) => ({
          id: k,
          title: u.fullName || u.name || k,
          subtitle: u.customLabel || u.email || 'Estudiante',
          type: 'student',
          item: { key: k, user: u }
        })) : []
      };
    }

    const filteredTasks = (tasks || []).filter(t => 
      norm(t.title).includes(q) || norm(t.description).includes(q) || norm(t.targetGroupName).includes(q)
    ).slice(0, 5).map(t => ({
      id: t.id,
      title: t.title || 'Publicación',
      subtitle: t.targetGroupName || 'General',
      type: 'task',
      item: t
    }));

    const filteredGroups = (academicGroups || []).filter(g => 
      norm(g.name).includes(q)
    ).slice(0, 4).map(g => ({
      id: g.id,
      title: g.name,
      subtitle: `${getMembersCount(g)} integrantes`,
      type: 'group',
      item: g
    }));

    const filteredEvals = (evaluations || []).filter(e => 
      norm(e.title).includes(q) || norm(e.description).includes(q)
    ).slice(0, 4).map(e => ({
      id: e.id,
      title: e.title || 'Evaluación',
      subtitle: e.dueDate ? `Vence: ${e.dueDate}` : 'Sin fecha',
      type: 'evaluation',
      item: e
    }));

    const filteredStudents = Object.entries(userMappings || {})
      .filter(([uk, ud]) => uk !== 'teacher' && (norm(uk).includes(q) || norm(ud?.fullName).includes(q) || norm(ud?.email).includes(q)))
      .slice(0, 5)
      .map(([k, u]) => ({
        id: k,
        title: u.fullName || u.name || k,
        subtitle: u.customLabel || u.email || 'Estudiante',
        type: 'student',
        item: { key: k, user: u }
      }));

    return {
      tasks: filteredTasks,
      academicGroups: filteredGroups,
      evaluations: filteredEvals,
      students: role === 'teacher' ? filteredStudents : []
    };
  }, [query, tasks, academicGroups, evaluations, userMappings, role]);

  const totalResultsCount = results.tasks.length + results.academicGroups.length + results.evaluations.length + results.students.length;

  if (!isOpen || typeof document === 'undefined' || !document.body) return null;

  const handleSelectTask = (task) => {
    onClose?.();
    if (changeTab) changeTab('tasks');
  };

  const handleSelectGroup = (group) => {
    onClose?.();
    if (setSelectedGroupForFeed) setSelectedGroupForFeed(group);
    if (changeTab) changeTab('groups');
  };

  const handleSelectEval = (evalItem) => {
    onClose?.();
    if (changeTab) changeTab('evaluations');
  };

  const handleSelectStudent = (studentData) => {
    onClose?.();
    if (handleOpenProfileByName) {
      handleOpenProfileByName(studentData?.user?.fullName || studentData?.user?.name || studentData?.id, studentData?.key);
    }
  };

  return ReactDOM.createPortal(
    <div 
      className={`fixed inset-0 z-[99999] flex items-start justify-center pt-16 sm:pt-24 p-3 bg-black/60 backdrop-blur-md animate-in fade-in duration-150 ${isDarkMode ? 'dark' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div 
        className={`w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 ${
          isDarkMode ? 'bg-gray-900 border-gray-700/80 text-gray-100' : 'bg-white border-gray-200 text-gray-800'
        }`}
      >
        {/* Cabecera del buscador */}
        <div className={`p-3.5 sm:p-4 border-b flex items-center gap-3 ${isDarkMode ? 'border-gray-800 bg-gray-900/90' : 'border-gray-100 bg-gray-50/70'}`}>
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={role === 'teacher' ? "Buscar tareas, materias, evaluaciones o estudiantes..." : "Buscar tareas, materias o evaluaciones..."}
            className="w-full bg-transparent border-none outline-none text-sm font-medium placeholder-gray-400"
          />
          {query ? (
            <button 
              type="button" 
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={15} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700">
              ESC
            </kbd>
          )}
        </div>

        {/* Lista de Resultados */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4">
          {totalResultsCount === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 font-medium">
              No se encontraron resultados para "{query}".
            </div>
          ) : (
            <>
              {/* Tareas y Anuncios */}
              {results.tasks.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <FileText size={12} />
                    <span>Tareas y Anuncios</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {results.tasks.map(item => (
                      <button
                        key={'task-' + item.id}
                        onClick={() => handleSelectTask(item.item)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors ${
                          isDarkMode ? 'hover:bg-gray-800/80 text-gray-200' : 'hover:bg-gray-100/80 text-gray-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{item.title}</p>
                          <p className="text-[11px] text-gray-400 truncate">{item.subtitle}</p>
                        </div>
                        <ChevronRight size={13} className="text-gray-400 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Materias y Grupos */}
              {results.academicGroups.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <BookOpen size={12} />
                    <span>Materias y Grupos</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {results.academicGroups.map(item => (
                      <button
                        key={'group-' + item.id}
                        onClick={() => handleSelectGroup(item.item)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors ${
                          isDarkMode ? 'hover:bg-gray-800/80 text-gray-200' : 'hover:bg-gray-100/80 text-gray-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{item.title}</p>
                          <p className="text-[11px] text-gray-400 truncate">{item.subtitle}</p>
                        </div>
                        <ChevronRight size={13} className="text-gray-400 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Evaluaciones */}
              {results.evaluations.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <CheckCheck size={12} />
                    <span>Evaluaciones</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {results.evaluations.map(item => (
                      <button
                        key={'eval-' + item.id}
                        onClick={() => handleSelectEval(item.item)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors ${
                          isDarkMode ? 'hover:bg-gray-800/80 text-gray-200' : 'hover:bg-gray-100/80 text-gray-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{item.title}</p>
                          <p className="text-[11px] text-gray-400 truncate">{item.subtitle}</p>
                        </div>
                        <ChevronRight size={13} className="text-gray-400 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Estudiantes y Directorio */}
              {results.students.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <UsersIcon size={12} />
                    <span>Estudiantes</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {results.students.map(item => (
                      <button
                        key={'stud-' + item.id}
                        onClick={() => handleSelectStudent(item.item)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors ${
                          isDarkMode ? 'hover:bg-gray-800/80 text-gray-200' : 'hover:bg-gray-100/80 text-gray-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{item.title}</p>
                          <p className="text-[11px] text-gray-400 truncate">{item.subtitle}</p>
                        </div>
                        <ChevronRight size={13} className="text-gray-400 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie de navegación */}
        <div className={`p-2.5 px-4 border-t flex items-center justify-between text-[11px] text-gray-400 ${isDarkMode ? 'border-gray-800 bg-gray-900/60' : 'border-gray-100 bg-gray-50/50'}`}>
          <div className="flex items-center gap-3">
            <span>Presiona <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-[10px] font-mono">Ctrl + K</kbd> en cualquier momento</span>
          </div>
          <span>Búsqueda rápida</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
export default CommandPaletteModal;
