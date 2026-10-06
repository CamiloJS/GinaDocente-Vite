// src/components/DemoModeBanner.jsx
import React, { useState } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  X, 
  LogOutIcon, 
  CheckCircle2, 
  GraduationCap,
  Shield,
  RotateCcw
} from './Icons.jsx';
import { DEMO_GUIDE_TOUR, DEMO_SUBJECT_NAME } from '../utils/demoData.js';

export function DemoModeBanner({ onExitDemo, onResetDemo, role = 'student', onSwitchDemoRole, isDarkMode, glassCard }) {
  const [showTourModal, setShowTourModal] = useState(false);
  const [selectedTourStep, setSelectedTourStep] = useState(0);

  const isTeacherDemo = role === 'teacher';

  return (
    <>
      {/* BANNER SUPERIOR COMPACTO */}
      <aside
        aria-label="Modo Demo"
        className={`w-full ${
          isTeacherDemo
            ? 'bg-gradient-to-r from-indigo-800 via-purple-800 to-fuchsia-900 border-fuchsia-400/40'
            : 'bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 border-purple-500/40'
        } text-white shadow-sm z-40 border-b transition-all`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/25">
              {isTeacherDemo ? (
                <Shield size={15} className="text-amber-300" />
              ) : (
                <Sparkles size={15} className="text-amber-300" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-black tracking-wider uppercase bg-amber-400 text-purple-950 px-2 py-0.5 rounded-full text-[10px]">
                Modo Demo
              </span>
              <span className="font-bold text-purple-100 text-xs truncate">
                {DEMO_SUBJECT_NAME}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 shrink-0">
            {onSwitchDemoRole && (
              <div
                role="group"
                aria-label="Cambiar rol"
                className="inline-flex items-center p-0.5 rounded-xl bg-black/25 border border-white/15"
              >
                <button
                  type="button"
                  onClick={() => onSwitchDemoRole('student')}
                  className={`py-1 px-2.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                    !isTeacherDemo
                      ? 'bg-white text-purple-900 shadow-xs'
                      : 'text-purple-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Estudiante
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchDemoRole('teacher')}
                  className={`py-1 px-2.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                    isTeacherDemo
                      ? 'bg-amber-400 text-purple-950 shadow-xs'
                      : 'text-purple-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Docente
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowTourModal(true)}
              className="py-1 px-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold border border-white/20 transition-colors flex items-center gap-1 cursor-pointer text-xs"
            >
              <HelpCircle size={13} />
              <span>Guía</span>
            </button>
            {onResetDemo && (
              <button
                type="button"
                onClick={onResetDemo}
                className="py-1 px-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold border border-white/20 transition-colors flex items-center gap-1 cursor-pointer text-xs"
                title="Reiniciar datos de prueba"
              >
                <RotateCcw size={13} />
                <span className="hidden sm:inline">Reiniciar</span>
              </button>
            )}
            <button
              type="button"
              onClick={onExitDemo}
              className="py-1 px-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-950 text-white font-bold border border-purple-400/30 transition-colors flex items-center gap-1 cursor-pointer text-xs"
            >
              <LogOutIcon size={13} />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MODAL DE GUÍA RÁPIDA */}
      {showTourModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`${glassCard} max-w-xl w-full rounded-3xl p-5 shadow-2xl border border-purple-500/30 relative flex flex-col max-h-[85vh]`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <GraduationCap size={18} />
                </div>
                <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Guía rápida
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTourModal(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEMO_GUIDE_TOUR.map((step, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedTourStep(idx)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedTourStep === idx
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
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

              <div className={`p-4 rounded-2xl border ${
                isDarkMode 
                  ? 'bg-gray-800/50 border-gray-700 text-gray-200' 
                  : 'bg-purple-50/50 border-purple-200 text-gray-800'
              } space-y-2 animate-in fade-in`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-purple-700 dark:text-purple-300">
                    {DEMO_GUIDE_TOUR[selectedTourStep].title}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200">
                    {DEMO_GUIDE_TOUR[selectedTourStep].badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {DEMO_GUIDE_TOUR[selectedTourStep].description}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200/80 dark:border-gray-800 flex items-center justify-between gap-3">
              <span className="text-[11px] text-gray-400 font-medium">
                {selectedTourStep + 1} / {DEMO_GUIDE_TOUR.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTourStep((prev) => (prev + 1) % DEMO_GUIDE_TOUR.length)}
                  className="py-1.5 px-3 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Siguiente
                </button>
                <button
                  type="button"
                  onClick={() => setShowTourModal(false)}
                  className="py-1.5 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>Cerrar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

