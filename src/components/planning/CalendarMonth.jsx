import { useMemo } from 'react';
import { MONTHS_FR, DOW_FR_SHORT, toISO } from '../../utils/dateUtils';

export default function CalendarMonth({ year, month, entries, onSelectDay }) {
  const { cells, monthLabel } = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = (first.getDay() + 6) % 7; // Mon=0
    const days = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    while (days.length % 7) days.push(null);
    return { cells: days, monthLabel: `${MONTHS_FR[month]} ${year}` };
  }, [year, month]);

  const byDay = useMemo(() => {
    const m = new Map();
    for (const e of entries) {
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date).push(e);
    }
    return m;
  }, [entries]);

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 text-xs font-semibold text-slate-500 mb-1 min-w-[680px]">
        {DOW_FR_SHORT.map((d) => <div key={d} className="px-2 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 min-w-[680px]">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="min-h-[86px] rounded-md bg-slate-50/40" />;
          const iso = toISO(d);
          const list = byDay.get(iso) || [];
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <button
              key={i}
              onClick={() => onSelectDay?.(iso)}
              className={`min-h-[86px] rounded-md border text-left p-1.5 transition ${
                isWeekend ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 hover:border-brand-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{d.getDate()}</span>
                {list.length > 0 && (
                  <span className="text-[10px] text-slate-500">{list.length}</span>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {list.slice(0, 3).map((e) => (
                  <div key={e.id} className={`text-[10px] truncate rounded px-1 py-0.5 ${
                    e.unplanned ? 'bg-amber-100 text-amber-800' : e.status === 'done' ? 'bg-emerald-100 text-emerald-800' : 'bg-brand-100 text-brand-800'
                  }`}>
                    {e.display || '•'}
                  </div>
                ))}
                {list.length > 3 && <div className="text-[10px] text-slate-500">+{list.length - 3} …</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
