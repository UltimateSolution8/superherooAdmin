import { useMemo, useState } from 'react';
import type { ColDef, ICellRendererParams, GridApi } from 'ag-grid-community';
import { DataGrid } from './DataGrid';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';

export type TaskRow = {
  id: string;
  buyerId: string;
  buyerPhone?: string | null;
  buyerName?: string | null;
  title: string;
  description: string;
  urgency: string;
  timeMinutes: number;
  budgetPaise: number;
  lat: number;
  lng: number;
  addressText: string | null;
  status: string;
  assignedHelperId: string | null;
  helperPhone?: string | null;
  helperName?: string | null;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  SEARCHING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  ASSIGNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ARRIVED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  STARTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function StatusRenderer(params: ICellRendererParams<TaskRow>) {
  const status = params.value as string;
  const cls = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function ActionRenderer(params: ICellRendererParams<TaskRow>) {
  const data = params.data;
  if (!data) return null;
  return (
    <Link
      to={`/tasks/${encodeURIComponent(data.id)}`}
      className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
    >
      Details
    </Link>
  );
}

export function TasksGrid({ tasks }: { tasks: TaskRow[] }) {
  const { state } = useAuth();
  const [gridApi, setGridApi] = useState<GridApi<TaskRow> | null>(null);
  const [nextStatus, setNextStatus] = useState('CANCELLED');

  const runBulkStatusUpdate = async () => {
    if (!gridApi) return;
    const selected = gridApi.getSelectedRows();
    if (!selected.length) {
      alert('Select at least one task.');
      return;
    }
    const taskIds = selected.map((r) => r.id);
    const res = await apiFetch<{ requested: number; succeeded: number; failed: number; failures: { id: string; message: string }[] }>(
      '/api/v1/admin/tasks/bulk-status',
      { method: 'POST', body: JSON.stringify({ taskIds, status: nextStatus }) },
      state.accessToken,
    );
    if (!res.ok) {
      alert(`Bulk update failed (${res.status || 'network'})`);
      return;
    }
    const failedIds = new Set((res.data.failures || []).map((f) => f.id));
    const updates = selected
      .filter((row) => !failedIds.has(row.id))
      .map((row) => ({ ...row, status: nextStatus }));
    if (updates.length > 0) {
      gridApi.applyTransaction({ update: updates });
    }
    const msg = `Updated ${res.data.succeeded}/${res.data.requested} tasks to ${nextStatus}.`;
    if (res.data.failed > 0) {
      alert(`${msg} Failed: ${res.data.failed}`);
    } else {
      alert(msg);
    }
  };

  const columnDefs = useMemo<ColDef<TaskRow>[]>(
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
        headerName: 'Task ID',
        field: 'id',
        width: 140,
        cellClass: 'font-mono text-xs',
        valueFormatter: (p) => p.value ? `${(p.value as string).substring(0, 8)}…` : '-',
      },
      { headerName: 'Title', field: 'title', flex: 1, minWidth: 180 },
      {
        headerName: 'Status',
        field: 'status',
        width: 130,
        cellRenderer: StatusRenderer,
      },
      { headerName: 'Urgency', field: 'urgency', width: 110 },
      {
        headerName: 'Budget (₹)',
        field: 'budgetPaise',
        width: 120,
        valueFormatter: (p) => p.value != null ? `₹${(Number(p.value) / 100).toFixed(0)}` : '-',
      },
      {
        headerName: 'Buyer',
        field: 'buyerName',
        width: 160,
        valueGetter: (p) => p.data?.buyerName || p.data?.buyerPhone || '-',
      },
      {
        headerName: 'Helper',
        field: 'helperName',
        width: 160,
        valueGetter: (p) => p.data?.helperName || p.data?.helperPhone || '-',
      },
      {
        headerName: 'Time (min)',
        field: 'timeMinutes',
        width: 110,
      },
      {
        headerName: 'Created',
        field: 'createdAt',
        width: 170,
        valueFormatter: (p) => p.value ? new Date(p.value as string).toLocaleString() : '-',
        sort: 'desc',
      },
      {
        headerName: '',
        field: 'id',
        cellRenderer: ActionRenderer,
        filter: false,
        sortable: false,
        width: 100,
        pinned: 'right',
      },
    ],
    [],
  );

  return (
    <DataGrid<TaskRow>
      rowData={tasks}
      columnDefs={columnDefs}
      title="Tasks"
      subtitle="View and manage all tasks across the platform."
      height={640}
      dateField="createdAt"
      exportFileName="superheroo-tasks.xlsx"
      onGridReady={(api) => setGridApi(api)}
      extraContent={(
        <div className="flex items-center gap-2">
          <select
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value)}
            className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-xs"
          >
            <option value="SEARCHING">SEARCHING</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="ARRIVED">ARRIVED</option>
            <option value="STARTED">STARTED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <button
            type="button"
            onClick={() => void runBulkStatusUpdate()}
            className="rounded-lg border border-indigo-500/30 px-3 py-2 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10"
          >
            Apply To Selected
          </button>
        </div>
      )}
    />
  );
}
