import Badge from '../common/Badge';
import { toISO } from '../../utils/dateUtils';

export default function CalendarDay({ dateISO, entries, projects, users, onPick, onRemove }) {
  const pMap = new Map(projects.map((p) => [p.id, p]));
  const lineMap = new Map();
  for (const p of projects) for (const l of p.lines) lineMap.set(l.id, l);
  const uMap = new Map(users.map((u) => [u.id, u]));
  const today = toISO(new Date());

  if (entries.length === 0) {
    return <div className="card p-8 text-center text-slate-500">Aucun audit planifié pour {dateISO}.</div>;
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead className="bg-slate-50">
          <tr>
            <th className="th">Technicien</th><th className="th">Projet</th><th className="th">Ligne</th>
            <th className="th">Statut</th><th className="th"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const u = uMap.get(e.technicianId);
            const p = pMap.get(e.projectId);
            const l = lineMap.get(e.lineId);
            const isDone = e.status === 'done';
            const isOverdue = !isDone && e.date < today;
            const tone = isDone ? 'success' : isOverdue ? 'danger' : 'neutral';
            const label = isDone ? 'Fait' : isOverdue ? 'En retard' : e.unplanned ? 'Urgent' : 'Planifié';
            const rowBg = isDone ? '' : isOverdue ? 'bg-rose-50/40' : '';
            return (
              <tr key={e.id} className={`hover:bg-slate-50 group ${rowBg}`}>
                <td className="td font-medium" onClick={() => onPick?.(e)}>{u?.displayName || e.technicianId}</td>
                <td className="td" onClick={() => onPick?.(e)}>{p?.name || e.projectId}</td>
                <td className="td" onClick={() => onPick?.(e)}>{l?.name || e.lineId}</td>
                <td className="td" onClick={() => onPick?.(e)}><Badge variant={tone}>{label}</Badge></td>
                <td className="td text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-3">
                    <button 
                      className={`text-xs font-medium hover:underline ${isDone ? 'text-emerald-600' : 'text-brand-700'}`}
                      onClick={() => onPick?.(e)}
                    >
                      {isDone ? 'Rapport' : 'Ouvrir →'}
                    </button>
                    {onRemove && e.status !== 'done' && (
                      <button 
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Supprimer la planification"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          if (confirm('Supprimer cet audit du planning ?')) {
                            onRemove(e.id);
                          }
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>

            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
