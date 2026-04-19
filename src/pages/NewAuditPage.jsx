import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { auditService } from '../services/auditService';
import ChecklistRenderer from '../components/audit/ChecklistRenderer';
import Badge from '../components/common/Badge';
import { toISO } from '../utils/dateUtils';

export default function NewAuditPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { projects, checklist, currentUser, createAudit } = useAppStore((s) => ({
    projects: s.projects, checklist: s.checklist, currentUser: s.currentUser, createAudit: s.createAudit,
  }));

  const [projectId, setProjectId] = useState(params.get('projectId') || projects[0]?.id || '');
  const [lineId, setLineId] = useState(params.get('lineId') || '');
  const [machineId, setMachineId] = useState('');
  const [date, setDate] = useState(params.get('date') || toISO(new Date()));
  const [auditeur, setAuditeur] = useState(currentUser?.displayName || '');
  const [superviseur, setSuperviseur] = useState('');
  const [gapLeader, setGapLeader] = useState('');
  const [answers, setAnswers] = useState({});
  const [actions, setActions] = useState([{ problem: '', action: '', resp: '', deadline: '', act: '', commentaires: '' }]);
  const [saving, setSaving] = useState(false);
  const [planId] = useState(params.get('planId') || null);

  const project = projects.find((p) => p.id === projectId);
  const line = project?.lines.find((l) => l.id === lineId);
  const machine = line?.machines.find((m) => m.id === machineId);

  useEffect(() => {
    if (project && !line) setLineId(project.lines[0]?.id || '');
  }, [projectId]);

  useEffect(() => {
    if (line && !machine) setMachineId(line.machines[0]?.id || '');
  }, [lineId]);

  const score = useMemo(() => auditService.computeScore(checklist, answers), [checklist, answers]);

  const submit = async () => {
    if (!projectId || !lineId) { alert('Sélectionnez un projet et une ligne'); return; }
    setSaving(true);
    try {
      await createAudit({
        planId,
        date,
        projectId,
        projectName: project?.name,
        lineId,
        lineName: line?.name,
        machineId,
        machineCode: machine?.code,
        technicianId: currentUser?.id,
        auditeur,
        superviseur,
        gapLeader,
        answers,
        actions: actions.filter((a) => a.problem || a.action || a.commentaires),
        score,
      });
      if (planId) {
        await useAppStore.getState().updatePlanEntry(planId, { status: 'done' });
      }
      navigate('/audits');
    } finally { setSaving(false); }
  };

  if (!checklist) return <div className="text-sm text-slate-500">Chargement de la check-list…</div>;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">{checklist.title}</h2>
          <Badge variant={score >= 80 ? 'success' : score >= 60 ? 'warn' : 'danger'}>
            Score : {score}%
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className="label">UAP (Projet)</label>
            <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div><label className="label">Ligne</label>
            <select className="input" value={lineId} onChange={(e) => setLineId(e.target.value)}>
              {project?.lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select></div>
          <div><label className="label">N° Machine</label>
            <select className="input" value={machineId} onChange={(e) => setMachineId(e.target.value)}>
              <option value="">—</option>
              {line?.machines.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
            </select></div>
          <div><label className="label">Auditeur</label>
            <input className="input" value={auditeur} onChange={(e) => setAuditeur(e.target.value)} /></div>
          <div><label className="label">Superviseur</label>
            <input className="input" value={superviseur} onChange={(e) => setSuperviseur(e.target.value)} /></div>
          <div><label className="label">Gap Leader</label>
            <input className="input" value={gapLeader} onChange={(e) => setGapLeader(e.target.value)} /></div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">Points à vérifier</h3>
        <ChecklistRenderer checklist={checklist} answers={answers} onChange={setAnswers} />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Actions correctives</h3>
          <button className="btn-secondary" onClick={() => setActions([...actions, { problem: '', action: '', resp: '', deadline: '', act: '', commentaires: '' }])}>
            + Ajouter
          </button>
        </div>
        <div className="space-y-3">
          {actions.map((a, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-6 gap-2">
              <input className="input md:col-span-2" placeholder="Problème" value={a.problem} onChange={(e) => setActions(actions.map((x, idx) => idx === i ? { ...x, problem: e.target.value } : x))} />
              <input className="input md:col-span-2" placeholder="Action" value={a.action} onChange={(e) => setActions(actions.map((x, idx) => idx === i ? { ...x, action: e.target.value } : x))} />
              <input className="input" placeholder="Resp." value={a.resp} onChange={(e) => setActions(actions.map((x, idx) => idx === i ? { ...x, resp: e.target.value } : x))} />
              <input type="date" className="input" value={a.deadline} onChange={(e) => setActions(actions.map((x, idx) => idx === i ? { ...x, deadline: e.target.value } : x))} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={() => navigate(-1)}>Annuler</button>
        <button className="btn-primary" onClick={submit} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer l\'audit'}
        </button>
      </div>
    </div>
  );
}
