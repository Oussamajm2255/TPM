import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { usePermissions } from '../hooks/usePermissions';
import { actionService } from '../services/actionService';
import { auditService } from '../services/auditService';

export default function AuditsPage() {
  const { audits, projects, users, checklist, currentUser, removeAudit, clearAllAudits } = useAppStore((s) => ({
    audits: s.audits, projects: s.projects, users: s.users, checklist: s.checklist, currentUser: s.currentUser,
    removeAudit: s.removeAudit, clearAllAudits: s.clearAllAudits,
  }));
  const { can } = usePermissions();

  const [filterProject, setFilterProject] = useState('');
  const [filterTech, setFilterTech] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [searchParams] = useSearchParams();

  // Auto-open audit from planning ?auditId=PL1
  useEffect(() => {
    const planId = searchParams.get('auditId');
    if (planId) {
      const found = audits.find(a => a.planId === planId);
      if (found) setSelected(found);
    }
  }, [searchParams, audits]);

  const scoped = useMemo(() => {
    let list = audits;
    if (currentUser?.role === 'technician') {
      list = list.filter((a) => a.technicianId === currentUser.id);
    }
    if (filterProject) list = list.filter((a) => a.projectId === filterProject);
    if (filterTech) list = list.filter((a) => a.technicianId === filterTech);
    return [...list].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
  }, [audits, filterProject, filterTech, currentUser]);

  const techs = users.filter((u) => u.role === 'technician');

  const handleClearAll = async () => {
    if (!confirm('Supprimer TOUS les audits ? Cette action est irréversible.')) return;
    setBusy(true);
    try { await clearAllAudits(); } 
    catch (err) { alert('Erreur lors de la suppression'); }
    finally { setBusy(false); }
  };

  const handleRemoveOne = async (id) => {
    if (!confirm('Supprimer cet audit ?')) return;
    setBusy(true);
    try { await removeAudit(id); }
    catch (err) { alert('Erreur lors de la suppression'); }
    finally { setBusy(false); }
  };

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
        <div className="flex items-center gap-2">
          {can('audits.delete') && audits.length > 0 && (
            <button 
              className="btn-ghost text-rose-600 border border-rose-100 bg-rose-50/50 hover:bg-rose-50 disabled:opacity-50"
              onClick={handleClearAll}
              disabled={busy}
            >
              {busy ? 'Suppression…' : 'Tout supprimer'}
            </button>
          )}
          {can('audits.create') && (
            <Link to="/audits/new" className="btn-primary">+ Nouvel audit</Link>
          )}
        </div>
      </div>

      {scoped.length === 0 ? (
        <EmptyState
          title="Aucun audit"
          hint="Démarrez un nouvel audit depuis le planning ou créez-en un directement."
          action={can('audits.create') && <Link to="/audits/new" className="btn-primary">Créer un audit</Link>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Date</th><th className="th">Projet</th><th className="th">Ligne</th>
                <th className="th">Machines</th><th className="th">Auditeur</th><th className="th">Score</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {scoped.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(a)}>
                  <td className="td">{a.date}</td>
                  <td className="td">{a.projectName}</td>
                  <td className="td">{a.lineName}</td>
                  <td className="td">
                    {(() => {
                      const nokMachinesMap = new Map(); // code -> Set of comments
                      
                      // 1. Check new answer format
                      if (a.answers) {
                        Object.entries(a.answers).forEach(([qId, ans]) => {
                          if (ans?.nokMachines?.length) {
                            const question = checklist?.items?.find(i => i.id === qId)?.label || qId;
                            ans.nokMachines.forEach(mId => {
                              // Lookup machine code from projects if possible, 
                              // but NewAuditPage saves machineIssues summary which has codes.
                              const machineSummary = a.machineIssues?.find(mi => mi.machineId === mId);
                              const code = machineSummary?.machineCode || mId;
                              if (!nokMachinesMap.has(code)) nokMachinesMap.set(code, new Set());
                              nokMachinesMap.get(code).add(question);
                            });
                          }
                        });
                      }
                      
                      // 2. Check legacy machineIssues summary (if answers didn't have nokMachines or for older audits)
                      if (nokMachinesMap.size === 0 && a.machineIssues) {
                        a.machineIssues.forEach(mi => {
                          if (mi.status === 'nok') {
                            if (!nokMachinesMap.has(mi.machineCode)) nokMachinesMap.set(mi.machineCode, new Set());
                            if (mi.comment) nokMachinesMap.get(mi.machineCode).add(mi.comment);
                          }
                        });
                      }

                      // 3. Check very old single machine logic
                      if (nokMachinesMap.size === 0 && a.machineCode) {
                         return a.machineCode;
                      }

                      if (nokMachinesMap.size === 0) return <Badge variant="success">Toutes OK</Badge>;

                      const totalNok = nokMachinesMap.size;
                      const tooltip = Array.from(nokMachinesMap.entries())
                        .map(([code, comments]) => `${code}: ${Array.from(comments).join(', ')}`)
                        .join('\n');

                      return (
                        <Badge variant="danger" title={tooltip}>
                          {totalNok} NOK
                        </Badge>
                      );
                    })()}
                  </td>
                  <td className="td">{a.auditeur}</td>
                  <td className="td">
                    {(() => {
                      const effScore = auditService.computeEffectiveScore(a.score, a.actions);
                      const allClosed = auditService.isAllActionsClosed(a.actions);
                      const hasActions = a.actions?.length > 0;
                      return (
                        <div className="flex items-center gap-1">
                          <Badge variant={effScore >= 80 ? 'success' : effScore >= 60 ? 'warn' : 'danger'}>
                            {effScore}%
                          </Badge>
                          {hasActions && !allClosed && (
                            <span className="text-[9px] text-amber-600 font-medium" title="Score provisoire — actions en cours">⏳</span>
                          )}
                          {hasActions && allClosed && (
                            <span className="text-[10px] text-emerald-600" title="Toutes les actions sont clôturées">✓</span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="td text-right">
                    {can('audits.delete') && (
                      <button 
                        className="btn-ghost text-rose-600 disabled:opacity-50" 
                        onClick={(e) => { e.stopPropagation(); handleRemoveOne(a.id); }}
                        disabled={busy}
                      >
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {selected && (
        <AuditReportModal audit={selected} checklist={checklist} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function AuditReportModal({ audit, checklist, onClose }) {
  if (!audit) return null;

  // Always read fresh audit from store so status updates reflect immediately
  const freshAudit = useAppStore(s => s.audits.find(a => a.id === audit.id)) || audit;

  const YES_NO = { yes: 'OK', no: 'NOK', na: 'N/A' };
  const TONE_CLASS = {
    yes: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    no: 'bg-rose-50 border-rose-200 text-rose-700',
    na: 'bg-slate-100 border-slate-200 text-slate-500',
  };

  const getAnswerValue = (ans) => typeof ans === 'string' ? ans : ans?.value;
  const getNokMachines = (ans) => ans?.nokMachines || [];

  const machineLookup = new Map();
  if (freshAudit.machineIssues) {
    freshAudit.machineIssues.forEach(mi => machineLookup.set(mi.machineId, mi.machineCode));
  }

  const handleStatusCycle = async (actionIdx, currentStatus) => {
    const cycle = { open: 'in_progress', in_progress: 'closed', closed: 'open' };
    const next = cycle[currentStatus || 'open'];
    await useAppStore.getState().updateActionStatus(freshAudit.id, actionIdx, next);
  };

  return (
    <Modal open={!!audit} onClose={onClose} title="Rapport d'audit" width="max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Date" value={freshAudit.date} />
          <Field label="Projet" value={freshAudit.projectName} />
          <Field label="Ligne" value={freshAudit.lineName} />
          <Field label="Score">
            {(() => {
              const effScore = auditService.computeEffectiveScore(freshAudit.score, freshAudit.actions);
              const allClosed = auditService.isAllActionsClosed(freshAudit.actions);
              const hasActions = freshAudit.actions?.length > 0;
              return (
                <div className="flex items-center gap-2">
                  <Badge variant={effScore >= 80 ? 'success' : effScore >= 60 ? 'warn' : 'danger'}>
                    {effScore}%
                  </Badge>
                  {hasActions && !allClosed && (
                    <span className="text-[10px] text-amber-600 font-medium">⏳ Provisoire</span>
                  )}
                  {hasActions && allClosed && (
                    <span className="text-[10px] text-emerald-600 font-medium">✓ Confirmé</span>
                  )}
                </div>
              );
            })()}
          </Field>
          <Field label="Auditeur" value={freshAudit.auditeur} />
          <Field label="Superviseur" value={freshAudit.superviseur || '-'} />
          <Field label="Gap Leader" value={freshAudit.gapLeader || '-'} />
          <Field label="Audité par" value={freshAudit.technicianId || '-'} />
        </div>

        {/* Checklist answers */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-800 mb-3">Questions de la check-list</h4>
          <div className="space-y-2">
            {(checklist?.items || []).map((q, idx) => {
              const ans = freshAudit.answers?.[q.id];
              const val = getAnswerValue(ans);
              const nokMachines = getNokMachines(ans);

              return (
                <div key={q.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-[11px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-slate-700 flex-1">{q.label}</span>
                    <span className={`chip text-[11px] font-bold ${val ? TONE_CLASS[val] : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                      {YES_NO[val] || '-'}
                    </span>
                  </div>
                  {val === 'no' && nokMachines.length > 0 && (
                    <div className="mt-2 ml-9 flex flex-wrap gap-1.5">
                      {nokMachines.map(mId => {
                        const code = machineLookup.get(mId) || mId;
                        return (
                          <span key={mId} className="px-2 py-0.5 rounded bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold">
                            Machine {code}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        {freshAudit.actions?.length > 0 && (
          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-800 mb-3">Actions correctives</h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full min-w-[600px] text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th text-xs">Problème</th>
                    <th className="th text-xs">Action</th>
                    <th className="th text-xs">Resp.</th>
                    <th className="th text-xs">Deadline</th>
                    <th className="th text-xs">Statut</th>
                    <th className="th text-xs">Commentaires</th>
                  </tr>
                </thead>
                <tbody>
                  {freshAudit.actions.map((act, i) => {
                    const status = act.act || 'open';
                    const label = actionService.STATUS_LABEL[status];
                    const variant = actionService.STATUS_VARIANT[status];
                    const isOverdue = status !== 'closed' && act.deadline && act.deadline < new Date().toISOString().split('T')[0];
                    return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="td text-xs">{act.problem || '-'}</td>
                      <td className="td text-xs">{act.action || '-'}</td>
                      <td className="td text-xs">{act.resp || '-'}</td>
                      <td className="td text-xs">
                        <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>{act.deadline || '-'}</span>
                      </td>
                      <td className="td text-xs">
                        <button
                          onClick={() => handleStatusCycle(i, status)}
                          className={`chip text-[10px] font-bold cursor-pointer hover:opacity-80 transition-opacity ${variant === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-700' : variant === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
                          title="Cliquer pour changer le statut"
                        >
                          {label}
                        </button>
                      </td>
                      <td className="td text-xs">{act.commentaires || '-'}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Machine issues summary */}
        {freshAudit.machineIssues?.length > 0 && (
          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-800 mb-3">État des machines</h4>
            <div className="flex flex-wrap gap-2">
              {freshAudit.machineIssues.map(mi => (
                <span 
                  key={mi.machineId}
                  className={`chip text-[10px] font-bold ${mi.status === 'nok' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
                >
                  {mi.machineCode}: {mi.status === 'nok' ? 'NOK' : 'OK'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button className="btn-secondary" onClick={onClose}>Fermer</button>
      </div>
    </Modal>
  );
}

function Field({ label, value, children }) {
  return (
    <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-black">{label}</div>
      <div className="mt-1 text-sm text-slate-800 font-semibold">{children ?? value}</div>
    </div>
  );
}
