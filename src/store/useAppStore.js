import { create } from 'zustand';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { projectService } from '../services/projectService';
import { auditService } from '../services/auditService';
import { planningService } from '../services/planningService';
import { notificationService } from '../services/notificationService';
import { actionService } from '../services/actionService';
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
  notifications: [],
  unreadCount: 0,
  loading: false,

  // --- boot
  async bootstrap() {
    set({ authLoading: true });
    const user = await authService.currentUser();
    set({ currentUser: user, authLoading: false });
    if (user) {
      await get().refreshAll();
      get().setupRealtime();
    }
  },

  async refreshAll() {
    set({ loading: true });
    const user = get().currentUser;
    const [projects, users, audits, checklist, planning, settings, notifs] = await Promise.all([
      projectService.list(),
      userService.list(),
      auditService.list(),
      auditService.checklist(),
      planningService.get(),
      planningService.settings(),
      user ? notificationService.list(user.id) : Promise.resolve([]),
    ]);
    set({ 
      projects, users, audits, checklist, planning, settings, 
      notifications: notifs,
      unreadCount: notifs.filter(n => !n.is_read).length,
      loading: false 
    });
  },

  // --- notifications
  setupRealtime() {
    const user = get().currentUser;
    if (!user) return;
    notificationService.unsubscribe();
    notificationService.subscribe(user.id, (notif) => {
      set(state => {
        const newList = [notif, ...state.notifications].slice(0, 20);
        return { 
          notifications: newList,
          unreadCount: newList.filter(n => !n.is_read).length
        };
      });
    });
  },

  async markNotificationRead(id) {
    await notificationService.markAsRead(id);
    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }));
  },

  async markAllNotificationsRead() {
    const user = get().currentUser;
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0
    }));
  },

  // --- auth actions
  async login(username, password) {
    const user = await authService.login(username, password);
    set({ currentUser: user });
    await get().refreshAll();
    get().setupRealtime();
    return user;
  },
  logout() {
    authService.logout();
    notificationService.unsubscribe();
    set({ currentUser: null, notifications: [], unreadCount: 0 });
  },

  // --- audits
  async createAudit(audit) {
    await auditService.create(audit);
    const audits = await auditService.list();
    set({ audits });

    // --- Notify Admins
    const admins = get().users.filter(u => u.role === 'admin' || u.role === 'manager');
    const sender = get().currentUser;
    
    for (const admin of admins) {
      if (admin.id === sender?.id) continue;
      
      const isCritical = audit.score < 60;
      await notificationService.create({
        user_id: admin.id,
        type: isCritical ? 'danger' : 'success',
        title: isCritical ? 'ALERTE: Score Critique' : 'Nouvel Audit',
        message: `${audit.projectName} - ${audit.lineName} par ${audit.auditeur} : ${audit.score}%`,
        link: '/audits'
      });
    }
  },
  async updateAudit(id, patch) {
    await auditService.update(id, patch);
    set({ audits: await auditService.list() });
  },

  // --- actions
  async updateActionStatus(auditId, actionIdx, newStatus) {
    await actionService.updateStatus(auditId, actionIdx, newStatus);
    set({ audits: await auditService.list() });
  },
  async removeAudit(id) {
    await auditService.remove(id);
    await get().refreshAll();
  },
  async clearAllAudits() {
    await auditService.clearAll();
    await get().refreshAll();
  },

  // --- planning
  async regeneratePlanning(hardWipe = false) {
    const planning = await planningService.regenerate(hardWipe);
    set({ planning });
  },

  async addUnplanned(input) {
    const planning = await planningService.addUnplanned(input);
    set({ planning });

    // --- Notify Technician
    if (input.technicianId !== get().currentUser?.id) {
      await notificationService.create({
        user_id: input.technicianId,
        type: 'warning',
        title: 'Audit non planifié assigné',
        message: `Vous avez été assigné à un audit sur ${input.projectName} pour le ${input.date}`,
        link: '/tasks'
      });
    }
  },
  async updatePlanEntry(id, patch) {
    const planning = await planningService.updateEntry(id, patch);
    set({ planning });
  },
  async reassignTask(id, technicianId) {
    const planning = await planningService.updateEntry(id, { technicianId });
    set({ planning });
  },
  async toggleUrgent(id, current) {
    const planning = await planningService.updateEntry(id, { unplanned: !current });
    set({ planning });
  },
  async removePlanEntry(id) {
    const planning = await planningService.removeEntry(id);
    set({ planning });
  },
  async clearAllPlanning() {
    await planningService.clearAll();
    set({ planning: [] });
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

  // --- projects
  async upsertProject(project) {
    await projectService.upsertProject(project);
    set({ projects: await projectService.list() });
  },
  async removeProject(id) {
    await projectService.removeProject(id);
    set({ projects: await projectService.list() });
  },
}));
