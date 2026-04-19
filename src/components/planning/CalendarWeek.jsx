import { useMemo } from 'react';
import { toISO, addDays, DOW_FR_SHORT } from '../../utils/dateUtils';
import PlanCell from './PlanCell';

export default function CalendarWeek({ weekStart, entries, projects, users, onPick }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const lookup = useMemo(() => {
    const pMap = new Map(projects.map((p) => [p.id, p]));
    const lineMap = new Map();
    for (const p of projects) for (const l of p.lines) lineMap.set(l.id, l);
    const uMap = new Map(users.map((u) => [u.id, u]));
    return { pMap, lineMap, uMap };
  }, [projects, users]);

  const byDay = useMemo(() => {
    const m = new Map();
    for (const e of entries) {
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date).push(e);
    }
    return m;
  }, [entries]);

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d, i) => {
        const iso = toISO(d);
        const list = byDay.get(iso) || [];
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        return (
          <div key={iso} className={`rounded-lg border p-2 min-h-[280px] ${isWeekend ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-500">{DOW_FR_SHORT[i]}</div>
              <div className="text-sm font-bold text-slate-800">{d.getDate()}</div>
            </div>
            <div className="space-y-1">
              {list.map((e) => (
                <button key={e.id} onClick={() => onPick?.(e)} className="w-full text-left">
                  <PlanCell
                    entry={e}
                    project={lookup.pMap.get(e.projectId)}
                    line={lookup.lineMap.get(e.lineId)}
                    user={lookup.uMap.get(e.technicianId)}
                    compact
                  />
                </button>
              ))}
              {list.length === 0 && <div className="text-[11px] text-slate-400">—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
