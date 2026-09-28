import React, { useState } from 'react';
import { OvaProject, QuizQuestion, TableRow } from '../types';

interface OvaViewerProps {
  data: OvaProject;
  onComplete?: () => void;
}

export const OvaViewer: React.FC<OvaViewerProps> = ({ data, onComplete }) => {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [activeSubSlideIndex, setActiveSubSlideIndex] = useState(0);
  const [visitedPages, setVisitedPages] = useState<number[]>([0]);

  // Quiz states
  const [quizAnswers, setQuizAnswers] = useState<Record<string, { isCorrect: boolean; feedback: string }>>({});

  // Table states
  const [tableInputs, setTableInputs] = useState<Record<string, string>>({});
  const [tableFeedback, setTableFeedback] = useState<Record<string, { correct: number; total: number; checked: boolean }>>({});

  // Cloze states
  const [clozeInputs, setClozeInputs] = useState<Record<string, string>>({});
  const [clozeFeedback, setClozeFeedback] = useState<Record<string, { correct: number; total: number; checked: boolean }>>({});

  // Accordion states
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  const currentPage = data.pages[activePageIndex] || data.pages[0];
  const currentSlide = currentPage?.subSlides?.[activeSubSlideIndex] || currentPage?.subSlides?.[0];

  // Total Progress
  let totalSteps = 0;
  let currentStep = 0;
  data.pages.forEach((p, pIdx) => {
    const count = p.subSlides ? p.subSlides.length : 1;
    totalSteps += count;
    if (pIdx < activePageIndex) {
      currentStep += count;
    } else if (pIdx === activePageIndex) {
      currentStep += (activeSubSlideIndex + 1);
    }
  });
  const progressPercent = Math.min(100, Math.round((currentStep / totalSteps) * 100));

  const handleNext = () => {
    if (currentPage.subSlides && activeSubSlideIndex < currentPage.subSlides.length - 1) {
      setActiveSubSlideIndex(prev => prev + 1);
    } else if (activePageIndex < data.pages.length - 1) {
      setActivePageIndex(prev => {
        const next = prev + 1;
        if (!visitedPages.includes(next)) setVisitedPages([...visitedPages, next]);
        return next;
      });
      setActiveSubSlideIndex(0);
    } else {
      if (onComplete) onComplete();
    }
  };

  const handlePrev = () => {
    if (activeSubSlideIndex > 0) {
      setActiveSubSlideIndex(prev => prev - 1);
    } else if (activePageIndex > 0) {
      const prevPage = data.pages[activePageIndex - 1];
      setActivePageIndex(activePageIndex - 1);
      setActiveSubSlideIndex(prevPage.subSlides ? prevPage.subSlides.length - 1 : 0);
    }
  };

  const handleSelectPage = (idx: number) => {
    setActivePageIndex(idx);
    setActiveSubSlideIndex(0);
    if (!visitedPages.includes(idx)) setVisitedPages([...visitedPages, idx]);
  };

  const checkTable = (blockId: string, rows: TableRow[]) => {
    let correct = 0;
    let total = 0;
    rows.forEach((row, rIdx) => {
      row.cells.forEach((cell, cIdx) => {
        if (cell.isInput) {
          total++;
          const key = `${blockId}_${rIdx}_${cIdx}`;
          const val = (tableInputs[key] || '').trim();
          if (val === cell.expectedAnswer?.trim()) {
            correct++;
          }
        }
      });
    });
    setTableFeedback(prev => ({
      ...prev,
      [blockId]: { correct, total, checked: true }
    }));
  };

  const checkQuiz = (q: QuizQuestion, optId: string) => {
    const selected = q.options.find(o => o.id === optId);
    if (!selected) return;
    setQuizAnswers(prev => ({
      ...prev,
      [q.id]: {
        isCorrect: selected.isCorrect,
        feedback: selected.isCorrect ? q.feedbackGood : q.feedbackBad
      }
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Progress Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#AD3333] flex items-center justify-center text-white font-bold text-xs shadow-md shadow-[#AD3333]/30">
            ET
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-tight truncate max-w-xs md:max-w-md">
              {data.title}
            </div>
            <div className="text-[10px] text-slate-400">
              {currentPage.title} {currentPage.subSlides.length > 1 ? `• Diapositiva ${activeSubSlideIndex + 1} de ${currentPage.subSlides.length}` : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-32 md:w-48 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-[#AD3333] to-red-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold text-[#AD3333]">{progressPercent}%</span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-72 border-r border-slate-800 bg-slate-900/40 p-3 overflow-y-auto hidden md:block shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
            Índice del OVA
          </div>
          <nav className="space-y-1">
            {data.pages.map((p, idx) => {
              const isActive = idx === activePageIndex;
              const isVisited = visitedPages.includes(idx);
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPage(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center justify-between gap-2.5 text-xs font-medium ${
                    isActive
                      ? 'bg-[#AD3333] text-white font-semibold shadow-md shadow-[#AD3333]/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="truncate">{idx + 1}. {p.title}</span>
                  {isVisited && <span className="text-emerald-400 text-xs">✓</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Reader Canvas */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            <div className="max-w-4xl mx-auto space-y-8">
              {currentPage.type === 'cover' ? (
                /* Cover Page */
                <div
                  className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800 aspect-video flex flex-col justify-between p-8 md:p-12 text-white"
                  style={{ backgroundColor: data.cover.backgroundColor }}
                >
                  <img src={data.cover.backgroundImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent"
                    style={{ opacity: data.cover.overlayOpacity }}
                  />

                  <div className="relative z-10 flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#AD3333] text-white shadow-lg border border-red-400/30">
                      {data.cover.badgeText}
                    </span>
                    <span className="text-xs text-slate-300 px-3 py-1 rounded-full bg-black/40 backdrop-blur border border-white/10">
                      {data.cover.institution}
                    </span>
                  </div>

                  <div className="relative z-10 space-y-4 my-auto max-w-2xl">
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-md">
                      {data.cover.title}
                    </h1>
                    <p className="text-sm md:text-base text-slate-300 line-clamp-3">
                      {data.cover.subtitle}
                    </p>
                  </div>

                  <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="text-xs text-slate-300">
                      Autor: <strong className="text-white">{data.cover.authorName}</strong>
                    </span>
                    <button
                      onClick={handleNext}
                      className="px-6 py-2.5 rounded-xl bg-[#AD3333] hover:bg-red-700 text-white font-bold text-xs shadow-xl shadow-[#AD3333]/30 hover:scale-105 transition"
                    >
                      {data.cover.startButtonText} →
                    </button>
                  </div>
                </div>
              ) : (
                /* Content Slide */
                <div className="space-y-6">
                  <div className="border-b border-slate-800 pb-4">
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">{currentPage.title}</h2>
                    {currentSlide?.title && currentPage.subSlides.length > 1 && (
                      <p className="text-xs text-[#AD3333] font-semibold mt-1">{currentSlide.title}</p>
                    )}
                  </div>

                  {currentSlide?.blocks?.map(block => (
                    <div key={block.id} className="space-y-4">
                      {block.type === 'text' && (
                        <div className="prose prose-invert max-w-none text-slate-200 text-sm md:text-base leading-relaxed whitespace-pre-line">
                          {block.content}
                        </div>
                      )}

                      {block.type === 'math' && (
                        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center shadow-lg space-y-2">
                          {block.content && <p className="text-xs text-slate-400">{block.content}</p>}
                          <div className="text-xl md:text-2xl text-amber-300 font-mono py-2">
                            {block.metadata?.latex}
                          </div>
                        </div>
                      )}

                      {block.type === 'video' && (
                        <div className="space-y-3">
                          {block.title && <h3 className="text-base font-bold text-white">{block.title}</h3>}
                          <div className="aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
                            <iframe src={block.metadata?.videoUrl} className="w-full h-full" allowFullScreen />
                          </div>
                        </div>
                      )}

                      {block.type === 'callout' && (
                        <div className="p-5 rounded-2xl border bg-slate-900/80 border-slate-800 space-y-2">
                          {block.title && <div className="font-bold text-sm text-white">{block.title}</div>}
                          <p className="text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-line">{block.content}</p>
                        </div>
                      )}

                      {block.type === 'interactive_table' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                          <h3 className="text-base font-bold text-white">{block.title || 'Actividad Práctica'}</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border border-slate-800 rounded-xl overflow-hidden">
                              <thead className="bg-slate-950 border-b border-slate-800 text-slate-300">
                                <tr>
                                  {block.metadata?.tableHeaders?.map((h, i) => (
                                    <th key={i} className="p-3 text-center font-bold">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                                {block.metadata?.tableRows?.map((row, rIdx) => (
                                  <tr key={rIdx}>
                                    <td className="p-3 text-center text-slate-200">{row.cells[0]?.value}</td>
                                    <td className="p-3 text-center">
                                      {row.cells[1]?.isInput ? (
                                        <input
                                          type="text"
                                          value={tableInputs[`${block.id}_${rIdx}_1`] || ''}
                                          onChange={e => setTableInputs({ ...tableInputs, [`${block.id}_${rIdx}_1`]: e.target.value })}
                                          className="w-16 text-center font-mono font-bold text-sm bg-slate-950 border-2 border-slate-700 rounded-lg p-1 text-white focus:outline-none focus:border-[#AD3333]"
                                          placeholder="?"
                                        />
                                      ) : (
                                        <span className="font-mono font-bold text-slate-300">{row.cells[1]?.value}</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <button
                              onClick={() => checkTable(block.id, block.metadata?.tableRows || [])}
                              className="px-5 py-2.5 rounded-xl bg-[#AD3333] hover:bg-red-700 text-white text-xs font-bold transition"
                            >
                              Comprobar Respuestas
                            </button>
                            {tableFeedback[block.id]?.checked && (
                              <span className="text-xs font-bold text-emerald-400">
                                Aciertos: {tableFeedback[block.id].correct} de {tableFeedback[block.id].total}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {block.type === 'quiz_multiple' && (
                        <div className="space-y-4">
                          {block.metadata?.questions?.map((q, qIdx) => (
                            <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                              <span className="px-2.5 py-1 rounded-md bg-[#AD3333]/20 text-red-300 text-xs font-bold">
                                Pregunta {qIdx + 1}
                              </span>
                              <p className="text-sm font-semibold text-white">{q.question}</p>
                              <div className="space-y-2">
                                {q.options.map(opt => (
                                  <button
                                    key={opt.id}
                                    onClick={() => checkQuiz(q, opt.id)}
                                    className="w-full text-left p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition flex items-center gap-2"
                                  >
                                    <span className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px]" />
                                    <span>{opt.text}</span>
                                  </button>
                                ))}
                              </div>
                              {quizAnswers[q.id] && (
                                <div
                                  className={`p-4 rounded-xl text-xs font-medium ${
                                    quizAnswers[q.id].isCorrect
                                      ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-200'
                                      : 'bg-rose-950/60 border border-rose-500/50 text-rose-200'
                                  }`}
                                >
                                  {quizAnswers[q.id].feedback}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Nav */}
          <footer className="h-16 border-t border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={activePageIndex === 0 && activeSubSlideIndex === 0}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <button
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-[#AD3333] hover:bg-red-700 text-white text-xs font-semibold transition"
            >
              Siguiente →
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
};
