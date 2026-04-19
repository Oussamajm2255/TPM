import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { usePermissions } from '../../hooks/usePermissions';

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
  const user = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const resetDemoData = useAppStore((s) => s.resetDemoData);
  const { can } = usePermissions();

  const title = TITLES[loc.pathname] || 'TPM Audit';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <div className="text-sm font-medium text-slate-800">{user?.displayName}</div>
          <div className="text-[11px] text-slate-500 capitalize">{user?.role}</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-semibold">
          {user?.displayName?.[0]?.toUpperCase()}
        </div>
        {can('planning.generate') && (
          <button
            className="btn-ghost text-xs"
            title="Réinitialiser les données de démo (charge le planning 2026)"
            onClick={async () => {
              if (!confirm('Réinitialiser toutes les données de démo ?\nLes audits remplis seront perdus. Le planning 2026 sera rechargé.')) return;
              await resetDemoData();
              alert('Données de démo rechargées ✓');
            }}
          >
            ↻ Reset démo
          </button>
        )}
        <button
          className="btn-ghost"
          onClick={() => { logout(); navigate('/login', { replace: true }); }}
          title="Se déconnecter"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}
