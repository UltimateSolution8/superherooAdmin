import { useMemo, useState } from 'react';
import type { ColDef, GridApi, ICellRendererParams } from 'ag-grid-community';
import { DataGrid } from './DataGrid';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';
import {
  normalizeEmailOrNull,
  normalizeIndianPhoneOrNull,
  validateEmailOrNull,
  validateIndianPhoneOrNull,
} from '../lib/validation';

export type MediatorRow = {
  id: string;
  role: string;
  status: string;
  phone: string | null;
  email: string | null;
  displayName: string | null;
  createdAt: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function StatusRenderer(params: ICellRendererParams<MediatorRow>) {
  const status = params.value as string;
  const cls = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>;
}

function ActionRenderer(params: ICellRendererParams<MediatorRow> & { onEdit: (row: MediatorRow) => void }) {
  const { data, api, onEdit } = params;
  const { state } = useAuth();
  if (!data) return null;

  const del = async () => {
    if (!confirm(`Block mediator ${data.displayName || data.phone || data.id}?`)) return;
    const res = await apiFetch<void>(
      `/api/v1/admin/mediators/${data.id}/delete`,
      { method: 'POST' },
      state.accessToken,
    );
    if (res.ok) {
      api?.applyTransaction({ update: [{ ...data, status: 'BLOCKED', phone: null, email: null, displayName: 'Deleted user' }] });
      return;
    }
    alert(`Failed to block mediator (${res.status || 'network'})`);
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onEdit(data)} className="rounded-lg border border-foreground/15 px-3 py-1 text-xs hover:bg-foreground/5 transition-colors">Edit</button>
      <button onClick={del} className="rounded-lg border border-red-400/30 px-3 py-1 text-xs text-red-500 hover:bg-red-500/5 transition-colors">Block</button>
    </div>
  );
}

export function MediatorsGrid({ mediators }: { mediators: MediatorRow[] }) {
  const { state } = useAuth();
  const [gridApi, setGridApi] = useState<GridApi<MediatorRow> | null>(null);
  const [selectedForEdit, setSelectedForEdit] = useState<MediatorRow | null>(null);
  const [editForm, setEditForm] = useState({ displayName: '', phone: '', email: '', status: 'ACTIVE' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = (row: MediatorRow) => {
    setSelectedForEdit(row);
    setEditForm({
      displayName: row.displayName ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      status: row.status,
    });
    setEditError(null);
    setSavingEdit(false);
  };

  const saveEdit = async () => {
    if (!selectedForEdit) return;
    const phone = normalizeIndianPhoneOrNull(editForm.phone);
    const email = normalizeEmailOrNull(editForm.email);
    if (!validateIndianPhoneOrNull(phone)) {
      setEditError('Enter a valid Indian mobile number.');
      return;
    }
    if (!phone) {
      setEditError('Mediator phone number is required for OTP login.');
      return;
    }
    if (!validateEmailOrNull(email)) {
      setEditError('Enter a valid email address.');
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    const res = await apiFetch<MediatorRow>(
      `/api/v1/admin/mediators/${selectedForEdit.id}/update`,
      {
        method: 'POST',
        body: JSON.stringify({
          displayName: editForm.displayName || null,
          phone,
          email: email || null,
          status: editForm.status || selectedForEdit.status,
        }),
      },
      state.accessToken,
    );
    setSavingEdit(false);
    if (!res.ok) {
      setEditError(res.errorText || 'Failed to update mediator.');
      return;
    }
    gridApi?.applyTransaction({ update: [res.data] });
    setSelectedForEdit(null);
  };

  const handleCellValueChanged = async (event: any) => {
    const { data } = event;
    if (!data) return;

    const phone = normalizeIndianPhoneOrNull(data.phone);
    const email = normalizeEmailOrNull(data.email);
    if (!validateIndianPhoneOrNull(phone) || !phone) {
      alert('Mediator phone number is required and must be a valid Indian mobile number.');
      event.node.setDataValue(event.column.getColId(), event.oldValue);
      return;
    }
    if (data.email && !validateEmailOrNull(email)) {
      alert('Enter a valid email address.');
      event.node.setDataValue(event.column.getColId(), event.oldValue);
      return;
    }

    const res = await apiFetch<MediatorRow>(
      `/api/v1/admin/mediators/${data.id}/update`,
      {
        method: 'POST',
        body: JSON.stringify({
          displayName: data.displayName || null,
          phone,
          email: email || null,
          status: data.status || 'ACTIVE',
        }),
      },
      state.accessToken,
    );

    if (res.ok) {
      event.node.setData(res.data);
    } else {
      alert(`Failed to update: ${res.errorText || 'network error'}`);
      event.node.setDataValue(event.column.getColId(), event.oldValue);
    }
  };

  const runBulkStatusUpdate = async (status: 'ACTIVE' | 'BLOCKED') => {
    if (!gridApi) return;
    const selected = gridApi.getSelectedRows();
    if (!selected.length) {
      alert('Select at least one mediator.');
      return;
    }
    const userIds = Array.from(new Set(selected.map((row) => row.id).filter((id) => UUID_RE.test(id))));
    if (!userIds.length) {
      alert('Selected rows do not contain valid mediator IDs.');
      return;
    }
    const res = await apiFetch<{ requested: number; succeeded: number; failed: number }>(
      '/api/v1/admin/mediators/bulk-update',
      { method: 'POST', body: JSON.stringify({ userIds, status }) },
      state.accessToken,
    );
    if (!res.ok) {
      alert(`Bulk update failed (${res.status || 'network'})`);
      return;
    }
    const ids = new Set(userIds);
    gridApi.applyTransaction({ update: selected.filter((row) => ids.has(row.id)).map((row) => ({ ...row, status })) });
    alert(`Updated ${res.data.succeeded}/${res.data.requested} mediators to ${status}.`);
  };

  const columnDefs = useMemo<ColDef<MediatorRow>[]>(
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
        valueFormatter: (p) => p.value ? `${(p.value as string).substring(0, 8)}...` : '-',
      },
      { headerName: 'Display Name', field: 'displayName', flex: 1, editable: true },
      { headerName: 'Phone', field: 'phone', width: 140, editable: true },
      { headerName: 'Email', field: 'email', width: 190, editable: true },
      {
        headerName: 'Status',
        field: 'status',
        width: 120,
        cellRenderer: StatusRenderer,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['ACTIVE', 'BLOCKED'] },
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
        cellRendererParams: { onEdit: openEditModal },
        filter: false,
        sortable: false,
        width: 150,
        pinned: 'right',
      },
    ],
    [],
  );

  return (
    <div className="relative">
      <DataGrid<MediatorRow>
        rowData={mediators}
        columnDefs={columnDefs}
        title="Mediators"
        subtitle="Admin-created mediator accounts for coordinating large bulk bookings. Phone is required for OTP login."
        height={640}
        dateField="createdAt"
        exportFileName="superheroo-mediators.csv"
        onGridReady={(api) => setGridApi(api)}
        onCellValueChanged={handleCellValueChanged}
        extraContent={(
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void runBulkStatusUpdate('ACTIVE')} className="rounded-lg border border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors">
              Bulk Set ACTIVE
            </button>
            <button type="button" onClick={() => void runBulkStatusUpdate('BLOCKED')} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors">
              Bulk Set BLOCKED
            </button>
          </div>
        )}
      />

      {selectedForEdit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-foreground/10 space-y-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">Edit Mediator</h3>
              <p className="text-xs text-foreground/60">Phone is mandatory because the mediator app uses OTP login.</p>
            </div>
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-foreground/60 uppercase">Display Name</span>
                <input className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-foreground/60 uppercase">Phone</span>
                <input className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-foreground/60 uppercase">Email</span>
                <input className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-foreground/60 uppercase">Status</span>
                <select className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </label>
            </div>
            {editError ? <p className="rounded-lg bg-red-50 border border-red-200 p-2 text-sm text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">{editError}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setSelectedForEdit(null)} className="rounded-lg border border-foreground/15 px-4 py-2 text-sm font-medium hover:bg-foreground/5">Cancel</button>
              <button type="button" onClick={saveEdit} disabled={savingEdit} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                {savingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
