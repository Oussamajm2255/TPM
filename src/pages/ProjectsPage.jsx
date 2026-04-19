import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import Badge from '../components/common/Badge';

export default function ProjectsPage() {
  const projects = useAppStore((s) => s.projects);
  const [selected, setSelected] = useState(projects[0]?.id || null);
  const current = projects.find((p) => p.id === selected) || projects[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="card p-3 lg:col-span-1">
        <div className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase">Projets</div>
        {projects.map((p) => {
          const lineCount = p.lines.length;
          const machineCount = p.lines.reduce((n, l) => n + l.machines.length, 0);
          const active = p.id === current?.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors ${
                active ? 'bg-brand-50 border border-brand-200' : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="font-medium text-slate-800">{p.name}</div>
              <div className="text-xs text-slate-500">{lineCount} lignes · {machineCount} machines</div>
            </button>
          );
        })}
      </div>

      <div className="lg:col-span-3 space-y-4">
        {current && (
          <>
            <div className="card p-5 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Projet</div>
                <div className="text-xl font-semibold text-slate-900">{current.name}</div>
              </div>
              <div className="flex gap-2">
                <Badge variant="brand">{current.lines.length} lignes</Badge>
                <Badge variant="info">
                  {current.lines.reduce((n, l) => n + l.machines.length, 0)} machines
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {current.lines.map((l) => (
                <div key={l.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-900">{l.name}</div>
                    <Badge variant="neutral">{l.machines.length}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {l.machines.slice(0, 40).map((m) => (
                      <span key={m.id} className="px-2 py-0.5 rounded bg-slate-100 text-[11px] text-slate-700">
                        {m.code}
                      </span>
                    ))}
                    {l.machines.length > 40 && (
                      <span className="text-[11px] text-slate-500">+{l.machines.length - 40} …</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
