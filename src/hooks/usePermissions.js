import { useAppStore } from '../store/useAppStore';

// Central permission map — keeps components free from role branching.
const MATRIX = {
  'dashboard.view':          ['admin', 'manager'],
  'projects.view':           ['admin', 'manager'],
  'projects.manage':         ['admin'],
  'tasks.view':              ['admin', 'manager', 'technician'],
  'audits.view':             ['admin', 'manager', 'technician'],
  'audits.create':           ['admin', 'manager', 'technician'],
  'audits.delete':           ['admin', 'manager'],
  'planning.view':           ['admin', 'manager', 'technician'],
  'planning.generate':       ['admin', 'manager'],
  'planning.unplanned':      ['admin', 'manager'],
  'planning.edit':           ['admin', 'manager'],
  'users.view':              ['admin'],
  'users.manage':            ['admin'],
  'actions.view':            ['admin', 'manager', 'technician'],
  'actions.update':          ['admin', 'manager', 'technician'],
};

export function usePermissions() {
  const user = useAppStore((s) => s.currentUser);
  const role = user?.role;
  return {
    user,
    role,
    can: (action) => !!role && (MATRIX[action] || []).includes(role),
  };
}
