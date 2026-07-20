import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../lib/auth';
import { onAuthExpired } from '../lib/api';

const LoginPage = lazy(() => import('./LoginPage'));
const DashboardPage = lazy(() => import('./DashboardPage'));
const HelpersPage = lazy(() => import('./HelpersPage'));
const PendingHelpersPage = lazy(() => import('./PendingHelpersPage'));
const BuyersPage = lazy(() => import('./BuyersPage'));
const MediatorsPage = lazy(() => import('./MediatorsPage'));
const TasksPage = lazy(() => import('./TasksPage'));
const TaskDetailPage = lazy(() => import('./TaskDetailPage'));
const SupportTicketsPage = lazy(() => import('./SupportTicketsPage'));
const SupportTicketDetailPage = lazy(() => import('./SupportTicketDetailPage'));
const SignupPage = lazy(() => import('./SignupPage'));
const VideoKycPage = lazy(() => import('./VideoKycPage'));
const LiveKycPage = lazy(() => import('./LiveKycPage'));
const LiveKycJoinPage = lazy(() => import('./LiveKycJoinPage'));
const BulkRequestsPage = lazy(() => import('./BulkRequestsPage'));
const LearnPage = lazy(() => import('./LearnPage'));
const SendNotificationsPage = lazy(() => import('./SendNotificationsPage'));
const ReportsPage = lazy(() => import('./ReportsPage').then(m => ({ default: m.ReportsPage })));

function PageLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/3 px-5 py-4 text-sm font-bold shadow-xl shadow-black/5">
        <span className="h-4 w-4 animate-pulse rounded-full bg-indigo-500" />
        Loading workspace
      </div>
    </div>
  );
}

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
      <Suspense fallback={<PageLoader />}>
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
          path="/reports"
          element={
            <Protected>
              <ReportsPage />
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
          path="/signup"
          element={
            <Protected>
              <SignupPage />
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
        <Route
          path="/kyc/live/join"
          element={
            <Protected>
              <LiveKycJoinPage />
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
      </Suspense>
    </AuthProvider>
  );
}
