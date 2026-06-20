import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Calendar, 
  ClipboardCheck, 
  Settings, 
  Users
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

export default function Sidebar() {
  const { can } = usePermissions();

  const navs = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tasks', label: 'Mes tâches', icon: ClipboardList },
    { to: '/planning', label: 'Planning', icon: Calendar },
    { to: '/audits', label: 'Audits', icon: ClipboardCheck },
    { to: '/projects', label: 'Projets', icon: Settings, permission: 'projects.manage' },
    { to: '/users', label: 'Utilisateurs', icon: Users, permission: 'users.manage' },
  ];

  return (
    <footer className="fixed bottom-3 sm:bottom-4 left-1/2 z-50 w-[min(1200px,calc(100%-0.75rem))] sm:w-[min(1200px,calc(100%-1.5rem))] -translate-x-1/2">
      <div className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-[0_18px_40px_rgba(15,23,42,0.16)] px-3 py-2">
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 px-2 py-1.5 rounded-xl border border-[#d8dcff] bg-[#f6f7ff]">
            <div className="h-11 w-11 rounded-xl bg-white border border-[#ccd1ff] grid place-items-center shadow-sm">
              <img src="/assets/Images/logo-global.png" alt="FORVIA" className="w-8 h-8 object-contain" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-black tracking-[0.2em] text-[#1f20c3]">TPM AUDIT</div>
            </div>
          </div>
          <div className="md:hidden h-10 w-10 rounded-xl bg-[#f6f7ff] border border-[#d8dcff] grid place-items-center">
            <img src="/assets/Images/logo-global.png" alt="FORVIA" className="w-6 h-6 object-contain" />
          </div>
          <nav className="flex-1 grid grid-cols-4 md:grid-cols-6 gap-1">
            {navs.map((n) => {
              if (n.permission && !can(n.permission)) return null;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) => `
                    interactive flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 px-1.5 sm:px-2 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-[11px] font-semibold border transition-all duration-300
                    ${isActive
                      ? 'bg-[#eef0ff] border-[#6163df] text-[#1f20c3] shadow-[inset_0_0_0_1px_rgba(31,32,195,0.15)]'
                      : 'border-transparent text-slate-600 hover:bg-[#f6f7ff] hover:border-[#d8dcff] hover:text-[#1f20c3]'}
                  `}
                >
                  <n.icon className="w-4 h-4" />
                  <span className="truncate max-w-[68px] sm:max-w-none">{n.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    </footer>
  );
}
