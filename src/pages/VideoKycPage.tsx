import { useEffect, useMemo, useState } from 'react';
import { Nav } from '../components/Nav';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { ColDef, GridApi, ICellRendererParams } from 'ag-grid-community';
import { DataGrid } from '../components/DataGrid';

type VideoKycRow = {
  id: string;
  helperId: string;
  helperName: string | null;
  status: string;
  createdAt: string;
  videoUrl: string | null;
  docFrontUrl: string | null;
  docBackUrl: string | null;
  selfieUrl?: string | null;
  liveRoomId?: string | null;
  liveRecordingUrl?: string | null;
  recommendation: string | null;
  faceMatchScore: number | null;
  livenessScore: number | null;
  reviewerNotes: string | null;
};

function ActionRenderer(params: ICellRendererParams<VideoKycRow>) {
  const { data, api } = params;
  const { state } = useAuth();
  if (!data) return null;

  const sendAction = async (action: 'APPROVE' | 'REJECT') => {
    const remarks = prompt(`Remarks for ${action.toLowerCase()}`, '') ?? '';
    const res = await apiFetch<void>(
      `/api/v1/admin/video-kyc/${data.id}/action`,
      {
        method: 'POST',
        body: JSON.stringify({ action, remarks: remarks || `${action} via admin` }),
      },
      state.accessToken,
    );
    if (!res.ok) {
      alert(`Failed to ${action.toLowerCase()} (${res.status || 'network'})`);
      return;
    }
    api?.applyTransaction({ update: [{ ...data, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' }] });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => sendAction('APPROVE')}
        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
      >
        Approve
      </button>
      <button
        onClick={() => sendAction('REJECT')}
        className="rounded-lg border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-950/30"
      >
        Reject
      </button>
    </div>
  );
}

export default function VideoKycPage() {
  const { state } = useAuth();
  const [rows, setRows] = useState<VideoKycRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gridApi, setGridApi] = useState<GridApi<VideoKycRow> | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await apiFetch<any>('/api/v1/admin/video-kyc', undefined, state.accessToken);
      if (!active) return;
      if (res.ok) {
        const payload = res.data;
        const items = Array.isArray(payload?.content) ? payload.content : Array.isArray(payload) ? payload : [];
        setRows(items);
      } else {
        setError(res.errorText);
      }
    })();
    return () => {
      active = false;
    };
  }, [state.accessToken]);

  const columnDefs = useMemo<ColDef<VideoKycRow>[]>(
    () => [
      { headerName: 'Superherooo', field: 'helperName', flex: 1, minWidth: 140 },
      { headerName: 'Status', field: 'status', width: 120 },
      {
        headerName: 'Video',
        field: 'videoUrl',
        width: 120,
        cellRenderer: (p: ICellRendererParams<VideoKycRow>) =>
          (p.data?.liveRecordingUrl || p.value)
            ? <a className="text-indigo-400 underline" href={String(p.data?.liveRecordingUrl || p.value)} target="_blank">View</a>
            : '-',
      },
      {
        headerName: 'Selfie',
        field: 'selfieUrl',
        width: 120,
        cellRenderer: (p: ICellRendererParams<VideoKycRow>) =>
          p.value ? <a className="text-indigo-400 underline" href={String(p.value)} target="_blank">View</a> : '-',
      },
      {
        headerName: 'Doc Front',
        field: 'docFrontUrl',
        width: 120,
        cellRenderer: (p: ICellRendererParams<VideoKycRow>) =>
          p.value ? <a className="text-indigo-400 underline" href={String(p.value)} target="_blank">View</a> : '-',
      },
      {
        headerName: 'Doc Back',
        field: 'docBackUrl',
        width: 120,
        cellRenderer: (p: ICellRendererParams<VideoKycRow>) =>
          p.value ? <a className="text-indigo-400 underline" href={String(p.value)} target="_blank">View</a> : '-',
      },
      { headerName: 'Face Match', field: 'faceMatchScore', width: 120 },
      { headerName: 'Liveness', field: 'livenessScore', width: 120 },
      { headerName: 'Recommendation', field: 'recommendation', width: 160 },
      { headerName: 'Notes', field: 'reviewerNotes', flex: 1, minWidth: 180 },
      {
        headerName: 'Submitted',
        field: 'createdAt',
        width: 170,
        valueFormatter: (p) => (p.value ? new Date(p.value as string).toLocaleString() : '-'),
      },
      {
        headerName: '',
        field: 'id',
        width: 160,
        pinned: 'right',
        cellRenderer: ActionRenderer,
        sortable: false,
        filter: false,
      },
    ],
    [],
  );

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        {error ? (
          <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <DataGrid<VideoKycRow>
          rowData={rows}
          columnDefs={columnDefs}
          title="Video KYC"
          subtitle="Review superherooo video KYC submissions."
          height={640}
          dateField="createdAt"
          exportFileName="superheroo-video-kyc.xlsx"
          onGridReady={(api) => setGridApi(api)}
          extraContent={
            <button
              onClick={() => gridApi?.refreshInfiniteCache?.()}
              className="rounded-lg border border-foreground/15 bg-foreground/5 px-3 py-2 text-xs font-semibold"
            >
              Refresh
            </button>
          }
        />
      </main>
    </div>
  );
}
