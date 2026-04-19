const YES_NO = [
  { value: 'yes', label: 'Oui',  variant: 'emerald' },
  { value: 'no',  label: 'Non',  variant: 'rose' },
  { value: 'na',  label: 'N/A', variant: 'slate' },
];

const TONE = {
  emerald: 'bg-emerald-600 border-emerald-600 text-white',
  rose:    'bg-rose-600 border-rose-600 text-white',
  slate:   'bg-slate-500 border-slate-500 text-white',
};

export default function ChecklistRenderer({ checklist, answers, onChange }) {
  if (!checklist) return null;
  return (
    <div className="space-y-2">
      {checklist.items.map((q, idx) => {
        const current = answers[q.id];
        return (
          <div key={q.id} className="card p-4 flex items-start gap-4">
            <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-xs font-semibold shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-800">{q.label}</div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {YES_NO.map((o) => {
                const active = current === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => onChange({ ...answers, [q.id]: o.value })}
                    className={`px-3 py-1.5 rounded-md border text-xs font-medium transition ${
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
        );
      })}
    </div>
  );
}
