import { useCallback, useMemo, useState } from 'react';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';

type PreviewRow = {
  lineNo: number;
  recommendedBudgetPaise: number;
  confidence: string;
  errors: string[];
};

type BatchSummary = {
  id: string;
  title: string;
  status: string;
  total: number;
  byTaskStatus: Record<string, number>;
  createdAt: string;
};

type BatchItem = {
  id: string;
  lineNo: number;
  externalRef?: string | null;
  priority: number;
  lineStatus: string;
  errorMessage?: string | null;
  taskId?: string | null;
  taskStatus?: string | null;
  taskTitle?: string | null;
};

const SAMPLE_LINES = JSON.stringify(
  [
    {
      title: 'AC repair',
      description: 'Split AC not cooling in hall',
      urgency: 'HIGH',
      timeMinutes: 90,
      budgetPaise: 120000,
      lat: 12.9716,
      lng: 77.5946,
      addressText: 'MG Road, Bengaluru',
      externalRef: 'SITE-001',
      priority: 2,
    },
    {
      title: 'Deep cleaning',
      description: 'Kitchen and bathroom deep cleaning',
      urgency: 'NORMAL',
      timeMinutes: 120,
      budgetPaise: 180000,
      lat: 12.975,
      lng: 77.605,
      addressText: 'Indiranagar, Bengaluru',
      externalRef: 'SITE-002',
      priority: 3,
    },
  ],
  null,
  2,
);

export default function BulkRequestsPage() {
  const { state } = useAuth();
  const token = state.accessToken;
  const [buyerId, setBuyerId] = useState('');
  const [title, setTitle] = useState('Morning Ops Batch');
  const [notes, setNotes] = useState('Priority sites for dispatch');
  const [linesText, setLinesText] = useState(SAMPLE_LINES);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [batchId, setBatchId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const parsedLines = useMemo(() => {
    try {
      const parsed = JSON.parse(linesText);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, [linesText]);

  const runPreview = useCallback(async () => {
    setError(null);
    setNotice(null);
    if (!parsedLines) {
      setError('Lines JSON is invalid.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch<{ items: PreviewRow[] }>('/api/v1/batches/preview', {
        method: 'POST',
        body: JSON.stringify({ items: parsedLines }),
      }, token);
      if (!res.ok) {
        setError(res.errorText);
        return;
      }
      setPreview(res.data.items ?? []);
      setNotice('Preview ready.');
    } finally {
      setBusy(false);
    }
  }, [parsedLines, token]);

  const createBatch = useCallback(async () => {
    setError(null);
    setNotice(null);
    if (!parsedLines) {
      setError('Lines JSON is invalid.');
      return;
    }
    if (!buyerId.trim()) {
      setError('Buyer ID is required.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        buyerId: buyerId.trim(),
        title: title.trim(),
        notes: notes.trim(),
        idempotencyKey: `bulk-${Date.now()}`,
        items: parsedLines,
      };
      const res = await apiFetch<{ batchId: string; createdCount: number; failedCount: number }>('/api/v1/batches', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, token);
      if (!res.ok) {
        setError(res.errorText);
        return;
      }
      const id = res.data.batchId;
      setBatchId(id);
      setNotice(`Batch created. Created ${res.data.createdCount}, failed ${res.data.failedCount}.`);
      await loadBatch(id);
    } finally {
      setBusy(false);
    }
  }, [buyerId, notes, parsedLines, title, token]);

  const loadBatch = useCallback(async (idRaw?: string) => {
    const id = (idRaw ?? batchId).trim();
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const [sumRes, itemsRes] = await Promise.all([
        apiFetch<BatchSummary>(`/api/v1/batches/${id}`, undefined, token),
        apiFetch<BatchItem[]>(`/api/v1/batches/${id}/items`, undefined, token),
      ]);
      if (!sumRes.ok) {
        setError(sumRes.errorText);
        return;
      }
      if (!itemsRes.ok) {
        setError(itemsRes.errorText);
        return;
      }
      setSummary(sumRes.data);
      setItems(itemsRes.data ?? []);
      setNotice('Batch loaded.');
    } finally {
      setBusy(false);
    }
  }, [batchId, token]);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bulk Requests</h1>
          <p className="text-sm text-foreground/70">Preview, create, and track high-volume task batches safely.</p>
        </div>

        {error ? <p className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">{error}</p> : null}
        {notice ? <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-300">{notice}</p> : null}

        <section className="rounded-2xl border border-foreground/10 p-5 space-y-4">
          <h2 className="text-sm font-semibold">Create Batch</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none"
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              placeholder="Buyer UUID"
            />
            <input
              className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Batch title"
            />
          </div>
          <input
            className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
          />
          <textarea
            className="min-h-[260px] w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm font-mono outline-none"
            value={linesText}
            onChange={(e) => setLinesText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={runPreview} className="rounded-lg border border-foreground/15 px-4 py-2 text-sm hover:bg-foreground/5">Preview</button>
            <button disabled={busy} onClick={createBatch} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Create Batch</button>
          </div>
        </section>

        <section className="rounded-2xl border border-foreground/10 p-5 space-y-3">
          <h2 className="text-sm font-semibold">Batch Lookup</h2>
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[320px] rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="Batch UUID"
            />
            <button disabled={busy} onClick={() => loadBatch()} className="rounded-lg border border-foreground/15 px-4 py-2 text-sm hover:bg-foreground/5">
              Load
            </button>
          </div>
          {summary ? (
            <div className="rounded-xl border border-foreground/10 p-4 text-sm">
              <div className="font-semibold">{summary.title}</div>
              <div className="text-foreground/70">Status: {summary.status} · Total lines: {summary.total}</div>
              <div className="text-foreground/60">Created: {new Date(summary.createdAt).toLocaleString()}</div>
              <div className="mt-2 text-xs text-foreground/70">
                {Object.entries(summary.byTaskStatus || {}).map(([k, v]) => `${k}: ${v}`).join(' | ')}
              </div>
            </div>
          ) : null}
        </section>

        {preview.length > 0 ? (
          <section className="rounded-2xl border border-foreground/10 p-5">
            <h2 className="text-sm font-semibold mb-3">Preview</h2>
            <div className="overflow-auto rounded-xl border border-foreground/10">
              <table className="w-full text-sm">
                <thead className="bg-foreground/5 text-foreground/70">
                  <tr>
                    <th className="px-3 py-2 text-left">Line</th>
                    <th className="px-3 py-2 text-left">Recommended</th>
                    <th className="px-3 py-2 text-left">Confidence</th>
                    <th className="px-3 py-2 text-left">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r) => (
                    <tr key={r.lineNo} className="border-t border-foreground/10">
                      <td className="px-3 py-2">{r.lineNo}</td>
                      <td className="px-3 py-2">₹{Math.round((r.recommendedBudgetPaise || 0) / 100)}</td>
                      <td className="px-3 py-2">{r.confidence}</td>
                      <td className="px-3 py-2">{r.errors?.length ? r.errors.join(', ') : 'OK'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {items.length > 0 ? (
          <section className="rounded-2xl border border-foreground/10 p-5">
            <h2 className="text-sm font-semibold mb-3">Batch Items</h2>
            <div className="overflow-auto rounded-xl border border-foreground/10">
              <table className="w-full text-sm">
                <thead className="bg-foreground/5 text-foreground/70">
                  <tr>
                    <th className="px-3 py-2 text-left">Line</th>
                    <th className="px-3 py-2 text-left">Ref</th>
                    <th className="px-3 py-2 text-left">Task</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-t border-foreground/10">
                      <td className="px-3 py-2">{r.lineNo}</td>
                      <td className="px-3 py-2">{r.externalRef || '-'}</td>
                      <td className="px-3 py-2">
                        <div>{r.taskTitle || '-'}</div>
                        <div className="text-xs text-foreground/60">{r.taskId || '-'}</div>
                      </td>
                      <td className="px-3 py-2">{r.taskStatus || r.lineStatus}</td>
                      <td className="px-3 py-2">{r.errorMessage || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

