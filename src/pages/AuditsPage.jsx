import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { usePermissions } from '../hooks/usePermissions';

export default function AuditsPage() {
  const { audits, projects, users, currentUser } = useAppStore((s) => ({
    audits: s.audits, projects: s.projects, users: s.users, currentUser: s.currentUser,
  }));
  const { can } = usePermissions();
  const removeAudit = useAppStore((s) => s.removeAudit);

  const [filterProject, setFilterProject] = useState('');
  const [filterTech, setFilterTech] = useState('');

  const scoped = useMemo(() => {
    let list = audits;
    if (currentUser?.role === 'technician') {
      list = list.filter((a) => a.technicianId === currentUser.id);
    }
    if (filterProject) list = list.filter((a) => a.projectId === filterProject);
    if (filterTech) list = list.filter((a) => a.technicianId === filterTech);
    return [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [audits, filterProject, filterTech, currentUser]);

  const techs = users.filter((u) => u.role === 'technician');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select className="input !w-auto" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="">Tous projets</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {currentUser?.role !== 'technician' && (
            <select className="input !w-auto" value={filterTech} onChange={(e) => setFilterTech(e.target.value)}>
              <option value="">Tous techniciens</option>
              {techs.map((t) => <option key={t.id} value={t.id}>{t.displayName}</option>)}
            </select>
          )}
        </div>
        {can('audits.create') && (
          <Link to="/audits/new" className="btn-primary">+ Nouvel audit</Link>
        )}
      </div>

      {scoped.length === 0 ? (
        <EmptyState
          title="Aucun audit"
          hint="Démarrez un nouvel audit depuis le planning ou créez-en un directement."
          action={can('audits.create') && <Link to="/audits/new" className="btn-primary">Créer un audit</Link>}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Date</th><th className="th">Projet</th><th className="th">Ligne</th>
                <th className="th">Machine</th><th className="th">Auditeur</th><th className="th">Score</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {scoped.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="td">{a.date}</td>
                  <td className="td">{a.projectName}</td>
                  <td className="td">{a.lineName}</td>
                  <td className="td">{a.machineCode || '—'}</td>
                  <td className="td">{a.auditeur}</td>
                  <td className="td">
                    <Badge variant={a.score >= 80 ? 'success' : a.score >= 60 ? 'warn' : 'danger'}>
                      {a.score}%
                    </Badge>
                  </td>
                  <td className="td text-right">
                    {can('audits.delete') && (
                      <button className="btn-ghost text-rose-600" onClick={() => {
                        if (confirm('Supprimer cet audit ?')) removeAudit(a.id);
                      }}>Supprimer</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
