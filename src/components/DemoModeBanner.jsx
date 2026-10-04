// src/components/DemoModeBanner.jsx
// Barra superior informativa, explicador contextual por pestaña y modal de tour interactivo
// para el Modo Demo / Invitado de English TECH.

import React, { useState } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  X, 
  ChevronRight, 
  LogOutIcon, 
  Compass, 
  CheckCircle2, 
  Lightbulb,
  GraduationCap
} from './Icons.jsx';
import { DEMO_GUIDE_TOUR, DEMO_TAB_INFO } from '../utils/demoData.js';

export function DemoModeBanner({ activeTab, onExitDemo, isDarkMode, glassCard }) {
  const [showTourModal, setShowTourModal] = useState(false);
  const [selectedTourStep, setSelectedTourStep] = useState(0);

  const currentTabExplanation = DEMO_TAB_INFO[activeTab] || DEMO_TAB_INFO.tasks;

  return (
    <>
      {/* BANNER SUPERIOR DE AVISO */}
      <aside aria-label="Aviso de Modo Demo" className="w-full bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white shadow-md z-40 border-b border-purple-500/40 transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2.5 text-center sm:text-left min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-xs">
              <Sparkles size={16} className="text-amber-300 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="font-black tracking-wider uppercase bg-amber-400 text-purple-950 px-2 py-0.5 rounded-full text-[10px] shadow-xs">
                  Modo Demo / Invitado
                </span>
                <span className="font-semibold text-white/90 hidden md:inline">
                  Contenido pedagógico simulado
                </span>
              </div>
              <p className="text-[11px] text-purple-100/90 truncate max-w-xl">
                Explora libremente English TECH. Tus acciones no afectarán las notas ni los datos reales del curso.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowTourModal(true)}
              className="py-1.5 px-3 rounded-xl bg-white text-purple-900 font-bold hover:bg-purple-50 shadow-xs transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <HelpCircle size={14} className="text-purple-700" />
              <span>¿Cómo funciona?</span>
            </button>
            <button
              type="button"
              onClick={onExitDemo}
              className="py-1.5 px-3 rounded-xl bg-purple-900/60 hover:bg-purple-950 text-white font-bold border border-purple-400/40 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
              title="Salir del modo demostración y volver a la pantalla de acceso"
            >
              <LogOutIcon size={14} />
              <span>Salir del demo</span>
            </button>
          </div>
        </div>
      </aside>

      {/* TARJETA EXPLICATIVA CONTEXTUAL DE LA PESTAÑA */}
      <section aria-label="Guía contextual de la sección" className="max-w-[680px] mx-auto px-2 md:px-0 pt-2 mb-2">
        <div className={`${glassCard} !p-3.5 border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent rounded-2xl flex items-start gap-3 shadow-xs`}>
          <div className="w-8 h-8 rounded-xl bg-purple-600/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20 mt-0.5">
            <Compass size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-purple-300' : 'text-purple-900'}`}>
                {currentTabExplanation.title}
              </h4>
              <button
                type="button"
                onClick={() => setShowTourModal(true)}
                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 shrink-0"
              >
                <span>Ver tour</span>
                <ChevronRight size={12} />
              </button>
            </div>
            <p className={`text-xs mt-0.5 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {currentTabExplanation.summary}
            </p>
          </div>
        </div>
      </section>

      {/* MODAL DEL TOUR INTERACTIVO Y EXPLICACIÓN DE FUNCIONALIDADES */}
      {showTourModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`${glassCard} max-w-2xl w-full rounded-3xl p-5 sm:p-6 shadow-2xl border border-purple-500/30 relative flex flex-col max-h-[90vh]`}>
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Guía de English TECH
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Descubre qué hace cada módulo y cómo funciona la plataforma
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTourModal(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido con pestañas interactivas */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEMO_GUIDE_TOUR.map((step, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedTourStep(idx)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedTourStep === idx
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-500/30'
                        : isDarkMode
                          ? 'bg-gray-800/70 border-gray-700 text-gray-300 hover:bg-gray-800'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <p className="text-xs font-bold truncate">{step.title}</p>
                    <span className={`text-[10px] font-semibold block mt-0.5 ${
                      selectedTourStep === idx ? 'text-purple-100' : 'text-gray-400'
                    }`}>
                      {step.badge}
                    </span>
                  </button>
                ))}
              </div>

              {/* Detalle del paso seleccionado */}
              <div className={`p-4 sm:p-5 rounded-2xl border ${
                isDarkMode 
                  ? 'bg-gray-800/50 border-gray-700 text-gray-200' 
                  : 'bg-purple-50/50 border-purple-200 text-gray-800'
              } space-y-2.5 animate-in fade-in`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm sm:text-base font-extrabold text-purple-700 dark:text-purple-300">
                    {DEMO_GUIDE_TOUR[selectedTourStep].title}
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200">
                    {DEMO_GUIDE_TOUR[selectedTourStep].badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {DEMO_GUIDE_TOUR[selectedTourStep].description}
                </p>
              </div>

              {/* Tips rápidos */}
              <div className={`p-3 rounded-2xl border flex items-start gap-2.5 text-xs ${
                isDarkMode ? 'bg-amber-950/20 border-amber-800/40 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Tip de navegación:</strong> Puedes responder los simulacros de evaluación, votar en las encuestas y escuchar las narraciones en voz alta con inteligencia artificial directamente desde este modo demo.
                </p>
              </div>
            </div>

            {/* Pie de modal */}
            <div className="pt-3 border-t border-gray-200/80 dark:border-gray-800 flex items-center justify-between gap-3">
              <span className="text-[11px] text-gray-400 font-medium">
                Paso {selectedTourStep + 1} de {DEMO_GUIDE_TOUR.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTourStep((prev) => (prev + 1) % DEMO_GUIDE_TOUR.length)}
                  className="py-2 px-3.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Siguiente tema
                </button>
                <button
                  type="button"
                  onClick={() => setShowTourModal(false)}
                  className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>Entendido, explorar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
