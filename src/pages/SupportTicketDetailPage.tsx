import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

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

export default function SupportTicketDetailPage() {
  const { ticketId } = useParams();
  const { state } = useAuth();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!ticketId) return;
      const res = await apiFetch<TicketDetail>(`/api/v1/admin/support/tickets/${encodeURIComponent(ticketId)}`, undefined, state.accessToken);
      if (!active) return;
      if (res.ok) {
        setTicket(res.data);
        setStatus(res.data.status);
      } else {
        setError(res.errorText);
      }
    })();
    return () => {
      active = false;
    };
  }, [ticketId, state.accessToken]);

  const handleStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId) return;
    const res = await apiFetch<void>(
      `/api/v1/admin/support/tickets/${encodeURIComponent(ticketId)}/status`,
      { method: 'POST', body: JSON.stringify({ status }) },
      state.accessToken,
    );
    if (!res.ok) {
      alert('Failed to update status');
      return;
    }
    if (ticket) setTicket({ ...ticket, status });
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId || !message.trim()) return;
    const res = await apiFetch<TicketMessage>(
      `/api/v1/admin/support/tickets/${encodeURIComponent(ticketId)}/messages`,
      { method: 'POST', body: JSON.stringify({ message }) },
      state.accessToken,
    );
    if (!res.ok) {
      alert('Failed to send message');
      return;
    }
    if (ticket) setTicket({ ...ticket, messages: [...ticket.messages, res.data] });
    setMessage('');
  };

  if (error) {
    return (
      <div className="min-h-dvh">
        <Nav />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight">Ticket</h1>
          <p className="mt-2 text-sm text-foreground/70">Could not load ticket ({error}).</p>
        </main>
      </div>
    );
  }

  if (!ticket) {
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
          <div className="text-xs font-mono text-foreground/60">{ticket.id}</div>
          <h1 className="text-2xl font-semibold tracking-tight">{ticket.subject ?? '(no subject)'}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/70">
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">{ticket.category}</span>
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">{ticket.status}</span>
            <span className="rounded-full border border-foreground/15 px-2 py-0.5">{ticket.priority}</span>
            <span className="text-foreground/50">|</span>
            <span>{ticket.createdByPhone ?? '-'}</span>
            <span className="text-foreground/50">({ticket.createdByRole})</span>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border border-foreground/10 p-5">
            <h2 className="text-sm font-semibold">Conversation</h2>
            <div className="mt-4 space-y-3">
              {ticket.messages.length === 0 ? (
                <div className="text-sm text-foreground/70">No messages.</div>
              ) : (
                ticket.messages.map((m) => (
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

            <form onSubmit={handleReply} className="mt-6 space-y-2">
              <label className="text-xs font-medium text-foreground/70">Reply</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
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
              <div className="text-sm">{new Date(ticket.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-foreground/60">Last message</div>
              <div className="text-sm">{new Date(ticket.lastMessageAt).toLocaleString()}</div>
            </div>
            <form onSubmit={handleStatus} className="space-y-2">
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
