import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import Badge from '../components/common/Badge';
import { toISO } from '../utils/dateUtils';

function Stat({ label, value, hint, tone = 'brand' }) {
  const color = { brand: 'text-brand-700', emerald: 'text-emerald-600', amber: 'text-amber-600', slate: 'text-slate-700' }[tone];
  return (
    <div className="card p-5">
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-3xl font-semibold mt-1 ${color}`}>{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { projects, audits, users, planning, currentUser } = useAppStore((s) => ({
    projects: s.projects, audits: s.audits, users: s.users, planning: s.planning, currentUser: s.currentUser,
  }));

  const totals = useMemo(() => {
    const lines = projects.reduce((n, p) => n + p.lines.length, 0);
    const machines = projects.reduce((n, p) => n + p.lines.reduce((m, l) => m + l.machines.length, 0), 0);
    const techs = users.filter((u) => u.role === 'technician' && u.active !== false).length;
    const todayISO = toISO(new Date());
    const todayPlan = planning.filter((p) => p.date === todayISO);
    return { lines, machines, techs, todayPlan };
  }, [projects, users, planning]);

  const recentAudits = [...audits].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6);
  const scoreAvg = audits.length
    ? Math.round(audits.reduce((s, a) => s + (a.score || 0), 0) / audits.length)
    : null;

  const myPlan = currentUser?.role === 'technician'
    ? planning.filter((p) => p.technicianId === currentUser.id).slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label="Projets" value={projects.length} hint={`${totals.lines} lignes · ${totals.machines} machines`} />
        <Stat label="Techniciens actifs" value={totals.techs} tone="emerald" />
        <Stat label="Audits réalisés" value={audits.length} hint={scoreAvg !== null ? `Score moyen : ${scoreAvg}%` : '—'} tone="slate" />
        <Stat label="Audits prévus aujourd'hui" value={totals.todayPlan.length} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Derniers audits</h2>
            <Link className="text-xs text-brand-700 hover:underline" to="/audits">Voir tout →</Link>
          </div>
          {recentAudits.length === 0 ? (
            <div className="text-sm text-slate-500">Aucun audit enregistré.</div>
          ) : (
            <table className="w-full">
              <thead><tr>
                <th className="th">Date</th><th className="th">Projet</th><th className="th">Ligne</th><th className="th">Score</th>
              </tr></thead>
              <tbody>
                {recentAudits.map((a) => (
                  <tr key={a.id}>
                    <td className="td">{a.date}</td>
                    <td className="td">{a.projectName}</td>
                    <td className="td">{a.lineName}</td>
                    <td className="td">
                      <Badge variant={a.score >= 80 ? 'success' : a.score >= 60 ? 'warn' : 'danger'}>
                        {a.score}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">
              {currentUser?.role === 'technician' ? 'Mes prochains audits' : "Audits d'aujourd'hui"}
            </h2>
            <Link className="text-xs text-brand-700 hover:underline" to={currentUser?.role === 'technician' ? '/tasks' : '/planning'}>
              {currentUser?.role === 'technician' ? 'Mes tâches →' : 'Planning →'}
            </Link>
          </div>
          <PlanList entries={currentUser?.role === 'technician' ? myPlan : totals.todayPlan} />
        </div>
      </div>
    </div>
  );
}

function PlanList({ entries }) {
  const { projects, users } = useAppStore((s) => ({ projects: s.projects, users: s.users }));
  if (entries.length === 0) return <div className="text-sm text-slate-500">Rien à afficher.</div>;
  const lookupLine = (pid, lid) => {
    const p = projects.find((x) => x.id === pid);
    const l = p?.lines.find((x) => x.id === lid);
    return { project: p?.name || pid, line: l?.name || lid };
  };
  const lookupUser = (uid) => users.find((u) => u.id === uid)?.displayName || uid;
  return (
    <ul className="divide-y divide-slate-100">
      {entries.map((e) => {
        const { project, line } = lookupLine(e.projectId, e.lineId);
        return (
          <li key={e.id} className="py-2 flex items-center justify-between text-sm">
            <div>
              <div className="font-medium text-slate-800">{project} · {line}</div>
              <div className="text-xs text-slate-500">{e.date} · {lookupUser(e.technicianId)}</div>
            </div>
            <Badge variant={e.unplanned ? 'warn' : 'brand'}>{e.unplanned ? 'Non planifié' : 'Planifié'}</Badge>
          </li>
        );
      })}
    </ul>
  );
}
