// Centralized actions service — single source of truth for all action operations.
// Actions live inside audits.actions[], this service flattens, filters, and updates them.

import { dataClient } from './dataClient';

const STATUS_LABEL = { open: 'Ouvert', in_progress: 'En cours', closed: 'Clôturé' };
const STATUS_VARIANT = { open: 'danger', in_progress: 'warn', closed: 'success' };

export const actionService = {
  STATUS_LABEL,
  STATUS_VARIANT,

  // Flatten all actions across all audits, enriched with context
  async getAll() {
    const audits = await dataClient.get('audits');
    const out = [];
    for (const audit of audits) {
      if (!audit.actions?.length) continue;
      audit.actions.forEach((act, idx) => {
        out.push({
          ...act,
          actionIdx: idx,
          auditId: audit.id,
          auditDate: audit.date,
          projectId: audit.projectId,
          projectName: audit.projectName,
          lineId: audit.lineId,
          lineName: audit.lineName,
          machineIssues: audit.machineIssues,
          auditeur: audit.auditeur,
          score: audit.score,
          // normalize status
          act: act.act || 'open',
        });
      });
    }
    return out;
  },

  // Get actions where a technician is listed as responsible (by displayName match)
  // Fallback: if resp is empty, match by the audit's auditeur name
  async getByTechnician(displayName) {
    const all = await this.getAll();
    const name = displayName?.toLowerCase();
    return all.filter(a =>
      (a.resp && a.resp.toLowerCase() === name) ||
      (!a.resp && a.auditeur?.toLowerCase() === name)
    );
  },

  // Get counts by status for KPIs
  async getStats() {
    const all = await this.getAll();
    const today = new Date().toISOString().split('T')[0];
    return {
      total: all.length,
      open: all.filter(a => a.act === 'open').length,
      inProgress: all.filter(a => a.act === 'in_progress').length,
      closed: all.filter(a => a.act === 'closed').length,
      overdue: all.filter(a => a.act !== 'closed' && a.deadline && a.deadline < today).length,
    };
  },

  // Get actions grouped by project for charting
  async getByProject() {
    const all = await this.getAll();
    const map = new Map();
    for (const a of all) {
      if (!map.has(a.projectId)) {
        map.set(a.projectId, { projectId: a.projectId, projectName: a.projectName, open: 0, in_progress: 0, closed: 0 });
      }
      const entry = map.get(a.projectId);
      if (a.act === 'open') entry.open++;
      else if (a.act === 'in_progress') entry.in_progress++;
      else entry.closed++;
    }
    return Array.from(map.values());
  },

  // Update a single action's status inside its parent audit
  async updateStatus(auditId, actionIdx, newStatus) {
    const res = await fetch(`/api/audits/${auditId}/actions/${actionIdx}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error('API error');
    return res.json();
  },
};
