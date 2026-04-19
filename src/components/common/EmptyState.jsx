export default function EmptyState({ title, hint, action }) {
  return (
    <div className="card p-8 text-center">
      <div className="text-slate-800 font-medium">{title}</div>
      {hint && <div className="text-sm text-slate-500 mt-1">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
