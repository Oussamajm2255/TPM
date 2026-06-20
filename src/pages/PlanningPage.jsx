import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { usePermissions } from '../hooks/usePermissions';
import CalendarMonth from '../components/planning/CalendarMonth';
import CalendarWeek from '../components/planning/CalendarWeek';
import CalendarDay from '../components/planning/CalendarDay';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { MONTHS_FR, startOfWeek, toISO, fromISO } from '../utils/dateUtils';

const VIEWS = ['Mois', 'Semaine', 'Jour'];

export default function PlanningPage() {
  const { projects, users, planning, settings, currentUser } = useAppStore((s) => ({
    projects: s.projects, users: s.users, planning: s.planning, settings: s.settings, currentUser: s.currentUser,
  }));
  const addUnplanned = useAppStore((s) => s.addUnplanned);
  const removePlanEntry = useAppStore((s) => s.removePlanEntry);
  const { can } = usePermissions();
  const navigate = useNavigate();

  const year = settings?.planningYear || 2026;
  const isTech = currentUser?.role === 'technician';
  const [view, setView] = useState(isTech ? 'Semaine' : 'Mois');
  const [cursor, setCursor] = useState(isTech ? new Date() : new Date(year, 0, 1));
  const [showUnplanned, setShowUnplanned] = useState(false);
  const [filterTech, setFilterTech] = useState('');
  const [filterProject, setFilterProject] = useState('');

  const techs = users.filter((u) => u.role === 'technician');

  const scopedEntries = useMemo(() => {
    let list = planning;
    if (currentUser?.role === 'technician') list = list.filter((e) => e.technicianId === currentUser.id);
    if (filterTech) list = list.filter((e) => e.technicianId === filterTech);
    if (filterProject) list = list.filter((e) => e.projectId === filterProject);
    return list;
  }, [planning, filterTech, filterProject, currentUser]);

  const displayEntries = useMemo(() => {
    const uMap = new Map(users.map((u) => [u.id, u]));
    const lineMap = new Map();
    for (const p of projects) for (const l of p.lines) lineMap.set(l.id, { ...l, projectName: p.name });
    return scopedEntries.map((e) => ({
      ...e,
      display: `${uMap.get(e.technicianId)?.displayName?.slice(0, 4) || '??'} · ${lineMap.get(e.lineId)?.name || ''}`,
    }));
  }, [scopedEntries, users, projects]);

  return (
    <div className="space-y-4">
      <div className="card-industrial p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!isTech && VIEWS.map((v) => (
            <button key={v}
              className={`btn-secondary ${view === v ? '!bg-[#eef0ff] !text-[#1f20c3] !border-[#5759e0]' : ''}`}
              onClick={() => setView(v)}>{v}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentUser?.role !== 'technician' ? (
            <>
              <select className="input !w-full sm:!w-auto" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
                <option value="">Tous projets</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className="input !w-full sm:!w-auto" value={filterTech} onChange={(e) => setFilterTech(e.target.value)}>
                <option value="">Tous techniciens</option>
                {techs.map((t) => <option key={t.id} value={t.id}>{t.displayName}</option>)}
              </select>
              {can('planning.unplanned') && (
                <button className="btn-secondary" onClick={() => setShowUnplanned(true)}>+ Audit non planifié</button>
              )}
            </>
          ) : (
            <div className="bg-[#eef0ff] text-indigo-700 px-4 py-2 rounded-[8px] text-sm font-semibold border border-[#4b4cd9]/40">
              Mon planning d'audits
            </div>
          )}
        </div>
      </div>


      <div className="card-industrial p-4">
        <NavBar view={view} cursor={cursor} setCursor={setCursor} year={year} />

        {view === 'Mois' && (
          <div className="overflow-x-auto">
            <CalendarMonth
              year={cursor.getFullYear()}
              month={cursor.getMonth()}
              entries={displayEntries}
              onSelectDay={(iso) => { setCursor(fromISO(iso)); setView('Jour'); }}
            />
          </div>
        )}
        {view === 'Semaine' && (
          <div className="overflow-x-auto">
            <CalendarWeek
              weekStart={startOfWeek(cursor)}
              entries={displayEntries}
              projects={projects}
              users={users}
              onPick={(e) => navigate(`/audits/new?planId=${e.id}&projectId=${e.projectId}&lineId=${e.lineId}&date=${e.date}`)}
            />
          </div>
        )}
        {view === 'Jour' && (
          <CalendarDay
            dateISO={toISO(cursor)}
            entries={displayEntries.filter((e) => e.date === toISO(cursor))}
            projects={projects}
            users={users}
            onPick={(e) => navigate(`/audits/new?planId=${e.id}&projectId=${e.projectId}&lineId=${e.lineId}&date=${e.date}`)}
            onRemove={can('planning.edit') ? removePlanEntry : null}
          />
        )}
      </div>


      {currentUser?.role !== 'technician' && <PlanStats entries={planning} users={users} projects={projects} />}

      <UnplannedModal
        open={showUnplanned}
        onClose={() => setShowUnplanned(false)}
        projects={projects}
        technicians={techs}
        onSubmit={async (input) => { await addUnplanned(input); setShowUnplanned(false); }}
      />
    </div>
  );
}

function NavBar({ view, cursor, setCursor, year }) {
  const label = view === 'Mois'
    ? `${MONTHS_FR[cursor.getMonth()]} ${cursor.getFullYear()}`
    : view === 'Semaine'
      ? `Semaine du ${toISO(startOfWeek(cursor))}`
      : cursor.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const shift = (delta) => {
    const d = new Date(cursor);
    if (view === 'Mois') d.setMonth(d.getMonth() + delta);
    else if (view === 'Semaine') d.setDate(d.getDate() + delta * 7);
    else d.setDate(d.getDate() + delta);
    setCursor(d);
  };

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-1">
        <button className="btn-secondary" onClick={() => shift(-1)}>‹</button>
        <button className="btn-secondary" onClick={() => setCursor(new Date(year, 0, 1))}>Début</button>
        <button className="btn-secondary" onClick={() => shift(1)}>›</button>
      </div>
      <div className="font-semibold text-slate-900 capitalize">{label}</div>
      <div />
    </div>
  );
}

function PlanStats({ entries, users, projects }) {
  const byTech = new Map();
  const byProject = new Map();
  for (const e of entries) {
    byTech.set(e.technicianId, (byTech.get(e.technicianId) || 0) + 1);
    byProject.set(e.projectId, (byProject.get(e.projectId) || 0) + 1);
  }
  const uName = (id) => users.find((u) => u.id === id)?.displayName || id;
  const pName = (id) => projects.find((p) => p.id === id)?.name || id;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card-industrial p-4">
        <h3 className="font-semibold text-slate-900 mb-3">Charge par technicien</h3>
        <div className="space-y-1">
          {[...byTech.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => (
            <Row key={id} label={uName(id)} value={n} max={Math.max(...byTech.values(), 1)} />
          ))}
          {byTech.size === 0 && <div className="text-sm text-slate-500">—</div>}
        </div>
      </div>
      <div className="card-industrial p-4">
        <h3 className="font-semibold text-slate-900 mb-3">Couverture par projet</h3>
        <div className="space-y-1">
          {[...byProject.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => (
            <Row key={id} label={pName(id)} value={n} max={Math.max(...byProject.values(), 1)} />
          ))}
          {byProject.size === 0 && <div className="text-sm text-slate-500">—</div>}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, max }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-28 truncate text-slate-600">{label}</div>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-[#1f20c3]" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-10 text-right font-medium text-slate-700">{value}</div>
    </div>
  );
}

function UnplannedModal({ open, onClose, projects, technicians, onSubmit }) {
  const [date, setDate] = useState(toISO(new Date(2026, 0, 1)));
  const [technicianId, setTechnicianId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [lineId, setLineId] = useState('');
  const [reason, setReason] = useState('');
  const project = projects.find((p) => p.id === projectId);

  const submit = () => {
    if (!date || !technicianId || !projectId || !lineId) return;
    onSubmit({ date, technicianId, projectId, lineId, reason });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Audit non planifié"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={submit}>Ajouter</button>
        </div>
      }
    >
      <div className="space-y-3">
        <div><label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="label">Technicien</label>
          <select className="input" value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
            <option value="">—</option>
            {technicians.map((t) => <option key={t.id} value={t.id}>{t.displayName}</option>)}
          </select></div>
        <div><label className="label">Projet</label>
          <select className="input" value={projectId} onChange={(e) => { setProjectId(e.target.value); setLineId(''); }}>
            <option value="">—</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></div>
        <div><label className="label">Ligne</label>
          <select className="input" value={lineId} onChange={(e) => setLineId(e.target.value)}>
            <option value="">—</option>
            {project?.lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select></div>
        <div><label className="label">Motif</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Panne, demande GAP, …" /></div>
        <div className="text-xs text-slate-500">
          L'audit prévu pour ce technicien ce jour-là (s'il existe) sera automatiquement décalé au prochain jour ouvré libre.
        </div>
      </div>
    </Modal>
  );
}
