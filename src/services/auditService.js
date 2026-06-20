import { dataClient } from './dataClient';

function nextId(items, prefix = 'A') {
  const max = items.reduce((m, x) => {
    const n = parseInt(String(x.id).replace(/^\D+/, ''), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${max + 1}`;
}

export const auditService = {
  list: () => dataClient.get('audits'),
  checklist: () => dataClient.get('checklist'),

  async create(audit) {
    return dataClient.patch('audits', (prev) => {
      const item = { ...audit, id: audit.id || nextId(prev, 'A'), createdAt: Date.now() };
      return [...prev, item];
    });
  },

  async update(id, patch) {
    return dataClient.patch('audits', (prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a))
    );
  },

  async remove(id) {
    return dataClient.patch('audits', (prev) => prev.filter((a) => a.id !== id));
  },
  async clearAll() {
    return dataClient.set('audits', []);
  },

  computeScore(checklist, answers, machineCount = 0) {
    if (!checklist?.items?.length) return 0;
    let total = 0;
    let weightSum = 0;
    for (const q of checklist.items) {
      const a = answers?.[q.id];
      const val = typeof a === 'string' ? a : a?.value;
      const nokCount = a?.nokMachines?.length || 0;
      const w = q.weight ?? 1;
      weightSum += w;
      if (val === 'yes') {
        total += w;
      } else if (val === 'no' && machineCount > 0) {
        // Proportional: fraction of OK machines earns partial credit
        const okRatio = (machineCount - nokCount) / machineCount;
        total += w * Math.max(0, okRatio);
      } else if (val === 'na') {
        weightSum -= w; // exclude N/A from denominator
      }
      // else 'no' with 0 machines or unknown count = 0 points
    }
    if (weightSum <= 0) return 0;
    return Math.round((total / weightSum) * 100);
  },

  // Effective score: base score + resolution bonus when all actions closed
  computeEffectiveScore(storedScore, actions = []) {
    if (!actions.length) return storedScore;
    const allClosed = actions.every(a => (a.act || 'open') === 'closed');
    if (!allClosed) return storedScore;
    // 25% of remaining gap to 100 — visible boost on charts
    const bonus = Math.round((100 - storedScore) * 0.25);
    return Math.min(100, storedScore + bonus);
  },

  // Check if all actions are resolved
  isAllActionsClosed(actions = []) {
    if (!actions.length) return true; // no actions = nothing to close
    return actions.every(a => (a.act || 'open') === 'closed');
  },
};
