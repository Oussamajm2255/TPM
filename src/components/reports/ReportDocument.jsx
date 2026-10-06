import { REPORT_TYPES, scoreTone } from '../../utils/reportData';

// A4 report sheet. Plain DOM + inline SVG so the browser's "Save as PDF" output is vector and identical to the preview.
export const RED = '#d50032';
const TONE = {
  emerald: { fg: '#047857', bg: '#ecfdf5', bar: '#10b981' },
  amber:   { fg: '#b45309', bg: '#fffbeb', bar: '#f59e0b' },
  rose:    { fg: '#be123c', bg: '#fff1f2', bar: '#e11d48' },
  slate:   { fg: '#475569', bg: '#f1f5f9', bar: '#94a3b8' },
};
const LEVEL = { danger: RED, warn: '#f59e0b', info: '#64748b' };

const CRIT = 60;
const val = (v, suffix = '') => (v == null ? '—' : `${v}${suffix}`);

function Section({ title, aside, children, className = '' }) {
  return (
    <section className={`break-inside-avoid ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          <span className="inline-block w-1 h-3 rounded-sm" style={{ background: RED }} />
          {title}
        </h3>
        {aside && <span className="text-[10px] font-semibold text-slate-400">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, hint, tone = 'slate', hot }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 relative overflow-hidden">
      {hot && <span className="absolute left-0 inset-y-0 w-1" style={{ background: RED }} />}
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="text-[26px] leading-none font-extrabold mt-1.5 tabular-nums" style={{ color: TONE[tone].fg }}>{value}</div>
      <div className="text-[10px] font-medium text-slate-400 mt-1 truncate">{hint || ' '}</div>
    </div>
  );
}

function ScorePill({ score }) {
  const t = TONE[scoreTone(score)];
  return (
    <span className="inline-block min-w-[40px] text-center rounded-full px-2 py-0.5 text-[10px] font-extrabold tabular-nums" style={{ color: t.fg, background: t.bg }}>
      {val(score, '%')}
    </span>
  );
}

function Empty({ children }) {
  return <div className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-[11px] font-medium text-slate-400">{children}</div>;
}

// Stacked horizontal bar: [{value,color,label}]
function Stacked({ parts }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
        {total > 0 && parts.filter((p) => p.value).map((p) => <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
            <i className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.label} <b className="text-slate-800 tabular-nums">{p.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

// Trend: bars = number of audits, dots/line = average score
function TrendChart({ data }) {
  const W = 330, H = 96, padB = 16, padT = 10;
  const max = Math.max(1, ...data.map((d) => d.count));
  const step = W / data.length, bw = Math.min(26, step * 0.5);
  const y = (s) => padT + (1 - s / 100) * (H - padT - padB);
  const pts = data.map((d, i) => (d.score == null ? null : [i * step + step / 2, y(d.score)]));
  const path = pts.filter(Boolean).map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <line x1="0" x2={W} y1={y(CRIT)} y2={y(CRIT)} stroke={RED} strokeDasharray="3 3" strokeWidth="0.8" opacity="0.5" />
      <text x={W - 2} y={y(CRIT) - 2} fontSize="7" fill={RED} textAnchor="end" opacity="0.8">seuil 60%</text>
      {data.map((d, i) => {
        const h = d.count ? Math.max(12, (d.count / max) * (H - padT - padB) * 0.55) : 0;
        return (
          <g key={i}>
            <rect x={i * step + step / 2 - bw / 2} y={H - padB - h} width={bw} height={h} rx="2" fill="#e2e8f0" />
            {d.count > 0 && <text x={i * step + step / 2} y={H - padB - 3} fontSize="7.5" fontWeight="700" textAnchor="middle" fill="#64748b">{d.count}</text>}
            <text x={i * step + step / 2} y={H - 4} fontSize="8" fontWeight="700" textAnchor="middle" fill="#64748b">{d.label}</text>
          </g>
        );
      })}
      <path d={path} fill="none" stroke={RED} strokeWidth="1.6" strokeLinejoin="round" />
      {pts.map((p, i) => p && (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="3" fill="#fff" stroke={RED} strokeWidth="1.6" />
          <text x={p[0]} y={p[1] - 6} fontSize="8" fontWeight="800" textAnchor="middle" fill="#0f172a">{data[i].score}</text>
        </g>
      ))}
    </svg>
  );
}
function ScoreBars({ rows }) {
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[110px_1fr_34px] items-center gap-2">
          <span className="text-[10.5px] font-semibold text-slate-700 truncate">{r.name}</span>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${r.score}%`, background: TONE[scoreTone(r.score)].bar }} /></div>
          <span className="text-[10.5px] font-extrabold tabular-nums text-right text-slate-800">{r.score}%</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportDocument({ report }) {
  const { type, period, kpis, planned, actions, attention, helpers } = report;
  const meta = REPORT_TYPES[type];
  const delta = kpis.delta;
  const vsPrev = type === 'daily' ? null : delta == null ? 'pas de période précédente' : `${delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : '= '}${delta} pts vs préc.`;

  return (
    <div id="report-sheet" className="report-sheet bg-white text-slate-900 flex flex-col" style={{ width: 794, height: 1120, overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ height: 6, background: RED }} />

      {/* Header */}
      <header className="flex items-center justify-between px-9 pt-5 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <img src="/assets/Images/logo-global.png" alt="FORVIA" className="h-12 w-auto object-contain" />
          <div className="pl-4 border-l border-slate-200 leading-tight">
            <div className="text-[10px] font-black tracking-[0.2em]" style={{ color: RED }}>TPM AUDIT · MAINTENANCE</div>
            <div className="text-[19px] font-extrabold text-slate-900 mt-0.5">{meta.title}</div>
          </div>
        </div>
        <div className="text-right leading-tight">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Période</div>
          <div className="text-[12px] font-bold text-slate-800 mt-0.5 max-w-[250px]">{period.label}</div>
          <div className="text-[10px] text-slate-400 mt-1">Édité le {helpers.fmtLong(report.todayISO)}</div>
        </div>
      </header>

      <div className="flex-1 px-9 py-4 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3">
          <Kpi label="Audits réalisés" value={kpis.audits} hint={`${kpis.machinesChecked} machines contrôlées`} />
          <Kpi label="Score moyen" value={val(kpis.avgScore, '%')} tone={scoreTone(kpis.avgScore)} hint={vsPrev} />
          <Kpi label="Scores critiques" value={kpis.critical} tone={kpis.critical ? 'rose' : 'emerald'} hot={kpis.critical > 0} hint="Audits sous 60%" />
          <Kpi label="Actions en retard" value={actions.overdue} tone={actions.overdue ? 'rose' : 'emerald'} hot={actions.overdue > 0} hint={`${actions.open + actions.inProgress} ouvertes au total`} />
        </div>

        {/* Execution & actions */}
        <div className="grid grid-cols-2 gap-5">
          <Section title="Réalisation du planning" aside={planned.rate != null ? `${planned.rate}% réalisé` : 'aucun audit planifié'}>
            <Stacked parts={[
              { label: 'Réalisés', value: planned.done, color: '#10b981' },
              { label: 'En retard', value: planned.late, color: RED },
              { label: 'À venir', value: planned.pending, color: '#cbd5e1' },
            ]} />
            {planned.unplanned > 0 && <div className="text-[10px] text-slate-400 mt-2">dont {planned.unplanned} audit{planned.unplanned > 1 ? 's' : ''} non planifié{planned.unplanned > 1 ? 's' : ''}</div>}
          </Section>
          <Section title="Plan d'actions" aside={actions.raised ? `${actions.raised} créée${actions.raised > 1 ? 's' : ''} sur la période` : 'aucune action créée'}>
            <Stacked parts={[
              { label: 'Ouvertes', value: actions.raisedOpen, color: RED },
              { label: 'En cours', value: actions.raisedInProgress, color: '#f59e0b' },
              { label: 'Clôturées', value: actions.raisedClosed, color: '#10b981' },
            ]} />
            <div className="text-[10px] text-slate-400 mt-2">{actions.closureRate != null && <>Taux de clôture : <b className="text-slate-700">{actions.closureRate}%</b> · </>}Total à ce jour : <b className="text-slate-700">{actions.open}</b> ouvertes, <b className="text-slate-700">{actions.inProgress}</b> en cours</div>
          </Section>
        </div>

        <ProjectPerformance report={report} />

        {/* Period-specific block */}
        {type === 'daily' && <DailyBlock report={report} />}
        {type !== 'daily' && <TrendBlock report={report} />}

        {/* Machines & recurring */}
        <div className="grid grid-cols-2 gap-5">
          <Section title="Machines NOK" aside={kpis.nokMachines ? `${kpis.nokMachines} machine${kpis.nokMachines > 1 ? 's' : ''}` : undefined}>
            {report.nokMachines.length ? (
              <ul className="space-y-1">
                {report.nokMachines.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5">
                    <span className="text-[11px] font-bold text-slate-800">N° {m.code} <span className="font-medium text-slate-400">· {m.line}</span></span>
                    {m.count > 1 && <span className="text-[9px] font-black rounded-full px-1.5 py-0.5 text-white" style={{ background: RED }}>×{m.count}</span>}
                  </li>
                ))}
              </ul>
            ) : <Empty>Aucune machine NOK</Empty>}
          </Section>
          <Section title={type === 'daily' ? 'Points non conformes' : 'Défauts récurrents'}>
            {report.topFailures.length ? (
              <ul className="space-y-1">
                {report.topFailures.slice(0, type === 'daily' ? 3 : 4).map((f) => (
                  <li key={f.id} className="flex items-start justify-between gap-3 rounded-md bg-slate-50 px-2.5 py-1.5">
                    <span className="text-[10.5px] font-semibold text-slate-700 leading-snug line-clamp-2">{f.label}</span>
                    <span className="text-[10px] font-extrabold tabular-nums text-slate-800 whitespace-nowrap">{f.audits} audit{f.audits > 1 ? 's' : ''}</span>
                  </li>
                ))}
              </ul>
            ) : <Empty>Aucun défaut relevé</Empty>}
          </Section>
        </div>

        {/* Actions needing attention */}
        <Section title="Actions à traiter" aside={actions.dueSoonCount ? `${actions.dueSoonCount} échéance${actions.dueSoonCount > 1 ? 's' : ''} à venir` : undefined}>
          {actions.overdueList.length ? (
            <ul className="space-y-1">
              {actions.overdueList.slice(0, type === 'daily' ? 3 : 4).map((a) => (
                <li key={`${a.auditId}-${a.idx}`} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-rose-100 bg-rose-50/50 px-2.5 py-1.5">
                  <span className="text-[10.5px] font-semibold text-slate-800 truncate">{a.problem || a.action || '—'} <span className="font-medium text-slate-400">· {a.lineName}{a.resp ? ` · ${a.resp}` : ''}</span></span>
                  <span className="text-[10px] font-extrabold whitespace-nowrap" style={{ color: RED }}>+{a.daysLate} j</span>
                </li>
              ))}
            </ul>
          ) : <Empty>Aucune action en retard</Empty>}
        </Section>

        {/* Manager attention points */}
        <Section title="Points d'attention manager">
          {attention.length ? (
            <ul className="space-y-1.5">
              {attention.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[11px] font-medium text-slate-700 leading-snug">
                  <span className="mt-[5px] w-2 h-2 rounded-full shrink-0" style={{ background: LEVEL[p.level] }} />
                  {p.text}
                </li>
              ))}
            </ul>
          ) : <Empty>{kpis.audits ? 'Rien à signaler — situation sous contrôle.' : 'Aucune donnée sur la période.'}</Empty>}
        </Section>
      </div>

      <footer className="flex items-center justify-between px-9 py-3 border-t border-slate-200 text-[9px] font-semibold text-slate-400">
        <span>FORVIA · TPM Audit — {meta.title}</span>
        <span>Scores = score effectif (bonus de résolution inclus), identiques au tableau de bord</span>
      </footer>
    </div>
  );
}

function DailyBlock({ report }) {
  const { auditList, dueToday } = report;
  return (
    <div className="grid grid-cols-[3fr_2fr] gap-5">
      <Section title="Audits réalisés" aside={auditList.length ? `${auditList.length} au total` : undefined}>
        {auditList.length ? (
          <ul className="space-y-1">
            {auditList.slice(0, 6).map((a) => (
              <li key={a.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md bg-slate-50 px-2.5 py-1.5">
                <span className="text-[11px] font-bold text-slate-800 truncate">{a.project} · {a.line} <span className="font-medium text-slate-400">· {a.auditeur}</span></span>
                <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">{a.nok ? `${a.nok} NOK` : 'RAS'}</span>
                <ScorePill score={a.score} />
              </li>
            ))}
            {auditList.length > 6 && <li className="text-[10px] text-slate-400 pl-1">+ {auditList.length - 6} autre{auditList.length - 6 > 1 ? 's' : ''}</li>}
          </ul>
        ) : <Empty>Aucun audit réalisé ce jour</Empty>}
      </Section>
      <Section title="Reste à faire">
        {dueToday.length ? (
          <ul className="space-y-1">
            {dueToday.slice(0, 5).map((d) => (
              <li key={d.id} className="rounded-md bg-slate-50 px-2.5 py-1.5 text-[10.5px] font-semibold text-slate-700 truncate">
                {d.project} · {d.line} <span className="font-medium text-slate-400">· {d.tech}</span>
              </li>
            ))}
            {dueToday.length > 5 && <li className="text-[10px] text-slate-400 pl-1">+ {dueToday.length - 5} autre{dueToday.length - 5 > 1 ? 's' : ''}</li>}
          </ul>
        ) : <Empty>Planning du jour terminé</Empty>}
      </Section>
    </div>
  );
}

function TrendBlock({ report }) {
  const { type, trend, weakLines } = report;
  return (
    <div className="grid grid-cols-2 gap-5">
      <Section title={type === 'weekly' ? 'Activité par jour' : 'Tendance par semaine'} aside="audits · score">
        {trend.some((t) => t.count) ? <TrendChart data={trend} /> : <Empty>Aucune donnée sur la période</Empty>}
      </Section>
      <div className="space-y-4">
        <Section title="Lignes à surveiller">
          {weakLines.length ? <ScoreBars rows={weakLines.slice(0, 4).map((l) => ({ key: l.id, name: l.line, score: l.score }))} /> : <Empty>{report.lines.length ? 'Toutes les lignes ≥ 80%' : 'Aucun audit'}</Empty>}
        </Section>
      </div>
    </div>
  );
}

function ProjectPerformance({ report }) {
  const { byProject, type } = report;
  return (
    <Section title="Performance par projet" aside="score moyen · audits · actions ouvertes">
      <div className="grid grid-cols-4 gap-3">
        {byProject.map((p) => {
          const t = TONE[scoreTone(p.score)];
          const d = type === 'daily' ? null : p.delta;
          return (
            <div key={p.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-800 truncate">{p.name}</span>
                {d != null && <span className="text-[9px] font-black tabular-nums" style={{ color: d < 0 ? RED : '#047857' }}>{d > 0 ? '▲ +' : d < 0 ? '▼ ' : '= '}{d}</span>}
              </div>
              <div className="text-[22px] leading-none font-extrabold mt-1.5 tabular-nums" style={{ color: t.fg }}>{val(p.score, '%')}</div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2"><div className="h-full rounded-full" style={{ width: `${p.score || 0}%`, background: t.bar }} /></div>
              <div className="flex items-center justify-between mt-2 text-[9.5px] font-semibold text-slate-500">
                <span><b className="text-slate-800 tabular-nums">{p.count}</b> audit{p.count > 1 ? 's' : ''}{p.critical ? <b style={{ color: RED }}> · {p.critical} crit.</b> : ''}</span>
                <span><b className="tabular-nums" style={{ color: p.overdue ? RED : '#1e293b' }}>{p.openActions}</b> act.{p.overdue ? <b style={{ color: RED }}> ({p.overdue} ⚠)</b> : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
