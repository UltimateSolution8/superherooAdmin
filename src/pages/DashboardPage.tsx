import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';

type Task = { id: string; status: string; createdAt: string; title: string; urgency: string; budgetPaise: number };

type Summary = {
  pendingHelpers: number;
  searchingTasks: number;
  assignedTasks: number;
  arrivedTasks: number;
  startedTasks: number;
  completedTasks: number;
  totalRevenuePaise: number;
};

export default function DashboardPage() {
  const { state } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [summaryRes, recentRes] = await Promise.all([
        apiFetch<Summary>('/api/v1/admin/summary', undefined, state.accessToken),
        apiFetch<Task[]>('/api/v1/admin/tasks/recent?limit=5', undefined, state.accessToken),
      ]);
      if (!active) return;
      if (summaryRes.ok) setSummary(summaryRes.data);
      else setError(summaryRes.errorText);
      if (recentRes.ok && Array.isArray(recentRes.data)) setRecentTasks(recentRes.data);
    })();
    return () => {
      active = false;
    };
  }, [state.accessToken]);

  const pendingCount = summary?.pendingHelpers ?? 0;
  const searching = summary?.searchingTasks ?? 0;
  const assigned = summary?.assignedTasks ?? 0;
  const arrived = summary?.arrivedTasks ?? 0;
  const started = summary?.startedTasks ?? 0;
  const completed = summary?.completedTasks ?? 0;
  const totalRevenue = summary?.totalRevenuePaise ?? 0;

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <header className="space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-foreground/60">Real-time overview of your marketplace operations.</p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200 mb-6">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard title="Pending Helpers" value={String(pendingCount)} icon="👤" color="amber" href="/helpers/pending" />
          <StatCard title="Active Tasks" value={String(searching + assigned + arrived + started)} icon="⚡" color="indigo" href="/tasks" />
          <StatCard title="Completed Tasks" value={String(completed)} icon="✅" color="emerald" href="/tasks" />
          <StatCard title="Total Revenue" value={`₹${(totalRevenue / 100).toLocaleString()}`} icon="💰" color="purple" />
        </section>

        <section className="rounded-2xl border border-foreground/10 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Task Pipeline</h2>
          <div className="grid grid-cols-5 gap-3">
            <PipelineStage label="Searching" count={searching} color="from-yellow-400 to-amber-500" />
            <PipelineStage label="Assigned" count={assigned} color="from-blue-400 to-indigo-500" />
            <PipelineStage label="Arrived" count={arrived} color="from-indigo-400 to-violet-500" />
            <PipelineStage label="Started" count={started} color="from-purple-400 to-fuchsia-500" />
            <PipelineStage label="Completed" count={completed} color="from-emerald-400 to-green-600" />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-foreground/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Tasks</h2>
              <Link to="/tasks" className="text-sm text-indigo-400 hover:underline">View all →</Link>
            </div>
            <div className="space-y-3">
              {recentTasks.length === 0 ? (
                <p className="text-sm text-foreground/50">No tasks yet.</p>
              ) : (
                recentTasks.map((t) => (
                  <Link
                    key={t.id}
                    to={`/tasks/${encodeURIComponent(t.id)}`}
                    className="flex items-center justify-between rounded-xl border border-foreground/8 p-3 hover:bg-foreground/3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{t.title}</div>
                      <div className="text-xs text-foreground/50 mt-0.5">
                        {t.urgency} • ₹{(t.budgetPaise / 100).toFixed(0)}
                      </div>
                    </div>
                    <StatusBadge status={t.status} />
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-foreground/10 p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <ActionCard title="Review Helpers" description="Approve pending KYC" href="/helpers/pending" icon="🔍" />
              <ActionCard title="Manage Tasks" description="View all tasks" href="/tasks" icon="📋" />
              <ActionCard title="All Helpers" description="Manage accounts" href="/helpers" icon="👥" />
              <ActionCard title="Support Tickets" description="Handle inquiries" href="/support/tickets" icon="💬" />
              <ActionCard title="Buyers" description="Manage buyer accounts" href="/buyers" icon="🛒" />
              <ActionCard title="Create User" description="Add new user" href="/signup" icon="➕" />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color, href }: { title: string; value: string; icon: string; color: string; href?: string }) {
  const colorMap: Record<string, string> = {
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
    indigo: 'from-indigo-500/10 to-indigo-600/5 border-indigo-500/20',
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
  };
  const cls = colorMap[color] || colorMap.indigo;

  const inner = (
    <div className={`rounded-2xl border bg-gradient-to-br ${cls} p-5 transition-shadow hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-foreground/60">{title}</div>
    </div>
  );

  return href ? <Link to={href}>{inner}</Link> : inner;
}

function PipelineStage({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-lg font-bold shadow-sm`}>
        {count}
      </div>
      <div className="mt-2 text-xs text-foreground/60 font-medium">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    SEARCHING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    ASSIGNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    ARRIVED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    STARTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function ActionCard({ title, description, href, icon }: { title: string; description: string; href: string; icon: string }) {
  return (
    <Link
      to={href}
      className="rounded-xl border border-foreground/8 p-4 hover:bg-foreground/3 transition-colors group"
    >
      <div className="text-xl mb-2">{icon}</div>
      <div className="text-sm font-semibold group-hover:text-indigo-400 transition-colors">{title}</div>
      <div className="text-xs text-foreground/50 mt-0.5">{description}</div>
    </Link>
  );
}
