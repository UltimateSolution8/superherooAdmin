import { useMemo, useState } from 'react';
import type { ColDef, GridApi, ICellRendererParams } from 'ag-grid-community';
import { DataGrid } from './DataGrid';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';

export type BuyerRow = {
  id: string;
  role: string;
  status: string;
  phone: string | null;
  email: string | null;
  displayName: string | null;
  createdAt: string;
};

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
    const phone = prompt('Phone', data.phone ?? '') ?? data.phone ?? '';
    const email = prompt('Email', data.email ?? '') ?? data.email ?? '';
    const status = prompt('Status (ACTIVE/BLOCKED)', data.status) ?? data.status;
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
        '/api/v1/admin/buyers',
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

  const columnDefs = useMemo<ColDef<BuyerRow>[]>(
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
      title="Task Givers"
      subtitle="Manage task giver accounts and contact details."
      height={640}
      dateField="createdAt"
      exportFileName="superheroo-buyers.xlsx"
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
