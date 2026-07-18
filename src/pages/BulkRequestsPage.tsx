import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { DataGrid } from '../components/DataGrid';

type PreviewRow = {
  lineNo: number;
  recommendedBudgetPaise: number;
  confidence: string;
  errors: string[];
};

type BatchSummary = {
  id: string;
  title: string;
  notes?: string | null;
  status: string;
  scheduledWindowStart?: string | null;
  scheduledWindowEnd?: string | null;
  total: number;
  requestedHelperCount?: number | null;
  addedWorkerCount?: number | null;
  auditNotes?: string | null;
  batchStartOtp?: string | null;
  batchCompletionOtp?: string | null;
  byTaskStatus: Record<string, number>;
  createdAt: string;
  buyerId?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  buyerEmail?: string | null;
  taskTemplateJson?: string | null;
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
  canRetry?: boolean;
  canCancel?: boolean;
  helperId?: string | null;
  helperName?: string | null;
};

type CsvLine = {
  title: string;
  description: string;
  urgency: string;
  timeMinutes: number;
  budgetPaise: number;
  lat: number;
  lng: number;
  addressText?: string;
  scheduledAt?: string;
  externalRef?: string;
  priority?: number;
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

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

function toNumber(value: string, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function csvToLines(content: string): CsvLine[] {
  const rows = content
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean);
  if (rows.length < 2) return [];
  const header = parseCsvLine(rows[0]).map((h) => h.toLowerCase());
  const idx = (name: string) => header.indexOf(name.toLowerCase());
  return rows.slice(1).map((row) => {
    const cells = parseCsvLine(row);
    const get = (name: string) => {
      const i = idx(name);
      return i >= 0 ? (cells[i] ?? '') : '';
    };
    return {
      title: get('title'),
      description: get('description'),
      urgency: (get('urgency') || 'NORMAL').toUpperCase(),
      timeMinutes: toNumber(get('timeMinutes'), 30),
      budgetPaise: toNumber(get('budgetPaise'), 0),
      lat: toNumber(get('lat')),
      lng: toNumber(get('lng')),
      addressText: get('addressText') || undefined,
      scheduledAt: get('scheduledAt') || undefined,
      externalRef: get('externalRef') || undefined,
      priority: toNumber(get('priority'), 3),
    };
  });
}

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
  const [actingItemId, setActingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [auditStatus, setAuditStatus] = useState('PENDING_AUDIT');
  const [auditRows, setAuditRows] = useState<BatchSummary[]>([]);
  const [auditBusyId, setAuditBusyId] = useState<string | null>(null);

  const parsedLines = useMemo(() => {
    try {
      const parsed = JSON.parse(linesText);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, [linesText]);

  const onCsvUpload = useCallback(async (file: File | null) => {
    if (!file) return;
    setError(null);
    setNotice(null);
    try {
      const raw = await file.text();
      const parsed = csvToLines(raw);
      if (!parsed.length) {
        setError('CSV has no data rows.');
        return;
      }
      setLinesText(JSON.stringify(parsed, null, 2));
      setNotice(`Loaded ${parsed.length} rows from CSV.`);
    } catch {
      setError('Could not parse CSV file.');
    }
  }, []);

  const runPreview = useCallback(async () => {
    setError(null);
    setNotice(null);
    if (!parsedLines) {
      setError('Lines JSON is invalid.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch<{ items: PreviewRow[] }>(
        '/api/v1/batches/preview',
        {
          method: 'POST',
          body: JSON.stringify({ items: parsedLines }),
        },
        token,
      );
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

  const loadAuditQueue = useCallback(async () => {
    const res = await apiFetch<BatchSummary[]>(
      `/api/v1/batches/mediator-audit?status=${encodeURIComponent(auditStatus)}`,
      undefined,
      token,
    );
    if (res.ok) setAuditRows(res.data ?? []);
    else setError(res.errorText);
  }, [auditStatus, token]);

  useEffect(() => {
    void loadAuditQueue();
  }, [loadAuditQueue]);

  const [selectedAuditRow, setSelectedAuditRow] = useState<BatchSummary | null>(null);
  const [modalItems, setModalItems] = useState<BatchItem[]>([]);
  const [modalItemsBusy, setModalItemsBusy] = useState(false);

  const actOnAudit = useCallback(
    async (row: BatchSummary, action: 'approve' | 'hold' | 'reject') => {
      const notes =
        action === 'hold'
          ? window.prompt('Reason / missing details for hold', row.auditNotes || 'Need customer clarification')
          : action === 'reject'
          ? window.prompt('Reason for rejection', row.auditNotes || 'Rejected by Customer Care')
          : window.prompt('Approval notes', row.auditNotes || 'Verified by Customer Care');
      if ((action === 'hold' || action === 'reject') && !notes) return;
      setAuditBusyId(row.id);
      setError(null);
      setNotice(null);
      try {
        const res = await apiFetch<BatchSummary>(
          `/api/v1/batches/${row.id}/mediator-audit/${action}`,
          {
            method: 'POST',
            body: JSON.stringify({ notes: notes || undefined }),
          },
          token,
        );
        if (!res.ok) {
          setError(res.errorText);
          return;
        }
        setNotice(
          action === 'approve'
            ? 'Bulk request approved and released to mediators.'
            : action === 'hold'
            ? 'Bulk request put on hold.'
            : 'Bulk request rejected.',
        );
        // Refresh details modal if it's currently open
        if (selectedAuditRow && selectedAuditRow.id === row.id) {
          setSelectedAuditRow(res.data ?? null);
        }
        await loadAuditQueue();
      } finally {
        setAuditBusyId(null);
      }
    },
    [loadAuditQueue, token, selectedAuditRow],
  );

  const openAuditDetails = useCallback(async (row: BatchSummary) => {
    setSelectedAuditRow(row);
    setModalItems([]);
    setModalItemsBusy(true);
    try {
      const res = await apiFetch<BatchItem[]>(`/api/v1/batches/${row.id}/items`, undefined, token);
      if (res.ok) {
        setModalItems(res.data ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setModalItemsBusy(false);
    }
  }, [token]);

  const loadBatch = useCallback(
    async (idRaw?: string) => {
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
    },
    [batchId, token],
  );

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
      const res = await apiFetch<{ batchId: string; createdCount: number; failedCount: number }>(
        '/api/v1/batches',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        token,
      );
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
  }, [buyerId, notes, parsedLines, title, token, loadBatch]);

  const actOnItem = useCallback(
    async (item: BatchItem, action: 'retry' | 'cancel') => {
      const id = batchId.trim();
      if (!id) return;
      setError(null);
      setNotice(null);
      setActingItemId(item.id);
      try {
        const body =
          action === 'cancel'
            ? JSON.stringify({ reason: 'Cancelled from bulk operations page' })
            : undefined;
        const res = await apiFetch<BatchItem>(
          `/api/v1/batches/${id}/items/${item.id}/${action}`,
          {
            method: 'POST',
            body,
          },
          token,
        );
        if (!res.ok) {
          setError(res.errorText);
          return;
        }
        setNotice(action === 'retry' ? `Retried line ${item.lineNo}.` : `Cancelled line ${item.lineNo}.`);
        await loadBatch(id);
      } finally {
        setActingItemId(null);
      }
    },
    [batchId, loadBatch, token],
  );

  const auditColumnDefs = useMemo<ColDef<BatchSummary>[]>(() => {
    return [
      {
        headerName: 'Created At',
        field: 'createdAt',
        valueFormatter: (params) => params.value ? new Date(params.value).toLocaleString() : '',
        sort: 'desc',
        width: 170,
      },
      {
        headerName: 'Scheduled At',
        valueGetter: (params) => {
          if (!params.data) return '';
          try {
            if (params.data.taskTemplateJson) {
              const t = JSON.parse(params.data.taskTemplateJson);
              if (t.scheduledAt) return new Date(t.scheduledAt).toLocaleString();
            }
          } catch {}
          return params.data.scheduledWindowStart ? new Date(params.data.scheduledWindowStart).toLocaleString() : 'Instant';
        },
        width: 170,
      },
      {
        headerName: 'Task Name',
        valueGetter: (params) => {
          if (!params.data) return '';
          try {
            if (params.data.taskTemplateJson) {
              const t = JSON.parse(params.data.taskTemplateJson);
              return t.title || params.data.title;
            }
          } catch {}
          return params.data.title;
        },
        flex: 1,
        minWidth: 150,
      },
      {
        headerName: 'Amount',
        valueGetter: (params) => {
          if (!params.data) return '';
          try {
            if (params.data.taskTemplateJson) {
              const t = JSON.parse(params.data.taskTemplateJson);
              return t.budgetPaise ? `₹${Math.round(t.budgetPaise / 100)}` : '-';
            }
          } catch {}
          return '-';
        },
        width: 100,
      },
      {
        headerName: 'Buyer',
        field: 'buyerName',
        valueFormatter: (params) => params.value || params.data?.buyerEmail || 'N/A',
        width: 150,
      },
      {
        headerName: 'Helpers',
        valueGetter: (params) => {
          if (!params.data) return '0/0';
          return `${params.data.addedWorkerCount || 0}/${params.data.requestedHelperCount || params.data.total || 0}`;
        },
        width: 110,
      },
      {
        headerName: 'Status',
        field: 'status',
        cellRenderer: (params: ICellRendererParams<BatchSummary>) => {
          const status = params.value as string;
          let color = 'bg-gray-100 text-gray-800';
          if (status === 'PENDING_AUDIT') color = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
          else if (status === 'ON_HOLD') color = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
          else if (status === 'PENDING_MEDIATOR') color = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
          else if (status === 'CANCELLED') color = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
          return (
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
              {status}
            </span>
          );
        },
        width: 130,
      },
      {
        headerName: 'Actions',
        cellRenderer: (params: ICellRendererParams<BatchSummary>) => {
          const row = params.data;
          if (!row) return null;
          const rowBusy = auditBusyId === row.id;
          return (
            <div className="flex gap-2 items-center h-full">
              <button
                onClick={() => void openAuditDetails(row)}
                className="rounded bg-indigo-600 px-2 py-0.5 text-xs text-white hover:bg-indigo-700"
              >
                Details
              </button>
              <button
                disabled={rowBusy || row.status === 'PENDING_MEDIATOR'}
                onClick={() => void actOnAudit(row, 'approve')}
                className="rounded border border-emerald-500/30 px-2 py-0.5 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                disabled={rowBusy || row.status === 'ON_HOLD'}
                onClick={() => void actOnAudit(row, 'hold')}
                className="rounded border border-amber-500/30 px-2 py-0.5 text-xs text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
              >
                Hold
              </button>
              <button
                disabled={rowBusy || row.status === 'CANCELLED'}
                onClick={() => void actOnAudit(row, 'reject')}
                className="rounded border border-red-500/30 px-2 py-0.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          );
        },
        width: 280,
      },
    ];
  }, [auditBusyId, actOnAudit, openAuditDetails]);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bulk Requests</h1>
          <p className="text-sm text-foreground/70">Preview, create, and track high-volume task batches safely.</p>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>
        ) : null}
        {notice ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>
        ) : null}

        <section className="space-y-4 rounded-2xl border border-foreground/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Customer Care Audit</h2>
              <p className="text-xs text-foreground/60">Review mediator-routed bulk requests before they are released to mediator apps.</p>
            </div>
            <div className="flex gap-2">
              <select
                className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-xs"
                value={auditStatus}
                onChange={(e) => setAuditStatus(e.target.value)}
              >
                <option value="PENDING_AUDIT">Pending Audit</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="PENDING_MEDIATOR">Released</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <button onClick={() => void loadAuditQueue()} className="rounded-lg border border-foreground/15 px-3 py-2 text-xs hover:bg-foreground/5">
                Refresh
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-foreground/10">
            <DataGrid<BatchSummary>
              rowData={auditRows}
              columnDefs={auditColumnDefs}
              height={400}
              quickFilter={true}
              pagination={true}
              pageSize={10}
            />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-foreground/10 p-5">
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
          <label className="inline-flex w-fit cursor-pointer rounded-lg border border-foreground/20 px-3 py-2 text-xs hover:bg-foreground/5">
            Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                void onCsvUpload(e.target.files?.[0] ?? null);
                e.currentTarget.value = '';
              }}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <a
              href="/templates/bulk-task-template.csv"
              download
              className="rounded-lg border border-foreground/20 px-3 py-2 hover:bg-foreground/5"
            >
              Download Sample CSV
            </a>
            <a
              href="/templates/bulk-task-template.xlsx"
              download
              className="rounded-lg border border-foreground/20 px-3 py-2 hover:bg-foreground/5"
            >
              Download Sample Excel
            </a>
          </div>
          <p className="text-xs text-foreground/60">
            CSV header: title,description,urgency,timeMinutes,budgetPaise,lat,lng,addressText,scheduledAt,externalRef,priority
          </p>
          <textarea
            className="min-h-[260px] w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm font-mono outline-none"
            value={linesText}
            onChange={(e) => setLinesText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={runPreview}
              className="rounded-lg border border-foreground/15 px-4 py-2 text-sm hover:bg-foreground/5"
            >
              Preview
            </button>
            <button
              disabled={busy}
              onClick={createBatch}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Create Batch
            </button>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-foreground/10 p-5">
          <h2 className="text-sm font-semibold">Batch Lookup</h2>
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[320px] rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="Batch UUID"
            />
            <button
              disabled={busy}
              onClick={() => loadBatch()}
              className="rounded-lg border border-foreground/15 px-4 py-2 text-sm hover:bg-foreground/5"
            >
              Load
            </button>
          </div>
          {summary ? (
            <div className="rounded-xl border border-foreground/10 p-4 text-sm">
              <div className="font-semibold">{summary.title}</div>
              <div className="text-foreground/70">Status: {summary.status} · Total lines: {summary.total}</div>
              <div className="text-foreground/60">Created: {new Date(summary.createdAt).toLocaleString()}</div>
              <div className="mt-2 text-xs text-foreground/70">
                {Object.entries(summary.byTaskStatus || {})
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' | ')}
              </div>
            </div>
          ) : null}
        </section>

        {preview.length > 0 ? (
          <section className="rounded-2xl border border-foreground/10 p-5">
            <h2 className="mb-3 text-sm font-semibold">Preview</h2>
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
            <h2 className="mb-3 text-sm font-semibold">Batch Items</h2>
            <div className="overflow-auto rounded-xl border border-foreground/10">
              <table className="w-full text-sm">
                <thead className="bg-foreground/5 text-foreground/70">
                  <tr>
                    <th className="px-3 py-2 text-left">Line</th>
                    <th className="px-3 py-2 text-left">Ref</th>
                    <th className="px-3 py-2 text-left">Task</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Error</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => {
                    const rowBusy = actingItemId === r.id;
                    return (
                      <tr key={r.id} className="border-t border-foreground/10">
                        <td className="px-3 py-2">{r.lineNo}</td>
                        <td className="px-3 py-2">{r.externalRef || '-'}</td>
                        <td className="px-3 py-2">
                          <div>{r.taskTitle || '-'}</div>
                          <div className="text-xs text-foreground/60">{r.taskId || '-'}</div>
                        </td>
                        <td className="px-3 py-2">{r.taskStatus || r.lineStatus}</td>
                        <td className="px-3 py-2">{r.errorMessage || '-'}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              disabled={rowBusy || !r.canRetry}
                              onClick={() => void actOnItem(r, 'retry')}
                              className="rounded-md border border-foreground/20 px-2 py-1 text-xs disabled:opacity-50"
                            >
                              Retry
                            </button>
                            <button
                              disabled={rowBusy || !r.canCancel}
                              onClick={() => void actOnItem(r, 'cancel')}
                              className="rounded-md border border-red-400/40 px-2 py-1 text-xs text-red-300 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
        {selectedAuditRow ? (() => {
          let template: any = {};
          try {
            if (selectedAuditRow.taskTemplateJson) {
              template = JSON.parse(selectedAuditRow.taskTemplateJson);
            }
          } catch {}
          const rowBusy = auditBusyId === selectedAuditRow.id;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-3xl rounded-2xl bg-background border border-foreground/10 p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-6">
                <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
                  <div>
                    <h2 className="text-lg font-bold">Mediator Request Details</h2>
                    <p className="text-xs text-foreground/60">Batch ID: {selectedAuditRow.id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedAuditRow(null)}
                    className="rounded-lg border border-foreground/15 p-2 text-sm hover:bg-foreground/5"
                  >
                    Close
                  </button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Task details */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold border-b border-foreground/5 pb-1">Task Specification</h3>
                    <div>
                      <span className="text-xs text-foreground/60 block">Task Name</span>
                      <span className="text-sm font-medium">{template.title || selectedAuditRow.title}</span>
                    </div>
                    <div>
                      <span className="text-xs text-foreground/60 block">Description</span>
                      <p className="text-sm">{template.description || 'No description provided'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-foreground/60 block">Amount / Budget</span>
                        <span className="text-sm font-bold text-emerald-400">
                          ₹{template.budgetPaise ? Math.round(template.budgetPaise / 100) : '-'} per helper
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-foreground/60 block">Expected Duration</span>
                        <span className="text-sm">{template.timeMinutes || '-'} minutes</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-foreground/60 block">Address</span>
                      <span className="text-sm">{template.addressText || 'N/A'}</span>
                    </div>
                    {template.landmark ? (
                      <div>
                        <span className="text-xs text-foreground/60 block">Landmark</span>
                        <span className="text-sm">{template.landmark}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Buyer and metadata details */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold border-b border-foreground/5 pb-1">Buyer & Routing Info</h3>
                    <div>
                      <span className="text-xs text-foreground/60 block">Buyer Name</span>
                      <span className="text-sm font-medium">{selectedAuditRow.buyerName || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-foreground/60 block">Buyer Phone</span>
                        <span className="text-sm">{selectedAuditRow.buyerPhone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-foreground/60 block">Buyer Email</span>
                        <span className="text-sm">{selectedAuditRow.buyerEmail || 'N/A'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-foreground/60 block">Buyer ID</span>
                      <span className="text-xs font-mono">{selectedAuditRow.buyerId || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-foreground/60 block">Date Created</span>
                        <span className="text-sm">{new Date(selectedAuditRow.createdAt).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-xs text-foreground/60 block">Scheduled At</span>
                        <span className="text-sm">
                          {template.scheduledAt ? new Date(template.scheduledAt).toLocaleString() : 'Instant'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-foreground/60 block">Audit Notes</span>
                      <span className="text-sm italic">{selectedAuditRow.auditNotes || 'No audit notes recorded'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t border-foreground/5 pt-2 mt-2">
                      <div>
                        <span className="text-xs text-foreground/60 block font-semibold text-blue-400">Batch Start OTP</span>
                        <span className="text-sm font-mono font-bold text-blue-400">{selectedAuditRow.batchStartOtp || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-foreground/60 block font-semibold text-blue-400">Batch Completion OTP</span>
                        <span className="text-sm font-mono font-bold text-blue-400">{selectedAuditRow.batchCompletionOtp || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Helpers Accepted */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold border-b border-foreground/5 pb-1">
                    Helpers Status ({selectedAuditRow.addedWorkerCount || 0}/{selectedAuditRow.requestedHelperCount || selectedAuditRow.total || 0} accepted)
                  </h3>
                  {modalItemsBusy ? (
                    <p className="text-xs text-foreground/60 animate-pulse">Loading accepted helpers...</p>
                  ) : modalItems.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-foreground/10 max-h-40">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-foreground/5 text-foreground/70">
                          <tr>
                            <th className="px-3 py-1.5">Line</th>
                            <th className="px-3 py-1.5">Helper ID</th>
                            <th className="px-3 py-1.5">Helper Name</th>
                            <th className="px-3 py-1.5">Task Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modalItems.map((item) => (
                            <tr key={item.id} className="border-t border-foreground/10">
                              <td className="px-3 py-1.5">{item.lineNo}</td>
                              <td className="px-3 py-1.5 font-mono">{item.helperId || 'Not Accepted Yet'}</td>
                              <td className="px-3 py-1.5">{item.helperName || '-'}</td>
                              <td className="px-3 py-1.5 font-semibold text-indigo-400">{item.taskStatus || item.lineStatus}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-foreground/60">No items or helpers found for this batch.</p>
                  )}
                </div>

                {/* Modal actions */}
                <div className="flex flex-wrap items-center justify-between border-t border-foreground/10 pt-4 gap-3">
                  <span className="text-sm">
                    Status: <strong className="text-indigo-400">{selectedAuditRow.status}</strong>
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={rowBusy || selectedAuditRow.status === 'PENDING_MEDIATOR'}
                      onClick={() => void actOnAudit(selectedAuditRow, 'approve')}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Approve Request
                    </button>
                    <button
                      disabled={rowBusy || selectedAuditRow.status === 'ON_HOLD'}
                      onClick={() => void actOnAudit(selectedAuditRow, 'hold')}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
                    >
                      Put on Hold
                    </button>
                    <button
                      disabled={rowBusy || selectedAuditRow.status === 'CANCELLED'}
                      onClick={() => void actOnAudit(selectedAuditRow, 'reject')}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      Reject Request
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })() : null}
      </section>
    </main>
  );
}
