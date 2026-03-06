import { useMemo, useState } from 'react';
import type { ColDef, GridApi, ICellRendererParams } from 'ag-grid-community';
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

  const handleBulkUpload = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (rows.length < 2) return;
    const header = rows[0].split(',').map((h) => h.trim().toLowerCase());
    const idxDisplay = header.indexOf('displayname');
    const idxEmail = header.indexOf('email');
    const idxPhone = header.indexOf('phone');
    const payloads = rows.slice(1).map((line) => line.split(',').map((v) => v.trim()));
    for (const cols of payloads) {
      await apiFetch(
        '/api/v1/admin/helpers',
        {
          method: 'POST',
          body: JSON.stringify({
            displayName: idxDisplay >= 0 ? cols[idxDisplay] : null,
            email: idxEmail >= 0 ? cols[idxEmail] : null,
            phone: idxPhone >= 0 ? cols[idxPhone] : null,
            status: 'ACTIVE',
          }),
        },
        state.accessToken,
      );
    }
    gridApi?.refreshClientSideRowModel('filter');
  };

  const columnDefs = useMemo<ColDef<HelperRow>[]>(
    () => [
      {
        headerName: 'ID',
        field: 'id',
        width: 140,
        cellClass: 'font-mono text-xs',
        valueFormatter: (p) => p.value ? `${(p.value as string).substring(0, 8)}…` : '-',
        checkboxSelection: true,
        headerCheckboxSelection: true,
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
      title="Superheroes"
      subtitle="Manage superhero accounts, contact details, and KYC status."
      height={640}
      dateField="createdAt"
      exportFileName="superheroo-helpers.xlsx"
      onGridReady={(api) => setGridApi(api)}
      extraContent={(
        <label className="inline-flex items-center gap-2 rounded-lg border border-foreground/15 bg-foreground/5 px-3 py-2 text-xs font-semibold cursor-pointer">
          Bulk Upload CSV
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => handleBulkUpload(e.target.files?.[0] || null)}
          />
        </label>
      )}
    />
  );
}
