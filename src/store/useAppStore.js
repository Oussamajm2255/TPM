import { create } from 'zustand';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { projectService } from '../services/projectService';
import { auditService } from '../services/auditService';
import { planningService } from '../services/planningService';
import { dataClient } from '../services/dataClient';

export const useAppStore = create((set, get) => ({
  // --- auth
  currentUser: null,
  authLoading: true,

  // --- data
  projects: [],
  users: [],
  audits: [],
  checklist: null,
  planning: [],
  settings: null,
  loading: false,

  // --- boot
  async bootstrap() {
    set({ authLoading: true });
    const user = await authService.currentUser();
    set({ currentUser: user, authLoading: false });
    await get().refreshAll();
  },

  async refreshAll() {
    set({ loading: true });
    const [projects, users, audits, checklist, planning, settings] = await Promise.all([
      projectService.list(),
      userService.list(),
      auditService.list(),
      auditService.checklist(),
      planningService.get(),
      planningService.settings(),
    ]);
    set({ projects, users, audits, checklist, planning, settings, loading: false });
  },

  // --- auth actions
  async login(username, password) {
    const user = await authService.login(username, password);
    set({ currentUser: user });
    await get().refreshAll();
    return user;
  },
  logout() {
    authService.logout();
    set({ currentUser: null });
  },

  // --- audits
  async createAudit(audit) {
    await auditService.create(audit);
    const audits = await auditService.list();
    set({ audits });
  },
  async updateAudit(id, patch) {
    await auditService.update(id, patch);
    set({ audits: await auditService.list() });
  },
  async removeAudit(id) {
    await auditService.remove(id);
    set({ audits: await auditService.list() });
  },

  // --- planning
  async regeneratePlanning(hardWipe = false) {
    const planning = await planningService.regenerate(hardWipe);
    set({ planning });
  },

  async addUnplanned(input) {
    const planning = await planningService.addUnplanned(input);
    set({ planning });
  },
  async updatePlanEntry(id, patch) {
    const planning = await planningService.updateEntry(id, patch);
    set({ planning });
  },
  async removePlanEntry(id) {
    const planning = await planningService.removeEntry(id);
    set({ planning });
  },

  // --- admin
  async resetDemoData() {
    await dataClient.reset();
    await get().refreshAll();
  },

  // --- users
  async upsertUser(user) {
    await userService.upsert(user);
    set({ users: await userService.list() });
  },
  async removeUser(id) {
    await userService.remove(id);
    set({ users: await userService.list() });
  },
}));
