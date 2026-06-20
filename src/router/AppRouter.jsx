import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ProjectsPage from '../pages/ProjectsPage';
import AuditsPage from '../pages/AuditsPage';
import NewAuditPage from '../pages/NewAuditPage';
import PlanningPage from '../pages/PlanningPage';
import TasksPage from '../pages/TasksPage';
import UsersPage from '../pages/UsersPage';
import { usePermissions } from '../hooks/usePermissions';

function Guard({ children, action }) {
  const { user, can } = usePermissions();
  if (!user) return <Navigate to="/login" replace />;
  if (action && !can(action)) return <Navigate to="/" replace />;
  return children;
}

export default function AppRouter() {
  const user = useAppStore((s) => s.currentUser);
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <Guard>
            <AppLayout />
          </Guard>
        }
      >
        <Route index element={user?.role === 'technician' ? <Navigate to="/tasks" replace /> : <DashboardPage />} />
        <Route path="tasks" element={<Guard action="tasks.view"><TasksPage /></Guard>} />
        <Route path="projects" element={<Guard action="projects.view"><ProjectsPage /></Guard>} />
        <Route path="audits" element={<Guard action="audits.view"><AuditsPage /></Guard>} />
        <Route path="audits/new" element={<Guard action="audits.create"><NewAuditPage /></Guard>} />
        <Route path="planning" element={<Guard action="planning.view"><PlanningPage /></Guard>} />
        <Route path="users" element={<Guard action="users.view"><UsersPage /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
