import { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { usePermissions } from '../hooks/usePermissions';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';

export default function ProjectsPage() {
  const { projects, upsertProject, removeProject } = useAppStore((s) => ({
    projects: s.projects,
    upsertProject: s.upsertProject,
    removeProject: s.removeProject,
  }));
  const { can } = usePermissions();
  const isAdmin = can('projects.manage');

  const [selectedId, setSelectedId] = useState(projects[0]?.id || null);
  const [showProjModal, setShowProjModal] = useState(false);
  const [editingProj, setEditingProj] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptConfig, setPromptConfig] = useState({ title: '', label: '', placeholder: '', onConfirm: () => {} });

  const current = useMemo(() => projects.find((p) => p.id === selectedId) || projects[0], [projects, selectedId]);

  const handleAddProject = () => {
    setEditingProj({ id: `P${Date.now()}`, name: '', lines: [] });
    setShowProjModal(true);
  };

  const handleEditProject = (p) => {
    setEditingProj(p);
    setShowProjModal(true);
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('Supprimer ce projet et toutes ses lignes/machines ?')) return;
    await removeProject(id);
    if (selectedId === id) setSelectedId(projects[0]?.id || null);
  };

  const handleSaveProject = async (p) => {
    await upsertProject(p);
    setShowProjModal(false);
    setSelectedId(p.id);
  };

  // --- Line Actions
  const handleAddLine = () => {
    setPromptConfig({
      title: 'Nouvelle Ligne',
      label: 'Nom de la ligne',
      placeholder: 'Ex: CAV 1, Montage, etc.',
      onConfirm: async (name) => {
        const newLine = { id: `L${Date.now()}`, name, machines: [] };
        await upsertProject({ ...current, lines: [...current.lines, newLine] });
        setShowPrompt(false);
      }
    });
    setShowPrompt(true);
  };

  const handleRemoveLine = async (lineId) => {
    if (!confirm('Supprimer cette ligne ?')) return;
    await upsertProject({ ...current, lines: current.lines.filter(l => l.id !== lineId) });
  };

  // --- Machine Actions
  const handleAddMachine = (lineId) => {
    setPromptConfig({
      title: 'Nouvelle Machine',
      label: 'Code machine',
      placeholder: 'Ex: 1160',
      onConfirm: async (code) => {
        const newMachine = { id: `M${Date.now()}`, code };
        const nextLines = current.lines.map(l => 
          l.id === lineId ? { ...l, machines: [...l.machines, newMachine] } : l
        );
        await upsertProject({ ...current, lines: nextLines });
        setShowPrompt(false);
      }
    });
    setShowPrompt(true);
  };

  const handleRemoveMachine = async (lineId, machineId) => {
    const nextLines = current.lines.map(l => 
      l.id === lineId ? { ...l, machines: l.machines.filter(m => m.id !== machineId) } : l
    );
    await upsertProject({ ...current, lines: nextLines });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
      <div className="card p-3 lg:col-span-1 flex flex-col">
        <div className="px-2 py-1 flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Projets</span>
          {isAdmin && (
            <button className="text-brand-600 font-bold text-lg hover:text-brand-700" onClick={handleAddProject}>+</button>
          )}
        </div>
        <div className="flex-1 overflow-auto space-y-1">
          {projects.map((p) => {
            const lineCount = p.lines.length;
            const machineCount = p.lines.reduce((n, l) => n + l.machines.length, 0);
            const active = p.id === current?.id;
            return (
              <div key={p.id} className="group relative">
                <button
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    active ? 'bg-brand-50 border border-brand-200' : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="font-medium text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-500">{lineCount} lignes · {machineCount} machines</div>
                </button>
                {isAdmin && (
                  <div className="absolute right-2 top-2 hidden group-hover:flex gap-1">
                    <button className="p-1 text-slate-400 hover:text-brand-600" onClick={() => handleEditProject(p)}>✎</button>
                    <button className="p-1 text-slate-400 hover:text-rose-600" onClick={() => handleDeleteProject(p.id)}>×</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-3 space-y-4">
        {current ? (
          <>
            <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">Projet</div>
                <div className="text-xl font-semibold text-slate-900">{current.name}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex gap-2">
                  <Badge variant="brand">{current.lines.length} lignes</Badge>
                  <Badge variant="info">
                    {current.lines.reduce((n, l) => n + l.machines.length, 0)} machines
                  </Badge>
                </div>
                {isAdmin && (
                  <button className="btn-primary py-1.5" onClick={handleAddLine}>+ Ajouter Ligne</button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
              {current.lines.map((l) => (
                <div key={l.id} className="card p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                       {l.name}
                       {isAdmin && (
                         <button className="text-rose-400 hover:text-rose-600 text-xs" onClick={() => handleRemoveLine(l.id)}>Supprimer</button>
                       )}
                    </div>
                    <Badge variant="neutral">{l.machines.length} machines</Badge>
                  </div>
                  
                  <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-lg p-3">
                    <div className="flex flex-wrap gap-2">
                      {l.machines.map((m) => (
                        <div key={m.id} className="group flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm text-xs text-slate-700">
                          {m.code}
                          {isAdmin && (
                            <button 
                              className="w-4 h-4 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-600 flex items-center justify-center transition-colors"
                              onClick={() => handleRemoveMachine(l.id, m.id)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      {isAdmin && (
                        <button 
                          className="px-2 py-1 rounded border border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-600 text-xs transition-colors"
                          onClick={() => handleAddMachine(l.id)}
                        >
                          + Ajouter
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {current.lines.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                  Aucune ligne dans ce projet.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="py-20 text-center text-slate-400 italic">
            Sélectionnez ou créez un projet pour voir les détails.
          </div>
        )}
      </div>

      {showProjModal && (
        <ProjectModal
          project={editingProj}
          onClose={() => setShowProjModal(false)}
          onSave={handleSaveProject}
        />
      )}

      {showPrompt && (
        <GenericPromptModal
          config={promptConfig}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </div>
  );
}

function GenericPromptModal({ config, onClose }) {
  const [value, setValue] = useState('');
  return (
    <Modal
      open={true}
      onClose={onClose}
      title={config.title}
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={() => config.onConfirm(value)}>Valider</button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">{config.label}</label>
          <input 
            className="input" 
            value={value} 
            onChange={(e) => setValue(e.target.value)}
            placeholder={config.placeholder}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && config.onConfirm(value)}
          />
        </div>
      </div>
    </Modal>
  );
}

function ProjectModal({ project, onClose, onSave }) {
  const [name, setName] = useState(project.name);
  return (
    <Modal
      open={true}
      onClose={onClose}
      title={project.name ? 'Modifier Projet' : 'Nouveau Projet'}
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onSave({ ...project, name })}>Enregistrer</button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Nom du projet</label>
          <input 
            className="input" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: SEAT, VW, etc."
            autoFocus
          />
        </div>
      </div>
    </Modal>
  );
}
