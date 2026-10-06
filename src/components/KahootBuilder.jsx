// src/components/KahootBuilder.jsx
// Editor de preguntas para Kahoot.

import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  ImageIcon,
  Clock,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Copy,
  Zap,
  X,
  Gamepad2,
} from './Icons.jsx';
import {
  KAHOOT_COLORS,
  KAHOOT_TIME_OPTIONS,
  KAHOOT_POINTS_OPTIONS,
  KAHOOT_QUESTION_TYPES,
  KAHOOT_MAX_QUESTIONS,
  createDefaultKahootQuestion,
  normalizeKahootQuestion,
  generarKahootConIA,
} from '../utils/kahootEngine.js';
import { compressImage, uploadImageToStorage } from '../utils/helpers.js';

const IDIOMAS_IA = [
  { value: 'en', label: 'Inglés' },
  { value: 'es', label: 'Español' },
  { value: 'bilingue', label: 'Bilingüe (EN/ES)' },
  { value: 'fr', label: 'Francés' },
  { value: 'bilingue_fr', label: 'Bilingüe (FR/ES)' },
  { value: 'en_fr', label: 'Inglés y francés' },
];

const KahootBuilder = ({
  questions = [],
  setQuestions,
  taskTitle = '',
  taskDesc = '',
  callGemini,
  showMessage,
  isDarkMode = false,
  isDemoMode = false,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(6);
  const [aiDifficulty, setAiDifficulty] = useState('media');
  const [aiLanguage, setAiLanguage] = useState('en');
  const [aiMix, setAiMix] = useState('variado');
  const [aiTimeLimit, setAiTimeLimit] = useState(20);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isGeneratingSingleAi, setIsGeneratingSingleAi] = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [showImageUrlInput, setShowImageUrlInput] = useState(false);

  const safeQuestions = Array.isArray(questions) && questions.length > 0
    ? questions
    : [createDefaultKahootQuestion('quiz', 0)];

  const safeIdx = Math.max(0, Math.min(activeIndex, safeQuestions.length - 1));
  const currentQ = normalizeKahootQuestion(safeQuestions[safeIdx], safeIdx, { preserveDraft: true });

  const updateQuestionAt = (idx, updater) => {
    setQuestions((prev) => {
      const list = Array.isArray(prev) && prev.length > 0 ? [...prev] : [createDefaultKahootQuestion('quiz', 0)];
      const target = normalizeKahootQuestion(list[idx], idx, { preserveDraft: true });
      const updated = typeof updater === 'function' ? updater(target) : { ...target, ...updater };
      list[idx] = normalizeKahootQuestion(updated, idx, { preserveDraft: true });
      return list;
    });
  };

  const handleAddQuestion = (type = 'quiz') => {
    if (safeQuestions.length >= KAHOOT_MAX_QUESTIONS) {
      showMessage?.(`Máximo ${KAHOOT_MAX_QUESTIONS} preguntas por Kahoot.`);
      return;
    }
    const newQ = createDefaultKahootQuestion(type, safeQuestions.length);
    const nextList = [...safeQuestions, newQ];
    setQuestions(nextList);
    setActiveIndex(nextList.length - 1);
  };

  const handleDuplicateQuestion = (idx) => {
    if (safeQuestions.length >= KAHOOT_MAX_QUESTIONS) {
      showMessage?.(`Máximo ${KAHOOT_MAX_QUESTIONS} preguntas por Kahoot.`);
      return;
    }
    const source = normalizeKahootQuestion(safeQuestions[idx], idx, { preserveDraft: true });
    const copyId = `kq_${Date.now()}_${safeQuestions.length}`;
    const duplicated = {
      ...source,
      id: copyId,
      options: (source.options || []).map((o, oi) => ({ ...o, id: `${copyId}_${oi}` })),
    };
    const nextList = [...safeQuestions];
    nextList.splice(idx + 1, 0, duplicated);
    setQuestions(nextList);
    setActiveIndex(idx + 1);
    showMessage?.('Pregunta duplicada.');
  };

  const handleDeleteQuestion = (idx) => {
    if (safeQuestions.length <= 1) {
      showMessage?.('El Kahoot debe tener al menos 1 pregunta.');
      return;
    }
    const nextList = safeQuestions.filter((_, i) => i !== idx);
    setQuestions(nextList);
    setActiveIndex(Math.max(0, Math.min(idx, nextList.length - 1)));
  };

  const handleMoveQuestion = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= safeQuestions.length) return;
    const nextList = [...safeQuestions];
    const [moved] = nextList.splice(idx, 1);
    nextList.splice(targetIdx, 0, moved);
    setQuestions(nextList);
    setActiveIndex(targetIdx);
  };

  const handleTypeChange = (newType) => {
    updateQuestionAt(safeIdx, (prev) => {
      if (prev.type === newType) return prev;
      const base = createDefaultKahootQuestion(newType, safeIdx);
      return {
        ...base,
        id: prev.id,
        text: prev.text,
        imageUrl: prev.imageUrl,
        imageReveal: prev.imageReveal,
        timeLimit: prev.timeLimit,
        pointsMultiplier: prev.pointsMultiplier,
        explanation: prev.explanation,
      };
    });
  };

  const handleApplyTimeToAll = (seconds) => {
    setQuestions((prev) =>
      (prev || []).map((q, i) => ({
        ...normalizeKahootQuestion(q, i, { preserveDraft: true }),
        timeLimit: seconds,
      }))
    );
    showMessage?.(`Tiempo de ${seconds}s aplicado a todas las preguntas.`);
  };

  const handleUploadQuestionImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showMessage?.('Por favor selecciona un archivo de imagen válido.');
      return;
    }
    setIsUploadingImg(true);
    try {
      const compressed = await compressImage(file, 1000, 1000, 0.78);
      if (isDemoMode) {
        updateQuestionAt(safeIdx, { imageUrl: compressed });
        showMessage?.('Imagen añadida a la pregunta (Modo Demo).');
      } else {
        const url = await uploadImageToStorage(compressed, 'kahoot_images');
        updateQuestionAt(safeIdx, { imageUrl: url });
        showMessage?.('Imagen subida a la pregunta.');
      }
    } catch (err) {
      console.error('Error subiendo imagen de Kahoot:', err);
      showMessage?.('No se pudo subir la imagen.');
    } finally {
      setIsUploadingImg(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleGenerateFullKahootAi = async (mode = 'replace') => {
    const effectiveTopic = (aiTopic || taskTitle || taskDesc || '').trim();
    if (!effectiveTopic) {
      showMessage?.('Escribe el tema del Kahoot en el campo de IA o en el título de la actividad.');
      return;
    }
    const safeAiCount = Math.max(1, Math.min(KAHOOT_MAX_QUESTIONS, Number(aiCount) || 6));
    setAiCount(safeAiCount);
    setIsGeneratingAi(true);
    try {
      const res = await generarKahootConIA(
        {
          tema: effectiveTopic,
          total: safeAiCount,
          dificultad: aiDifficulty,
          idioma: aiLanguage,
          mezcla: aiMix,
          timeLimit: aiTimeLimit,
        },
        callGemini
      );
      if (!res.ok || !res.questions.length) {
        showMessage?.(res.error || 'No se pudieron generar las preguntas con IA.');
        return;
      }
      if (mode === 'append') {
        const baseList = safeQuestions.filter((q) => q.text?.trim());
        const combined = [...baseList, ...res.questions]
          .slice(0, KAHOOT_MAX_QUESTIONS)
          .map((q, idx) => {
            const idReal = `kq_item_${idx}`;
            return {
              ...q,
              id: idReal,
              options: Array.isArray(q.options)
                ? q.options.map((o, oi) => ({ ...o, id: `${idReal}_${oi}` }))
                : [],
            };
          });
        const addedCount = Math.max(0, combined.length - baseList.length);
        setQuestions(combined);
        setActiveIndex(Math.max(0, combined.length - (addedCount || 1)));
        showMessage?.(`✨ Se añadieron ${addedCount} preguntas con IA.`);
      } else {
        setQuestions(res.questions);
        setActiveIndex(0);
        showMessage?.(`✨ Kahoot de ${res.questions.length} preguntas generado con IA.`);
      }
      setShowAiPanel(false);
    } catch (err) {
      console.error('Error generando Kahoot con IA:', err);
      showMessage?.('Error al conectar con la IA.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAutoCompleteSingleQuestionAi = async () => {
    const seedText = (currentQ.text || taskTitle || taskDesc || '').trim();
    if (!seedText) {
      showMessage?.('Escribe una idea o pregunta en el enunciado para que la IA genere las opciones.');
      return;
    }
    setIsGeneratingSingleAi(true);
    try {
      const singleMix =
        currentQ.type === 'truefalse'
          ? 'solo_vf'
          : currentQ.type === 'type_answer'
            ? 'solo_type_answer'
            : currentQ.type === 'puzzle'
              ? 'solo_puzzle'
              : 'solo_quiz';
      const res = await generarKahootConIA(
        {
          tema: `Crea 1 excelente pregunta sobre: ${seedText}`,
          total: 1,
          dificultad: aiDifficulty,
          idioma: aiLanguage,
          mezcla: singleMix,
          timeLimit: currentQ.timeLimit || 20,
        },
        callGemini
      );
      if (res.ok && res.questions[0]) {
        const gen = res.questions[0];
        updateQuestionAt(safeIdx, {
          ...gen,
          id: currentQ.id,
          type: currentQ.type,
          imageUrl: currentQ.imageUrl || gen.imageUrl || '',
          timeLimit: currentQ.timeLimit || gen.timeLimit || 20,
          pointsMultiplier: currentQ.pointsMultiplier,
        });
        showMessage?.('✨ Pregunta y opciones generadas con IA.');
      } else {
        showMessage?.('No se pudo autocompletar la pregunta con IA.');
      }
    } catch {
      showMessage?.('Error al autocompletar con IA.');
    } finally {
      setIsGeneratingSingleAi(false);
    }
  };

  const isQuestionValid = (q) => {
    if (!q?.text?.trim()) return false;
    if (q.type === 'type_answer') return Boolean(q.correctAnswer?.trim());
    if (q.type === 'puzzle') return (q.puzzleItems || []).filter((x) => String(x || '').trim()).length >= 3;
    const validOpts = (q.options || []).filter((o) => String(o.text || '').trim());
    return validOpts.length >= 2 && validOpts.some((o) => o.isCorrect);
  };

  return (
    <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-gradient-to-br from-purple-50/60 via-white to-indigo-50/40 dark:from-purple-950/25 dark:via-gray-900 dark:to-indigo-950/20 space-y-4 mt-2 animate-in fade-in duration-200">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-purple-200/70 dark:border-purple-800/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#46178F] to-[#7B2CBF] text-white flex items-center justify-center shadow-sm shrink-0">
            <Gamepad2 size={17} />
          </div>
          <h4 className="text-xs font-black text-purple-950 dark:text-purple-100 flex items-center gap-2">
            <span>Kahoot</span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-600 text-white">
              {safeQuestions.length} {safeQuestions.length === 1 ? 'pregunta' : 'preguntas'}
            </span>
          </h4>
        </div>

        <button
          type="button"
          onClick={() => setShowAiPanel(!showAiPanel)}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
            showAiPanel
              ? 'bg-purple-700 text-white ring-2 ring-purple-400/50'
              : 'bg-gradient-to-r from-[#46178F] via-purple-600 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white'
          }`}
        >
          <Sparkles size={14} />
          <span>{showAiPanel ? 'Cerrar IA' : 'Crear Kahoot con IA'}</span>
        </button>
      </div>

      {/* Panel de generación con IA */}
      {showAiPanel && (
        <div className="p-4 rounded-2xl border border-purple-300 dark:border-purple-700/80 bg-purple-100/50 dark:bg-purple-950/40 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
              <Sparkles size={15} className="text-purple-600 dark:text-purple-400" />
              Crear Kahoot con IA
            </span>
            <button
              type="button"
              onClick={() => setShowAiPanel(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            >
              <X size={15} />
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
              Tema:
            </label>
            <textarea
              rows={2}
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder={
                taskTitle
                  ? `Escribe detalles o usa "${taskTitle}"...`
                  : 'Escribe el tema de las preguntas...'
              }
              className="w-full py-2 px-3 text-xs font-medium rounded-xl bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                Preguntas
              </label>
              <input
                type="number"
                min={1}
                max={KAHOOT_MAX_QUESTIONS}
                value={aiCount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setAiCount('');
                    return;
                  }
                  const num = parseInt(val, 10);
                  if (!Number.isNaN(num)) {
                    setAiCount(Math.max(1, Math.min(KAHOOT_MAX_QUESTIONS, num)));
                  }
                }}
                onBlur={() => {
                  setAiCount((prev) => Math.max(1, Math.min(KAHOOT_MAX_QUESTIONS, Number(prev) || 6)));
                }}
                className="w-full py-1.5 px-2.5 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                Formato
              </label>
              <select
                value={aiMix}
                onChange={(e) => setAiMix(e.target.value)}
                className="w-full py-1.5 px-2 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="variado">Quiz y V/F</option>
                <option value="completo">Todos los tipos</option>
                <option value="solo_quiz">Solo Quiz</option>
                <option value="solo_vf">Solo V/F</option>
                <option value="solo_type_answer">Solo Respuesta corta</option>
                <option value="solo_puzzle">Solo Puzzle</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                Dificultad
              </label>
              <select
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(e.target.value)}
                className="w-full py-1.5 px-2 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="facil">Fácil</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                Idioma
              </label>
              <select
                value={aiLanguage}
                onChange={(e) => setAiLanguage(e.target.value)}
                className="w-full py-1.5 px-2 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              >
                {IDIOMAS_IA.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                Tiempo
              </label>
              <select
                value={aiTimeLimit}
                onChange={(e) => setAiTimeLimit(Number(e.target.value))}
                className="w-full py-1.5 px-2 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              >
                {KAHOOT_TIME_OPTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec} s
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {safeQuestions.some((q) => q.text?.trim()) && safeQuestions.filter((q) => q.text?.trim()).length < KAHOOT_MAX_QUESTIONS && (
              <button
                type="button"
                disabled={isGeneratingAi}
                onClick={() => handleGenerateFullKahootAi('append')}
                className="px-3.5 py-2 rounded-xl border border-purple-500 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingAi ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>Añadir al final</span>
              </button>
            )}
            <button
              type="button"
              disabled={isGeneratingAi}
              onClick={() => handleGenerateFullKahootAi('replace')}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingAi ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>{isGeneratingAi ? 'Generando...' : 'Generar preguntas'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra horizontal de preguntas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
        {safeQuestions.map((q, idx) => {
          const norm = normalizeKahootQuestion(q, idx, { preserveDraft: true });
          const isSelected = idx === safeIdx;
          const valid = isQuestionValid(norm);
          const typeInfo = KAHOOT_QUESTION_TYPES[norm.type] || KAHOOT_QUESTION_TYPES.quiz;
          return (
            <button
              key={norm.id || idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-[#46178F] text-white border-[#46178F] shadow-md shadow-purple-500/25 scale-102'
                  : isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-purple-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                  isSelected
                    ? 'bg-white text-[#46178F]'
                    : valid
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}
              >
                {idx + 1}
              </span>
              <div className="text-left">
                <div className="flex items-center gap-1 leading-none">
                  <span>{typeInfo.shortLabel}</span>
                  {norm.pointsMultiplier === 2 && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400 text-gray-950 font-black">
                      x2
                    </span>
                  )}
                  {norm.imageUrl && <ImageIcon size={11} className="opacity-80" />}
                </div>
                <span
                  className={`block text-[10px] truncate max-w-[90px] mt-0.5 font-normal ${
                    isSelected ? 'text-purple-200' : 'text-gray-400'
                  }`}
                >
                  {norm.text || 'Pregunta'}
                </span>
              </div>
            </button>
          );
        })}

        {/* Botones para agregar nueva pregunta */}
        <div className="flex items-center gap-1 shrink-0 pl-1">
          <button
            type="button"
            onClick={() => handleAddQuestion('quiz')}
            className="px-3 py-2 rounded-xl border-2 border-dashed border-purple-400 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
            title="Añadir pregunta de selección múltiple"
          >
            <Plus size={14} /> Quiz
          </button>
          <button
            type="button"
            onClick={() => handleAddQuestion('truefalse')}
            className="px-2.5 py-2 rounded-xl border-2 border-dashed border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
            title="Añadir pregunta de Verdadero o Falso"
          >
            <Plus size={14} /> V/F
          </button>
        </div>
      </div>

      {/* Editor de la pregunta seleccionada */}
      <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900/90 space-y-4 shadow-2xs">
        {/* Fila 1: Controles de tipo, tiempo, puntos y orden */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de Tipo de Pregunta */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
              {Object.values(KAHOOT_QUESTION_TYPES).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeChange(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                    currentQ.type === t.id
                      ? 'bg-[#46178F] text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={t.description}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tiempo límite */}
            <div className="flex items-center gap-1">
              <Clock size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
              <select
                value={currentQ.timeLimit}
                onChange={(e) => updateQuestionAt(safeIdx, { timeLimit: Number(e.target.value) })}
                className="py-1 px-2 text-xs font-bold rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 outline-none"
                title="Tiempo límite"
              >
                {KAHOOT_TIME_OPTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec} s
                  </option>
                ))}
              </select>
              {safeQuestions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleApplyTimeToAll(currentQ.timeLimit)}
                  className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline px-1"
                  title="Aplicar este tiempo a todas las preguntas"
                >
                  Aplicar a todas
                </button>
              )}
            </div>

            {/* Multiplicador de Puntos */}
            <div className="flex items-center gap-1">
              <Zap size={14} className="text-amber-500 shrink-0" />
              <select
                value={currentQ.pointsMultiplier}
                onChange={(e) => updateQuestionAt(safeIdx, { pointsMultiplier: Number(e.target.value) })}
                className="py-1 px-2 text-xs font-bold rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 outline-none"
                title="Puntaje"
              >
                {KAHOOT_POINTS_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Acciones de la pregunta */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safeIdx === 0}
              onClick={() => handleMoveQuestion(safeIdx, -1)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
              title="Subir"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              disabled={safeIdx === safeQuestions.length - 1}
              onClick={() => handleMoveQuestion(safeIdx, 1)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
              title="Bajar"
            >
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleDuplicateQuestion(safeIdx)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40"
              title="Duplicar"
            >
              <Copy size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteQuestion(safeIdx)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Enunciado de la pregunta */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-xs font-extrabold text-gray-700 dark:text-gray-200">
              Pregunta #{safeIdx + 1} <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              disabled={isGeneratingSingleAi}
              onClick={handleAutoCompleteSingleQuestionAi}
              className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingSingleAi ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              <span>Completar con IA</span>
            </button>
          </div>

          <input
            type="text"
            value={currentQ.text}
            onChange={(e) => updateQuestionAt(safeIdx, { text: e.target.value })}
            placeholder="Escribe la pregunta aquí..."
            className="w-full py-3 px-4 text-sm sm:text-base font-extrabold rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:border-purple-500 text-center shadow-inner"
          />
        </div>

        {/* Imagen de la pregunta */}
        <div className="p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40">
          {currentQ.imageUrl ? (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative group shrink-0">
                <img
                  src={currentQ.imageUrl}
                  alt={`Pregunta ${safeIdx + 1}`}
                  className="h-28 w-44 object-cover rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => updateQuestionAt(safeIdx, { imageUrl: '', imageReveal: 'none' })}
                  className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md cursor-pointer"
                  title="Quitar imagen"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="flex-1 flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => updateQuestionAt(safeIdx, { imageReveal: 'none' })}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    currentQ.imageReveal !== 'blur'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Imagen normal
                </button>
                <button
                  type="button"
                  onClick={() => updateQuestionAt(safeIdx, { imageReveal: 'blur' })}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    currentQ.imageReveal === 'blur'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Revelado progresivo
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <ImageIcon size={15} className="text-purple-500" />
                <span>Imagen (opcional)</span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <label className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-purple-500 cursor-pointer flex items-center gap-1.5 shadow-2xs">
                  {isUploadingImg ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
                  <span>{isUploadingImg ? 'Subiendo...' : 'Subir imagen'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadQuestionImage}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setShowImageUrlInput(!showImageUrlInput)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-purple-500 cursor-pointer"
                >
                  Enlace URL
                </button>
                {typeof window !== 'undefined' && window.openGifPicker && (
                  <button
                    type="button"
                    onClick={() =>
                      window.openGifPicker?.((url) => updateQuestionAt(safeIdx, { imageUrl: url }))
                    }
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-xs font-bold text-purple-600 dark:text-purple-400 hover:border-purple-500 cursor-pointer"
                  >
                    GIF
                  </button>
                )}
              </div>
              {showImageUrlInput && (
                <div className="w-full flex items-center gap-2 mt-2">
                  <input
                    type="url"
                    value={currentQ.imageUrl || ''}
                    onChange={(e) => updateQuestionAt(safeIdx, { imageUrl: e.target.value })}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className="flex-1 py-1.5 px-3 text-xs rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowImageUrlInput(false)}
                    className="text-xs font-bold text-gray-500 hover:text-gray-800 px-2"
                  >
                    Listo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Opciones según el tipo de pregunta */}
        {(currentQ.type === 'quiz' || currentQ.type === 'truefalse') && (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Opciones
              </span>
              {currentQ.type === 'quiz' && (
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      const nonEmptyCorrectIdx = currentQ.options.findIndex(
                        (o) => o.isCorrect && String(o.text || '').trim()
                      );
                      const firstCorrectIdx =
                        nonEmptyCorrectIdx >= 0
                          ? nonEmptyCorrectIdx
                          : Math.max(0, currentQ.options.findIndex((o) => o.isCorrect));
                      updateQuestionAt(safeIdx, {
                        allowMultiple: false,
                        options: currentQ.options.map((o, i) => ({
                          ...o,
                          isCorrect: i === firstCorrectIdx,
                        })),
                      });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      !currentQ.allowMultiple
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Respuesta única
                  </button>
                  <button
                    type="button"
                    onClick={() => updateQuestionAt(safeIdx, { allowMultiple: true })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      currentQ.allowMultiple
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Varias correctas
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {(currentQ.options || []).map((opt, oIdx) => {
                const colorInfo = KAHOOT_COLORS[oIdx % KAHOOT_COLORS.length];
                return (
                  <div
                    key={opt.id || oIdx}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl border-2 transition-all ${
                      opt.isCorrect
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/25 shadow-xs'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl ${colorInfo.badgeClass} font-black text-base flex items-center justify-center shrink-0 shadow-xs select-none`}
                    >
                      {colorInfo.symbol}
                    </div>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateQuestionAt(safeIdx, (prev) => ({
                          ...prev,
                          options: prev.options.map((item, i) =>
                            i === oIdx ? { ...item, text: val } : item
                          ),
                        }));
                      }}
                      placeholder={
                        currentQ.type === 'truefalse'
                          ? oIdx === 0
                            ? 'Verdadero'
                            : 'Falso'
                          : `Opción ${oIdx + 1}${oIdx >= 2 ? ' (opcional)' : ''}`
                      }
                      className="flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        updateQuestionAt(safeIdx, (prev) => {
                          if (prev.allowMultiple) {
                            return {
                              ...prev,
                              options: prev.options.map((item, i) =>
                                i === oIdx ? { ...item, isCorrect: !item.isCorrect } : item
                              ),
                            };
                          }
                          return {
                            ...prev,
                            options: prev.options.map((item, i) => ({
                              ...item,
                              isCorrect: i === oIdx,
                            })),
                          };
                        });
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                        opt.isCorrect
                          ? 'bg-emerald-600 text-white shadow-sm scale-102'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-emerald-500/20'
                      }`}
                      title="Marcar como respuesta correcta"
                    >
                      <CheckCircle2 size={14} />
                      <span className="hidden sm:inline">{opt.isCorrect ? 'Correcta' : 'Marcar'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Editor para Respuesta Corta */}
        {currentQ.type === 'type_answer' && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1">
                Respuesta correcta <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={currentQ.correctAnswer || ''}
                onChange={(e) => updateQuestionAt(safeIdx, { correctAnswer: e.target.value })}
                placeholder="Escribe la respuesta correcta"
                className="w-full py-2 px-3 text-xs sm:text-sm font-bold rounded-xl bg-white dark:bg-gray-900 border border-blue-300 dark:border-blue-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1">
                Otras respuestas válidas (separadas por coma, opcional)
              </label>
              <input
                type="text"
                value={
                  currentQ.acceptedAnswersInput !== undefined
                    ? currentQ.acceptedAnswersInput
                    : (currentQ.acceptedAnswers || []).join(', ')
                }
                onChange={(e) => {
                  const rawVal = e.target.value;
                  updateQuestionAt(safeIdx, {
                    acceptedAnswersInput: rawVal,
                    acceptedAnswers: rawVal
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  });
                }}
                placeholder="Opcional"
                className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Editor para Puzzle */}
        {currentQ.type === 'puzzle' && (
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-200">
              Escribe los elementos en el orden correcto:
            </label>
            {[0, 1, 2, 3].map((pIdx) => {
              const colorInfo = KAHOOT_COLORS[pIdx % KAHOOT_COLORS.length];
              const val = currentQ.puzzleItems?.[pIdx] || '';
              return (
                <div key={pIdx} className="flex items-center gap-2">
                  <span
                    className={`w-8 h-8 rounded-xl ${colorInfo.badgeClass} font-black text-xs flex items-center justify-center shrink-0`}
                  >
                    {pIdx + 1}°
                  </span>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => {
                      const nextItems = [...(currentQ.puzzleItems || ['', '', '', ''])];
                      nextItems[pIdx] = e.target.value;
                      updateQuestionAt(safeIdx, { puzzleItems: nextItems });
                    }}
                    placeholder={`Opción ${pIdx + 1}${pIdx === 3 ? ' (opcional)' : ''}`}
                    className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Retroalimentación breve */}
        <div>
          <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
            Explicación o retroalimentación breve
          </label>
          <input
            type="text"
            value={currentQ.explanation || ''}
            onChange={(e) => updateQuestionAt(safeIdx, { explanation: e.target.value })}
            placeholder="Escribe aquí tu retroalimentación"
            className="w-full py-2 px-3 text-xs font-medium rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
    </div>
  );
};

export default KahootBuilder;
