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

  computeScore(checklist, answers) {
    if (!checklist?.items?.length) return 0;
    let total = 0;
    let weightSum = 0;
    for (const q of checklist.items) {
      const a = answers?.[q.id];
      const w = q.weight ?? 1;
      weightSum += w;
      if (a === 'yes') total += w;
      else if (a === 'na') weightSum -= w; // exclude N/A from denominator
    }
    if (weightSum <= 0) return 0;
    return Math.round((total / weightSum) * 100);
  },
};
