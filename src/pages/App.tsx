import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '../lib/auth';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';
import HelpersPage from './HelpersPage';
import PendingHelpersPage from './PendingHelpersPage';
import BuyersPage from './BuyersPage';
import TasksPage from './TasksPage';
import TaskDetailPage from './TaskDetailPage';
import SupportTicketsPage from './SupportTicketsPage';
import SupportTicketDetailPage from './SupportTicketDetailPage';
import SignupPage from './SignupPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  if (!state.accessToken) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <Protected>
              <DashboardPage />
            </Protected>
          }
        />
        <Route
          path="/helpers"
          element={
            <Protected>
              <HelpersPage />
            </Protected>
          }
        />
        <Route
          path="/helpers/pending"
          element={
            <Protected>
              <PendingHelpersPage />
            </Protected>
          }
        />
        <Route
          path="/buyers"
          element={
            <Protected>
              <BuyersPage />
            </Protected>
          }
        />
        <Route
          path="/tasks"
          element={
            <Protected>
              <TasksPage />
            </Protected>
          }
        />
        <Route
          path="/tasks/:taskId"
          element={
            <Protected>
              <TaskDetailPage />
            </Protected>
          }
        />
        <Route
          path="/support/tickets"
          element={
            <Protected>
              <SupportTicketsPage />
            </Protected>
          }
        />
        <Route
          path="/support/tickets/:ticketId"
          element={
            <Protected>
              <SupportTicketDetailPage />
            </Protected>
          }
        />
        <Route
          path="/signup"
          element={
            <Protected>
              <SignupPage />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
