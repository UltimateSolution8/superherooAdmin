import { useMemo } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { DataGrid } from './DataGrid';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';

export type PendingHelperRow = {
  helperId: string;
  displayName: string | null;
  phone: string | null;
  email: string | null;
  kycSubmittedAt: string | null;
  kycFullName: string | null;
  kycIdNumber: string | null;
  docFrontUrl: string | null;
  docBackUrl: string | null;
  selfieUrl: string | null;
};

function DocsRenderer(params: ICellRendererParams<PendingHelperRow>) {
  const d = params.data;
  if (!d) return null;
  return (
    <div className="flex items-center gap-2">
      {d.docFrontUrl ? (
        <a href={d.docFrontUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs">Front</a>
      ) : <span className="text-foreground/30 text-xs">Front</span>}
      {d.docBackUrl ? (
        <a href={d.docBackUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs">Back</a>
      ) : <span className="text-foreground/30 text-xs">Back</span>}
      {d.selfieUrl ? (
        <a href={d.selfieUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs">Selfie</a>
      ) : <span className="text-foreground/30 text-xs">Selfie</span>}
    </div>
  );
}

function ActionRenderer({ data }: ICellRendererParams<PendingHelperRow>) {
  const { state } = useAuth();
  if (!data) return null;

  const approve = async () => {
    const res = await apiFetch<void>(
      `/api/v1/admin/helpers/${data.helperId}/approve`,
      { method: 'POST' },
      state.accessToken,
    );
    if (res.ok) window.location.reload();
    else alert('Failed to approve');
  };

  const reject = async () => {
    const reason = prompt('Rejection reason?') || 'Incomplete KYC';
    const res = await apiFetch<void>(
      `/api/v1/admin/helpers/${data.helperId}/reject`,
      { method: 'POST', body: JSON.stringify({ reason }) },
      state.accessToken,
    );
    if (res.ok) window.location.reload();
    else alert('Failed to reject');
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={approve} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white">Approve</button>
      <button onClick={reject} className="rounded-lg border border-red-400/30 px-3 py-1 text-xs text-red-500">Reject</button>
    </div>
  );
}

export function PendingHelpersGrid({ helpers }: { helpers: PendingHelperRow[] }) {
  const columnDefs = useMemo<ColDef<PendingHelperRow>[]>(
    () => [
      {
        headerName: 'Helper ID',
        field: 'helperId',
        width: 140,
        cellClass: 'font-mono text-xs',
        valueFormatter: (p) => p.value ? `${(p.value as string).substring(0, 8)}…` : '-',
      },
      { headerName: 'Name', field: 'displayName', flex: 1 },
      { headerName: 'Phone', field: 'phone', width: 140 },
      { headerName: 'Email', field: 'email', width: 180 },
      { headerName: 'Full Name', field: 'kycFullName', width: 160 },
      { headerName: 'ID Number', field: 'kycIdNumber', width: 140 },
      {
        headerName: 'Submitted',
        field: 'kycSubmittedAt',
        width: 170,
        valueFormatter: (p) => p.value ? new Date(p.value as string).toLocaleString() : '-',
      },
      {
        headerName: 'Documents',
        field: 'docFrontUrl',
        cellRenderer: DocsRenderer,
        filter: false,
        sortable: false,
        width: 180,
      },
      {
        headerName: '',
        field: 'helperId',
        cellRenderer: ActionRenderer,
        filter: false,
        sortable: false,
        width: 140,
        pinned: 'right',
      },
    ],
    [],
  );

  return (
    <DataGrid<PendingHelperRow>
      rowData={helpers}
      columnDefs={columnDefs}
      title="Pending KYC"
      subtitle="Review helper documents and approve/reject KYC."
      height={640}
    />
  );
}
