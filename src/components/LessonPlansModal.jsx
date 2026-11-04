// src/components/LessonPlansModal.jsx
// Modal visor, editor y gestor de planeaciones de clase guardadas

import React, { useState } from 'react';
import {
  X,
  FileText,
  Trash2,
  Edit3,
  CheckLine,
  Plus,
  CalendarEmoji,
  Clock,
  Printer,
  Copy,
  ChevronDown,
  ChevronRight,
  BookOpen
} from './Icons.jsx';
import {
  formatLessonPlanAsMarkdown,
  stripTimeFromActivityText,
  sanitizeRealisticActivityText,
  sanitizeRealisticResourceText,
  normalizeLessonPlan
} from '../utils/lessonPlanEngine.js';

export function LessonPlansModal({
  isOpen,
  onClose,
  lessonPlans = [],
  onUpdatePlan,
  onDeletePlan,
  isDarkMode = false,
  showMessage
}) {
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // Asegurar lista única sin duplicados por id
  const uniquePlans = React.useMemo(() => {
    const map = new Map();
    (lessonPlans || []).forEach((p) => {
      if (!p || !p.id) return;
      const key = String(p.id).trim();
      const existing = map.get(key);
      if (!existing || (Number(p.updatedAt || p.createdAt || 0) >= Number(existing.updatedAt || existing.createdAt || 0))) {
        map.set(key, p);
      }
    });
    return Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [lessonPlans]);

  if (!isOpen) return null;

  // Plan actualmente seleccionado
  const activePlan = uniquePlans.find((p) => p.id === (selectedPlanId || uniquePlans[0]?.id)) || uniquePlans[0] || null;

  const startEditing = (plan) => {
    setEditingPlanId(plan.id);
    setSelectedPlanId(plan.id);
    setEditForm(JSON.parse(JSON.stringify(plan)));
  };

  const cancelEditing = () => {
    setEditingPlanId(null);
    setEditForm(null);
  };

  const saveEditing = async () => {
    if (!editForm) return;
    const planToSave = normalizeLessonPlan({ ...editForm, updatedAt: Date.now() });
    setSelectedPlanId(planToSave.id);
    await onUpdatePlan(planToSave);
    setEditingPlanId(null);
    setEditForm(null);
    showMessage?.('Planeación actualizada correctamente.');
  };

  const handleCopyMarkdown = (plan) => {
    const text = formatLessonPlanAsMarkdown(plan);
    navigator.clipboard.writeText(text);
    showMessage?.('Planeación copiada al portapapeles.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-5xl max-h-[94vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider">
                  Respaldos IA
                </span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {uniquePlans.length} {uniquePlans.length === 1 ? 'planeación guardada' : 'planeaciones guardadas'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold">Planeaciones de clase (Semanal)</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo: Sidebar con lista + Vista previa/edición */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Sidebar de lista */}
          <div
            className={`w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 flex flex-col overflow-y-auto shrink-0 ${
              isDarkMode ? 'bg-gray-900/60' : 'bg-gray-50/70'
            }`}
          >
            <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs font-bold text-gray-500">
              <span>HISTORIAL DE PLANEACIONES</span>
            </div>

            {uniquePlans.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-gray-400">
                <FileText size={32} className="mx-auto opacity-40" />
                <p className="text-xs font-medium">Aún no hay planeaciones generadas con IA.</p>
                <p className="text-[11px] text-gray-500">
                  Ve a Contenidos, haz clic en "Ayuda" en cualquier semana y presiona "Crear un plan de clase".
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
                {uniquePlans.map((plan) => {
                  const isSelected = activePlan?.id === plan.id;
                  const isEditingThis = editingPlanId === plan.id;
                  const dateStr = plan.createdAt ? new Date(plan.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '';

                  return (
                    <div
                      key={plan.id}
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        if (editingPlanId && editingPlanId !== plan.id) {
                          cancelEditing();
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-purple-900/30 border-purple-500/50 shadow-xs'
                            : 'bg-purple-50 border-purple-300 shadow-xs'
                          : isDarkMode
                            ? 'bg-gray-800/40 border-gray-800 hover:bg-gray-800/80 hover:border-gray-700'
                            : 'bg-white border-gray-200 hover:border-purple-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-[#AD3333] text-white text-[10px] font-black">
                          Semana {plan.week || 1}
                        </span>
                        <span className="text-[10px] text-gray-400">{dateStr}</span>
                      </div>
                      <h4 className="text-xs font-bold truncate text-gray-800 dark:text-gray-100">
                        {plan.weekTopic || plan.learningPurpose || 'Planeación de clase'}
                      </h4>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {plan.unit || 'Universidad de Pamplona'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel Principal: Formato impreso / editor oficial */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {!activePlan ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400">
                <BookOpen size={48} className="opacity-30 mb-3" />
                <h4 className="font-bold text-sm">Ninguna planeación seleccionada</h4>
                <p className="text-xs text-gray-500 mt-1">Selecciona una de la lista o crea una nueva desde Contenidos programáticos.</p>
              </div>
            ) : editingPlanId === activePlan.id && editForm ? (
              /* ================= MODO EDICIÓN ================= */
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <Edit3 size={15} /> Editando planeación (Semana {editForm.week})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={saveEditing}
                      className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckLine size={14} /> Guardar cambios
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-gray-600 dark:text-gray-300 block mb-1">Institución educativa</label>
                    <input
                      type="text"
                      value={editForm.institution || ''}
                      onChange={(e) => setEditForm({ ...editForm, institution: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-600 dark:text-gray-300 block mb-1">Asignatura</label>
                    <input
                      type="text"
                      placeholder="Dejar vacía o especificar..."
                      value={editForm.subject || ''}
                      onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-600 dark:text-gray-300 block mb-1">Profesor</label>
                    <input
                      type="text"
                      value={editForm.teacher || ''}
                      onChange={(e) => setEditForm({ ...editForm, teacher: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-600 dark:text-gray-300 block mb-1">Curso</label>
                    <input
                      type="text"
                      placeholder="Dejar vacío o especificar..."
                      value={editForm.course || ''}
                      onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-bold text-gray-600 dark:text-gray-300 block mb-1">Unidad</label>
                    <input
                      type="text"
                      value={editForm.unit || ''}
                      onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-bold text-gray-600 dark:text-gray-300 block mb-1">Fecha / Rango de fechas (Columna Fecha)</label>
                    <input
                      type="text"
                      placeholder="Ej: Semana 1 o 15 de Noviembre..."
                      value={editForm.rows?.[0]?.date || `Semana ${editForm.week || 1}`}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newRows = (editForm.rows || []).map(r => ({ ...r, date: val }));
                        setEditForm({ ...editForm, rows: newRows });
                      }}
                      className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-bold text-gray-600 dark:text-gray-300 block mb-1">Propósito de aprendizaje</label>
                    <textarea
                      rows={2}
                      value={editForm.learningPurpose || ''}
                      onChange={(e) => setEditForm({ ...editForm, learningPurpose: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-bold text-gray-600 dark:text-gray-300 block mb-1">Propósitos específicos</label>
                    <textarea
                      rows={3}
                      value={editForm.specificPurposes || ''}
                      onChange={(e) => setEditForm({ ...editForm, specificPurposes: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Edición de las 3 filas del cuadro */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-xs font-black uppercase text-gray-500">Fases de la clase (Cuadro)</h5>
                  {(editForm.rows || []).map((row, rIdx) => (
                    <div
                      key={rIdx}
                      className={`p-3.5 rounded-2xl border space-y-2.5 ${
                        isDarkMode ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
                        <span>Fase: {row.phase}</span>
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-gray-500">Tiempo:</label>
                          <input
                            type="text"
                            value={row.time || ''}
                            onChange={(e) => {
                              const newRows = [...editForm.rows];
                              newRows[rIdx].time = e.target.value;
                              setEditForm({ ...editForm, rows: newRows });
                            }}
                            className="w-24 p-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-center font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="font-bold text-gray-500 block mb-1 text-[11px]">Temas</label>
                          <textarea
                            rows={2}
                            value={row.topics || ''}
                            onChange={(e) => {
                              const newRows = [...editForm.rows];
                              newRows[rIdx].topics = e.target.value;
                              setEditForm({ ...editForm, rows: newRows });
                            }}
                            className="w-full p-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-gray-500 block mb-1 text-[11px]">Actividades</label>
                          <textarea
                            rows={3}
                            value={row.activities || ''}
                            onChange={(e) => {
                              const newRows = [...editForm.rows];
                              newRows[rIdx].activities = e.target.value;
                              setEditForm({ ...editForm, rows: newRows });
                            }}
                            className="w-full p-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-gray-500 block mb-1 text-[11px]">Recursos</label>
                          <textarea
                            rows={2}
                            value={row.resources || ''}
                            onChange={(e) => {
                              const newRows = [...editForm.rows];
                              newRows[rIdx].resources = e.target.value;
                              setEditForm({ ...editForm, rows: newRows });
                            }}
                            className="w-full p-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ================= MODO VISUALIZACIÓN OFICIAL (IDÉNTICO A LA IMAGEN) ================= */
              <div className="space-y-4 animate-in fade-in">
                {/* Barra de acciones rápidas */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 text-xs font-black border border-purple-500/20">
                      Semana {activePlan.week}
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      {activePlan.weekTopic || activePlan.unit}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Imprimir o guardar como PDF"
                    >
                      <Printer size={13} /> Imprimir / PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyMarkdown(activePlan)}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Copiar texto estructurado"
                    >
                      <Copy size={13} /> Copiar
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditing(activePlan)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Edit3 size={13} /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('¿Seguro que deseas eliminar esta planeación de clase?')) {
                          const deletedId = activePlan.id;
                          onDeletePlan(deletedId, activePlan);
                          if (selectedPlanId === deletedId) {
                            setSelectedPlanId(null);
                          }
                          showMessage?.('Planeación eliminada.');
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold border border-red-500/20 transition-colors cursor-pointer"
                      title="Eliminar planeación"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* HOJA OFICIAL CON EL FORMATO IDÉNTICO A LA IMAGEN */}
                <div className="p-6 sm:p-8 rounded-2xl bg-white text-black border border-gray-300 shadow-md font-sans text-xs leading-relaxed space-y-4 printable-lesson-plan">
                  {/* Título Principal */}
                  <div className="text-center">
                    <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-black">
                      FORMATO PLANEACIÓN DE CLASE (SEMANAL)
                    </h2>
                  </div>

                  {/* Encabezado con líneas subrayadas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 pt-2">
                    {/* Fila 1: Institución educativa y Asignatura */}
                    <div className="flex items-baseline">
                      <span className="font-extrabold text-black shrink-0 whitespace-nowrap">
                        Institución educativa:&nbsp;
                      </span>
                      <span className="flex-1 border-b border-black font-semibold text-black px-1.5">
                        {activePlan.institution || 'Universidad de Pamplona'}
                      </span>
                    </div>

                    <div className="flex items-baseline">
                      <span className="font-extrabold text-black shrink-0 whitespace-nowrap">
                        Asignatura:&nbsp;
                      </span>
                      <span className="flex-1 border-b border-black font-semibold text-black px-1.5 min-h-[1.25rem]">
                        {activePlan.subject || ''}
                      </span>
                    </div>

                    {/* Fila 2: Profesor, Curso y Unidad */}
                    <div className="flex items-baseline">
                      <span className="font-extrabold text-black shrink-0 whitespace-nowrap">
                        Profesor:&nbsp;
                      </span>
                      <span className="flex-1 border-b border-black font-semibold text-black px-1.5">
                        {activePlan.teacher || ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-baseline">
                        <span className="font-extrabold text-black shrink-0 whitespace-nowrap">
                          Curso:&nbsp;
                        </span>
                        <span className="flex-1 border-b border-black font-semibold text-black px-1.5 min-h-[1.25rem]">
                          {activePlan.course || ''}
                        </span>
                      </div>

                      <div className="flex items-baseline">
                        <span className="font-extrabold text-black shrink-0 whitespace-nowrap">
                          Unidad:&nbsp;
                        </span>
                        <span className="flex-1 border-b border-black font-semibold text-black px-1.5">
                          {activePlan.unit || ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Propósito de aprendizaje */}
                  <div className="pt-2">
                    <div className="flex items-baseline flex-wrap">
                      <span className="font-extrabold text-black shrink-0">
                        Propósito de aprendizaje:&nbsp;
                      </span>
                      <span className="flex-1 min-w-[200px] border-b border-black font-semibold text-black px-1.5">
                        {activePlan.learningPurpose || ''}
                      </span>
                    </div>
                  </div>

                  {/* Propósitos específicos */}
                  <div>
                    <div className="flex items-baseline">
                      <span className="font-extrabold text-black shrink-0">
                        Propósitos específicos:&nbsp;
                      </span>
                      <div className="flex-1 border-b border-black min-h-[1.25rem]" />
                    </div>
                    <div className="pt-1.5 pb-2 border-b border-black whitespace-pre-line text-black font-medium pl-4">
                      {activePlan.specificPurposes || ''}
                    </div>
                    {/* Segunda línea de cierre para respetar la imagen */}
                    <div className="border-b border-black h-1" />
                  </div>

                  {/* CUADRO / TABLA PRINCIPAL EXACTO AL FORMATO */}
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full border-collapse border border-black text-left text-[11px] sm:text-xs">
                      <thead>
                        <tr className="border-b border-black bg-gray-50/70">
                          <th className="border border-black p-2 font-black text-black w-24">Fecha</th>
                          <th className="border border-black p-2 font-black text-black w-28">Fases</th>
                          <th className="border border-black p-2 font-black text-black w-44">Temas</th>
                          <th className="border border-black p-2 font-black text-black">Actividades</th>
                          <th className="border border-black p-2 font-black text-black w-36">Recursos</th>
                          <th className="border border-black p-2 font-black text-black w-20 text-center">Tiempo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activePlan.rows || []).map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-black align-top">
                            {/* Fecha (compartida o individual) */}
                            {rIdx === 0 ? (
                              <td
                                rowSpan={activePlan.rows.length}
                                className="border border-black p-2.5 font-bold text-black text-center align-middle bg-white"
                              >
                                {row.date || `Semana ${activePlan.week}`}
                              </td>
                            ) : null}

                            {/* Fase */}
                            <td className="border border-black p-2.5 font-black text-black bg-white">
                              {row.phase}
                            </td>

                            {/* Temas */}
                            <td className="border border-black p-2.5 text-black font-semibold whitespace-pre-line">
                              {row.topics}
                            </td>

                            {/* Actividades */}
                            <td className="border border-black p-2.5 text-black font-normal whitespace-pre-line leading-relaxed">
                              {stripTimeFromActivityText(sanitizeRealisticActivityText(row.activities, row.phase))}
                            </td>

                            {/* Recursos */}
                            <td className="border border-black p-2.5 text-black font-medium whitespace-pre-line">
                              {sanitizeRealisticResourceText(row.resources)}
                            </td>

                            {/* Tiempo */}
                            <td className="border border-black p-2.5 font-bold text-black text-center whitespace-nowrap">
                              {row.time}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {activePlan ? `Planeación de Semana ${activePlan.week}: ${activePlan.weekTopic || ''}` : 'Sin planeación'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cerrar
          </button>
        </div>

        {/* Estilos CSS para impresión limpia en blanco y negro sin el fondo oscuro del modal */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            .printable-lesson-plan, .printable-lesson-plan * {
              visibility: visible !important;
            }
            .printable-lesson-plan {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 24px !important;
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              color: black !important;
              z-index: 99999999 !important;
            }
            @page {
              margin: 1cm;
              size: portrait;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
