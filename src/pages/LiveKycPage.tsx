import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Nav } from '../components/Nav';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { DataGrid } from '../components/DataGrid';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { buildKitToken, createZego } from '../lib/zego';

type PendingHelperRow = {
  helperId: string;
  displayName: string | null;
  phone: string | null;
  email: string | null;
  kycSubmittedAt: string | null;
  kycFullName: string | null;
  kycIdNumber: string | null;
};

type LiveKycSessionResponse = {
  id: string;
  helperId: string;
  helperName: string | null;
  appId: number;
  roomId: string;
  userId: string;
  userName: string;
  token: string;
  status: string;
  expiresAt: string;
};

type SnapshotUrlResponse = {
  uploadUrl: string;
  key: string;
  expiresInSeconds: number;
};

export default function LiveKycPage() {
  const { state } = useAuth();
  const [helpers, setHelpers] = useState<PendingHelperRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<LiveKycSessionResponse | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [approveBusy, setApproveBusy] = useState(false);
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [manualHelperId, setManualHelperId] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zegoRef = useRef<any>(null);
  const lastPendingCountRef = useRef<number | null>(null);

  const loadPendingHelpers = useCallback(async (showPopup: boolean) => {
    const res = await apiFetch<PendingHelperRow[]>(
      '/api/v1/admin/helpers/pending',
      undefined,
      state.accessToken,
    );
    if (res.ok) {
      const data = res.data || [];
      setHelpers(data);
      const previous = lastPendingCountRef.current;
      if (showPopup && previous != null && data.length > previous) {
        setQueueNotice(`${data.length - previous} new KYC request(s) entered the queue.`);
      }
      lastPendingCountRef.current = data.length;
    } else {
      setError(res.errorText);
    }
  }, [state.accessToken]);

  useEffect(() => {
    let active = true;
    loadPendingHelpers(false).catch((e) => active && setError(e?.message || 'Could not load pending KYC.'));
    const timer = window.setInterval(() => {
      if (active) loadPendingHelpers(true).catch(() => undefined);
    }, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [loadPendingHelpers]);

  useEffect(() => {
    if (!session || !containerRef.current) return;
    if (!session.token || !session.appId || !session.roomId || !session.userId) {
      console.error('Zego: Missing live session token fields');
      setSessionError('No video token');
      return;
    }
    let zp: any = null;
    try {
      const kitToken = buildKitToken({
        appId: Number(session.appId),
        roomId: session.roomId,
        token: session.token,
        userId: session.userId,
        userName: session.userName || 'Admin',
      });
      zp = createZego(kitToken);
      zegoRef.current = zp;
      zp.joinRoom({
        container: containerRef.current,
        scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
        showPreJoinView: true,
        turnOnCameraWhenJoining: true,
        showRoomTimer: true,
      });
    } catch (e) {
      console.error('Zego init failed', e);
      setSessionError('Could not start live KYC call. Please retry.');
      return;
    }
    return () => {
      try {
        if (zegoRef.current) zp.destroy();
      } catch {
        // ignore
      }
      zegoRef.current = null;
    };
  }, [session]);

  const startLive = useCallback(async (helperId: string) => {
    setSessionBusy(true);
    setSessionError(null);
    try {
      const res = await apiFetch<LiveKycSessionResponse>(
        '/api/v1/admin/video-kyc/live/start',
        { method: 'POST', body: JSON.stringify({ helperId }) },
        state.accessToken,
      );
      if (!res.ok) {
        setSessionError(res.errorText || 'start_failed');
        return;
      }
      setSession(res.data);
    } finally {
      setSessionBusy(false);
    }
  }, [state.accessToken]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const helperId = params.get('helperId');
    if (helperId) {
      startLive(helperId);
    }
  }, [startLive]);

  const endLive = useCallback(async () => {
    if (!session) return;
    await apiFetch<void>(
      `/api/v1/admin/video-kyc/live/${session.id}/end`,
      { method: 'POST' },
      state.accessToken,
    );
    setSession(null);
    setSnapshots({});
  }, [session, state.accessToken]);

  const canApprove = Boolean(session && snapshots.selfie && snapshots['doc-front'] && snapshots['doc-back']);

  const approveFromLive = useCallback(async () => {
    if (!session || !canApprove) return;
    setApproveBusy(true);
    setSessionError(null);
    try {
      const res = await apiFetch<void>(
        `/api/v1/admin/video-kyc/${session.id}/action`,
        { method: 'POST', body: JSON.stringify({ action: 'APPROVE', remarks: 'Approved via live KYC session' }) },
        state.accessToken,
      );
      if (!res.ok) {
        setSessionError(res.errorText || 'approve_failed');
        return;
      }
      await apiFetch<void>(
        `/api/v1/admin/video-kyc/live/${session.id}/end`,
        { method: 'POST' },
        state.accessToken,
      );
      setHelpers((prev) => prev.filter((h) => h.helperId !== session.helperId));
      setSession(null);
      setSnapshots({});
    } finally {
      setApproveBusy(false);
    }
  }, [canApprove, session, state.accessToken]);

  const captureSnapshot = useCallback(async (kind: 'selfie' | 'doc-front' | 'doc-back') => {
    if (!session) return;
    const container = containerRef.current;
    if (!container) return;
    const videos = Array.from(container.querySelectorAll('video'));
    const target = videos
      .filter((v) => v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0)
      .sort((a, b) => (b.videoWidth * b.videoHeight) - (a.videoWidth * a.videoHeight))[0];
    if (!target) {
      setSessionError('video_not_ready');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = target.videoWidth;
    canvas.height = target.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(target, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) return;

    const urlRes = await apiFetch<SnapshotUrlResponse>(
      `/api/v1/admin/video-kyc/live/${session.id}/snapshot-url?kind=${encodeURIComponent(kind)}`,
      { method: 'POST' },
      state.accessToken,
    );
    if (!urlRes.ok) {
      setSessionError(urlRes.errorText || 'snapshot_url_failed');
      return;
    }
    const upload = await fetch(urlRes.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: blob,
    });
    if (!upload.ok) {
      setSessionError('snapshot_upload_failed');
      return;
    }

    const confirm = await apiFetch<void>(
      `/api/v1/admin/video-kyc/live/${session.id}/snapshot`,
      { method: 'POST', body: JSON.stringify({ kind, key: urlRes.data.key }) },
      state.accessToken,
    );
    if (!confirm.ok) {
      setSessionError(confirm.errorText || 'snapshot_confirm_failed');
      return;
    }

    setSnapshots((prev) => ({ ...prev, [kind]: URL.createObjectURL(blob) }));
  }, [session, state.accessToken]);

  const columnDefs = useMemo<ColDef<PendingHelperRow>[]>(
    () => [
      { headerName: 'Name', field: 'displayName', flex: 1, minWidth: 140 },
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
        headerName: '',
        field: 'helperId',
        width: 160,
        pinned: 'right',
        cellRenderer: (p: ICellRendererParams<PendingHelperRow>) => (
          <button
            onClick={() => p.data && startLive(p.data.helperId)}
            className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Start Live
          </button>
        ),
      },
    ],
    [startLive],
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
        {queueNotice ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            <button className="float-right text-xs opacity-70 hover:opacity-100" onClick={() => setQueueNotice(null)}>Dismiss</button>
            {queueNotice}
          </div>
        ) : null}
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-foreground/10 bg-foreground/2 p-4">
          <div className="flex-1 min-w-[280px] space-y-1">
            <label className="text-xs font-semibold text-foreground/60">Start Live KYC by Helper ID</label>
            <input
              type="text"
              placeholder="Enter helper UUID..."
              value={manualHelperId}
              onChange={(e) => setManualHelperId(e.target.value)}
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => manualHelperId.trim() && startLive(manualHelperId.trim())}
            disabled={!manualHelperId.trim() || sessionBusy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Start Live KYC
          </button>
        </div>

        <DataGrid<PendingHelperRow>
          rowData={helpers}
          columnDefs={columnDefs}
          title="Live KYC"
          subtitle="Start a live KYC session with a pending superherooo."
          height={420}
          dateField="kycSubmittedAt"
          exportFileName="superheroo-live-kyc.csv"
        />

        <section className="rounded-2xl border border-foreground/10 bg-foreground/2 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Live Session</h3>
              <p className="text-xs text-foreground/60">
                {session ? `Room ${session.roomId}` : 'No active session'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => captureSnapshot('selfie')}
                disabled={!session}
                className="rounded-lg border border-foreground/15 px-3 py-1 text-xs font-semibold"
              >
                Capture Selfie
              </button>
              <button
                onClick={() => captureSnapshot('doc-front')}
                disabled={!session}
                className="rounded-lg border border-foreground/15 px-3 py-1 text-xs font-semibold"
              >
                Capture Doc Front
              </button>
              <button
                onClick={() => captureSnapshot('doc-back')}
                disabled={!session}
                className="rounded-lg border border-foreground/15 px-3 py-1 text-xs font-semibold"
              >
                Capture Doc Back
              </button>
              <button
                onClick={endLive}
                disabled={!session}
                className="rounded-lg border border-foreground/15 px-3 py-1 text-xs font-semibold"
              >
                End Session
              </button>
              <button
                onClick={approveFromLive}
                disabled={!canApprove || approveBusy}
                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                {approveBusy ? 'Approving…' : 'Approve KYC'}
              </button>
            </div>
          </div>
          {sessionError ? <p className="text-xs text-red-500">{sessionError}</p> : null}
          <div ref={containerRef} className="h-[420px] w-full rounded-xl overflow-hidden bg-black/80" />
          <div className="flex items-center gap-3 text-xs text-foreground/60">
            {sessionBusy ? 'Starting session…' : null}
            {snapshots.selfie ? <span>Selfie captured</span> : null}
            {snapshots['doc-front'] ? <span>Doc front captured</span> : null}
            {snapshots['doc-back'] ? <span>Doc back captured</span> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
