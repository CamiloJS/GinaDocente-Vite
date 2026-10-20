// src/components/TargetStudentsModal.jsx
// Modal para asignar la evaluación a estudiantes específicos.
// Se renderiza con createPortal en document.body con z-[250] para garantizar
// que ningún panel lateral (como el chat en z-0) se sobreponga ni lo obstruya.

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, CheckCircle2, UserCheck, UsersIcon } from './Icons.jsx';
import { glassCard, glassInput } from '../utils/styles.js';
import { DEMO_USER_MAPPINGS } from '../utils/demoData.js';
import { resolveUserPhoto } from '../utils/helpers.js';

export default function TargetStudentsModal({
  isOpen,
  onClose,
  selectedStudentIds = [],
  onSave,
  userMappings = {},
  academicGroups = [],
  targetGroupId = 'all',
  targetGroupName = 'Todos los estudiantes (Global)',
  isDarkMode = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState(targetGroupId && targetGroupId !== 'all' ? 'group' : 'all');
  const [currentSelection, setCurrentSelection] = useState(() => Array.isArray(selectedStudentIds) ? [...selectedStudentIds] : []);

  // Sincronizar selección cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setCurrentSelection(Array.isArray(selectedStudentIds) ? [...selectedStudentIds] : []);
      setSearchTerm('');
      setFilterMode(targetGroupId && targetGroupId !== 'all' ? 'group' : 'all');
    }
  }, [isOpen, selectedStudentIds, targetGroupId]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lista unificada de estudiantes registrados
  const allStudents = useMemo(() => {
    const map = new Map();

    const isTeacherKey = (k) => {
      const lower = String(k || '').toLowerCase();
      return lower.includes('docente') || lower.includes('teacher') || lower === 'gina' || lower === 'camilo';
    };

    // 1. Desde userMappings o datos demo
    const activeMap = (userMappings && Object.keys(userMappings).length > 0) ? userMappings : DEMO_USER_MAPPINGS;
    Object.entries(activeMap || {}).forEach(([key, u]) => {
      if (!u || u.role === 'teacher' || isTeacherKey(key) || isTeacherKey(u.username) || isTeacherKey(u.id)) return;
      const id = String(u.id || key).trim();
      if (!id) return;

      map.set(id, {
        id,
        key,
        name: u.fullName || u.name || key,
        username: u.username || key,
        email: u.email || '',
        profilePicUrl: resolveUserPhoto(u, userMappings, u.profilePicUrl || ''),
        academicGroupId: u.academicGroupId || ''
      });
    });

    // 2. Desde miembros de grupos académicos
    (academicGroups || []).forEach((g) => {
      const members = Array.isArray(g.members)
        ? g.members
        : (g.members && typeof g.members === 'object' ? Object.keys(g.members) : []);

      members.forEach((m) => {
        if (!m || isTeacherKey(m)) return;
        const cleanM = String(m).trim();
        if (!map.has(cleanM)) {
          const uInfo = userMappings?.[cleanM] || userMappings?.[cleanM.toLowerCase().replace(/^@/, '')] || {};
          map.set(cleanM, {
            id: cleanM,
            key: cleanM,
            name: uInfo.fullName || uInfo.name || cleanM,
            username: uInfo.username || cleanM,
            email: uInfo.email || '',
            profilePicUrl: resolveUserPhoto(cleanM, userMappings, uInfo.profilePicUrl || ''),
            academicGroupId: g.id
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [userMappings, academicGroups]);

  // Obtener miembros del grupo asignado si aplica
  const groupMemberIds = useMemo(() => {
    if (!targetGroupId || targetGroupId === 'all') return null;
    const targetGroup = (academicGroups || []).find((g) => g.id === targetGroupId);
    if (!targetGroup) return null;
    const members = Array.isArray(targetGroup.members)
      ? targetGroup.members
      : (targetGroup.members && typeof targetGroup.members === 'object' ? Object.keys(targetGroup.members) : []);
    return new Set(members.map((m) => String(m).toLowerCase().trim()));
  }, [targetGroupId, academicGroups]);

  // Filtrado según búsqueda y grupo
  const filteredStudents = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return allStudents.filter((st) => {
      if (filterMode === 'group' && groupMemberIds) {
        const matchesGroup = groupMemberIds.has(String(st.id).toLowerCase()) ||
          groupMemberIds.has(String(st.key).toLowerCase()) ||
          groupMemberIds.has(String(st.email).toLowerCase()) ||
          groupMemberIds.has(String(st.username).toLowerCase());
        if (!matchesGroup) return false;
      }

      if (!q) return true;
      const n = (st.name || '').toLowerCase();
      const u = (st.username || '').toLowerCase();
      const em = (st.email || '').toLowerCase();
      return n.includes(q) || u.includes(q) || em.includes(q);
    });
  }, [allStudents, searchTerm, filterMode, groupMemberIds]);

  if (!isOpen || typeof document === 'undefined') return null;

  const toggleStudent = (id) => {
    setCurrentSelection((prev) => {
      const exists = prev.includes(id);
      return exists ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  const selectAllVisible = () => {
    const visibleIds = filteredStudents.map((s) => s.id);
    setCurrentSelection((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const deselectAllVisible = () => {
    const visibleIdsSet = new Set(filteredStudents.map((s) => s.id));
    setCurrentSelection((prev) => prev.filter((id) => !visibleIdsSet.has(id)));
  };

  const clearAll = () => setCurrentSelection([]);

  const handleConfirm = () => {
    onSave(currentSelection);
    onClose();
  };

  const totalSelected = currentSelection.length;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`${glassCard} !p-0 w-full max-w-xl rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150`}
      >
        {/* Cabecera */}
        <div className="p-4 sm:p-5 border-b border-gray-200/80 dark:border-gray-800 flex items-start justify-between gap-3 bg-gradient-to-r from-purple-500/10 via-blue-500/5 to-transparent">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <UsersIcon size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 leading-tight">
                Asignar a estudiantes específicos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                Solo los estudiantes marcados podrán ver y presentar esta evaluación.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer shrink-0"
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="p-3.5 sm:p-4 border-b border-gray-100 dark:border-gray-800/80 space-y-2.5 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar estudiante por nombre, usuario o correo..."
              className={`${glassInput} !pl-9 !py-2 text-xs w-full`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {groupMemberIds ? (
              <div className="flex items-center gap-1.5 bg-gray-200/60 dark:bg-gray-800 p-0.5 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setFilterMode('group')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    filterMode === 'group'
                      ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-300 shadow-xs'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Grupo: {targetGroupName.slice(0, 18)}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-300 shadow-xs'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Todos ({allStudents.length})
                </button>
              </div>
            ) : (
              <span className="text-[11px] font-semibold text-gray-500">
                Total estudiantes: {allStudents.length}
              </span>
            )}

            <div className="flex items-center gap-1.5 ml-auto text-[11px] font-bold">
              <button
                type="button"
                onClick={selectAllVisible}
                className="text-purple-600 dark:text-purple-400 hover:underline px-1 py-0.5 cursor-pointer"
              >
                Seleccionar visibles
              </button>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <button
                type="button"
                onClick={deselectAllVisible}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-1 py-0.5 cursor-pointer"
              >
                Deseleccionar visibles
              </button>
              {totalSelected > 0 && (
                <>
                  <span className="text-gray-300 dark:text-gray-700">·</span>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-rose-600 hover:underline px-1 py-0.5 cursor-pointer"
                  >
                    Limpiar todo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Lista de estudiantes scrolleable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 divide-y divide-gray-100 dark:divide-gray-800/60 max-h-[50vh]">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-10 px-4 text-gray-500">
              <UsersIcon size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-xs font-bold">No se encontraron estudiantes</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Prueba con otro término de búsqueda o cambia el filtro de grupo.
              </p>
            </div>
          ) : (
            filteredStudents.map((st) => {
              const isSelected = currentSelection.includes(st.id);
              const initial = (st.name || st.username || '?').trim().charAt(0).toUpperCase();

              return (
                <div
                  key={st.id}
                  onClick={() => toggleStudent(st.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all select-none pt-2.5 ${
                    isSelected
                      ? 'bg-purple-500/10 border border-purple-500/30 dark:bg-purple-950/20'
                      : isDarkMode
                      ? 'hover:bg-gray-800/50 border border-transparent'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer shrink-0"
                  />

                  {st.profilePicUrl ? (
                    <img
                      src={st.profilePicUrl}
                      alt={st.name}
                      className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {initial}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                      {st.name}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      @{st.username} {st.email ? `· ${st.email}` : ''}
                    </p>
                  </div>

                  {isSelected && (
                    <CheckCircle2 size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pie con contador y botones de acción */}
        <div className="p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2.5 bg-gray-50/70 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                totalSelected > 0
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-300'
                  : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {totalSelected === 0
                ? 'Todos los estudiantes (sin restricción)'
                : `${totalSelected} estudiante${totalSelected === 1 ? '' : 's'} seleccionado${totalSelected === 1 ? '' : 's'}`}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                isDarkMode
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <UserCheck size={14} />
              Confirmar asignación ({totalSelected})
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
