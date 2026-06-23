// Generate realistic audits for all overdue planning entries on Railway
import pg from 'pg';
import fs from 'node:fs';

const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres:CZeSHKOIpDMpDdEvFsYXFIewCANuYrau@thomas.proxy.rlwy.net:36925/railway',
  ssl: { rejectUnauthorized: false },
});

// Seeded random for reproducibility
let seed = 2026;
function rand() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }

await client.connect();
console.log('Connected');

// Load checklist
const checklist = JSON.parse(fs.readFileSync('./src/data/checklist.json', 'utf8'));
const questions = checklist.items;

// Load planning
const { rows: planning } = await client.query("SELECT * FROM planning WHERE status != 'done' AND date < CURRENT_DATE ORDER BY date");
console.log(`Found ${planning.length} overdue/non-done entries`);

// Load projects for machine data
const { rows: projects } = await client.query('SELECT * FROM projects');
const { rows: lines } = await client.query('SELECT * FROM lines');
const { rows: machines } = await client.query('SELECT * FROM machines');

const lineMachinesMap = new Map();
for (const m of machines) {
  if (!lineMachinesMap.has(m.line_id)) lineMachinesMap.set(m.line_id, []);
  lineMachinesMap.get(m.line_id).push(m);
}

// Lookup maps
const projectNameMap = new Map(projects.map(p => [p.id, p.name]));
const lineNameMap = new Map(lines.map(l => [l.id, l.name]));
const lineProjectMap = new Map(lines.map(l => [l.id, l.project_id]));

// Track scores per line for trend
const lineScoreTracker = new Map();

// Auditors
const auditors = ['Abdelsal', 'Marwen', 'Sami', 'Saif'];
const supervisors = ['Abdelsal', 'Houssine'];
const gapLeaders = ['Monji', 'Hafedh', 'Bechir'];

let auditCount = 0;
let actionCount = 0;

// Find max existing audit ID to avoid conflicts
const { rows: maxAudit } = await client.query("SELECT MAX(CAST(SUBSTRING(id FROM 2) AS INTEGER)) as mx FROM audits WHERE id LIKE 'A%'");
const startId = (maxAudit[0]?.mx || 0) + 1;
console.log(`Starting audit IDs from A${startId}`);

for (const plan of planning) {
  const lineMachines = lineMachinesMap.get(plan.line_id) || [];

  // Shop-floor realism: clear upward trend per line
  // First audit 73-77, then climbs step by step to 84-91
  let prevScores = lineScoreTracker.get(plan.line_id) || [];
  let baseScore;
  const last = prevScores.length > 0 ? prevScores[prevScores.length - 1] : 0;
  if (prevScores.length === 0) {
    baseScore = randInt(73, 77);
  } else if (prevScores.length === 1) {
    baseScore = Math.min(83, last + randInt(2, 6));
  } else if (prevScores.length === 2) {
    baseScore = Math.min(87, last + randInt(1, 5));
  } else if (prevScores.length < 6) {
    baseScore = Math.min(91, last + randInt(0, 4));
    // 15% chance of a dip (realistic)
    if (rand() < 0.15) baseScore = Math.max(74, baseScore - randInt(3, 8));
  } else {
    // Mature line: stable 83-91 with dips
    baseScore = randInt(83, 91);
    if (rand() < 0.12) baseScore = Math.max(74, baseScore - randInt(5, 10));
  }
  lineScoreTracker.set(plan.line_id, [...prevScores, baseScore]);

  // Always at least 1 NOK until score stabilizes, even high scores get occasional issues
  const numNok = baseScore < 76 ? randInt(3, 5) : baseScore < 82 ? randInt(2, 4) : baseScore < 88 ? randInt(1, 2) : rand() < 0.5 ? 1 : 0;
  const shuffledQ = [...questions].sort(() => rand() - 0.5);
  const nokQuestions = shuffledQ.slice(0, numNok);
  const nokIds = new Set(nokQuestions.map(q => q.id));

  const answers = {};
  const actions = [];
  const nokMachineIds = new Set();

  for (const q of questions) {
    if (nokIds.has(q.id) && lineMachines.length > 0) {
      // NOK
      // Select a realistic proportion of machines as NOK
      const nokPct = 0.35 + rand() * 0.45; // 35-80% of machines
      const nokCount = Math.max(1, Math.floor(lineMachines.length * nokPct));
      const shuffledM = [...lineMachines].sort(() => rand() - 0.5);
      const nokM = shuffledM.slice(0, nokCount);
      const machineIds = nokM.map(m => m.id);
      machineIds.forEach(id => nokMachineIds.add(id));

      answers[q.id] = { value: 'no', nokMachines: machineIds };

      // Auto-action
      const codes = nokM.map(m => m.code).join(', ');
      actions.push({
        problem: `${q.label} → Machines: ${codes}`,
        action: pick(['Nettoyage effectué', 'Pièce remplacée', 'Réglage fait', 'Lubrification OK', 'Vérifié et conforme']),
        resp: pick(auditors),
        deadline: plan.date,
        act: 'closed',
        commentaires: 'Corrigé pendant l\'audit',
      });
    } else if (rand() < 0.1) {
      answers[q.id] = 'na';
    } else {
      answers[q.id] = 'yes';
    }
  }

  // Machine issues
  const machineIssues = lineMachines.map(m => ({
    machineId: m.id,
    machineCode: m.code,
    status: nokMachineIds.has(m.id) ? 'nok' : 'ok',
    comment: '',
  }));

  // Compute base score
  const machineCount = lineMachines.length;
  let total = 0, weightSum = 0;
  for (const q of questions) {
    const a = answers[q.id];
    const val = typeof a === 'string' ? a : a?.value;
    const nokCount = a?.nokMachines?.length || 0;
    const w = q.weight || 1;
    weightSum += w;
    if (val === 'yes') total += w;
    else if (val === 'no' && machineCount > 0) {
      total += w * Math.max(0, (machineCount - nokCount) / machineCount);
    } else if (val === 'na') weightSum -= w;
  }
  const score = weightSum > 0 ? Math.round((total / weightSum) * 100) : 0;

  // Store raw score — the app applies resolution bonus on-the-fly
  const effectiveScore = score;

  // Insert audit
  const auditId = `A${startId + auditCount}`;
  await client.query(
    `INSERT INTO audits (id, plan_id, date, technician_id, auditeur, superviseur, gap_leader,
      project_id, project_name, line_id, line_name, machine_issues, answers, actions, score, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [auditId, plan.id, plan.date, plan.technician_id,
      pick(auditors), pick(supervisors), pick(gapLeaders),
      lineProjectMap.get(plan.line_id) || plan.project_id,
      projectNameMap.get(lineProjectMap.get(plan.line_id)) || '',
      plan.line_id, lineNameMap.get(plan.line_id) || '',
      JSON.stringify(machineIssues), JSON.stringify(answers), JSON.stringify(actions),
      effectiveScore, 'done']
  );

  // Mark planning as done
  await client.query("UPDATE planning SET status = 'done' WHERE id = $1", [plan.id]);

  auditCount++;
  actionCount += actions.length;

  if (auditCount % 100 === 0) console.log(`  ${auditCount}/${planning.length} audits (${actionCount} actions)`);
}

console.log(`\nDone: ${auditCount} audits, ${actionCount} actions closed`);
await client.end();
