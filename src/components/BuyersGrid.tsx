import { useMemo, useState } from 'react';
import type { ColDef, ICellRendererParams, GridApi } from 'ag-grid-community';
import { DataGrid } from './DataGrid';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';
import {
  normalizeEmailOrNull,
  normalizeIndianPhoneOrNull,
  validateEmailOrNull,
  validateIndianPhoneOrNull,
} from '../lib/validation';

export type BuyerRow = {
  id: string;
  role: string;
  status: string;
  phone: string | null;
  email: string | null;
  displayName: string | null;
  bulkCsvEnabled?: boolean;
  createdAt: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function StatusRenderer(params: ICellRendererParams<BuyerRow>) {
  const status = params.value as string;
  const cls = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>;
}

function ActionRenderer(params: ICellRendererParams<BuyerRow>) {
  const { data, api } = params;
  const { state } = useAuth();
  if (!data) return null;

  const edit = async () => {
    const displayName = prompt('Display name', data.displayName ?? '') ?? data.displayName ?? '';
    const phoneInput = prompt('Phone', data.phone ?? '') ?? data.phone ?? '';
    const emailInput = prompt('Email', data.email ?? '') ?? data.email ?? '';
    const status = prompt('Status (ACTIVE/BLOCKED)', data.status) ?? data.status;
    const phone = normalizeIndianPhoneOrNull(phoneInput);
    const email = normalizeEmailOrNull(emailInput);
    if (!validateIndianPhoneOrNull(phone)) {
      alert('Enter a valid Indian mobile number.');
      return;
    }
    if (!validateEmailOrNull(email)) {
      alert('Enter a valid email address.');
      return;
    }
    const res = await apiFetch<BuyerRow>(
      `/api/v1/admin/buyers/${data.id}/update`,
      {
        method: 'POST',
        body: JSON.stringify({
          displayName: displayName || null,
          phone: phone || null,
          email: email || null,
          status: status || data.status,
        }),
      },
      state.accessToken,
    );
    if (res.ok) {
      api?.applyTransaction({ update: [res.data] });
      return;
    }
    alert(`Failed to update buyer (${res.status || 'network'})`);
  };

  const del = async () => {
    if (!confirm(`Delete buyer ${data.displayName || data.id}?`)) return;
    const res = await apiFetch<void>(
      `/api/v1/admin/buyers/${data.id}/delete`,
      { method: 'POST' },
      state.accessToken,
    );
    if (res.ok) {
      api?.applyTransaction({ remove: [data] });
      return;
    }
    alert(`Failed to delete buyer (${res.status || 'network'})`);
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={edit} className="rounded-lg border border-foreground/15 px-3 py-1 text-xs">Edit</button>
      <button onClick={del} className="rounded-lg border border-red-400/30 px-3 py-1 text-xs text-red-500">Delete</button>
    </div>
  );
}

export function BuyersGrid({ buyers }: { buyers: BuyerRow[] }) {
  const { state } = useAuth();
  const [gridApi, setGridApi] = useState<GridApi<BuyerRow> | null>(null);

  const runBulkStatusUpdate = async (status: 'ACTIVE' | 'BLOCKED') => {
    if (!gridApi) return;
    const selected = gridApi.getSelectedRows();
    if (!selected.length) {
      alert('Select at least one buyer.');
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
      alert('Selected rows do not contain valid buyer IDs.');
      return;
    }
    const res = await apiFetch<{ requested: number; succeeded: number; failed: number; failures: { id: string; message: string }[] }>(
      '/api/v1/admin/buyers/bulk-update',
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
    const msg = `Updated ${res.data.succeeded}/${res.data.requested} buyers to ${status}.`;
    if (res.data.failed > 0) {
      alert(`${msg} Failed: ${res.data.failed}`);
    } else {
      alert(msg);
    }
  };

  const runBulkCsvAccessUpdate = async (enabled: boolean) => {
    if (!gridApi) return;
    const selected = gridApi.getSelectedRows();
    if (!selected.length) {
      alert('Select at least one buyer.');
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
      alert('Selected rows do not contain valid buyer IDs.');
      return;
    }
    const res = await apiFetch<{ requested: number; succeeded: number; failed: number; failures: { id: string; message: string }[] }>(
      '/api/v1/admin/buyers/bulk-csv-access',
      { method: 'POST', body: JSON.stringify({ userIds, enabled }) },
      state.accessToken,
    );
    if (!res.ok) {
      alert(`CSV access update failed (${res.status || 'network'})`);
      return;
    }
    const ids = new Set(userIds);
    const updated = selected.filter((row) => ids.has(row.id)).map((row) => ({ ...row, bulkCsvEnabled: enabled }));
    gridApi.applyTransaction({ update: updated });
    const msg = `${enabled ? 'Enabled' : 'Disabled'} CSV bulk upload for ${res.data.succeeded}/${res.data.requested} buyers.`;
    if (res.data.failed > 0) {
      alert(`${msg} Failed: ${res.data.failed}`);
    } else {
      alert(msg);
    }
  };

  const columnDefs = useMemo<ColDef<BuyerRow>[]>(
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
        headerName: 'CSV Bulk',
        field: 'bulkCsvEnabled',
        width: 120,
        valueFormatter: (p) => (p.value ? 'ENABLED' : 'DISABLED'),
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
        width: 150,
        pinned: 'right',
      },
    ],
    [],
  );

  return (
    <DataGrid<BuyerRow>
      rowData={buyers}
      columnDefs={columnDefs}
      title="Buyers"
      subtitle="Manage buyer accounts and contact details."
      height={640}
      dateField="createdAt"
      exportFileName="superheroo-buyers.xlsx"
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
          <button
            type="button"
            onClick={() => void runBulkCsvAccessUpdate(true)}
            className="rounded-lg border border-sky-500/30 px-3 py-2 text-xs font-semibold text-sky-400 hover:bg-sky-500/10"
          >
            Enable CSV Bulk
          </button>
          <button
            type="button"
            onClick={() => void runBulkCsvAccessUpdate(false)}
            className="rounded-lg border border-slate-500/30 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-500/10"
          >
            Disable CSV Bulk
          </button>
        </div>
      )}
    />
  );
}
