import { NavLink } from 'react-router-dom';
import { useMemo } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { useAppStore } from '../../store/useAppStore';
import { toISO } from '../../utils/dateUtils';

const items = [
  { to: '/',         label: 'Tableau de bord', action: 'dashboard.view', icon: '⌂' },
  { to: '/tasks',    label: 'Mes tâches',       action: 'tasks.view',     icon: '✓', badge: 'pendingTasks' },
  { to: '/planning', label: 'Planning',         action: 'planning.view',  icon: '🗓' },
  { to: '/audits',   label: 'Audits',           action: 'audits.view',    icon: '📋' },
  { to: '/projects', label: 'Projets & Lignes', action: 'projects.view',  icon: '⚙' },
  { to: '/users',    label: 'Utilisateurs',     action: 'users.view',     icon: '👥' },
];

export default function Sidebar() {
  const { can, user } = usePermissions();
  const planning = useAppStore((s) => s.planning);
  const audits = useAppStore((s) => s.audits);

  const pendingTasks = useMemo(() => {
    if (!user) return 0;
    const todayISO = toISO(new Date());
    let list = planning;
    if (user.role === 'technician') list = list.filter((e) => e.technicianId === user.id);
    const doneIds = new Set(audits.map((a) => a.planId).filter(Boolean));
    return list.filter((e) => e.status !== 'done' && !doneIds.has(e.id) && e.date <= todayISO).length;
  }, [planning, audits, user]);

  const badges = { pendingTasks };

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <div className="h-16 px-5 flex items-center border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-brand-600 text-white grid place-items-center font-bold">T</div>
        <div className="ml-3">
          <div className="font-semibold text-slate-900 leading-tight">TPM Audit</div>
          <div className="text-[11px] text-slate-500">Maintenance 2026</div>
        </div>
      </div>
      <nav className="flex-1 py-3 px-2">
        {items.filter((it) => can(it.action)).map((it) => {
          const n = it.badge ? badges[it.badge] : 0;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-1 transition-colors
                 ${isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`
              }
            >
              <span className="w-5 text-center">{it.icon}</span>
              <span className="flex-1">{it.label}</span>
              {n > 0 && (
                <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  {n}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-3 text-[11px] text-slate-400 border-t border-slate-100">
        v1.0 · JSON mode
      </div>
    </aside>
  );
}
