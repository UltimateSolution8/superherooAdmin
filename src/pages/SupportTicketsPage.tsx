import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';

type Ticket = {
  id: string;
  createdByUserId: string;
  createdByRole: string;
  createdByPhone: string | null;
  category: string;
  subject: string | null;
  status: string;
  priority: string;
  relatedTaskId: string | null;
  assigneeUserId: string | null;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

export default function SupportTicketsPage() {
  const { state } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [params] = useSearchParams();
  const status = (params.get('status') || '').toUpperCase();
  const selectedStatus = STATUSES.includes(status as (typeof STATUSES)[number]) ? status : '';

  const query = useMemo(() => (selectedStatus ? `?status=${encodeURIComponent(selectedStatus)}` : ''), [selectedStatus]);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await apiFetch<Ticket[]>(`/api/v1/admin/support/tickets${query}`, undefined, state.accessToken);
      if (!active) return;
      if (res.ok && Array.isArray(res.data)) setTickets(res.data);
      else setError(res.errorText);
    })();
    return () => {
      active = false;
    };
  }, [query, state.accessToken]);

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Support Tickets</h1>
            <p className="text-sm text-foreground/70">Human queue. AI drafts are available via API when configured.</p>
            {error ? <div className="text-xs text-red-300">{error}</div> : null}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Link
              className={`rounded-full border px-3 py-1.5 ${!selectedStatus ? 'bg-foreground text-background' : 'border-foreground/15 hover:bg-foreground/5'}`}
              to="/support/tickets"
            >
              All
            </Link>
            {STATUSES.map((s) => (
              <Link
                key={s}
                className={`rounded-full border px-3 py-1.5 ${selectedStatus === s ? 'bg-foreground text-background' : 'border-foreground/15 hover:bg-foreground/5'}`}
                to={`/support/tickets?status=${encodeURIComponent(s)}`}
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
                <th className="text-left font-medium px-4 py-3">Ticket</th>
                <th className="text-left font-medium px-4 py-3">Category</th>
                <th className="text-left font-medium px-4 py-3">User</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Last Msg</th>
                <th className="text-right font-medium px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-foreground/70" colSpan={6}>
                    No tickets.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="border-t border-foreground/10">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-foreground/70">{t.id}</div>
                      <div className="mt-1 font-medium">{t.subject ?? '(no subject)'}</div>
                    </td>
                    <td className="px-4 py-3">{t.category}</td>
                    <td className="px-4 py-3">
                      <div className="text-foreground/80">{t.createdByPhone ?? '-'}</div>
                      <div className="text-xs text-foreground/60">{t.createdByRole}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs">{t.status}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground/70">{new Date(t.lastMessageAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
                        to={`/support/tickets/${encodeURIComponent(t.id)}`}
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
