import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import ReportDocument from '../components/reports/ReportDocument';
import { REPORT_TYPES, buildReport, getPeriod, shiftAnchor } from '../utils/reportData';
import { toISO } from '../utils/dateUtils';

const SHEET_W = 794; // A4 @ 96dpi

// Hides the app chrome and prints only the sheet on A4 (user picks "Save as PDF").
const PRINT_CSS = `
@page { size: A4; margin: 0; }
@media print {
  html, body, #root { height: auto !important; background: #fff !important; }
  body { background-image: none !important; }
  header.glass, footer.fixed, .no-print { display: none !important; }
  main { height: auto !important; overflow: visible !important; padding: 0 !important; }
  main > div { padding: 0 !important; }
  .reports-root { padding: 0 !important; }
  .reports-root > * { margin: 0 !important; }
  .report-frame { zoom: 1 !important; box-shadow: none !important; margin: 0 !important; border: 0 !important; width: 794px !important; }
  .report-sheet { box-shadow: none !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

export default function ReportsPage() {
  const { audits, planning, projects, users, checklist } = useAppStore((s) => ({
    audits: s.audits, planning: s.planning, projects: s.projects, users: s.users, checklist: s.checklist,
  }));
  const todayISO = toISO(new Date());
  const [type, setType] = useState('weekly');
  const [anchor, setAnchor] = useState(todayISO);
  const wrapRef = useRef(null);
  const [zoom, setZoom] = useState(1);

  const report = useMemo(
    () => buildReport({ type, anchorISO: anchor, todayISO, audits, planning, projects, users, checklist }),
    [type, anchor, todayISO, audits, planning, projects, users, checklist],
  );

  // Fit the A4 preview to the available width
  useEffect(() => {
    const fit = () => { if (wrapRef.current) setZoom(Math.min(1, (wrapRef.current.clientWidth - 2) / SHEET_W)); };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const exportPdf = () => {
    // The browser uses document.title as the default PDF file name → deterministic name per report.
    const prevTitle = document.title;
    document.title = `Rapport_${REPORT_TYPES[type].label}_${getPeriod(type, anchor).short}`;
    const restore = () => { document.title = prevTitle; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    window.print();
  };

  const inputValue = type === 'monthly' ? anchor.slice(0, 7) : anchor;
  const onInput = (v) => {
    if (!v) return;
    setAnchor(type === 'monthly' ? `${v}-01` : v);
  };

  return (
    <div className="reports-root space-y-5 pb-10">
      <style>{PRINT_CSS}</style>

      <div className="no-print card-industrial p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 gap-0.5 self-start">
          {Object.entries(REPORT_TYPES).map(([k, t]) => (
            <button
              key={k}
              onClick={() => setType(k)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${type === k ? 'bg-white text-[#1f20c3] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-white p-1 px-2 rounded-[8px] border border-slate-200">
            <button className="btn-ghost !px-1.5 !py-1" onClick={() => setAnchor(shiftAnchor(type, anchor, -1))} aria-label="Période précédente"><ChevronLeft className="w-4 h-4" /></button>
            <input
              type={type === 'monthly' ? 'month' : 'date'}
              value={inputValue}
              onChange={(e) => onInput(e.target.value)}
              className="text-xs font-bold text-slate-700 border-none bg-transparent p-0 focus:ring-0 cursor-pointer"
            />
            <button className="btn-ghost !px-1.5 !py-1" onClick={() => setAnchor(shiftAnchor(type, anchor, 1))} aria-label="Période suivante"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <span className="text-xs font-semibold text-slate-500 hidden md:inline">{report.period.label}</span>
          <button className="btn-primary" onClick={exportPdf}>
            <FileDown className="w-4 h-4" /> Exporter en PDF
          </button>
        </div>
      </div>

      <div ref={wrapRef}>
        <div
          className="report-frame mx-auto rounded-sm border border-slate-200 shadow-card bg-white"
          style={{ width: SHEET_W, zoom, maxWidth: 'none' }}
        >
          <ReportDocument report={report} />
        </div>
      </div>
    </div>
  );
}
