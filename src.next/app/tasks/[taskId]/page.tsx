import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import { Nav } from '@/components/Nav';
import { setTaskStatus } from './serverActions';

type Task = {
  id: string;
  buyerId: string;
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

const STATUSES = ['SEARCHING', 'ASSIGNED', 'ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED'] as const;

export default async function TaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const cookieStore = await cookies();
  if (!cookieStore.get('him_admin_access')) {
    redirect('/login');
  }

  const resolvedParams = await params;

  const taskId = resolvedParams.taskId;
  const res = await apiFetch<Task>(`/api/v1/admin/tasks/${encodeURIComponent(taskId)}`);

  if (!res.ok) {
    return (
      <div className="min-h-dvh">
        <Nav />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight">Task</h1>
          <p className="mt-2 text-sm text-foreground/70">Could not load task (HTTP {res.status}).</p>
        </main>
      </div>
    );
  }

  const t = res.data;

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <header className="space-y-2">
          <div className="text-xs font-mono text-foreground/60">{t.id}</div>
          <h1 className="text-2xl font-semibold tracking-tight">Task Details</h1>
          <div className="text-lg font-medium">{t.title}</div>
          <div className="text-sm text-foreground/80">{t.description}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/70">
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">{t.status}</span>
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">Buyer: {t.buyerId}</span>
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">Helper: {t.assignedHelperId ?? '-'}</span>
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">{t.urgency}</span>
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">{t.timeMinutes} min</span>
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">INR {(t.budgetPaise / 100).toFixed(0)}</span>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border border-foreground/10 p-5 space-y-3">
            <div>
              <div className="text-xs text-foreground/60">Location</div>
              <div className="text-sm">{t.lat}, {t.lng}</div>
            </div>
            <div>
              <div className="text-xs text-foreground/60">Address</div>
              <div className="text-sm">{t.addressText ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-foreground/60">Created</div>
              <div className="text-sm">{new Date(t.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-foreground/60">Arrival selfie</div>
              {t.arrivalSelfieUrl ? (
                <a className="text-sm underline" href={t.arrivalSelfieUrl} target="_blank" rel="noreferrer">Open</a>
              ) : (
                <div className="text-sm">-</div>
              )}
              {t.arrivalSelfieCapturedAt ? (
                <div className="text-xs text-foreground/70">
                  {new Date(t.arrivalSelfieCapturedAt).toLocaleString()} | {t.arrivalSelfieLat}, {t.arrivalSelfieLng}
                </div>
              ) : null}
            </div>
            <div>
              <div className="text-xs text-foreground/60">Completion selfie</div>
              {t.completionSelfieUrl ? (
                <a className="text-sm underline" href={t.completionSelfieUrl} target="_blank" rel="noreferrer">Open</a>
              ) : (
                <div className="text-sm">-</div>
              )}
              {t.completionSelfieCapturedAt ? (
                <div className="text-xs text-foreground/70">
                  {new Date(t.completionSelfieCapturedAt).toLocaleString()} | {t.completionSelfieLat}, {t.completionSelfieLng}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/10 p-5 space-y-4">
            <form action={setTaskStatus} className="space-y-2">
              <input type="hidden" name="taskId" value={t.id} />
              <div className="text-xs font-medium text-foreground/70">Status</div>
              <select
                name="status"
                defaultValue={t.status}
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
