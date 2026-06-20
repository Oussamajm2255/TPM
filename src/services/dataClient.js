import initialUsers from '../data/users.json';
import initialProjects from '../data/projects.json';
import initialChecklist from '../data/checklist.json';
import initialPlanning from '../data/planning.json';

const STORAGE_PREFIX = 'tpm-audit:v2:';

function getInitialData(collection) {
  switch (collection) {
    case 'users':
      return initialUsers.map(u => ({
        id: u.id, username: u.username, password: u.password,
        display_name: u.displayName, role: u.role, active: u.active ?? true,
      }));
    case 'projects':
      return structuredClone(initialProjects);
    case 'checklist':
      return [initialChecklist];
    case 'planning':
      return initialPlanning.map(p => ({
        id: p.id, date: p.date,
        technician_id: p.technicianId, project_id: p.projectId,
        line_id: p.lineId, status: p.status || 'todo',
        unplanned: p.unplanned || false,
      }));
    case 'settings':
      return [{ key: 'main', value: {
        planningYear: 2026, planningStartISO: '2026-05-04',
        workingDays: [1, 2, 3, 4, 5], started: true, companyName: 'Audit TPM',
      }}];
    case 'notifications':
      return [];
    case 'audits':
      return [];
    default:
      return null;
  }
}

function loadRaw(collection) {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + collection);
    if (stored) return JSON.parse(stored);
  } catch {}
  const initial = getInitialData(collection);
  if (initial !== null) {
    localStorage.setItem(STORAGE_PREFIX + collection, JSON.stringify(initial));
    return initial;
  }
  return [];
}

function saveRaw(collection, data) {
  localStorage.setItem(STORAGE_PREFIX + collection, JSON.stringify(data));
}

function toCamelCase(collection, data) {
  if (collection === 'users') {
    return data.map(u => ({ ...u, displayName: u.display_name }));
  }
  if (collection === 'planning') {
    return data.map(p => ({
      ...p, technicianId: p.technician_id, projectId: p.project_id, lineId: p.line_id,
    }));
  }
  if (collection === 'audits') {
    return data.map(a => ({
      ...a, projectId: a.project_id, projectName: a.project_name,
      lineId: a.line_id, lineName: a.line_name,
      machineIssues: a.machine_issues, technicianId: a.technician_id, planId: a.plan_id,
    }));
  }
  return data;
}

function toSnakeCase(collection, data) {
  if (collection === 'users') {
    return data.map(u => ({
      id: u.id, username: u.username, password: u.password,
      display_name: u.displayName, role: u.role, active: u.active,
    }));
  }
  if (collection === 'planning') {
    return data.map(p => ({
      id: p.id, date: p.date, technician_id: p.technicianId,
      project_id: p.projectId, line_id: p.lineId,
      status: p.status, unplanned: p.unplanned,
    }));
  }
  if (collection === 'audits') {
    return data.map(a => ({
      id: a.id, date: a.date,
      project_id: a.projectId, project_name: a.projectName,
      line_id: a.lineId, line_name: a.lineName,
      machine_issues: a.machineIssues, technician_id: a.technicianId,
      auditeur: a.auditeur, superviseur: a.superviseur, gap_leader: a.gapLeader,
      answers: a.answers, actions: a.actions, score: a.score,
      plan_id: a.planId,
    }));
  }
  return data;
}

export const dataClient = {
  async get(collection) {
    const raw = loadRaw(collection);
    if (collection === 'checklist') return raw[0] || null;
    if (collection === 'settings') {
      return raw.reduce((acc, curr) => ({ ...acc, ...curr.value }), {});
    }
    return toCamelCase(collection, raw);
  },

  async set(collection, value) {
    let toSave = Array.isArray(value) ? value : [value];

    if (collection === 'settings') {
      saveRaw('settings', [{ key: 'main', value }]);
      return value;
    }
    if (collection === 'checklist') {
      saveRaw('checklist', [value]);
      return value;
    }

    toSave = toSnakeCase(collection, toSave);
    saveRaw(collection, toSave);
    return value;
  },

  async patch(collection, updater) {
    const current = await this.get(collection);
    const updated = updater(current);
    await this.set(collection, updated);
    return updated;
  },

  async clear(collection) {
    saveRaw(collection, []);
  },

  async reset() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  },
};

export const supabase = {
  from() {
    const chain = {
      select() { return chain; },
      insert() { return chain; },
      update() { return chain; },
      delete() { return chain; },
      upsert() { return chain; },
      eq() { return chain; },
      neq() { return chain; },
      order() { return chain; },
      limit() { return chain; },
      then(resolve) { return Promise.resolve(resolve?.({ data: [], error: null }) ?? { data: [], error: null }); },
    };
    return chain;
  },
  channel() {
    return { on() { return this; }, subscribe() { return this; }, unsubscribe() {} };
  },
  removeChannel() {},
};

export function exportDB() {
  return "Local Mode: Export via browser console";
}

export function importDB(json) {
  console.error("Import not implemented in local mode");
}
