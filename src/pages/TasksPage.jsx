import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { usePermissions } from '../hooks/usePermissions';
import { actionService } from '../services/actionService';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
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
  const [filterProject, setFilterProject] = useState('');
  const [filterLine, setFilterLine] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [reassignTarget, setReassignTarget] = useState(null);

  const techs = users.filter((u) => u.role === 'technician');
  const isTech = currentUser?.role === 'technician';
  const isAdmin = can('planning.edit');
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
    } else if (isTech) {
      list = list.filter((e) => e.technicianId === currentUser?.id);
    }

    if (filterProject) list = list.filter((e) => e.projectId === filterProject);
    if (filterLine) list = list.filter((e) => e.lineId === filterLine);

    // For technicians, only show tasks up to today (or already done)
    if (isTech) {
      list = list.filter((e) => 
        e.date <= todayISO || 
        e.status === 'done' || 
        audits.some((a) => a.planId === e.id)
      );
    }

    return list.map((e) => ({ ...e, bucket: classifyTask(e, audits, todayISO) }));
  }, [planning, audits, todayISO, currentUser, filterTech, filterProject, filterLine, isTech]);


  const groups = useMemo(() => {
    const buckets = { overdue: [], today: [], week: [], upcoming: [], done: [] };
    for (const t of tasks) buckets[t.bucket].push(t);
    for (const k of Object.keys(buckets)) buckets[k].sort((a, b) => a.date.localeCompare(b.date));
    return buckets;
  }, [tasks]);

  const totalCount = tasks.length;
  const doneCount = groups.done.length;
  const pendingCount = totalCount - doneCount;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const currentProject = projects.find(p => p.id === filterProject);

  // --- Actions view state
  const [view, setView] = useState('audits');
  const [actionItems, setActionItems] = useState([]);

  useEffect(() => {
    if (view === 'actions') {
      (async () => {
        const techName = currentUser?.displayName;
        const all = isTech
          ? await actionService.getByTechnician(techName)
          : await actionService.getAll();
        // Filter by project/tech if admin filters are set
        let filtered = all;
        if (!isTech && filterTech) {
          const u = users.find(x => x.id === filterTech);
          if (u) filtered = filtered.filter(a =>
            (a.resp && a.resp.toLowerCase() === u.displayName?.toLowerCase()) ||
            (!a.resp && a.auditeur?.toLowerCase() === u.displayName?.toLowerCase())
          );
        }
        if (filterProject) filtered = filtered.filter(a => a.projectId === filterProject);
        setActionItems(filtered);
      })();
    }
  }, [view, currentUser, filterTech, filterProject, users, audits, isTech]);

  const actionGroups = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const buckets = { overdue: [], open: [], in_progress: [], closed: [] };
    for (const a of actionItems) {
      if (a.act === 'closed') buckets.closed.push(a);
      else if (a.deadline && a.deadline < today) buckets.overdue.push(a);
      else if (a.act === 'in_progress') buckets.in_progress.push(a);
      else buckets.open.push(a);
    }
    return buckets;
  }, [actionItems]);

  const actionTotal = actionItems.length;
  const actionClosed = actionGroups.closed.length;
  const actionOpen = actionGroups.open.length + actionGroups.overdue.length;

  return (
    <div className="space-y-5">
      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('audits')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
            view === 'audits'
              ? 'bg-[#eef0ff] border-[#5759e0] text-[#1f20c3]'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-[#f6f7ff]'
          }`}
        >
          Audits Planifiés ({isTech ? pendingCount : totalCount})
        </button>
        <button
          onClick={() => setView('actions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
            view === 'actions'
              ? 'bg-[#eef0ff] border-[#5759e0] text-[#1f20c3]'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-[#f6f7ff]'
          }`}
        >
          Actions Correctives ({actionTotal})
        </button>
      </div>

      {/* ===== AUDITS VIEW ===== */}
      {view === 'audits' && <>
      {!isTech && (
        <div className="card p-5 bg-white shadow-sm border-slate-100 overflow-hidden relative">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-slate-800">Progression globale des audits</div>
            <div className="text-sm font-bold text-brand-600">{progressPct}%</div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-500 transition-all duration-1000" 
              style={{ width: `${progressPct}%` }} 
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-400 uppercase tracking-wider">
            {doneCount} terminés / {totalCount} total planifiés
          </div>
        </div>
      )}

      <div className={`grid gap-3 ${isTech ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'}`}>
        <Kpi label="À faire aujourd'hui" value={groups.today.length} tone="amber" />
        <Kpi label="En retard" value={groups.overdue.length} tone="rose" />
        {!isTech && (
          <>
            <Kpi label="Cette semaine" value={groups.week.length} tone="brand" />
            <Kpi label="À venir" value={groups.upcoming.length} tone="slate" />
          </>
        )}
        <Kpi label="Terminées" value={doneCount} tone="emerald" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          {isTech
            ? `Bonjour ${currentUser.displayName}, vous avez ${pendingCount} audit(s) à réaliser.`
            : `${pendingCount} tâches en cours · ${doneCount} terminées`}
          <span className="text-xs text-slate-400 ml-2">· Période : 2026</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {!isTech && (
            <>
              <select className="input !w-full sm:!w-auto" value={filterProject} onChange={(e) => { setFilterProject(e.target.value); setFilterLine(''); }}>
                <option value="">Tous projets</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className="input !w-full sm:!w-auto" value={filterLine} onChange={(e) => setFilterLine(e.target.value)}>
                <option value="">Toutes lignes</option>
                {currentProject?.lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <select className="input !w-full sm:!w-auto" value={filterTech} onChange={(e) => setFilterTech(e.target.value)}>
                <option value="">Tous techniciens</option>
                {techs.map((t) => <option key={t.id} value={t.id}>{t.displayName}</option>)}
              </select>
            </>
          )}
          <label className="text-sm flex items-center gap-2 text-slate-600 ml-2">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
            Afficher les terminées
          </label>
        </div>
      </div>

      {totalCount === 0 && (
        <EmptyState
          title="Aucune tâche trouvée"
          hint="Ajustez vos filtres ou générez le planning annuel."
        />
      )}

      <TaskGroup title="En retard"         bucket="overdue"  entries={groups.overdue}   lookup={lookup} onStart={(e) => startAudit(navigate, e)} isAdmin={isAdmin} onReassign={setReassignTarget} />
      <TaskGroup title="Aujourd'hui"       bucket="today"    entries={groups.today}     lookup={lookup} onStart={(e) => startAudit(navigate, e)} isAdmin={isAdmin} onReassign={setReassignTarget} highlight />
      <TaskGroup title="Cette semaine"     bucket="week"     entries={groups.week}      lookup={lookup} onStart={(e) => startAudit(navigate, e)} isAdmin={isAdmin} onReassign={setReassignTarget} />
      <TaskGroup title="À venir"           bucket="upcoming" entries={groups.upcoming}  lookup={lookup} onStart={(e) => startAudit(navigate, e)} isAdmin={isAdmin} onReassign={setReassignTarget} />
      {showDone && <TaskGroup title="Terminées" bucket="done" entries={groups.done}     lookup={lookup} isAdmin={isAdmin} onReassign={setReassignTarget} />}

      {reassignTarget && (
        <ReassignModal
          task={reassignTarget}
          techs={techs}
          onClose={() => setReassignTarget(null)}
          onConfirm={async (techId) => {
            await useAppStore.getState().reassignTask(reassignTarget.id, techId);
            setReassignTarget(null);
          }}
        />
      )}
      </>}

      {/* ===== ACTIONS VIEW ===== */}
      {view === 'actions' && <ActionsView
        actionItems={actionItems}
        actionGroups={actionGroups}
        actionTotal={actionTotal}
        actionOpen={actionOpen}
        actionClosed={actionClosed}
        currentUser={currentUser}
        isTech={isTech}
        isAdmin={isAdmin}
        audits={audits}
        updateActionStatus={(auditId, idx, status) => useAppStore.getState().updateActionStatus(auditId, idx, status)}
      />}
    </div>
  );
}

// ============ ACTIONS VIEW ============
function ActionsView({ actionItems, actionGroups, actionTotal, actionOpen, actionClosed, currentUser, isTech, isAdmin, audits, updateActionStatus }) {
  const handleCycle = async (auditId, actionIdx, current) => {
    const cycle = { open: 'in_progress', in_progress: 'closed', closed: 'open' };
    await updateActionStatus(auditId, actionIdx, cycle[current || 'open']);
  };

  const groupDefs = [
    { key: 'overdue',   title: 'En retard',        variant: 'danger' },
    { key: 'open',       title: 'Ouvertes',         variant: 'warn' },
    { key: 'in_progress',title: 'En cours',         variant: 'brand' },
    { key: 'closed',     title: 'Clôturées',        variant: 'success' },
  ];

  const filteredGroups = groupDefs.filter(g => actionGroups[g.key].length > 0);

  if (actionTotal === 0) {
    return (
      <EmptyState
        title="Aucune action corrective"
        hint={isTech ? "Les actions qui vous sont assignées apparaîtront ici." : "Les actions correctives des audits apparaîtront ici."}
      />
    );
  }

  return (
    <>
      {/* Actions KPI */}
      <div className={`grid gap-3 ${isTech ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <ActionKpi label="Total" value={actionTotal} tone="slate" />
        <ActionKpi label="Ouvertes" value={actionOpen} tone="rose" />
        <ActionKpi label="Clôturées" value={actionClosed} tone="emerald" />
        <ActionKpi label="Résolution" value={`${actionTotal > 0 ? Math.round((actionClosed / actionTotal) * 100) : 0}%`} tone="brand" />
      </div>

      {/* Action Groups */}
      {filteredGroups.map(g => (
        <div key={g.key}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-slate-900">{g.title}</h3>
            <Badge variant={g.variant}>{actionGroups[g.key].length}</Badge>
          </div>
          <div className="space-y-2">
            {actionGroups[g.key].map((act, i) => (
              <ActionCard
                key={`${act.auditId}-${act.actionIdx}`}
                action={act}
                onCycle={() => handleCycle(act.auditId, act.actionIdx, act.act)}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function ActionKpi({ label, value, tone = 'slate' }) {
  const color = { brand: 'text-brand-700', emerald: 'text-emerald-600', amber: 'text-amber-600', rose: 'text-rose-600', slate: 'text-slate-700' }[tone];
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

function ActionCard({ action, onCycle }) {
  const status = action.act || 'open';
  const variant = actionService.STATUS_VARIANT[status];
  const chipClass = variant === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-700' : variant === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-700' : variant === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-brand-50 border-brand-200 text-brand-700';

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 leading-snug">{action.problem || action.action || 'Sans description'}</div>
          <div className="text-xs text-slate-500 mt-1">
            {action.projectName} · {action.lineName}
            {action.resp && <span className="ml-2 text-slate-400">Resp: {action.resp}</span>}
          </div>
        </div>
        <button
          onClick={onCycle}
          className={`chip text-[10px] font-bold cursor-pointer hover:opacity-80 transition-opacity shrink-0 ${chipClass}`}
          title="Cliquer pour changer le statut"
        >
          {actionService.STATUS_LABEL[status]}
        </button>
      </div>
      {action.deadline && (
        <div className="text-[10px] text-slate-400">
          Échéance: {action.deadline}
        </div>
      )}
      {action.commentaires && (
        <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2">{action.commentaires}</div>
      )}
    </div>
  );
}

function ReassignModal({ task, techs, onClose, onConfirm }) {
  const [selected, setSelected] = useState(task.technicianId);
  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Réaffecter l'audit"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onConfirm(selected)}>Confirmer</button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="text-sm text-slate-600">Choisissez le nouveau technicien pour cet audit :</div>
        <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {techs.map((t) => <option key={t.id} value={t.id}>{t.displayName}</option>)}
        </select>
      </div>
    </Modal>
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

function TaskGroup({ title, bucket, entries, lookup, onStart, highlight, isAdmin, onReassign }) {
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
          <TaskCard 
            key={e.id} 
            entry={e} 
            lookup={lookup} 
            onStart={onStart} 
            isAdmin={isAdmin}
            onReassign={onReassign}
          />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ entry, lookup, onStart, isAdmin, onReassign }) {
  const project = lookup.pMap.get(entry.projectId);
  const line = lookup.lineMap.get(entry.lineId);
  const user = lookup.uMap.get(entry.technicianId);
  const d = fromISO(entry.date);
  const dayLabel = `${DOW_FR_SHORT[(d.getDay() + 6) % 7]} ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const { variant, label } = STATUS_TONE[entry.bucket];
  const disabled = entry.bucket === 'done';

  const toggleUrgent = () => {
    useAppStore.getState().toggleUrgent(entry.id, !!entry.unplanned);
  };

  return (
    <div className={`card p-4 flex flex-col justify-between transition-shadow hover:shadow-md ${
      entry.bucket === 'overdue' ? 'border-rose-200' :
      entry.bucket === 'today' ? 'border-amber-300 ring-1 ring-amber-200' :
      entry.unplanned ? 'border-rose-300 ring-1 ring-rose-100 bg-rose-50/10' : ''
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
            {entry.unplanned && <Badge variant="danger">Urgent</Badge>}
            {entry.rescheduled && <Badge variant="info">Reporté</Badge>}
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
          <span>Technicien : <span className="text-slate-700 font-medium">{user?.displayName || '—'}</span></span>
          {isAdmin && !disabled && (
            <button className="text-brand-600 hover:underline font-medium" onClick={() => onReassign(entry)}>Modifier</button>
          )}
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          {line && <>{line.machines?.length || 0} machines à vérifier</>}
        </div>
        {entry.reason && (
          <div className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded p-2">
            <span className="font-medium">Motif :</span> {entry.reason}
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          {isAdmin && !disabled && (
            <button 
              className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                entry.unplanned ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              onClick={toggleUrgent}
            >
              {entry.unplanned ? 'Retirer Urgence' : 'Mettre en Urgent'}
            </button>
          )}
        </div>
        {disabled ? (
          <Badge variant="success">✓ Audit réalisé</Badge>
        ) : (
          <button className="btn-primary py-1.5 px-4 text-sm" onClick={() => onStart(entry)}>
            Démarrer →
          </button>
        )}
      </div>
    </div>
  );
}
