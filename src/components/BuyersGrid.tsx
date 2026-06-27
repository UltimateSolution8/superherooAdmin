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

function ActionRenderer(params: ICellRendererParams<BuyerRow> & { onEdit: (b: BuyerRow) => void }) {
  const { data, api, onEdit } = params;
  const { state } = useAuth();
  if (!data) return null;

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
      <button onClick={() => onEdit(data)} className="rounded-lg border border-foreground/15 px-3 py-1 text-xs hover:bg-foreground/5 transition-colors">Edit</button>
      <button onClick={del} className="rounded-lg border border-red-400/30 px-3 py-1 text-xs text-red-500 hover:bg-red-500/5 transition-colors">Delete</button>
    </div>
  );
}

export function BuyersGrid({ buyers }: { buyers: BuyerRow[] }) {
  const { state } = useAuth();
  const [gridApi, setGridApi] = useState<GridApi<BuyerRow> | null>(null);

  // Edit Modal states
  const [selectedBuyerForEdit, setSelectedBuyerForEdit] = useState<BuyerRow | null>(null);
  const [editForm, setEditForm] = useState({ displayName: '', phone: '', email: '', status: 'ACTIVE' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = (buyer: BuyerRow) => {
    setSelectedBuyerForEdit(buyer);
    setEditForm({
      displayName: buyer.displayName ?? '',
      phone: buyer.phone ?? '',
      email: buyer.email ?? '',
      status: buyer.status,
    });
    setEditError(null);
    setSavingEdit(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedBuyerForEdit) return;
    const phone = normalizeIndianPhoneOrNull(editForm.phone);
    const email = normalizeEmailOrNull(editForm.email);
    if (!validateIndianPhoneOrNull(phone)) {
      setEditError('Enter a valid Indian mobile number.');
      return;
    }
    if (!validateEmailOrNull(email)) {
      setEditError('Enter a valid email address.');
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    const res = await apiFetch<BuyerRow>(
      `/api/v1/admin/buyers/${selectedBuyerForEdit.id}/update`,
      {
        method: 'POST',
        body: JSON.stringify({
          displayName: editForm.displayName || null,
          phone: phone || null,
          email: email || null,
          status: editForm.status || selectedBuyerForEdit.status,
        }),
      },
      state.accessToken,
    );
    setSavingEdit(false);
    if (!res.ok) {
      setEditError(res.errorText || 'Failed to update user.');
      return;
    }
    gridApi?.applyTransaction({ update: [res.data] });
    setSelectedBuyerForEdit(null);
  };

  const handleCellValueChanged = async (event: any) => {
    const { data } = event;
    if (!data) return;

    const phone = normalizeIndianPhoneOrNull(data.phone);
    const email = normalizeEmailOrNull(data.email);

    if (data.phone && !validateIndianPhoneOrNull(phone)) {
      alert('Enter a valid Indian mobile number.');
      event.node.setDataValue('phone', event.oldValue);
      return;
    }
    if (data.email && !validateEmailOrNull(email)) {
      alert('Enter a valid email address.');
      event.node.setDataValue('email', event.oldValue);
      return;
    }

    const res = await apiFetch<BuyerRow>(
      `/api/v1/admin/buyers/${data.id}/update`,
      {
        method: 'POST',
        body: JSON.stringify({
          displayName: data.displayName || null,
          phone: phone || null,
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
      { headerName: 'Display Name', field: 'displayName', flex: 1, editable: true },
      { headerName: 'Phone', field: 'phone', width: 140, editable: true },
      { headerName: 'Email', field: 'email', width: 180, editable: true },
      {
        headerName: 'Status',
        field: 'status',
        width: 120,
        cellRenderer: StatusRenderer,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['ACTIVE', 'BLOCKED'],
        },
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
        cellRendererParams: {
          onEdit: openEditModal,
        },
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
      <DataGrid<BuyerRow>
        rowData={buyers}
        columnDefs={columnDefs}
        title="Citizens"
        subtitle="Manage citizen accounts and contact details. Double-click cells to edit inline."
        height={640}
        dateField="createdAt"
        exportFileName="superheroo-citizens.xlsx"
        onGridReady={(api) => setGridApi(api)}
        onCellValueChanged={handleCellValueChanged}
        extraContent={(
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void runBulkStatusUpdate('ACTIVE')}
              className="rounded-lg border border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              Bulk Set ACTIVE
            </button>
            <button
              type="button"
              onClick={() => void runBulkStatusUpdate('BLOCKED')}
              className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Bulk Set BLOCKED
            </button>
            <button
              type="button"
              onClick={() => void runBulkCsvAccessUpdate(true)}
              className="rounded-lg border border-sky-500/30 px-3 py-2 text-xs font-semibold text-sky-400 hover:bg-sky-500/10 transition-colors"
            >
              Enable CSV Bulk
            </button>
            <button
              type="button"
              onClick={() => void runBulkCsvAccessUpdate(false)}
              className="rounded-lg border border-slate-500/30 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-500/10 transition-colors"
            >
              Disable CSV Bulk
            </button>
          </div>
        )}
      />

      {/* Edit User Modal */}
      {selectedBuyerForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-foreground/10 space-y-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">Edit Citizen</h3>
              <p className="text-xs text-foreground/60">Update account details, phone number, and status.</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground/60 uppercase">Display Name</label>
                <input
                  className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground/60 uppercase">Phone</label>
                <input
                  className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground/60 uppercase">Email</label>
                <input
                  className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground/60 uppercase">Status</label>
                <select
                  className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>
            </div>
            {editError && <p className="text-xs text-red-500 font-semibold">{editError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedBuyerForEdit(null)}
                className="rounded-lg border border-foreground/15 px-4 py-2 text-sm font-semibold hover:bg-foreground/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
