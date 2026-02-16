import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import { Nav } from '@/components/Nav';
import { postReply, setStatus } from './serverActions';

type TicketMessage = {
  id: string;
  authorType: string;
  authorUserId: string | null;
  message: string;
  createdAt: string;
};

type TicketDetail = {
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
  messages: TicketMessage[];
};

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const cookieStore = await cookies();
  if (!cookieStore.get('him_admin_access')) {
    redirect('/login');
  }

  const resolvedParams = await params;
  const ticketId = resolvedParams.ticketId;
  const res = await apiFetch<TicketDetail>(`/api/v1/admin/support/tickets/${encodeURIComponent(ticketId)}`);
  if (!res.ok) {
    return (
      <div className="min-h-dvh">
        <Nav />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight">Ticket</h1>
          <p className="mt-2 text-sm text-foreground/70">Could not load ticket (HTTP {res.status}).</p>
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
          <h1 className="text-2xl font-semibold tracking-tight">{t.subject ?? '(no subject)'}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/70">
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">{t.category}</span>
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">{t.status}</span>
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">{t.priority}</span>
            <span className="text-foreground/50">|</span>
            <span>{t.createdByPhone ?? '-'}</span>
            <span className="text-foreground/50">({t.createdByRole})</span>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border border-foreground/10 p-5">
            <h2 className="text-sm font-semibold">Conversation</h2>
            <div className="mt-4 space-y-3">
              {t.messages.length === 0 ? (
                <div className="text-sm text-foreground/70">No messages.</div>
              ) : (
                t.messages.map((m) => (
                  <div key={m.id} className="rounded-xl border border-foreground/10 p-4">
                    <div className="flex items-center justify-between text-xs text-foreground/60">
                      <span>{m.authorType}</span>
                      <span>{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{m.message}</pre>
                  </div>
                ))
              )}
            </div>

            <form action={postReply} className="mt-6 space-y-2">
              <input type="hidden" name="ticketId" value={t.id} />
              <label className="text-xs font-medium text-foreground/70">Reply</label>
              <textarea
                name="message"
                className="w-full rounded-xl border border-foreground/15 bg-transparent p-3 text-sm outline-none focus:ring-2 focus:ring-foreground/30"
                rows={4}
                placeholder="Write a reply…"
              />
              <div className="flex justify-end">
                <button className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90">
                  Send
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-foreground/10 p-5 space-y-4">
            <div>
              <div className="text-xs text-foreground/60">Created</div>
              <div className="text-sm">{new Date(t.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-foreground/60">Last message</div>
              <div className="text-sm">{new Date(t.lastMessageAt).toLocaleString()}</div>
            </div>
            <form action={setStatus} className="space-y-2">
              <input type="hidden" name="ticketId" value={t.id} />
              <div className="text-xs font-medium text-foreground/70">Status</div>
              <select
                name="status"
                defaultValue={t.status}
                className="w-full rounded-xl border border-foreground/15 bg-transparent p-2 text-sm outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button className="w-full rounded-lg border border-foreground/15 px-3 py-2 text-xs hover:bg-foreground/5">
                Update status
              </button>
            </form>
            <div className="text-xs text-foreground/50">
              AI drafts: call <span className="font-mono">POST /api/v1/admin/support/tickets/&lt;id&gt;/ai-draft</span> after setting <span className="font-mono">LLM_PROVIDER</span> and <span className="font-mono">LLM_API_KEY</span> on the API service.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
