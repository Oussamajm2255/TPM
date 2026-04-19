import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { usePermissions } from '../hooks/usePermissions';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { toISO, fromISO, addDays, startOfWeek, DOW_FR_SHORT } from '../utils/dateUtils';

const STATUS_TONE = {
  overdue:  { variant: 'danger',  label: 'En retard' },
  today:    { variant: 'warn',    label: "Aujourd'hui" },
  week:     { variant: 'brand',   label: 'Cette semaine' },
  upcoming: { variant: 'info',    label: 'À venir' },
  done:     { variant: 'success', label: 'Terminée' },
};

function classifyTask(entry, audits, todayISO) {
  if (entry.status === 'done' || audits.some((a) => a.planId === entry.id)) return 'done';
  if (entry.date < todayISO) return 'overdue';
  if (entry.date === todayISO) return 'today';
  const endOfWeek = toISO(addDays(startOfWeek(fromISO(todayISO)), 6));
  if (entry.date <= endOfWeek) return 'week';
  return 'upcoming';
}

export default function TasksPage() {
  const { planning, projects, users, audits, currentUser } = useAppStore((s) => ({
    planning: s.planning, projects: s.projects, users: s.users, audits: s.audits, currentUser: s.currentUser,
  }));
  const { can } = usePermissions();
  const navigate = useNavigate();

  const [filterTech, setFilterTech] = useState('');
  const [showDone, setShowDone] = useState(false);

  const techs = users.filter((u) => u.role === 'technician');
  const isTech = currentUser?.role === 'technician';
  const todayISO = toISO(new Date());

  const lookup = useMemo(() => {
    const pMap = new Map(projects.map((p) => [p.id, p]));
    const lineMap = new Map();
    for (const p of projects) for (const l of p.lines) lineMap.set(l.id, { ...l, projectName: p.name });
    const uMap = new Map(users.map((u) => [u.id, u]));
    return { pMap, lineMap, uMap };
  }, [projects, users]);

  const tasks = useMemo(() => {
    let list = planning;
    if (filterTech) {
      list = list.filter((e) => e.technicianId === filterTech);
    } else {
      list = list.filter((e) => e.technicianId === currentUser?.id);
    }
    return list.map((e) => ({ ...e, bucket: classifyTask(e, audits, todayISO) }));
  }, [planning, audits, todayISO, currentUser, filterTech]);


  const groups = useMemo(() => {
    const buckets = { overdue: [], today: [], week: [], upcoming: [], done: [] };
    for (const t of tasks) buckets[t.bucket].push(t);
    for (const k of Object.keys(buckets)) buckets[k].sort((a, b) => a.date.localeCompare(b.date));
    return buckets;
  }, [tasks]);

  const total = tasks.length;
  const doneCount = groups.done.length;
  const pendingCount = total - doneCount;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="À faire aujourd'hui" value={groups.today.length} tone="amber" />
        <Kpi label="En retard" value={groups.overdue.length} tone="rose" />
        <Kpi label="Cette semaine" value={groups.week.length} tone="brand" />
        <Kpi label="À venir" value={groups.upcoming.length} tone="slate" />
        <Kpi label="Terminées" value={doneCount} tone="emerald" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          {isTech
            ? `Bonjour ${currentUser.displayName}, vous avez ${pendingCount} audit(s) à réaliser.`
            : `${pendingCount} tâches en cours · ${doneCount} terminées`}
          <span className="text-xs text-slate-400 ml-2">· Période : semaine 16 → fin 2026</span>
        </div>
        <div className="flex items-center gap-2">
          {!isTech && (
            <select className="input !w-auto" value={filterTech} onChange={(e) => setFilterTech(e.target.value)}>
              <option value="">Tous techniciens</option>
              {techs.map((t) => <option key={t.id} value={t.id}>{t.displayName}</option>)}
            </select>
          )}
          <label className="text-sm flex items-center gap-2 text-slate-600">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
            Afficher les terminées
          </label>
        </div>
      </div>

      {total === 0 && (
        <EmptyState
          title="Aucune tâche planifiée"
          hint={can('planning.generate')
            ? "Générez le planning depuis l'onglet Planning pour créer les tâches de l'année."
            : "Patientez : votre responsable doit encore générer le planning."}
        />
      )}

      <TaskGroup title="En retard"         bucket="overdue"  entries={groups.overdue}   lookup={lookup} onStart={(e) => startAudit(navigate, e)} />
      <TaskGroup title="Aujourd'hui"       bucket="today"    entries={groups.today}     lookup={lookup} onStart={(e) => startAudit(navigate, e)} highlight />
      <TaskGroup title="Cette semaine"     bucket="week"     entries={groups.week}      lookup={lookup} onStart={(e) => startAudit(navigate, e)} />
      <TaskGroup title="À venir"           bucket="upcoming" entries={groups.upcoming}  lookup={lookup} onStart={(e) => startAudit(navigate, e)} />
      {showDone && <TaskGroup title="Terminées" bucket="done" entries={groups.done}     lookup={lookup} />}
    </div>
  );
}

function startAudit(navigate, entry) {
  navigate(`/audits/new?planId=${entry.id}&projectId=${entry.projectId}&lineId=${entry.lineId}&date=${entry.date}`);
}

function Kpi({ label, value, tone = 'slate' }) {
  const color = { brand: 'text-brand-700', emerald: 'text-emerald-600', amber: 'text-amber-600', rose: 'text-rose-600', slate: 'text-slate-700' }[tone];
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function TaskGroup({ title, bucket, entries, lookup, onStart, highlight }) {
  if (!entries.length) return null;
  const { variant } = STATUS_TONE[bucket];
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <Badge variant={variant}>{entries.length}</Badge>
      </div>
      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 ${highlight ? 'relative' : ''}`}>
        {entries.map((e) => (
          <TaskCard key={e.id} entry={e} lookup={lookup} onStart={onStart} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ entry, lookup, onStart }) {
  const project = lookup.pMap.get(entry.projectId);
  const line = lookup.lineMap.get(entry.lineId);
  const user = lookup.uMap.get(entry.technicianId);
  const d = fromISO(entry.date);
  const dayLabel = `${DOW_FR_SHORT[(d.getDay() + 6) % 7]} ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const { variant, label } = STATUS_TONE[entry.bucket];
  const disabled = entry.bucket === 'done';

  return (
    <div className={`card p-4 flex flex-col justify-between transition-shadow hover:shadow-md ${
      entry.bucket === 'overdue' ? 'border-rose-200' :
      entry.bucket === 'today' ? 'border-amber-300 ring-1 ring-amber-200' :
      entry.unplanned ? 'border-amber-200' : ''
    }`}>
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-slate-500">{dayLabel}</div>
            <div className="font-semibold text-slate-900 mt-0.5">{project?.name}</div>
            <div className="text-sm text-slate-600">Ligne <b>{line?.name}</b></div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={variant}>{label}</Badge>
            {entry.unplanned && <Badge variant="warn">Urgent</Badge>}
            {entry.rescheduled && <Badge variant="info">Reporté</Badge>}
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          Technicien : <span className="text-slate-700 font-medium">{user?.displayName || '—'}</span>
          {line && <> · {line.machines?.length || 0} machines</>}
        </div>
        {entry.reason && (
          <div className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded p-2">
            <span className="font-medium">Motif :</span> {entry.reason}
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-end">
        {disabled ? (
          <Badge variant="success">✓ Audit réalisé</Badge>
        ) : (
          <button className="btn-primary" onClick={() => onStart(entry)}>
            Démarrer l'audit →
          </button>
        )}
      </div>
    </div>
  );
}
