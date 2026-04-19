import { dataClient } from './dataClient';
import { userService } from './userService';
import { projectService } from './projectService';
import { generatePlanning, insertUnplanned, planningStats } from '../utils/planningEngine';
import { listYearDays, isWorkingDay, toISO } from '../utils/dateUtils';

export const planningService = {
  async get() {
    return dataClient.get('planning');
  },

  async settings() {
    return dataClient.get('settings');
  },

  async regenerate(hardWipe = false) {
    const [technicians, lines, settings] = await Promise.all([
      userService.technicians(),
      projectService.allLines(),
      dataClient.get('settings'),
    ]);
    const entries = generatePlanning({
      year: settings.planningYear,
      technicians,
      lines,
      workingDays: settings.workingDays,
      startISO: settings.planningStartISO,
      restrictions: settings.projectRestrictions || {},
    });
    // Preserve previously-inserted unplanned audits unless hardWipe requested
    const prev = await dataClient.get('planning');
    const unplanned = hardWipe ? [] : prev.filter((p) => p.unplanned);

    let workingDates = listYearDays(settings.planningYear)
      .filter((d) => isWorkingDay(d, settings.workingDays))
      .map(toISO);
    if (settings.planningStartISO) workingDates = workingDates.filter((d) => d >= settings.planningStartISO);

    let merged = entries;
    for (const u of unplanned) merged = insertUnplanned(merged, u, workingDates);

    await dataClient.set('planning', merged);
    return merged;
  },


  async addUnplanned({ date, technicianId, projectId, lineId, reason }) {
    const settings = await dataClient.get('settings');
    let workingDates = listYearDays(settings.planningYear)
      .filter((d) => isWorkingDay(d, settings.workingDays))
      .map(toISO);
    if (settings.planningStartISO) workingDates = workingDates.filter((d) => d >= settings.planningStartISO);

    const current = await dataClient.get('planning');
    const id = `PU${Date.now().toString(36)}`;
    const updated = insertUnplanned(current, {
      id, date, technicianId, projectId, lineId, reason,
    }, workingDates);
    await dataClient.set('planning', updated);
    return updated;
  },

  async updateEntry(id, patch) {
    return dataClient.patch('planning', (prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  },

  async removeEntry(id) {
    return dataClient.patch('planning', (prev) => prev.filter((p) => p.id !== id));
  },

  async stats() {
    const [entries, technicians] = await Promise.all([
      dataClient.get('planning'),
      userService.technicians(),
    ]);
    return planningStats(entries, technicians);
  },
};
