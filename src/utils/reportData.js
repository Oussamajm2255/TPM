// Report data builder — pure functions, no I/O. Turns the store's audits / planning / projects
// into the compact figures shown in the Daily / Weekly / Monthly reports.
// Reuses auditService.computeEffectiveScore so scores match the Dashboard exactly.

import { auditService } from '../services/auditService';
import { addDays, endOfMonth, fromISO, startOfMonth, startOfWeek, toISO, MONTHS_FR, DOW_FR_SHORT } from './dateUtils';

export const REPORT_TYPES = {
  daily:   { label: 'Quotidien',   title: 'Rapport journalier' },
  weekly:  { label: 'Hebdomadaire', title: 'Rapport hebdomadaire' },
  monthly: { label: 'Mensuel',     title: 'Rapport mensuel' },
};

const CRITICAL = 60; // same threshold as Dashboard "Points critiques"
const GOOD = 80;

const eff = (a) => auditService.computeEffectiveScore(a.score, a.actions || []);
const avg = (list) => (list.length ? Math.round(list.reduce((s, x) => s + x, 0) / list.length) : null);
const pct = (n, d) => (d ? Math.round((n / d) * 100) : null);
const actStatus = (a) => a.act || 'open';
const isoWeek = (d) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
};
const MONTHS_ABBR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const fmtDay = (iso) => { const d = fromISO(iso); return `${DOW_FR_SHORT[(d.getDay() + 6) % 7]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };
const fmtLong = (iso) => { const d = fromISO(iso); return `${d.getDate()} ${MONTHS_FR[d.getMonth()].toLowerCase()} ${d.getFullYear()}`; };

export function getPeriod(type, anchorISO) {
  const a = fromISO(anchorISO);
  if (type === 'daily') {
    return { from: anchorISO, to: anchorISO, label: fmtLong(anchorISO), short: anchorISO };
  }
  if (type === 'weekly') {
    const s = startOfWeek(a), e = addDays(s, 6);
    return {
      from: toISO(s), to: toISO(e),
      label: `Semaine ${isoWeek(s)} · ${s.getDate()} ${MONTHS_ABBR[s.getMonth()]} – ${e.getDate()} ${MONTHS_ABBR[e.getMonth()]} ${e.getFullYear()}`,
      short: `S${String(isoWeek(s)).padStart(2, '0')}-${s.getFullYear()}`,
    };
  }
  const s = startOfMonth(a), e = endOfMonth(a);
  return { from: toISO(s), to: toISO(e), label: `${MONTHS_FR[a.getMonth()]} ${a.getFullYear()}`, short: `${a.getFullYear()}-${String(a.getMonth() + 1).padStart(2, '0')}` };
}

export function previousPeriod(type, period) {
  const d = fromISO(period.from);
  if (type === 'daily') return getPeriod(type, toISO(addDays(d, -1)));
  if (type === 'weekly') return getPeriod(type, toISO(addDays(d, -7)));
  return getPeriod(type, toISO(new Date(d.getFullYear(), d.getMonth() - 1, 1)));
}

export function shiftAnchor(type, anchorISO, dir) {
  const d = fromISO(anchorISO);
  if (type === 'daily') return toISO(addDays(d, dir));
  if (type === 'weekly') return toISO(addDays(d, 7 * dir));
  return toISO(new Date(d.getFullYear(), d.getMonth() + dir, 1));
}

const inRange = (iso, p) => iso >= p.from && iso <= p.to;

export function buildReport({ type, anchorISO, todayISO, audits, planning, projects, users, checklist }) {
  const period = getPeriod(type, anchorISO);
  const prev = previousPeriod(type, period);
  const machineLabel = new Map(); // machineId -> { code, line, project }
  const lineLabel = new Map();
  for (const p of projects) for (const l of p.lines || []) {
    lineLabel.set(l.id, { line: l.name, project: p.name });
    for (const m of l.machines || []) machineLabel.set(m.id, { code: m.code, line: l.name, project: p.name });
  }
  const userName = (id) => users.find((u) => u.id === id)?.displayName || '—';
  const qLabel = new Map((checklist?.items || []).map((q) => [q.id, q.label]));

  const inPeriod = audits.filter((a) => inRange(a.date, period));
  const inPrev = audits.filter((a) => inRange(a.date, prev));
  const scores = inPeriod.map(eff);

  // ---- KPIs
  const avgScore = avg(scores);
  const prevAvg = avg(inPrev.map(eff));
  const critical = inPeriod.filter((a) => eff(a) < CRITICAL);

  // ---- Planned vs done (planning entries dated within the period)
  const planDone = (e) => e.status === 'done' || audits.some((a) => a.planId === e.id);
  const plan = planning.filter((e) => inRange(e.date, period));
  const done = plan.filter(planDone).length;
  const late = plan.filter((e) => !planDone(e) && e.date < todayISO).length;
  const planned = {
    total: plan.length, done, late,
    pending: plan.length - done - late,
    unplanned: plan.filter((e) => e.unplanned).length,
    rate: pct(done, plan.length),
  };

  // ---- NOK machines & recurrence (machine flagged NOK in several audits of the period)
  const nokByMachine = new Map();
  for (const a of inPeriod) {
    for (const m of a.machineIssues || []) {
      if (m.status !== 'nok') continue;
      const cur = nokByMachine.get(m.machineId) || { id: m.machineId, code: m.machineCode, count: 0, last: '' };
      cur.count++; cur.last = a.date > cur.last ? a.date : cur.last;
      nokByMachine.set(m.machineId, cur);
    }
  }
  const nokMachines = [...nokByMachine.values()]
    .map((m) => ({ ...m, ...(machineLabel.get(m.id) || {}) }))
    .sort((x, y) => y.count - x.count || x.code.localeCompare(y.code, undefined, { numeric: true }));
  const machinesChecked = new Set(inPeriod.flatMap((a) => (a.machineIssues || []).map((m) => m.machineId))).size;

  // ---- Recurring checklist failures (answer "no"), weighted by # of NOK machines
  const fail = new Map();
  for (const a of inPeriod) for (const [qid, ans] of Object.entries(a.answers || {})) {
    if (ans?.value !== 'no') continue;
    const cur = fail.get(qid) || { id: qid, label: qLabel.get(qid) || qid, audits: 0, machines: 0 };
    cur.audits++; cur.machines += ans.nokMachines?.length || 0;
    fail.set(qid, cur);
  }
  const topFailures = [...fail.values()].sort((x, y) => y.audits - x.audits || y.machines - x.machines).slice(0, 4);

  // ---- Lines (avg score) & projects
  const byLine = new Map();
  for (const a of inPeriod) {
    const cur = byLine.get(a.lineId) || { id: a.lineId, line: a.lineName, project: a.projectName, scores: [] };
    cur.scores.push(eff(a)); byLine.set(a.lineId, cur);
  }
  const lines = [...byLine.values()].map((l) => ({ ...l, score: avg(l.scores), count: l.scores.length }));
  const weakLines = lines.filter((l) => l.score < GOOD).sort((x, y) => x.score - y.score).slice(0, 4);
  const byProject = projects.map((p) => {
    const mine = inPeriod.filter((a) => a.projectId === p.id);
    const s = mine.map(eff);
    const score = avg(s);
    const prevScore = avg(inPrev.filter((a) => a.projectId === p.id).map(eff));
    const open = audits.filter((a) => a.projectId === p.id)
      .flatMap((a) => a.actions || []).filter((x) => actStatus(x) !== 'closed');
    return {
      id: p.id, name: p.name, score, count: s.length,
      delta: score != null && prevScore != null ? score - prevScore : null,
      critical: s.filter((x) => x < CRITICAL).length,
      openActions: open.length,
      overdue: open.filter((x) => x.deadline && x.deadline < todayISO).length,
    };
  }).sort((x, y) => (y.score ?? -1) - (x.score ?? -1));

  // ---- Activity buckets (days for weekly / weeks for monthly) → trend
  let trend = [];
  if (type === 'weekly') {
    for (let i = 0; i < 7; i++) {
      const iso = toISO(addDays(fromISO(period.from), i));
      const list = inPeriod.filter((a) => a.date === iso);
      trend.push({ label: DOW_FR_SHORT[i], count: list.length, score: avg(list.map(eff)), weekend: i > 4 });
    }
    trend = trend.filter((d) => !d.weekend || d.count);
  } else if (type === 'monthly') {
    const s = startOfWeek(fromISO(period.from));
    for (let w = s; toISO(w) <= period.to; w = addDays(w, 7)) {
      const wf = toISO(w), wt = toISO(addDays(w, 6));
      const list = inPeriod.filter((a) => a.date >= wf && a.date <= wt);
      trend.push({ label: `S${isoWeek(w)}`, count: list.length, score: avg(list.map(eff)) });
    }
  }

  // ---- Actions (current state — statuses carry no history)
  // Deadlines may be stored as full timestamps — keep the date part, drop anything unreadable.
  const cleanDate = (d) => { const s = String(d || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; };
  // "Problem → Machines: 1, 2, 3" → readable title + machine count
  const splitTitle = (t) => {
    const [head, tail] = String(t || '').split(/\s*→\s*Machines?\s*:\s*/i);
    return { title: head || '', machineCount: tail ? tail.split(',').filter((x) => x.trim()).length : 0 };
  };
  const allActions = audits.flatMap((a) => (a.actions || []).map((act, idx) => ({
    ...act, deadline: cleanDate(act.deadline), ...splitTitle(act.problem || act.action),
    status: actStatus(act), auditId: a.id, idx, auditDate: a.date,
    lineName: a.lineName, projectName: a.projectName, auditeur: a.auditeur,
  })));
  const openNow = allActions.filter((a) => a.status !== 'closed');
  const overdue = openNow.filter((a) => a.deadline && a.deadline < todayISO)
    .sort((x, y) => x.deadline.localeCompare(y.deadline));
  const raised = allActions.filter((a) => inRange(a.auditDate, period));
  const nextEnd = type === 'monthly' ? toISO(addDays(fromISO(todayISO), 14)) : toISO(addDays(fromISO(todayISO), 7));
  const dueSoon = openNow.filter((a) => a.deadline && a.deadline >= todayISO && a.deadline <= nextEnd)
    .sort((x, y) => x.deadline.localeCompare(y.deadline));
  const daysLate = (a) => Math.max(0, Math.round((fromISO(todayISO) - fromISO(a.deadline)) / 86400000));
  const actions = {
    open: openNow.filter((a) => a.status === 'open').length,
    inProgress: openNow.filter((a) => a.status === 'in_progress').length,
    overdue: overdue.length,
    raised: raised.length,
    raisedOpen: raised.filter((a) => a.status === 'open').length,
    raisedInProgress: raised.filter((a) => a.status === 'in_progress').length,
    raisedClosed: raised.filter((a) => a.status === 'closed').length,
    closureRate: pct(raised.filter((a) => a.status === 'closed').length, raised.length),
    overdueList: overdue.slice(0, 5).map((a) => ({ ...a, daysLate: daysLate(a) })),
    dueSoon: dueSoon.slice(0, 4),
    dueSoonCount: dueSoon.length,
  };

  // ---- Audit list (daily)
  const auditList = inPeriod.map((a) => ({
    id: a.id, project: a.projectName, line: a.lineName, auditeur: a.auditeur || userName(a.technicianId),
    score: eff(a), nok: (a.machineIssues || []).filter((m) => m.status === 'nok').length,
    actionsOpen: (a.actions || []).filter((x) => actStatus(x) !== 'closed').length,
  })).sort((x, y) => x.score - y.score);
  const dueToday = type === 'daily'
    ? plan.filter((e) => !planDone(e)).map((e) => ({
      id: e.id, ...(lineLabel.get(e.lineId) || { line: e.lineId, project: '' }), tech: userName(e.technicianId), late: e.date < todayISO,
    }))
    : [];

  // ---- Auto-generated attention points (deterministic rules, most urgent first)
  const attention = [];
  if (actions.overdue) attention.push({ level: 'danger', text: `${actions.overdue} action${actions.overdue > 1 ? 's' : ''} en retard — relancer les responsables.` });
  critical.forEach((a) => attention.push({ level: 'danger', text: `${a.projectName} · ${a.lineName} : score critique ${eff(a)}% (${fmtDay(a.date)}).` }));
  nokMachines.filter((m) => m.count >= 2).slice(0, 3).forEach((m) =>
    attention.push({ level: 'warn', text: `Machine ${m.code} (${m.line}) NOK sur ${m.count} audits — vérifier la cause racine.` }));
  if (planned.late) attention.push({ level: 'warn', text: `${planned.late} audit${planned.late > 1 ? 's' : ''} planifié${planned.late > 1 ? 's' : ''} non réalisé${planned.late > 1 ? 's' : ''} — à replanifier.` });
  if (topFailures[0] && topFailures[0].audits >= 2) attention.push({ level: 'info', text: `Point récurrent : « ${topFailures[0].label} » (${topFailures[0].audits} audits).` });
  if (actions.dueSoonCount) attention.push({ level: 'info', text: `${actions.dueSoonCount} action${actions.dueSoonCount > 1 ? 's' : ''} à échéance sous ${type === 'monthly' ? '14' : '7'} jours.` });

  return {
    type, period, prev, todayISO,
    kpis: {
      audits: inPeriod.length, avgScore, delta: avgScore != null && prevAvg != null ? avgScore - prevAvg : null,
      critical: critical.length, machinesChecked, nokMachines: nokMachines.length,
    },
    planned, trend, lines, weakLines, byProject, nokMachines: nokMachines.slice(0, 5), topFailures,
    actions, auditList, dueToday, attention: attention.slice(0, 4),
    bestLines: [...lines].sort((x, y) => y.score - x.score).slice(0, 3),
    bestLine: [...lines].sort((x, y) => y.score - x.score)[0] || null,
    helpers: { fmtDay, fmtLong },
  };
}

export const scoreTone = (s) => (s == null ? 'slate' : s >= GOOD ? 'emerald' : s >= CRITICAL ? 'amber' : 'rose');
