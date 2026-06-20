import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  LineChart, Line as ReLine, AreaChart, Area
} from 'recharts';
import { useAppStore } from '../store/useAppStore';
import { actionService } from '../services/actionService';
import { auditService } from '../services/auditService';
import Badge from '../components/common/Badge';
import { toISO } from '../utils/dateUtils';

// --- Components
function Stat({ label, value, hint, tone = 'brand' }) {
  const color = { 
    brand: 'text-indigo-700', 
    emerald: 'text-emerald-600', 
    amber: 'text-amber-600', 
    slate: 'text-slate-700' 
  }[tone];
  
  return (
    <div className="card-industrial p-5">
      <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">{label}</div>
      <div className={`text-3xl font-extrabold mt-1 tabular-nums ${color}`}>{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1 font-medium">{hint}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { projects, audits, users, planning, currentUser } = useAppStore((s) => ({
    projects: s.projects, audits: s.audits, users: s.users, planning: s.planning, currentUser: s.currentUser,
  }));

  const [drill, setDrill] = useState({ level: 'global', id: null, name: '' });
  const [chartView, setChartView] = useState('scores'); // 'scores' | 'actions'
  const [actionStats, setActionStats] = useState({ total: 0, open: 0, inProgress: 0, closed: 0, overdue: 0 });
  const [actionByProject, setActionByProject] = useState([]);
  const [actionItems, setActionItems] = useState([]);

  useEffect(() => {
    (async () => {
      const [stats, byProj, items] = await Promise.all([
        actionService.getStats(),
        actionService.getByProject(),
        actionService.getAll(),
      ]);
      setActionStats(stats);
      setActionByProject(byProj);
      setActionItems(items);
    })();
  }, [audits]);
  const [dateRange, setDateRange] = useState({
    from: '2026-01-01',
    to: '2026-12-31'
  });

  const handleQuickSelect = (type) => {
    const today = new Date();
    const year = 2026; // Keeping it consistent with user requirement
    
    if (type === 'today') {
      const iso = toISO(today);
      setDateRange({ from: iso, to: iso });
    } else if (type === 'this-month') {
      const first = toISO(new Date(year, today.getMonth(), 1));
      const last = toISO(new Date(year, today.getMonth() + 1, 0));
      setDateRange({ from: first, to: last });
    } else if (type === 'last-month') {
      const first = toISO(new Date(year, today.getMonth() - 1, 1));
      const last = toISO(new Date(year, today.getMonth(), 0));
      setDateRange({ from: first, to: last });
    } else if (type === 'year') {
      setDateRange({ from: `${year}-01-01`, to: `${year}-12-31` });
    }
  };

  // --- Breadcrumb Navigation
  const handleReset = () => setDrill({ level: 'global', id: null, name: '' });
  const handleGoProject = (id, name) => setDrill({ level: 'project', id, name });

  // --- Data Filtering
  const filteredAudits = useMemo(() => {
    let list = audits.filter(a => a.date >= dateRange.from && a.date <= dateRange.to);
    
    if (drill.level === 'project') list = list.filter(a => a.projectId === drill.id);
    if (drill.level === 'line') list = list.filter(a => a.lineId === drill.id);
    
    return list;
  }, [audits, drill, dateRange]);

  // --- Level 1: Global (Average Score per Project) — use effective scores
  const globalData = useMemo(() => {
    const baseList = audits.filter(a => a.date >= dateRange.from && a.date <= dateRange.to);
    return projects.map(p => {
      const pAudits = baseList.filter(a => a.projectId === p.id);
      const avg = pAudits.length 
        ? Math.round(pAudits.reduce((sum, a) => sum + auditService.computeEffectiveScore(a.score, a.actions), 0) / pAudits.length)
        : 0;
      return { id: p.id, name: p.name, score: avg, count: pAudits.length };
    }).sort((a, b) => b.score - a.score);
  }, [projects, audits, dateRange]);

  // --- Level 2: Project (Average Score per Line) — use effective scores
  const projectData = useMemo(() => {
    if (drill.level !== 'project') return [];
    const project = projects.find(p => p.id === drill.id);
    if (!project) return [];
    
    const baseList = audits.filter(a => a.date >= dateRange.from && a.date <= dateRange.to);
    
    return project.lines.map(l => {
      const lAudits = baseList.filter(a => a.lineId === l.id);
      const avg = lAudits.length
        ? Math.round(lAudits.reduce((sum, a) => sum + auditService.computeEffectiveScore(a.score, a.actions), 0) / lAudits.length)
        : 0;
      return { id: l.id, name: l.name, score: avg, count: lAudits.length };
    }).sort((a, b) => b.score - a.score);
  }, [drill, projects, audits, dateRange]);

  // --- Level 3: Line (Score Trend) — use effective scores
  const lineHistory = useMemo(() => {
    if (drill.level !== 'line') return [];
    return filteredAudits
      .map(a => ({ date: a.date, score: auditService.computeEffectiveScore(a.score, a.actions) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [drill, filteredAudits]);

  // --- KPIs — use effective scores
  const kpis = useMemo(() => {
    const count = filteredAudits.length;
    const avg = count ? Math.round(filteredAudits.reduce((s, a) => s + auditService.computeEffectiveScore(a.score, a.actions), 0) / count) : 0;
    const lowCount = filteredAudits.filter(a => auditService.computeEffectiveScore(a.score, a.actions) < 60).length;
    return { count, avg, lowCount };
  }, [filteredAudits]);

  return (
    <div className="space-y-6 pb-10">
      {/* Filters & Breadcrumbs Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 card-industrial p-3 sm:p-4">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm font-medium">
          <button 
            onClick={handleReset}
            className={`hover:text-indigo-700 transition-colors ${drill.level === 'global' ? 'text-slate-900 cursor-default' : 'text-slate-400'}`}
          >
            Vue Globale
          </button>
          {drill.level !== 'global' && (
            <>
              <span className="text-slate-500">/</span>
              <button 
                onClick={() => drill.level === 'line' && handleGoProject(filteredAudits[0]?.projectId, filteredAudits[0]?.projectName)}
                className={`hover:text-indigo-700 transition-colors ${drill.level === 'project' ? 'text-slate-900 cursor-default' : 'text-slate-400'}`}
              >
                Projet: {drill.name || '—'}
              </button>
            </>
          )}
          {drill.level === 'line' && (
            <>
              <span className="text-slate-500">/</span>
              <span className="text-slate-900">Ligne: {drill.name || '—'}</span>
            </>
          )}
        </div>

        {/* Date Selectors */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-white p-1.5 px-2 sm:px-3 rounded-[8px] border border-slate-200">
          <select 
            className="text-xs font-bold text-indigo-700 border-none bg-transparent p-0 pr-4 sm:pr-6 focus:ring-0 cursor-pointer"
            onChange={(e) => handleQuickSelect(e.target.value)}
            defaultValue="year"
          >
            <option value="today">Aujourd'hui</option>
            <option value="this-month">Ce mois</option>
            <option value="last-month">Mois dernier</option>
            <option value="year">Année 2026</option>
            <option value="custom" disabled>Période perso</option>
          </select>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Du</span>
            <input 
              type="date" 
              value={dateRange.from} 
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="text-xs font-bold text-slate-700 border-none bg-transparent p-0 focus:ring-0 cursor-pointer"
            />
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Au</span>
            <input 
              type="date" 
              value={dateRange.to} 
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="text-xs font-bold text-slate-700 border-none bg-transparent p-0 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat 
          label={drill.level === 'global' ? "Total Audits" : `Audits (${drill.name})`} 
          value={kpis.count} 
          hint="Depuis le début de l'année"
        />
        <Stat 
          label="Score Moyen" 
          value={`${kpis.avg}%`} 
          tone={kpis.avg >= 80 ? 'emerald' : kpis.avg >= 60 ? 'amber' : 'brand'}
          hint="Performance globale"
        />
        <Stat 
          label="Points Critiques" 
          value={kpis.lowCount} 
          tone={kpis.lowCount > 0 ? 'brand' : 'emerald'}
          hint="Scores inférieurs à 60%"
        />
        <Stat
          label="Actions ouvertes"
          value={actionStats.open + actionStats.overdue}
          tone={actionStats.overdue > 0 ? 'amber' : actionStats.open > 0 ? 'brand' : 'emerald'}
          hint={actionStats.overdue > 0 ? `${actionStats.overdue} en retard` : `${actionStats.closed} clôturées`}
        />
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.14em]">Vue</span>
        <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 gap-0.5">
          <button
            onClick={() => { setChartView('scores'); handleReset(); }}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition ${chartView === 'scores' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Performance
          </button>
          <button
            onClick={() => setChartView('actions')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition ${chartView === 'actions' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Actions
          </button>
        </div>
      </div>

      {/* Actions KPI Dashboard */}
      {chartView === 'actions' && (
        <>
          {/* KPI mini cards */}
          <div className="grid grid-cols-4 gap-3">
            <ActionKpiCard label="Ouvertes" value={actionStats.open} color="rose" />
            <ActionKpiCard label="En cours" value={actionStats.inProgress} color="amber" />
            <ActionKpiCard label="Clôturées" value={actionStats.closed} color="emerald" />
            <ActionKpiCard label="Résolution" value={`${actionStats.total > 0 ? Math.round((actionStats.closed / actionStats.total) * 100) : 0}%`} color="brand" />
          </div>

          {/* Overdue alert */}
          {actionStats.overdue > 0 && (
            <div className="card-industrial p-4 border-l-4 border-l-rose-500 bg-rose-50/50 flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <span className="text-sm font-bold text-rose-700">{actionStats.overdue} action{actionStats.overdue > 1 ? 's' : ''} en retard</span>
                <span className="text-xs text-rose-500 ml-2">— nécessite{actionStats.overdue > 1 ? 'nt' : ''} votre attention</span>
              </div>
            </div>
          )}

          {/* Per-project breakdown */}
          <div className="card-industrial p-5">
            <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Par projet</h3>
            <ActionsBreakdown data={actionByProject} />
          </div>

          {/* Recent actions */}
          <div className="card-industrial p-5">
            <h3 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wider">Dernières actions</h3>
            <div className="space-y-2">
              {actionItems.sort((a, b) => {
                // Sort: open/in_progress first by deadline (urgent first), then closed by recency
                const aClosed = a.act === 'closed';
                const bClosed = b.act === 'closed';
                if (aClosed && !bClosed) return 1;
                if (!aClosed && bClosed) return -1;
                if (!aClosed) return (b.deadline || '').localeCompare(a.deadline || '');
                return 0; // both closed, keep original order
              }).slice(0, 8).map((a, i) => {
                const status = a.act || 'open';
                const color = status === 'open' ? 'text-rose-500 bg-rose-50 border-rose-200' : status === 'in_progress' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200';
                const overdue = a.deadline && a.deadline < new Date().toISOString().split('T')[0];
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <span className={`chip text-[9px] font-bold shrink-0 ${color}`}>
                      {actionService.STATUS_LABEL[status]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{a.problem || a.action || 'Sans description'}</div>
                      <div className="text-[10px] text-slate-400">{a.projectName} · {a.lineName}{a.resp ? ` · ${a.resp}` : ''}</div>
                    </div>
                    {a.deadline && status !== 'closed' && (
                      <span className={`text-[9px] font-medium shrink-0 ${overdue ? 'text-rose-600' : 'text-slate-400'}`}>
                        {overdue ? 'En retard' : a.deadline}
                      </span>
                    )}
                    {status === 'closed' && (
                      <span className="text-[9px] font-medium shrink-0 text-emerald-500">Clôturée</span>
                    )}
                  </div>
                );
              })}
              {actionItems.length === 0 && (
                <div className="text-xs text-slate-400 text-center py-4">Aucune action corrective enregistrée</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Scores Chart */}
      {chartView === 'scores' && (
      <div className="card-industrial p-6 min-h-[450px] flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {drill.level === 'global' && "Performance par Projet"}
              {drill.level === 'project' && `Performance des Lignes : ${drill.name}`}
              {drill.level === 'line' && `Historique de la Ligne : ${drill.name}`}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Cliquez sur une barre pour explorer les details
            </p>
          </div>
          {drill.level !== 'global' && (
            <button onClick={handleReset} className="btn-secondary !py-1 text-xs">Retour vue globale</button>
          )}
        </div>

        <div className="h-[290px] sm:h-[320px] md:h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            {drill.level === 'line' ? (
              <AreaChart data={lineHistory}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} dx={-10} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" animationDuration={1000} />
              </AreaChart>
            ) : (
              <BarChart data={drill.level === 'global' ? globalData : projectData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} dx={-10} />
                <RechartsTooltip cursor={{fill: '#eef2ff'}} content={<CustomTooltip />} />
                <Bar 
                  dataKey="score" 
                  radius={[8, 8, 0, 0]} 
                  barSize={40}
                  animationDuration={800}
                  onClick={(data) => {
                    if (drill.level === 'global') {
                      setDrill({ level: 'project', id: data.id, name: data.name });
                    } else if (drill.level === 'project') {
                      setDrill({ level: 'line', id: data.id, name: data.name });
                    }
                  }}
                >
                  {(drill.level === 'global' ? globalData : projectData).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.score >= 80 ? '#10B981' : entry.score >= 60 ? '#F59E0B' : '#6366F1'} 
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-industrial p-5">
          <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Derniers audits ({drill.level === 'global' ? 'Tous' : drill.name})</h3>
          <div className="space-y-3">
            {filteredAudits.slice(0, 5).map(a => {
                const effScore = auditService.computeEffectiveScore(a.score, a.actions);
                const allClosed = auditService.isAllActionsClosed(a.actions);
                const hasActions = a.actions?.length > 0;
                return (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-[8px] bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-sm font-bold text-slate-800">{a.projectName} · {a.lineName}</div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase">{a.date} · {a.auditeur}</div>
                </div>
                <div className="flex items-center gap-2">
                  {hasActions && !allClosed && (
                    <span className="text-[10px] text-amber-500" title="Score provisoire">⏳</span>
                  )}
                  {hasActions && allClosed && (
                    <span className="text-[10px] text-emerald-500" title="Confirmé">✓</span>
                  )}
                  <div className={`text-sm font-black ${effScore >= 80 ? 'text-emerald-500' : effScore >= 60 ? 'text-amber-500' : 'text-indigo-500'}`}>
                    {effScore}%
                  </div>
                </div>
              </div>
                );
              })}
            {filteredAudits.length === 0 && <div className="text-sm text-slate-400 text-center py-4 italic">Aucune donnee disponible pour ce niveau.</div>}
          </div>
        </div>

        <div className="card-industrial p-5 text-slate-900 overflow-hidden relative">
          <div className="relative z-10">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider opacity-80">État des Actions</h3>
            <div className="space-y-4">
              <ActionDistRow label="En retard" count={actionStats.overdue} total={actionStats.total} color="bg-rose-400" />
              <ActionDistRow label="Ouvertes" count={actionStats.open} total={actionStats.total} color="bg-rose-300" />
              <ActionDistRow label="En cours" count={actionStats.inProgress} total={actionStats.total} color="bg-amber-400" />
              <ActionDistRow label="Clôturées" count={actionStats.closed} total={actionStats.total} color="bg-emerald-400" />
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-100 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-xl rounded-[8px] border border-slate-200">
        <p className="text-xs font-bold text-slate-800 mb-1">{label}</p>
        <p className="text-sm font-black text-indigo-700">{payload[0].value}%</p>
        {payload[0].payload.count !== undefined && (
          <p className="text-[10px] text-slate-400 font-medium">{payload[0].payload.count} audits réalisés</p>
        )}
      </div>
    );
  }
  return null;
}

function ActionKpiCard({ label, value, color }) {
  const colors = {
    rose: 'border-l-rose-500 bg-rose-50/40',
    amber: 'border-l-amber-500 bg-amber-50/40',
    emerald: 'border-l-emerald-500 bg-emerald-50/40',
    brand: 'border-l-brand-500 bg-brand-50/40',
  };
  const textColors = {
    rose: 'text-rose-700',
    amber: 'text-amber-700',
    emerald: 'text-emerald-700',
    brand: 'text-brand-700',
  };
  return (
    <div className={`card-industrial p-4 border-l-4 ${colors[color]}`}>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.14em]">{label}</div>
      <div className={`text-2xl font-extrabold mt-0.5 tabular-nums ${textColors[color]}`}>{value}</div>
    </div>
  );
}

function ActionsBreakdown({ data }) {
  if (!data.length) return <div className="text-xs text-slate-400 text-center py-4">Aucune action corrective</div>;

  const maxTotal = Math.max(...data.map(d => d.open + d.in_progress + d.closed), 1);
  const sorted = [...data].sort((a, b) => (b.open + b.in_progress) - (a.open + a.in_progress));

  return (
    <div className="space-y-4">
      {sorted.map(row => {
        const total = row.open + row.in_progress + row.closed;
        return (
          <div key={row.projectId} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">{row.projectName}</span>
              <span className="text-[10px] text-slate-400 font-medium">{total} actions</span>
            </div>
            <div className="h-5 w-full bg-slate-100 rounded-full overflow-hidden flex">
              {row.open > 0 && (
                <div className="h-full bg-rose-500 flex items-center justify-center text-[9px] font-bold text-white min-w-[24px] transition-all duration-700" style={{ width: `${Math.max((row.open / maxTotal) * 100, 2)}%` }}>
                  {row.open}
                </div>
              )}
              {row.in_progress > 0 && (
                <div className="h-full bg-amber-400 flex items-center justify-center text-[9px] font-bold text-white min-w-[24px] transition-all duration-700" style={{ width: `${Math.max((row.in_progress / maxTotal) * 100, 2)}%` }}>
                  {row.in_progress}
                </div>
              )}
              {row.closed > 0 && (
                <div className="h-full bg-emerald-400 flex items-center justify-center text-[9px] font-bold text-white min-w-[24px] transition-all duration-700" style={{ width: `${Math.max((row.closed / maxTotal) * 100, 2)}%` }}>
                  {row.closed}
                </div>
              )}
            </div>
            <div className="flex gap-2 text-[10px] text-slate-500">
              {row.open > 0 && <span className="text-rose-600 font-medium">{row.open} ouvertes</span>}
              {row.in_progress > 0 && <span className="text-amber-600 font-medium">{row.in_progress} en cours</span>}
              {row.closed > 0 && <span className="text-emerald-600 font-medium">{row.closed} clôturées</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionDistRow({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] font-bold">
        <span>{label}</span>
        <span>{count}</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DistributionRow({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] font-bold">
        <span>{label}</span>
        <span>{count}</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
