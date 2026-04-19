// ----------------------------------------------------------------------------
// Planning engine — deterministic, fair audit distribution.
//
// Rules enforced:
//   R1. Each technician performs at most 1 planned audit per working day.
//   R2. Full project/line coverage before any line repeats.
//   R3. Workload balanced across technicians (difference <= 1 audit).
//   R4. A technician should not repeat the same line within a cooldown window.
//   R5. Engine is deterministic: same inputs → same output (seeded shuffle).
//
// Unplanned audits inserted by the Maintenance Manager are preserved and the
// regular schedule rebalances around them.
// ----------------------------------------------------------------------------

import { listYearDays, isWorkingDay, toISO } from './dateUtils';

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, seed) {
  const rand = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build the base yearly schedule.
 *
 * @param {Object} opts
 * @param {number} opts.year
 * @param {Array} opts.technicians  [{id, displayName}]
 * @param {Array} opts.lines        flat list [{projectId, projectName, lineId, lineName}]
 * @param {number[]} [opts.workingDays] getDay() values considered working (default Mon-Fri)
 * @param {number} [opts.cooldown] min days between a technician revisiting a line
 * @param {number} [opts.seed]
 * @returns {Array} entries [{id,date,technicianId,projectId,lineId,status,unplanned:false}]
 */
/**
 * restrictions — per-project whitelist of technician IDs.
 *   { [projectId]: [techId, techId, ...] }
 * A project listed here is *restricted*: only its whitelisted technicians may
 * audit it. Unlisted projects stay open to everyone.
 */
function isTechAllowed(tech, line, restrictions) {
  const allowed = restrictions?.[line.projectId];
  if (!allowed) return true;
  return allowed.includes(tech.id);
}

export function generatePlanning({
  year,
  technicians,
  lines,
  workingDays = [1, 2, 3, 4, 5],
  cooldown = 7,
  seed = 2026,
  startISO,       // optional cutoff — skip working days before this ISO date
  restrictions = {},
}) {
  if (!technicians?.length || !lines?.length) return [];

  let workingDates = listYearDays(year)
    .filter((d) => isWorkingDay(d, workingDays))
    .map(toISO);
  if (startISO) workingDates = workingDates.filter((d) => d >= startISO);

  // Shuffle lines once for project-variety; shuffle technician order per day
  const shuffledLines = seededShuffle(lines, seed);
  const N = technicians.length;
  const L = shuffledLines.length;

  // Track last-seen: tech → lineId → dayIndex
  const lastSeen = new Map(technicians.map((t) => [t.id, new Map()]));

  const entries = [];
  let entryCounter = 0;

  workingDates.forEach((dateISO, dayIdx) => {
    // Technicians rotate order each day to avoid the same pairing pattern
    const rotation = (dayIdx % N);
    const dayTechs = [
      ...technicians.slice(rotation),
      ...technicians.slice(0, rotation),
    ];

    // Pool of candidate line-indices for today, starting from a rotated offset
    const offset = (dayIdx * N) % L;
    const pool = [];
    for (let k = 0; k < L; k++) pool.push((offset + k) % L);

    const usedToday = new Set();

    dayTechs.forEach((tech, i) => {
      // Find first line in pool that passes cooldown, isn't taken today, and
      // respects any per-project restriction.
      let chosen = -1;
      for (let step = 0; step < pool.length; step++) {
        const idx = pool[(i + step) % pool.length];
        if (usedToday.has(idx)) continue;
        const line = shuffledLines[idx];
        if (!isTechAllowed(tech, line, restrictions)) continue;
        const last = lastSeen.get(tech.id).get(line.lineId);
        if (last !== undefined && dayIdx - last < cooldown) continue;
        chosen = idx;
        break;
      }
      // Fallback 1 — relax cooldown only (still respect restrictions)
      if (chosen === -1) {
        for (let step = 0; step < pool.length; step++) {
          const idx = pool[(i + step) % pool.length];
          if (usedToday.has(idx)) continue;
          const line = shuffledLines[idx];
          if (!isTechAllowed(tech, line, restrictions)) continue;
          chosen = idx;
          break;
        }
      }
      if (chosen === -1) return; // technician has no allowed line today — skip

      usedToday.add(chosen);
      const line = shuffledLines[chosen];
      lastSeen.get(tech.id).set(line.lineId, dayIdx);

      entries.push({
        id: `PL${++entryCounter}`,
        date: dateISO,
        technicianId: tech.id,
        projectId: line.projectId,
        lineId: line.lineId,
        status: 'scheduled',
        unplanned: false,
      });
    });
  });

  return entries;
}

/**
 * Merge an unplanned audit into an existing schedule.
 * - If the technician already has an audit that day, the existing one is
 *   pushed to the next working day where they are free.
 * - The unplanned entry is marked unplanned:true and always wins the slot.
 */
export function insertUnplanned(currentPlan, unplanned, workingDates) {
  const plan = currentPlan.slice();
  const workingIdx = new Map(workingDates.map((d, i) => [d, i]));

  const conflict = plan.find(
    (p) => p.date === unplanned.date && p.technicianId === unplanned.technicianId && !p.unplanned
  );

  if (conflict) {
    // Find next working day where this technician has no assignment
    const start = workingIdx.get(conflict.date) ?? 0;
    let placed = false;
    for (let i = start + 1; i < workingDates.length; i++) {
      const d = workingDates[i];
      const busy = plan.some((p) => p.date === d && p.technicianId === conflict.technicianId);
      if (!busy) {
        conflict.date = d;
        conflict.rescheduled = true;
        placed = true;
        break;
      }
    }
    if (!placed) {
      // No slot this year — mark as overflow; UI surfaces it
      conflict.overflow = true;
    }
  }

  plan.push({ ...unplanned, unplanned: true, status: unplanned.status || 'scheduled' });
  return plan;
}

// Simple KPIs for balance checking
export function planningStats(entries, technicians) {
  const byTech = new Map(technicians.map((t) => [t.id, 0]));
  const byProject = new Map();
  const byLine = new Map();
  for (const e of entries) {
    byTech.set(e.technicianId, (byTech.get(e.technicianId) || 0) + 1);
    byProject.set(e.projectId, (byProject.get(e.projectId) || 0) + 1);
    byLine.set(e.lineId, (byLine.get(e.lineId) || 0) + 1);
  }
  return { byTech, byProject, byLine, total: entries.length };
}
