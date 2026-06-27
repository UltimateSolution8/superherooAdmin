import { useMemo, useState } from 'react';
import type { ColDef, ICellRendererParams, GridApi } from 'ag-grid-community';
import { DataGrid } from './DataGrid';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';

export type HelperRow = {
  id: string;
  role: string;
  status: string;
  phone: string | null;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  helperKycStatus: string | null;
  helperKycFullName: string | null;
  helperKycIdNumber: string | null;
  helperKycDocFrontUrl: string | null;
  helperKycDocBackUrl: string | null;
  helperKycSelfieUrl: string | null;
  helperKycSubmittedAt: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const KYC_COLORS: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function StatusRenderer(params: ICellRendererParams<HelperRow>) {
  const status = params.value as string;
  const cls = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>;
}

function KycRenderer(params: ICellRendererParams<HelperRow>) {
  const status = params.value as string;
  if (!status) return <span className="text-xs text-foreground/30">-</span>;
  const cls = KYC_COLORS[status] || 'bg-gray-100 text-gray-800';
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>;
}

function DocsRenderer(params: ICellRendererParams<HelperRow>) {
  const d = params.data;
  if (!d) return null;
  return (
    <div className="flex items-center gap-2">
      {d.helperKycDocFrontUrl ? (
        <a href={d.helperKycDocFrontUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs">Front</a>
      ) : <span className="text-foreground/30 text-xs">Front</span>}
      {d.helperKycDocBackUrl ? (
        <a href={d.helperKycDocBackUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs">Back</a>
      ) : <span className="text-foreground/30 text-xs">Back</span>}
      {d.helperKycSelfieUrl ? (
        <a href={d.helperKycSelfieUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs">Selfie</a>
      ) : <span className="text-foreground/30 text-xs">Selfie</span>}
    </div>
  );
}

function ActionRenderer(params: ICellRendererParams<HelperRow>) {
  const { data, api } = params;
  const { state } = useAuth();
  if (!data) return null;

  const reopenKyc = async () => {
    const res = await apiFetch<void>(
      `/api/v1/admin/helpers/${data.id}/reopen-kyc`,
      { method: 'POST' },
      state.accessToken,
    );
    if (res.ok) {
      api?.applyTransaction({ update: [{ ...data, helperKycStatus: 'PENDING' }] });
      return;
    }
    alert(`Failed to reopen KYC (${res.status || 'network'})`);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete helper ${data.displayName || data.id}?`)) return;
    const res = await apiFetch<void>(
      `/api/v1/admin/helpers/${data.id}/delete`,
      { method: 'POST' },
      state.accessToken,
    );
    if (res.ok) {
      api?.applyTransaction({ remove: [data] });
      return;
    }
    alert(`Failed to delete helper (${res.status || 'network'})`);
  };

  return (
    <div className="flex items-center gap-2">
      {(data.helperKycStatus === 'APPROVED' || data.helperKycStatus === 'REJECTED') ? (
        <button
          onClick={reopenKyc}
          className="rounded-lg border border-amber-400/30 px-3 py-1 text-xs text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
        >
          Reopen KYC
        </button>
      ) : null}
      <button
        onClick={handleDelete}
        className="rounded-lg border border-red-400/30 px-3 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
      >
        Delete
      </button>
    </div>
  );
}

export function HelpersGrid({ helpers }: { helpers: HelperRow[] }) {
  const { state } = useAuth();
  const [gridApi, setGridApi] = useState<GridApi<HelperRow> | null>(null);

  const runBulkStatusUpdate = async (status: 'ACTIVE' | 'BLOCKED') => {
    if (!gridApi) return;
    const selected = gridApi.getSelectedRows();
    if (!selected.length) {
      alert('Select at least one helper.');
      return;
    }
    const userIds = Array.from(
      new Set(
        selected
          .map((r) => (typeof r.id === 'string' ? r.id.trim() : ''))
          .filter((id) => UUID_RE.test(id)),
      ),
    );
    if (!userIds.length) {
      alert('Selected rows do not contain valid helper IDs.');
      return;
    }
    const res = await apiFetch<{ requested: number; succeeded: number; failed: number; failures: { id: string; message: string }[] }>(
      '/api/v1/admin/helpers/bulk-update',
      { method: 'POST', body: JSON.stringify({ userIds, status }) },
      state.accessToken,
    );
    if (!res.ok) {
      alert(`Bulk update failed (${res.status || 'network'})`);
      return;
    }
    const ids = new Set(userIds);
    const updated = selected.filter((row) => ids.has(row.id)).map((row) => ({ ...row, status }));
    gridApi.applyTransaction({ update: updated });
    const msg = `Updated ${res.data.succeeded}/${res.data.requested} helpers to ${status}.`;
    if (res.data.failed > 0) {
      alert(`${msg} Failed: ${res.data.failed}`);
    } else {
      alert(msg);
    }
  };

  const columnDefs = useMemo<ColDef<HelperRow>[]>(
    () => [
      {
        headerName: '',
        field: 'id',
        width: 54,
        minWidth: 54,
        maxWidth: 54,
        pinned: 'left',
        sortable: false,
        filter: false,
        resizable: false,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        headerCheckboxSelectionFilteredOnly: true,
      },
      {
        headerName: 'ID',
        field: 'id',
        width: 140,
        cellClass: 'font-mono text-xs',
        valueFormatter: (p) => p.value ? `${(p.value as string).substring(0, 8)}…` : '-',
      },
      { headerName: 'Display Name', field: 'displayName', flex: 1 },
      { headerName: 'Phone', field: 'phone', width: 140 },
      { headerName: 'Email', field: 'email', width: 180 },
      {
        headerName: 'Status',
        field: 'status',
        width: 120,
        cellRenderer: StatusRenderer,
      },
      {
        headerName: 'KYC',
        field: 'helperKycStatus',
        width: 120,
        cellRenderer: KycRenderer,
      },
      { headerName: 'KYC Name', field: 'helperKycFullName', width: 150 },
      {
        headerName: 'Documents',
        field: 'helperKycDocFrontUrl',
        cellRenderer: DocsRenderer,
        filter: false,
        sortable: false,
        width: 180,
      },
      {
        headerName: 'Created',
        field: 'createdAt',
        width: 160,
        valueFormatter: (p) => p.value ? new Date(p.value as string).toLocaleString() : '-',
        sort: 'desc',
      },
      {
        headerName: '',
        field: 'id',
        cellRenderer: ActionRenderer,
        filter: false,
        sortable: false,
        width: 90,
        pinned: 'right',
      },
    ],
    [],
  );

  return (
    <DataGrid<HelperRow>
      rowData={helpers}
      columnDefs={columnDefs}
      title="All Superherooos"
      subtitle="Manage superherooo accounts, contact details, and KYC status."
      height={640}
      dateField="createdAt"
      exportFileName="superherooo-list.xlsx"
      onGridReady={(api) => setGridApi(api)}
      extraContent={(
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void runBulkStatusUpdate('ACTIVE')}
            className="rounded-lg border border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10"
          >
            Bulk Set ACTIVE
          </button>
          <button
            type="button"
            onClick={() => void runBulkStatusUpdate('BLOCKED')}
            className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10"
          >
            Bulk Set BLOCKED
          </button>
        </div>
      )}
    />
  );
}
