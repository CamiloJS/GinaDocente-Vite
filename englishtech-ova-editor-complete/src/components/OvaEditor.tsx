import React, { useState } from 'react';
import { OvaProject } from '../types';
import { OvaViewer } from './OvaViewer';

interface OvaEditorProps {
  initialData: OvaProject;
  onSave?: (updated: OvaProject) => void;
}

export const OvaEditor: React.FC<OvaEditorProps> = ({ initialData, onSave }) => {
  const [project, setProject] = useState<OvaProject>(initialData);
  const [mode, setMode] = useState<'editor' | 'preview'>('editor');

  const handleTitleChange = (val: string) => {
    setProject(prev => {
      const updated = { ...prev, title: val };
      if (onSave) onSave(updated);
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Editor Top Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#AD3333] flex items-center justify-center text-white font-bold text-sm shadow-md">
            ET
          </div>
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              English TECH • OVA Studio
            </div>
            <input
              type="text"
              value={project.title}
              onChange={e => handleTitleChange(e.target.value)}
              className="text-xs text-slate-300 bg-transparent border-b border-slate-700 focus:border-[#AD3333] focus:outline-none px-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'editor' ? 'bg-[#AD3333] text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Modo Edición
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'preview' ? 'bg-[#AD3333] text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Vista Previa Estudiante
          </button>
        </div>
      </header>

      {/* Body */}
      {mode === 'preview' ? (
        <OvaViewer data={project} />
      ) : (
        <div className="flex-1 p-8 max-w-4xl mx-auto space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Configuración del Objeto de Aprendizaje</h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Título del OVA:</label>
                <input
                  type="text"
                  value={project.title}
                  onChange={e => handleTitleChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-[#AD3333]"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Materia / Asignatura:</label>
                <input
                  type="text"
                  value={project.subject}
                  onChange={e => setProject({ ...project, subject: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-[#AD3333]"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Descripción pedagógica:</label>
                <textarea
                  rows={3}
                  value={project.description}
                  onChange={e => setProject({ ...project, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-[#AD3333]"
                />
              </div>
            </div>
          </div>

          <div className="text-center p-6 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-400">
            Para la experiencia completa de edición tipo Canva con arrastrar y soltar bloques, selector de imágenes y exportación a HTML descargable, utiliza la aplicación web <strong>index.html</strong> incluida en el proyecto.
          </div>
        </div>
      )}
    </div>
  );
};
