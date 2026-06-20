import Badge from '../common/Badge';
import { toISO } from '../../utils/dateUtils';

export default function PlanCell({ entry, project, line, user, compact = false }) {
  const today = toISO(new Date());
  const isDone = entry.status === 'done';
  const isOverdue = !isDone && entry.date < today;

  const tone = isDone ? 'success' : isOverdue ? 'danger' : 'neutral';
  const borderColor = isDone ? 'border-emerald-200' : isOverdue ? 'border-rose-200' : 'border-slate-300';
  const bgColor = isDone ? 'bg-emerald-50' : isOverdue ? 'bg-rose-50' : 'bg-slate-100';
  const label = isDone ? 'Fait' : isOverdue ? 'En retard' : entry.unplanned ? 'Urgent' : 'Planifié';
  const textColor = isDone ? 'text-emerald-800' : isOverdue ? 'text-rose-800' : 'text-slate-800';

  return (
    <div className={`rounded-md border ${borderColor} ${bgColor} px-2 py-1 text-[11px] leading-tight`}>
      <div className={`font-semibold truncate ${textColor}`}>{user?.displayName || '—'}</div>
      <div className={`truncate ${textColor} opacity-70`}>{project?.name} · {line?.name}</div>
      {!compact && (
        <div className="mt-1 flex gap-1">
          <Badge variant={tone}>{label}</Badge>
        </div>
      )}
    </div>
  );
}
