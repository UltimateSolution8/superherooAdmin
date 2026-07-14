import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../lib/auth';
import { onAuthExpired } from '../lib/api';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';
import HelpersPage from './HelpersPage';
import PendingHelpersPage from './PendingHelpersPage';
import BuyersPage from './BuyersPage';
import MediatorsPage from './MediatorsPage';
import TasksPage from './TasksPage';
import TaskDetailPage from './TaskDetailPage';
import SupportTicketsPage from './SupportTicketsPage';
import SupportTicketDetailPage from './SupportTicketDetailPage';
import SignupPage from './SignupPage';
import VideoKycPage from './VideoKycPage';
import LiveKycPage from './LiveKycPage';
import LiveKycJoinPage from './LiveKycJoinPage';
import BulkRequestsPage from './BulkRequestsPage';
import LearnPage from './LearnPage';
import SendNotificationsPage from './SendNotificationsPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  if (!state.accessToken) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  if (state.accessToken) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function SessionExpiryWatcher() {
  const navigate = useNavigate();
  const { state, logout } = useAuth();

  useEffect(() => {
    const unsubscribe = onAuthExpired(() => {
      if (!state.accessToken) return;
      logout();
      navigate('/login', { replace: true });
    });
    return unsubscribe;
  }, [navigate, logout, state.accessToken]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <SessionExpiryWatcher />
      <Routes>
        <Route
          path="/login"
          element={(
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          )}
        />
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
          path="/mediators"
          element={
            <Protected>
              <MediatorsPage />
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
          path="/kyc/video"
          element={
            <Protected>
              <VideoKycPage />
            </Protected>
          }
        />
        <Route
          path="/kyc/live"
          element={
            <Protected>
              <LiveKycPage />
            </Protected>
          }
        />
        <Route path="/kyc/live/join" element={<LiveKycJoinPage />} />
        <Route
          path="/signup"
          element={
            <Protected>
              <SignupPage />
            </Protected>
          }
        />
        <Route
          path="/bulk-requests"
          element={
            <Protected>
              <BulkRequestsPage />
            </Protected>
          }
        />
        <Route
          path="/learn"
          element={
            <Protected>
              <LearnPage />
            </Protected>
          }
        />
        <Route
          path="/notifications/send"
          element={
            <Protected>
              <SendNotificationsPage />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
