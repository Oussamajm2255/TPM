const VARIANTS = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  brand:   'bg-[#eef0ff] text-indigo-700 border-[#ccd1ff]',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warn:    'bg-amber-50 text-amber-700 border-amber-200',
  danger:  'bg-rose-50 text-rose-700 border-rose-200',
  info:    'bg-sky-50 text-sky-700 border-sky-200',
};

export default function Badge({ children, variant = 'neutral', className = '' }) {
  return <span className={`chip ${VARIANTS[variant]} ${className}`}>{children}</span>;
}
