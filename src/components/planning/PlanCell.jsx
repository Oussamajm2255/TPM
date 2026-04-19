import Badge from '../common/Badge';

export default function PlanCell({ entry, project, line, user, compact = false }) {
  const tone = entry.status === 'done' ? 'success' : entry.unplanned ? 'warn' : 'brand';
  return (
    <div className={`rounded-md border ${entry.unplanned ? 'border-amber-200 bg-amber-50' : 'border-brand-100 bg-brand-50'} px-2 py-1 text-[11px] leading-tight`}>
      <div className="font-semibold text-slate-800 truncate">{user?.displayName || '—'}</div>
      <div className="text-slate-600 truncate">{project?.name} · {line?.name}</div>
      {!compact && (
        <div className="mt-1 flex gap-1">
          <Badge variant={tone}>{entry.status === 'done' ? 'Fait' : entry.unplanned ? 'Urgent' : 'Planifié'}</Badge>
        </div>
      )}
    </div>
  );
}
