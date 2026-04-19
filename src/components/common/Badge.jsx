const VARIANTS = {
  neutral: 'bg-slate-100 text-slate-700',
  brand:   'bg-brand-100 text-brand-700',
  success: 'bg-emerald-100 text-emerald-700',
  warn:    'bg-amber-100 text-amber-700',
  danger:  'bg-rose-100 text-rose-700',
  info:    'bg-sky-100 text-sky-700',
};

export default function Badge({ children, variant = 'neutral', className = '' }) {
  return <span className={`chip ${VARIANTS[variant]} ${className}`}>{children}</span>;
}
