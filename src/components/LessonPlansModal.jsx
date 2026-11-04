// src/components/LessonPlansModal.jsx
// Modal visor, editor y gestor de planeaciones de clase guardadas

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  BookOpen,
  Sparkles,
  Loader2,
  Eye,
  CheckCheck
} from './Icons.jsx';
import {
  formatLessonPlanAsMarkdown,
  stripTimeFromActivityText,
  sanitizeRealisticActivityText,
  sanitizeRealisticResourceText,
  normalizeLessonPlan,
  buildGenerateMaterialPrompt,
  generateDefaultDidacticMaterials
} from '../utils/lessonPlanEngine.js';
import { DidacticMaterialSheet } from './DidacticMaterialSheet.jsx';

export function LessonPlansModal({
  isOpen,
  onClose,
  lessonPlans = [],
  onUpdatePlan,
  onDeletePlan,
  isDarkMode = false,
  showMessage,
  callGemini
}) {
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [activeMaterialModal, setActiveMaterialModal] = useState(null);
  const [printTargetMaterial, setPrintTargetMaterial] = useState(null);
  const [isGeneratingMaterial, setIsGeneratingMaterial] = useState(false);

  // Limpiar objetivo de impresión al finalizar
  useEffect(() => {
    const handleAfterPrint = () => setPrintTargetMaterial(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // Asegurar lista única sin duplicados por id
  const uniquePlans = useMemo(() => {
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

  // Plan actualmente seleccionado
  const activePlan = uniquePlans.find((p) => p.id === (selectedPlanId || uniquePlans[0]?.id)) || uniquePlans[0] || null;

  // Asegurar que activePlan tenga didacticMaterials
  const activeMaterials = useMemo(() => {
    if (!activePlan) return [];
    if (Array.isArray(activePlan.didacticMaterials) && activePlan.didacticMaterials.length > 0) {
      return activePlan.didacticMaterials;
    }
    return generateDefaultDidacticMaterials(activePlan);
  }, [activePlan]);

  if (!isOpen) return null;

  const startEditing = (plan) => {
    setEditingPlanId(plan.id);
    setSelectedPlanId(plan.id);
    const cloned = JSON.parse(JSON.stringify(plan));
    if (!Array.isArray(cloned.didacticMaterials) || cloned.didacticMaterials.length === 0) {
      cloned.didacticMaterials = generateDefaultDidacticMaterials(plan);
    }
    setEditForm(cloned);
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
    showMessage?.('Planeación y materiales didácticos actualizados con éxito.');
  };

  const handleCopyMarkdown = (plan) => {
    const text = formatLessonPlanAsMarkdown(plan);
    navigator.clipboard.writeText(text);
    showMessage?.('Planeación completa con materiales copiada al portapapeles.');
  };

  const handleCopyMaterial = (mat) => {
    if (!mat) return;
    const header = `UNIVERSIDAD DE PAMPLONA\nMATERIAL DIDÁCTICO: ${mat.title}\nTipo: ${mat.type} | Fase: ${mat.phase}\nDescripción: ${mat.description}\n\n`;
    navigator.clipboard.writeText(header + (mat.content || ''));
    showMessage?.(`Material "${mat.title}" copiado al portapapeles.`);
  };

  const handlePrint = () => {
    setPrintTargetMaterial(null);
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const handlePrintMaterial = (mat) => {
    setPrintTargetMaterial(mat);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleGenerateNewMaterialWithAi = async () => {
    if (!callGemini || !activePlan || isGeneratingMaterial) return;
    setIsGeneratingMaterial(true);
    try {
      const prompt = buildGenerateMaterialPrompt({
        plan: activePlan,
        materialType: 'Guía de ejercicios',
        phase: 'Desarrollo'
      });
      const res = await callGemini(prompt);
      let parsed = null;
      try {
        let clean = res.trim();
        const jsonMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (jsonMatch) clean = jsonMatch[1].trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = {
          title: `Guía Práctica de Aplicación: ${activePlan.weekTopic || 'Tema de Clase'}`,
          type: 'Guía de ejercicios',
          phase: 'Desarrollo',
          description: 'Guía complementaria generada con IA para trabajo en el aula.',
          content: res
        };
      }

      const newMaterial = {
        id: `mat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: parsed.title || `Material Didáctico: ${activePlan.weekTopic || 'Tema'}`,
        type: parsed.type || 'Guía de ejercicios',
        phase: parsed.phase || 'Desarrollo',
        description: parsed.description || 'Material didáctico para uso activo en clase.',
        content: stripTimeFromActivityText(sanitizeRealisticActivityText(parsed.content || ''))
      };

      const updatedPlan = {
        ...activePlan,
        didacticMaterials: [...(activePlan.didacticMaterials || activeMaterials), newMaterial],
        updatedAt: Date.now()
      };

      await onUpdatePlan(updatedPlan);
      showMessage?.('¡Nuevo material didáctico generado con IA y guardado en la planeación!');
    } catch (err) {
      console.error('Error generando material didáctico:', err);
      showMessage?.('No se pudo generar el material con IA en este momento.');
    } finally {
      setIsGeneratingMaterial(false);
    }
  };

  const modalContent = (
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

                {/* Edición de Materiales Didácticos */}
                <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h5 className="text-xs font-black uppercase text-gray-700 dark:text-gray-300">
                        Materiales didácticos de la clase ({editForm.didacticMaterials?.length || 0})
                      </h5>
                      <p className="text-[11px] text-gray-500">
                        Guías, lecturas y talleres prácticos listos para imprimir
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const current = editForm.didacticMaterials || [];
                        const newMat = {
                          id: `mat_${Date.now()}`,
                          title: `Guía Práctica: ${editForm.weekTopic || 'Tema de Clase'}`,
                          type: 'Guía de ejercicios',
                          phase: 'Desarrollo',
                          description: 'Taller de aplicación práctica para resolución en parejas.',
                          content: `UNIVERSIDAD DE PAMPLONA\nGUÍA DE TRABAJO PRÁCTICO\nTema: ${editForm.weekTopic || ''}\n\nINSTRUCCIONES:\n...\n\nEJERCICIOS PRÁCTICOS:\n1. ...\n2. ...`
                        };
                        setEditForm({ ...editForm, didacticMaterials: [...current, newMat] });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus size={13} /> Agregar material didáctico
                    </button>
                  </div>

                  {(editForm.didacticMaterials || []).map((mat, mIdx) => (
                    <div
                      key={mat.id || mIdx}
                      className={`p-3.5 rounded-2xl border space-y-2.5 ${
                        isDarkMode ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-purple-600 dark:text-purple-400">
                          Material #{mIdx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editForm.didacticMaterials.filter((_, idx) => idx !== mIdx);
                            setEditForm({ ...editForm, didacticMaterials: updated });
                          }}
                          className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={13} /> Eliminar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="sm:col-span-2">
                          <label className="font-bold text-gray-500 block mb-1 text-[11px]">Título del material</label>
                          <input
                            type="text"
                            value={mat.title || ''}
                            onChange={(e) => {
                              const updated = [...editForm.didacticMaterials];
                              updated[mIdx].title = e.target.value;
                              setEditForm({ ...editForm, didacticMaterials: updated });
                            }}
                            className="w-full p-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-gray-500 block mb-1 text-[11px]">Tipo de material</label>
                          <select
                            value={mat.type || 'Guía de ejercicios'}
                            onChange={(e) => {
                              const updated = [...editForm.didacticMaterials];
                              updated[mIdx].type = e.target.value;
                              setEditForm({ ...editForm, didacticMaterials: updated });
                            }}
                            className="w-full p-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold"
                          >
                            <option value="Guía de ejercicios">Guía de ejercicios</option>
                            <option value="Lectura técnica">Lectura técnica</option>
                            <option value="Taller práctico">Taller práctico</option>
                            <option value="Ficha de trabajo">Ficha de trabajo</option>
                            <option value="Rúbrica de evaluación">Rúbrica de evaluación</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="font-bold text-gray-500 block mb-1 text-[11px]">Descripción / Instrucciones de uso</label>
                          <input
                            type="text"
                            value={mat.description || ''}
                            onChange={(e) => {
                              const updated = [...editForm.didacticMaterials];
                              updated[mIdx].description = e.target.value;
                              setEditForm({ ...editForm, didacticMaterials: updated });
                            }}
                            className="w-full p-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-gray-500 block mb-1 text-[11px]">Fase de la clase</label>
                          <select
                            value={mat.phase || 'Desarrollo'}
                            onChange={(e) => {
                              const updated = [...editForm.didacticMaterials];
                              updated[mIdx].phase = e.target.value;
                              setEditForm({ ...editForm, didacticMaterials: updated });
                            }}
                            className="w-full p-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold"
                          >
                            <option value="Inicio">Inicio</option>
                            <option value="Desarrollo">Desarrollo</option>
                            <option value="Cierre - Tarea">Cierre - Tarea</option>
                          </select>
                        </div>
                        <div className="sm:col-span-3">
                          <label className="font-bold text-gray-500 block mb-1 text-[11px]">
                            Contenido completo y redactado (Listo para imprimir)
                          </label>
                          <textarea
                            rows={6}
                            value={mat.content || ''}
                            onChange={(e) => {
                              const updated = [...editForm.didacticMaterials];
                              updated[mIdx].content = e.target.value;
                              setEditForm({ ...editForm, didacticMaterials: updated });
                            }}
                            className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-mono leading-relaxed"
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
                      onClick={() => {
                        document.getElementById('didactic-materials-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold flex items-center gap-1.5 text-purple-600 dark:text-purple-400 transition-colors cursor-pointer"
                      title="Ver materiales didácticos de la clase"
                    >
                      <BookOpen size={13} /> Materiales ({activeMaterials.length})
                    </button>
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
                <div 
                  data-darkreader-ignore="true"
                  data-lesson-plan-sheet="true"
                  className="p-6 sm:p-8 rounded-2xl bg-white text-black border-2 border-gray-300 shadow-md font-sans text-xs leading-relaxed space-y-4 printable-lesson-plan"
                  style={{
                    color: '#000000',
                    WebkitTextFillColor: '#000000',
                    backgroundColor: '#ffffff',
                    colorScheme: 'only light',
                    forcedColorAdjust: 'none',
                    isolation: 'isolate'
                  }}
                >
                  {/* Título Principal */}
                  <div className="text-center">
                    <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-black" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                      FORMATO PLANEACIÓN DE CLASE (SEMANAL)
                    </h2>
                  </div>

                  {/* Encabezado con líneas subrayadas */}
                  <div className="space-y-3 pt-2">
                    {/* Fila 1: Institución educativa y Asignatura */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                      <div className="flex-1 flex items-baseline min-w-0">
                        <span className="font-black text-black shrink-0 whitespace-nowrap" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                          Institución educativa:&nbsp;
                        </span>
                        <span className="flex-1 border-b-2 border-black font-bold text-black px-1.5 truncate" style={{ color: '#000000', borderColor: '#000000', WebkitTextFillColor: '#000000' }}>
                          {activePlan.institution || 'Universidad de Pamplona'}
                        </span>
                      </div>

                      <div className="w-full sm:w-2/5 flex items-baseline min-w-0">
                        <span className="font-black text-black shrink-0 whitespace-nowrap" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                          Asignatura:&nbsp;
                        </span>
                        <span className="flex-1 border-b-2 border-black font-bold text-black px-1.5 min-h-[1.25rem] truncate" style={{ color: '#000000', borderColor: '#000000', WebkitTextFillColor: '#000000' }}>
                          {activePlan.subject || ''}
                        </span>
                      </div>
                    </div>

                    {/* Fila 2: Profesor, Curso y Unidad */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                      <div className="flex-1 flex items-baseline min-w-0">
                        <span className="font-black text-black shrink-0 whitespace-nowrap" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                          Profesor:&nbsp;
                        </span>
                        <span className="flex-1 border-b-2 border-black font-bold text-black px-1.5 truncate" style={{ color: '#000000', borderColor: '#000000', WebkitTextFillColor: '#000000' }}>
                          {activePlan.teacher || ''}
                        </span>
                      </div>

                      <div className="w-full sm:w-36 flex items-baseline min-w-0">
                        <span className="font-black text-black shrink-0 whitespace-nowrap" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                          Curso:&nbsp;
                        </span>
                        <span className="flex-1 border-b-2 border-black font-bold text-black px-1.5 min-h-[1.25rem] truncate" style={{ color: '#000000', borderColor: '#000000', WebkitTextFillColor: '#000000' }}>
                          {activePlan.course || ''}
                        </span>
                      </div>

                      <div className="w-full sm:w-56 flex items-baseline min-w-0">
                        <span className="font-black text-black shrink-0 whitespace-nowrap" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                          Unidad:&nbsp;
                        </span>
                        <span className="flex-1 border-b-2 border-black font-bold text-black px-1.5 truncate" style={{ color: '#000000', borderColor: '#000000', WebkitTextFillColor: '#000000' }} title={activePlan.unit || ''}>
                          {activePlan.unit || ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Propósito de aprendizaje */}
                  <div className="pt-2">
                    <div className="flex items-baseline flex-wrap">
                      <span className="font-black text-black shrink-0" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                        Propósito de aprendizaje:&nbsp;
                      </span>
                      <span className="flex-1 min-w-[200px] border-b-2 border-black font-semibold text-black px-1.5" style={{ color: '#000000', borderColor: '#000000', WebkitTextFillColor: '#000000' }}>
                        {activePlan.learningPurpose || ''}
                      </span>
                    </div>
                  </div>

                  {/* Propósitos específicos */}
                  <div className="pt-1">
                    <div className="flex items-baseline">
                      <span className="font-black text-black shrink-0" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                        Propósitos específicos:&nbsp;
                      </span>
                      <div className="flex-1 border-b-2 border-black min-h-[1.25rem]" style={{ borderColor: '#000000' }} />
                    </div>
                    <div className="pt-1.5 pb-2 border-b-2 border-black whitespace-pre-line text-black font-medium pl-4" style={{ color: '#000000', borderColor: '#000000', WebkitTextFillColor: '#000000' }}>
                      {activePlan.specificPurposes || ''}
                    </div>
                    {/* Segunda línea de cierre para respetar la imagen */}
                    <div className="border-b-2 border-black h-1" style={{ borderColor: '#000000' }} />
                  </div>

                  {/* CUADRO / TABLA PRINCIPAL EXACTO AL FORMATO */}
                  <div className="overflow-x-auto pt-3">
                    <table className="w-full border-collapse border-2 border-black text-left text-[11px] sm:text-xs" style={{ borderColor: '#000000' }}>
                      <thead>
                        <tr className="border-b-2 border-black bg-gray-100" style={{ borderColor: '#000000', backgroundColor: '#f3f4f6' }}>
                          <th className="border border-black p-2 font-black text-black w-24 text-center" style={{ color: '#000000', borderColor: '#000000', backgroundColor: '#f3f4f6', WebkitTextFillColor: '#000000' }}>Fecha</th>
                          <th className="border border-black p-2 font-black text-black w-28 text-center" style={{ color: '#000000', borderColor: '#000000', backgroundColor: '#f3f4f6', WebkitTextFillColor: '#000000' }}>Fases</th>
                          <th className="border border-black p-2 font-black text-black w-44" style={{ color: '#000000', borderColor: '#000000', backgroundColor: '#f3f4f6', WebkitTextFillColor: '#000000' }}>Temas</th>
                          <th className="border border-black p-2 font-black text-black" style={{ color: '#000000', borderColor: '#000000', backgroundColor: '#f3f4f6', WebkitTextFillColor: '#000000' }}>Actividades</th>
                          <th className="border border-black p-2 font-black text-black w-36" style={{ color: '#000000', borderColor: '#000000', backgroundColor: '#f3f4f6', WebkitTextFillColor: '#000000' }}>Recursos</th>
                          <th className="border border-black p-2 font-black text-black w-20 text-center" style={{ color: '#000000', borderColor: '#000000', backgroundColor: '#f3f4f6', WebkitTextFillColor: '#000000' }}>Tiempo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activePlan.rows || []).map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-black align-top" style={{ borderColor: '#000000' }}>
                            {/* Fecha (compartida o individual) */}
                            {rIdx === 0 ? (
                              <td
                                rowSpan={activePlan.rows.length}
                                className="border border-black p-2.5 font-black text-black text-center align-middle bg-white"
                                style={{ color: '#000000', borderColor: '#000000', backgroundColor: '#ffffff', WebkitTextFillColor: '#000000' }}
                              >
                                {row.date || `Semana ${activePlan.week || 1}`}
                              </td>
                            ) : null}

                            {/* Fase */}
                            <td className="border border-black p-2.5 font-black text-black text-center bg-gray-50/70" style={{ color: '#000000', borderColor: '#000000', WebkitTextFillColor: '#000000' }}>
                              {row.phase}
                            </td>

                            {/* Temas */}
                            <td className="border border-black p-2.5 text-black font-semibold whitespace-pre-line" style={{ color: '#000000', borderColor: '#000000', WebkitTextFillColor: '#000000' }}>
                              {row.topics}
                            </td>

                            {/* Actividades */}
                            <td className="border border-black p-2.5 text-black font-normal whitespace-pre-line leading-relaxed" style={{ color: '#000000', borderColor: '#000000', WebkitTextFillColor: '#000000' }}>
                              {stripTimeFromActivityText(sanitizeRealisticActivityText(row.activities, row.phase))}
                            </td>

                            {/* Recursos */}
                            <td className="border border-black p-2.5 text-black font-medium whitespace-pre-line" style={{ color: '#000000', borderColor: '#000000', WebkitTextFillColor: '#000000' }}>
                              {sanitizeRealisticResourceText(row.resources)}
                            </td>

                            {/* Tiempo */}
                            <td className="border border-black p-2.5 font-black text-black text-center whitespace-nowrap" style={{ color: '#000000', borderColor: '#000000', WebkitTextFillColor: '#000000' }}>
                              {row.time}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ================= SECCIÓN DE MATERIALES DIDÁCTICOS (LISTOS PARA IMPRIMIR O USAR) ================= */}
                <div id="didactic-materials-section" className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
                        <BookOpen size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-100">
                            Materiales Didácticos de la Clase
                          </h4>
                          <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-black">
                            {activeMaterials.length}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Guías, lecturas y talleres prácticos listos para imprimir o entregar en clase
                        </p>
                      </div>
                    </div>

                    {callGemini && (
                      <button
                        type="button"
                        onClick={handleGenerateNewMaterialWithAi}
                        disabled={isGeneratingMaterial}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isGeneratingMaterial ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                        <span>{isGeneratingMaterial ? 'Generando con IA...' : '✨ Diseñar nuevo material con IA'}</span>
                      </button>
                    )}
                  </div>

                  {activeMaterials.length === 0 ? (
                    <div className="p-6 text-center border rounded-2xl border-dashed border-gray-300 dark:border-gray-700 space-y-1">
                      <p className="text-xs font-semibold text-gray-500">No hay materiales didácticos adicionales generados.</p>
                      {callGemini && (
                        <button
                          type="button"
                          onClick={handleGenerateNewMaterialWithAi}
                          className="text-xs font-bold text-purple-600 hover:underline"
                        >
                          Generar guía práctica con IA ahora
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {activeMaterials.map((mat, mIdx) => (
                        <div
                          key={mat.id || mIdx}
                          className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                            isDarkMode
                              ? 'bg-gray-800/40 border-gray-700/80 hover:border-purple-500/50'
                              : 'bg-white border-gray-200 hover:border-purple-300 shadow-xs'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-1">
                              <span className="px-2 py-0.5 rounded-md bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase">
                                {mat.type || 'Guía de ejercicios'}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400">
                                Fase: {mat.phase || 'Desarrollo'}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-snug">
                              {mat.title}
                            </h5>
                            <p className="text-[11px] text-gray-500 line-clamp-2">
                              {mat.description}
                            </p>
                            <div className="flex items-center gap-1.5 pt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <FileText size={12} />
                              <span>Formato oficial: Hoja Blanca de Aula (UP)</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-gray-100 dark:border-gray-700/60">
                            <button
                              type="button"
                              onClick={() => setActiveMaterialModal(mat)}
                              className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Eye size={13} /> Ver hoja blanca
                            </button>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyMaterial(mat)}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                title="Copiar texto del material"
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintMaterial(mat)}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                title="Imprimir este material"
                              >
                                <Printer size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Lectura y Visualización Completa de un Material Didáctico en HOJA BLANCA */}
        {activeMaterialModal && (
          <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xs animate-in fade-in">
            <div
              className={`w-full max-w-4xl max-h-[94vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
                isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              {/* Cabecera del modal */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0 border border-purple-500/20">
                    <BookOpen size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider">
                        {activeMaterialModal.type || 'Material Didáctico'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold truncate">
                        Fase: {activeMaterialModal.phase || 'Desarrollo'} • Formato Hoja Blanca
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-extrabold truncate">
                      {activeMaterialModal.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePrintMaterial(activeMaterialModal)}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    title="Imprimir hoja de trabajo / Guardar como PDF"
                  >
                    <Printer size={13} />
                    <span className="hidden sm:inline">Imprimir / PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMaterialModal(null)}
                    className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Contenedor tipo mesa de trabajo / visor con la HOJA BLANCA en el centro */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-8 bg-gray-200/80 dark:bg-black/60">
                <DidacticMaterialSheet
                  material={activeMaterialModal}
                  plan={activePlan}
                />
              </div>

              {/* Footer con acciones */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/70 shrink-0">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Hoja oficial de trabajo lista para imprimir o fotocopiar para la clase
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyMaterial(activeMaterialModal)}
                    className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy size={13} /> Copiar texto
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintMaterial(activeMaterialModal)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Printer size={13} /> Imprimir hoja blanca
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vista oculta exclusivamente para imprimir un solo material didáctico */}
        {printTargetMaterial && (
          <div className="printable-material-single hidden print:block bg-white text-black font-sans printable-lesson-plan">
            <DidacticMaterialSheet
              material={printTargetMaterial}
              plan={activePlan}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {activePlan ? `Planeación de Semana ${activePlan.week}: ${activePlan.weekTopic || ''}` : 'Sin planeación'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

        {/* Estilos CSS para contraste absoluto en pantalla y en impresión */}
        <style>{`
          .printable-lesson-plan,
          .printable-lesson-plan *,
          [data-lesson-plan-sheet],
          [data-lesson-plan-sheet] * {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            border-color: #000000 !important;
            color-scheme: only light !important;
            forced-color-adjust: none !important;
            --darkreader-inline-color: #000000 !important;
            --darkreader-inline-bg: #ffffff !important;
            --darkreader-inline-border: #000000 !important;
          }
          .printable-lesson-plan th,
          [data-lesson-plan-sheet] th {
            background-color: #f3f4f6 !important;
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            font-weight: 900 !important;
          }
          .printable-lesson-plan td,
          [data-lesson-plan-sheet] td {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
          }
          @media print {
            body * {
              visibility: hidden !important;
            }
            ${
              printTargetMaterial
                ? `.printable-material-single, .printable-material-single * {
                    visibility: visible !important;
                  }
                  .printable-material-single {
                    display: block !important;
                    position: fixed !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    background: white !important;
                    color: black !important;
                    z-index: 99999999 !important;
                  }
                  .printable-material-sheet {
                    border: none !important;
                    box-shadow: none !important;
                    max-width: 100% !important;
                    padding: 0.5cm !important;
                    border-radius: 0 !important;
                  }`
                : `.printable-lesson-plan, .printable-lesson-plan * {
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
                  }`
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

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
