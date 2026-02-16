import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import { Nav } from '@/components/Nav';

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
  createdAt: string;
};

const STATUSES = ['SEARCHING', 'ASSIGNED', 'ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED'] as const;

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const cookieStore = await cookies();
  if (!cookieStore.get('him_admin_access')) {
    redirect('/login');
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawStatus = resolvedSearchParams?.status;
  const status = (rawStatus || '').trim().toUpperCase();
  const selectedStatus = STATUSES.includes(status as (typeof STATUSES)[number]) ? status : '';
  const statusParam = selectedStatus ? `?status=${encodeURIComponent(selectedStatus)}` : '';

  const res = await apiFetch<Task[]>(`/api/v1/admin/tasks${statusParam}`);
  const tasks = res.ok ? res.data : [];

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
            <p className="text-sm text-foreground/70">Inspect and update task lifecycle for demos and support operations.</p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Link
              className={`rounded-full border px-3 py-1.5 ${!selectedStatus ? 'bg-foreground text-background' : 'border-foreground/15 hover:bg-foreground/5'}`}
              href="/tasks"
            >
              All
            </Link>
            {STATUSES.map((s) => (
              <Link
                key={s}
                className={`rounded-full border px-3 py-1.5 ${selectedStatus === s ? 'bg-foreground text-background' : 'border-foreground/15 hover:bg-foreground/5'}`}
                href={`/tasks?status=${encodeURIComponent(s)}`}
              >
                {s}
              </Link>
            ))}
          </div>
        </header>

        <div className="mt-6 overflow-hidden rounded-2xl border border-foreground/10">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-foreground/70">
              <tr>
                <th className="text-left font-medium px-4 py-3">Task</th>
                <th className="text-left font-medium px-4 py-3">Buyer</th>
                <th className="text-left font-medium px-4 py-3">Helper</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Created</th>
                <th className="text-right font-medium px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-foreground/70" colSpan={6}>
                    No tasks.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t.id} className="border-t border-foreground/10">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-foreground/70">{t.id}</div>
                      <div className="mt-1 font-semibold">{t.title}</div>
                      <div className="mt-1 line-clamp-2 max-w-xl">{t.description}</div>
                      <div className="mt-1 text-xs text-foreground/70">
                        {t.urgency} | {t.timeMinutes} min | INR {(t.budgetPaise / 100).toFixed(0)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{t.buyerId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.assignedHelperId ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs">{t.status}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground/70">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
                        href={`/tasks/${encodeURIComponent(t.id)}`}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
