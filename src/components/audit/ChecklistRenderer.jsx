const YES_NO = [
  { value: 'yes', label: 'OK',  variant: 'emerald' },
  { value: 'no',  label: 'NOK',  variant: 'rose' },
  { value: 'na',  label: 'N/A', variant: 'slate' },
];

const TONE = {
  emerald: 'bg-emerald-600 border-emerald-600 text-white',
  rose:    'bg-rose-600 border-rose-600 text-white',
  slate:   'bg-slate-500 border-slate-500 text-white',
};

export default function ChecklistRenderer({ checklist, answers, onChange, machines = [] }) {
  if (!checklist) return null;
  return (
    <div className="space-y-2">
      {checklist.items.map((q, idx) => {
        const current = answers[q.id];
        const val = typeof current === 'string' ? current : current?.value;
        const nokMachines = current?.nokMachines || [];

        return (
          <div key={q.id} className="card p-4 transition-all duration-200 border-l-4 border-l-transparent focus-within:border-l-brand-500">
            <div className="flex items-start gap-4">
              <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-xs font-semibold shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-800 leading-relaxed">{q.label}</div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {YES_NO.map((o) => {
                  const active = val === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => {
                        const nextVal = o.value;
                        if (nextVal === 'no') {
                          onChange({ ...answers, [q.id]: { value: 'no', nokMachines: [] } });
                        } else {
                          onChange({ ...answers, [q.id]: o.value });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${
                        active ? TONE[o.variant]
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {val === 'no' && (
              <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Machines concernées par cette anomalie :</div>
                  <div className="text-[10px] text-slate-400 italic">Cliquez pour marquer NOK</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {machines.map((m) => {
                    const isNok = nokMachines.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          const nextNok = isNok 
                            ? nokMachines.filter(id => id !== m.id)
                            : [...nokMachines, m.id];
                          onChange({ ...answers, [q.id]: { value: 'no', nokMachines: nextNok } });
                        }}
                        className={`px-2.5 py-1 rounded-md border text-[10px] font-bold transition-all ${
                          isNok ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm ring-1 ring-rose-200' 
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {m.code}
                      </button>
                    );
                  })}
                  {!machines.length && <div className="text-[10px] text-slate-400 italic">Aucune machine disponible.</div>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
