import { useMemo, useState } from 'react';
import type { ColDef, ICellRendererParams, GridApi } from 'ag-grid-community';
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
  kycDocFrontUrl?: string | null;
  kycDocBackUrl?: string | null;
  kycSelfieUrl?: string | null;
  docFrontUrl: string | null;
  docBackUrl: string | null;
  selfieUrl: string | null;
  payoutAccountHolderName?: string | null;
  payoutBankName?: string | null;
  payoutBankAccountLast4?: string | null;
  payoutIfscCode?: string | null;
  payoutUpiIdMasked?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function DocsRenderer(params: ICellRendererParams<PendingHelperRow>) {
  const d = params.data;
  if (!d) return null;
  const frontUrl = d.docFrontUrl || d.kycDocFrontUrl;
  const backUrl = d.docBackUrl || d.kycDocBackUrl;
  const selfieUrl = d.selfieUrl || d.kycSelfieUrl;
  return (
    <div className="flex items-center gap-2">
      {frontUrl ? (
        <a href={frontUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs">Front</a>
      ) : <span className="text-foreground/30 text-xs">Front</span>}
      {backUrl ? (
        <a href={backUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs">Back</a>
      ) : <span className="text-foreground/30 text-xs">Back</span>}
      {selfieUrl ? (
        <a href={selfieUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs">Selfie</a>
      ) : <span className="text-foreground/30 text-xs">Selfie</span>}
    </div>
  );
}

function ActionRenderer(params: ICellRendererParams<PendingHelperRow>) {
  const { data, api } = params;
  const { state } = useAuth();
  if (!data) return null;

  const approve = async () => {
    const res = await apiFetch<void>(
      `/api/v1/admin/helpers/${data.helperId}/approve`,
      { method: 'POST' },
      state.accessToken,
    );
    if (res.ok) {
      api?.applyTransaction({ remove: [data] });
      return;
    }
    alert(`Failed to approve (${res.status || 'network'})`);
  };

  const reject = async () => {
    const reason = prompt('Rejection reason?') || 'Incomplete KYC';
    const res = await apiFetch<void>(
      `/api/v1/admin/helpers/${data.helperId}/reject`,
      { method: 'POST', body: JSON.stringify({ reason }) },
      state.accessToken,
    );
    if (res.ok) {
      api?.applyTransaction({ remove: [data] });
      return;
    }
    alert(`Failed to reject (${res.status || 'network'})`);
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={approve} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white">Approve</button>
      <button onClick={reject} className="rounded-lg border border-red-400/30 px-3 py-1 text-xs text-red-500">Reject</button>
    </div>
  );
}

export function PendingHelpersGrid({ helpers }: { helpers: PendingHelperRow[] }) {
  const { state } = useAuth();
  const [gridApi, setGridApi] = useState<GridApi<PendingHelperRow> | null>(null);

  const runBulkAction = async (action: 'APPROVE' | 'REJECT') => {
    if (!gridApi) return;
    const selected = gridApi.getSelectedRows();
    if (!selected.length) {
      alert('Select at least one helper.');
      return;
    }
    const helperIds = Array.from(
      new Set(
        selected
          .map((r) => (typeof r.helperId === 'string' ? r.helperId.trim() : ''))
          .filter((id) => UUID_RE.test(id)),
      ),
    );
    if (!helperIds.length) {
      alert('Selected rows do not contain valid helper IDs.');
      return;
    }
    const reason = action === 'REJECT' ? (prompt('Rejection reason for selected helpers') || 'Rejected in bulk action') : undefined;
    const res = await apiFetch<{ requested: number; succeeded: number; failed: number; failures: { id: string; message: string }[] }>(
      '/api/v1/admin/helpers/pending/bulk-action',
      {
        method: 'POST',
        body: JSON.stringify({
          helperIds,
          action,
          reason,
        }),
      },
      state.accessToken,
    );
    if (!res.ok) {
      alert(`Bulk action failed (${res.status || 'network'})`);
      return;
    }
    const failedIds = new Set((res.data.failures || []).map((f) => f.id));
    const ids = new Set(helperIds);
    const toRemove = selected.filter((row) => ids.has(row.helperId) && !failedIds.has(row.helperId));
    if (toRemove.length > 0) {
      gridApi.applyTransaction({ remove: toRemove });
    }
    const msg = `${action} completed for ${res.data.succeeded}/${res.data.requested} helpers.`;
    if (res.data.failed > 0) {
      alert(`${msg} Failed: ${res.data.failed}`);
    } else {
      alert(msg);
    }
  };

  const columnDefs = useMemo<ColDef<PendingHelperRow>[]>(
    () => [
      {
        headerName: '',
        field: 'helperId',
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
      { headerName: 'Account Holder', field: 'payoutAccountHolderName', width: 170 },
      {
        headerName: 'Bank / IFSC',
        field: 'payoutBankName',
        width: 220,
        valueGetter: (p) => {
          const bank = p.data?.payoutBankName || '-';
          const ifsc = p.data?.payoutIfscCode;
          return ifsc ? `${bank} / ${ifsc}` : bank;
        },
      },
      {
        headerName: 'Account',
        field: 'payoutBankAccountLast4',
        width: 120,
        valueFormatter: (p) => p.value ? `Ending ${p.value}` : '-',
      },
      { headerName: 'UPI', field: 'payoutUpiIdMasked', width: 150 },
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
      subtitle="Review superherooo documents and approve/reject KYC."
      height={640}
      dateField="kycSubmittedAt"
      exportFileName="superheroo-pending-kyc.csv"
      onGridReady={(api) => setGridApi(api)}
      extraContent={(
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void runBulkAction('APPROVE')}
            className="rounded-lg border border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10"
          >
            Bulk Approve
          </button>
          <button
            type="button"
            onClick={() => void runBulkAction('REJECT')}
            className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10"
          >
            Bulk Reject
          </button>
        </div>
      )}
    />
  );
}
