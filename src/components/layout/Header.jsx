import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { usePermissions } from '../../hooks/usePermissions';
import NotificationCenter from './NotificationCenter';
import { Bell, LogOut, ShieldCheck } from 'lucide-react';

const TITLES = {
  '/':         'Tableau de bord',
  '/tasks':    'Mes tâches',
  '/planning': 'Planning des audits',
  '/audits':   'Audits',
  '/audits/new': 'Nouvel audit',
  '/projects': 'Projets & Lignes',
  '/users':    'Utilisateurs',
};

export default function Header() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user, logout, unreadCount } = useAppStore((s) => ({
    user: s.currentUser, 
    logout: s.logout,
    unreadCount: s.unreadCount
  }));
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);
  const { can } = usePermissions();

  const title = TITLES[loc.pathname] || 'TPM Audit';

  // Close on click outside
  useEffect(() => {
    const click = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false); };
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 glass px-3 sm:px-4 md:px-6 flex items-center justify-between">
      <h1 className="text-sm sm:text-base md:text-lg font-semibold text-slate-900 tracking-tight truncate pr-3">{title}</h1>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifs(!showNotifs)}
            className={`w-10 h-10 rounded-[8px] grid place-items-center border transition-all ${showNotifs ? 'bg-[#eef0ff] border-[#5759e0] text-[#1f20c3]' : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full border-2 border-white grid place-items-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && <NotificationCenter onClose={() => setShowNotifs(false)} />}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 card-industrial px-2 sm:px-3 py-1.5 sm:py-2">
          <div className="text-right leading-tight hidden sm:block">
            <div className="text-sm font-semibold text-slate-900 max-w-32 truncate">{user?.displayName}</div>
            <div className="text-[11px] text-slate-400 capitalize inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {user?.role}
            </div>
          </div>
          <div className="w-9 h-9 rounded-[8px] bg-[#eef0ff] border border-[#5759e0] text-[#1f20c3] grid place-items-center font-semibold">
            {user?.displayName?.[0]?.toUpperCase()}
          </div>
          <button
            className="btn-ghost ml-0 sm:ml-1 !px-2"
            onClick={() => { logout(); navigate('/login', { replace: true }); }}
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
