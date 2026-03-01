import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';

const STATUSES = ['SEARCHING', 'ASSIGNED', 'ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED'] as const;

type TaskDetail = {
  id: string;
  buyerId: string;
  buyerName?: string | null;
  buyerPhone?: string | null;
  title: string;
  description: string;
  urgency: string;
  timeMinutes: number;
  budgetPaise: number;
  lat: number;
  lng: number;
  addressText: string | null;
  status: string;
  assignedHelperId: string | null;
  helperName?: string | null;
  helperPhone?: string | null;
  arrivalSelfieUrl: string | null;
  arrivalSelfieLat: number | null;
  arrivalSelfieLng: number | null;
  arrivalSelfieAddress: string | null;
  arrivalSelfieCapturedAt: string | null;
  completionSelfieUrl: string | null;
  completionSelfieLat: number | null;
  completionSelfieLng: number | null;
  completionSelfieAddress: string | null;
  completionSelfieCapturedAt: string | null;
  createdAt: string;
};

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const { state } = useAuth();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!taskId) return;
      const res = await apiFetch<TaskDetail>(`/api/v1/admin/tasks/${encodeURIComponent(taskId)}`, undefined, state.accessToken);
      if (!active) return;
      if (res.ok) {
        setTask(res.data);
        setStatus(res.data.status);
      } else {
        setError(res.errorText);
      }
    })();
    return () => {
      active = false;
    };
  }, [taskId, state.accessToken]);

  const updateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId) return;
    const res = await apiFetch<TaskDetail>(
      `/api/v1/admin/tasks/${encodeURIComponent(taskId)}/status`,
      { method: 'POST', body: JSON.stringify({ status }) },
      state.accessToken,
    );
    if (res.ok) {
      setTask(res.data);
      return;
    }
    alert('Failed to update status');
  };

  if (error) {
    return (
      <div className="min-h-dvh">
        <Nav />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight">Task</h1>
          <p className="mt-2 text-sm text-foreground/70">Could not load task ({error}).</p>
        </main>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-dvh">
        <Nav />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-sm text-foreground/70">Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <header className="space-y-2">
          <div className="text-xs font-mono text-foreground/60">{task.id}</div>
          <h1 className="text-2xl font-semibold tracking-tight">Task Details</h1>
          <div className="text-lg font-medium">{task.title}</div>
          <div className="text-sm text-foreground/80">{task.description}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/70">
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">{task.status}</span>
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">Buyer: {task.buyerName || task.buyerPhone || task.buyerId}</span>
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">Helper: {task.helperName || task.helperPhone || task.assignedHelperId || '-'}</span>
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">{task.urgency}</span>
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">{task.timeMinutes} min</span>
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">INR {(task.budgetPaise / 100).toFixed(0)}</span>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border border-foreground/10 p-5 space-y-3">
            <div>
              <div className="text-xs text-foreground/60">Location</div>
              <div className="text-sm">{task.lat}, {task.lng}</div>
            </div>
            <div>
              <div className="text-xs text-foreground/60">Address</div>
              <div className="text-sm">{task.addressText ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-foreground/60">Created</div>
              <div className="text-sm">{new Date(task.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-foreground/60">Arrival selfie</div>
              {task.arrivalSelfieUrl ? (
                <a className="text-sm underline" href={task.arrivalSelfieUrl} target="_blank" rel="noreferrer">Open</a>
              ) : (
                <div className="text-sm">-</div>
              )}
              {task.arrivalSelfieCapturedAt ? (
                <div className="text-xs text-foreground/70">
                  {new Date(task.arrivalSelfieCapturedAt).toLocaleString()} | {task.arrivalSelfieLat}, {task.arrivalSelfieLng}
                </div>
              ) : null}
            </div>
            <div>
              <div className="text-xs text-foreground/60">Completion selfie</div>
              {task.completionSelfieUrl ? (
                <a className="text-sm underline" href={task.completionSelfieUrl} target="_blank" rel="noreferrer">Open</a>
              ) : (
                <div className="text-sm">-</div>
              )}
              {task.completionSelfieCapturedAt ? (
                <div className="text-xs text-foreground/70">
                  {new Date(task.completionSelfieCapturedAt).toLocaleString()} | {task.completionSelfieLat}, {task.completionSelfieLng}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/10 p-5 space-y-4">
            <form onSubmit={updateStatus} className="space-y-2">
              <div className="text-xs font-medium text-foreground/70">Status</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-foreground/15 bg-transparent p-2 text-sm outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button className="w-full rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-background hover:opacity-90">
                Update status
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
