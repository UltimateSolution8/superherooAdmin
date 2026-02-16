import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import { Nav } from '@/components/Nav';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get('him_admin_access')) {
    redirect('/login');
  }

  const pending = await apiFetch<Array<{ helperId: string }>>('/api/v1/admin/helpers/pending');
  const pendingCount = pending.ok ? pending.data.length : 0;

  return (
    <div className="min-h-dvh">
      <Nav />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex items-end justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-foreground/70">
              Quick view of onboarding, live demand, and support workflows.
            </p>
          </div>
          <div className="text-xs text-foreground/60">
            API: <span className="font-mono">{process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL}</span>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card title="Pending Helpers" value={String(pendingCount)} href="/helpers/pending" />
          <Card title="Tasks" value="Open" href="/tasks" />
        </section>

        <section className="mt-10 rounded-2xl border border-foreground/10 p-6">
          <h2 className="text-lg font-semibold">Next steps</h2>
          <ul className="mt-3 list-disc pl-5 text-sm text-foreground/70 space-y-2">
            <li>Approve pending helpers so they can go online and receive tasks.</li>
            <li>Monitor task lifecycle for any stuck/failed assignments.</li>
            <li>Integrate SMS provider to disable dev OTP return in production.</li>
          </ul>
          <div className="mt-5 flex gap-3">
            <Link className="rounded-lg border border-foreground/15 px-4 py-2 text-sm hover:bg-foreground/5" href="/helpers/pending">
              Review Helpers
            </Link>
            <Link className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90" href="/tasks">
              Review Tasks
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Card({ title, value, href }: { title: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-foreground/10 p-6 hover:bg-foreground/5 transition-colors"
    >
      <div className="text-sm text-foreground/70">{title}</div>
      <div className="mt-2 text-4xl font-semibold tracking-tight">{value}</div>
      <div className="mt-3 text-sm text-foreground/70">Open</div>
    </Link>
  );
}
