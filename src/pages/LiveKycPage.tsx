import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  type LocalTrackPublication,
  type RemoteTrack,
} from 'livekit-client';
import { Nav } from '../components/Nav';
import { DataGrid } from '../components/DataGrid';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAdminRealtime } from '../lib/realtime';

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
  provider: 'LIVEKIT';
  serverUrl: string;
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

type SnapshotKind = 'selfie' | 'doc-front' | 'doc-back';

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export default function LiveKycPage() {
  const { state } = useAuth();
  const { kycRevision, connected: realtimeConnected } = useAdminRealtime();
  const [helpers, setHelpers] = useState<PendingHelperRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<LiveKycSessionResponse | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [approveBusy, setApproveBusy] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState<SnapshotKind | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [manualHelperId, setManualHelperId] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [remoteReady, setRemoteReady] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteTrackRef = useRef<RemoteTrack | null>(null);
  const roomRef = useRef<Room | null>(null);
  const lastPendingCountRef = useRef<number | null>(null);

  const loadPendingHelpers = useCallback(async (showPopup: boolean) => {
    const res = await apiFetch<PendingHelperRow[]>('/api/v1/admin/helpers/pending', undefined, state.accessToken);
    if (!res.ok) {
      setError(res.errorText);
      return;
    }
    const data = res.data || [];
    setHelpers(data);
    const previous = lastPendingCountRef.current;
    if (showPopup && previous != null && data.length > previous) {
      setQueueNotice(`${data.length - previous} new KYC request(s) entered the queue.`);
    }
    lastPendingCountRef.current = data.length;
  }, [state.accessToken]);

  useEffect(() => {
    let active = true;
    void loadPendingHelpers(false).catch((cause) => active && setError(cause?.message || 'Could not load pending KYC.'));
    const timer = window.setInterval(() => {
      if (active) void loadPendingHelpers(true);
    }, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [loadPendingHelpers]);

  useEffect(() => {
    if (kycRevision > 0) void loadPendingHelpers(true);
  }, [kycRevision, loadPendingHelpers]);

  useEffect(() => {
    if (!session) {
      setElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    if (session.provider !== 'LIVEKIT' || !session.serverUrl || !session.token) {
      setSessionError('The backend returned an invalid LiveKit session.');
      return;
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
    });
    roomRef.current = room;

    const attachRemote = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
        remoteTrackRef.current?.detach();
        remoteTrackRef.current = track;
        track.attach(remoteVideoRef.current);
        setRemoteReady(true);
      } else if (track.kind === Track.Kind.Audio) {
        track.attach();
      }
    };
    const detachRemote = (track: RemoteTrack) => {
      track.detach();
      if (track === remoteTrackRef.current) {
        remoteTrackRef.current = null;
        setRemoteReady(false);
      }
    };
    const attachLocal = (publication: LocalTrackPublication) => {
      if (publication.source === Track.Source.Camera && publication.track && localVideoRef.current) {
        publication.track.attach(localVideoRef.current);
      }
    };

    room
      .on(RoomEvent.TrackSubscribed, attachRemote)
      .on(RoomEvent.TrackUnsubscribed, detachRemote)
      .on(RoomEvent.LocalTrackPublished, attachLocal)
      .on(RoomEvent.ConnectionStateChanged, setConnectionState)
      .on(RoomEvent.Reconnecting, () => setConnectionState(ConnectionState.Reconnecting))
      .on(RoomEvent.Reconnected, () => setConnectionState(ConnectionState.Connected))
      .on(RoomEvent.Disconnected, () => {
        setConnectionState(ConnectionState.Disconnected);
        setRemoteReady(false);
      });

    const connect = async () => {
      try {
        setConnectionState(ConnectionState.Connecting);
        await room.connect(session.serverUrl, session.token);
        const publications = await Promise.all([
          room.localParticipant.setCameraEnabled(true, { resolution: VideoPresets.h720.resolution }),
          room.localParticipant.setMicrophoneEnabled(true),
        ]);
        publications.filter(Boolean).forEach((publication) => attachLocal(publication as LocalTrackPublication));
        setCameraEnabled(true);
        setMicEnabled(true);
      } catch (cause) {
        console.error('LiveKit connection failed', cause);
        setSessionError('Could not connect to live KYC. Check camera/microphone permissions and retry.');
        setConnectionState(ConnectionState.Disconnected);
      }
    };
    void connect();

    return () => {
      remoteTrackRef.current?.detach();
      remoteTrackRef.current = null;
      room.disconnect();
      roomRef.current = null;
      setRemoteReady(false);
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
        setSessionError(res.errorText || 'Live KYC is currently unavailable.');
        return;
      }
      setSnapshots({});
      setSession(res.data);
    } finally {
      setSessionBusy(false);
    }
  }, [state.accessToken]);

  useEffect(() => {
    const helperId = new URLSearchParams(window.location.search).get('helperId');
    if (helperId) void startLive(helperId);
  }, [startLive]);

  const endLive = useCallback(async () => {
    if (!session) return;
    const ending = session;
    roomRef.current?.disconnect();
    setSession(null);
    setSnapshots({});
    const result = await apiFetch<void>(
      `/api/v1/admin/video-kyc/live/${ending.id}/end`,
      { method: 'POST' },
      state.accessToken,
    );
    if (!result.ok) setSessionError(result.errorText || 'The call ended locally, but server cleanup needs attention.');
  }, [session, state.accessToken]);

  const toggleMicrophone = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  }, [micEnabled]);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !cameraEnabled;
    const publication = await room.localParticipant.setCameraEnabled(next, { resolution: VideoPresets.h720.resolution });
    if (publication) {
      publication.track?.attach(localVideoRef.current || undefined);
    }
    setCameraEnabled(next);
  }, [cameraEnabled]);

  const retryConnection = useCallback(async () => {
    const room = roomRef.current;
    if (!room || !session || room.state !== ConnectionState.Disconnected) return;
    setSessionError(null);
    try {
      await room.connect(session.serverUrl, session.token);
    } catch {
      setSessionError('Reconnect failed. The token may have expired; end and start a new session.');
    }
  }, [session]);

  const captureSnapshot = useCallback(async (kind: SnapshotKind) => {
    if (!session || !remoteVideoRef.current || !remoteReady) return;
    const target = remoteVideoRef.current;
    if (target.readyState < 2 || !target.videoWidth || !target.videoHeight) {
      setSessionError('The helper video is not ready yet.');
      return;
    }
    setSnapshotBusy(kind);
    setSessionError(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = target.videoWidth;
      canvas.height = target.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas_unavailable');
      ctx.drawImage(target, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('snapshot_failed');

      const urlRes = await apiFetch<SnapshotUrlResponse>(
        `/api/v1/admin/video-kyc/live/${session.id}/snapshot-url?kind=${encodeURIComponent(kind)}`,
        { method: 'POST' },
        state.accessToken,
      );
      if (!urlRes.ok) throw new Error(urlRes.errorText || 'snapshot_url_failed');
      const upload = await fetch(urlRes.data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });
      if (!upload.ok) throw new Error('snapshot_upload_failed');
      const confirm = await apiFetch<void>(
        `/api/v1/admin/video-kyc/live/${session.id}/snapshot`,
        { method: 'POST', body: JSON.stringify({ kind, key: urlRes.data.key }) },
        state.accessToken,
      );
      if (!confirm.ok) throw new Error(confirm.errorText || 'snapshot_confirm_failed');

      const previousUrl = snapshots[kind];
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      setSnapshots((previous) => ({ ...previous, [kind]: URL.createObjectURL(blob) }));
    } catch (cause) {
      setSessionError(cause instanceof Error ? cause.message : 'Could not capture the snapshot.');
    } finally {
      setSnapshotBusy(null);
    }
  }, [remoteReady, session, snapshots, state.accessToken]);

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
        setSessionError(res.errorText || 'Could not approve KYC.');
        return;
      }
      roomRef.current?.disconnect();
      setHelpers((previous) => previous.filter((helper) => helper.helperId !== session.helperId));
      setSession(null);
      setSnapshots({});
    } finally {
      setApproveBusy(false);
    }
  }, [canApprove, session, state.accessToken]);

  const columnDefs = useMemo<ColDef<PendingHelperRow>[]>(() => [
    { headerName: 'Name', field: 'displayName', flex: 1, minWidth: 140 },
    { headerName: 'Phone', field: 'phone', width: 140 },
    { headerName: 'Email', field: 'email', width: 180 },
    { headerName: 'Full Name', field: 'kycFullName', width: 160 },
    { headerName: 'ID Number', field: 'kycIdNumber', width: 140 },
    {
      headerName: 'Submitted', field: 'kycSubmittedAt', width: 170,
      valueFormatter: (params) => params.value ? new Date(params.value as string).toLocaleString() : '-',
    },
    {
      headerName: '', field: 'helperId', width: 160, pinned: 'right',
      cellRenderer: (params: ICellRendererParams<PendingHelperRow>) => (
        <button
          onClick={() => params.data && startLive(params.data.helperId)}
          className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          Start Live
        </button>
      ),
    },
  ], [startLive]);

  const statusLabel = connectionState === ConnectionState.Reconnecting
    ? 'Reconnecting…'
    : connectionState === ConnectionState.Connected
      ? remoteReady ? 'Helper connected' : 'Waiting for helper…'
      : connectionState === ConnectionState.Connecting ? 'Connecting…' : 'Disconnected';

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        {error ? <p className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-400">{error}</p> : null}
        {queueNotice ? (
          <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-3 text-sm font-semibold text-emerald-300">
            <button className="float-right text-xs opacity-70 hover:opacity-100" onClick={() => setQueueNotice(null)}>Dismiss</button>
            {queueNotice}
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-foreground/10 bg-foreground/2 p-4">
          <div className="min-w-[280px] flex-1 space-y-1">
            <label className="text-xs font-semibold text-foreground/60">Start Live KYC by Helper ID</label>
            <input
              type="text"
              placeholder="Enter helper UUID..."
              value={manualHelperId}
              onChange={(event) => setManualHelperId(event.target.value)}
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <span className={`text-xs ${realtimeConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
            {realtimeConnected ? 'Realtime connected' : 'Polling fallback active'}
          </span>
          <button
            onClick={() => manualHelperId.trim() && startLive(manualHelperId.trim())}
            disabled={!manualHelperId.trim() || sessionBusy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {sessionBusy ? 'Starting…' : 'Start Live KYC'}
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

        <section className="space-y-4 rounded-2xl border border-foreground/10 bg-foreground/2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Live Session</h3>
              <p className="text-xs text-foreground/60">
                {session ? `${statusLabel} · ${formatDuration(elapsedSeconds)} · Room ${session.roomId}` : 'No active session'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={toggleMicrophone} disabled={!session} className="rounded-lg border border-foreground/15 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                {micEnabled ? 'Mute mic' : 'Unmute mic'}
              </button>
              <button onClick={toggleCamera} disabled={!session} className="rounded-lg border border-foreground/15 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                {cameraEnabled ? 'Stop camera' : 'Start camera'}
              </button>
              {connectionState === ConnectionState.Disconnected && session ? (
                <button onClick={retryConnection} className="rounded-lg border border-amber-500/50 px-3 py-1.5 text-xs font-semibold text-amber-400">Reconnect</button>
              ) : null}
              <button onClick={endLive} disabled={!session} className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 disabled:opacity-50">End call</button>
            </div>
          </div>

          {sessionError ? <p role="alert" className="rounded-lg bg-red-950/30 p-3 text-xs text-red-400">{sessionError}</p> : null}
          <div className="relative grid min-h-[420px] overflow-hidden rounded-xl bg-black lg:grid-cols-[1fr_220px]">
            <div className="relative min-h-[420px]">
              <video ref={remoteVideoRef} autoPlay playsInline className="h-full min-h-[420px] w-full object-contain" />
              {!remoteReady ? (
                <div className="absolute inset-0 grid place-items-center text-center text-sm text-white/70">
                  <div><div className="mb-2 text-2xl">📹</div>{session ? statusLabel : 'Start a session to begin'}</div>
                </div>
              ) : null}
              <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">{session?.helperName || 'Helper'}</span>
            </div>
            <div className="relative min-h-[160px] border-t border-white/10 bg-black/80 lg:border-l lg:border-t-0">
              <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">Admin preview</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['selfie', 'doc-front', 'doc-back'] as SnapshotKind[]).map((kind) => (
              <button
                key={kind}
                onClick={() => captureSnapshot(kind)}
                disabled={!remoteReady || snapshotBusy !== null}
                className="rounded-lg border border-foreground/15 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {snapshotBusy === kind ? 'Uploading…' : snapshots[kind] ? `Retake ${kind}` : `Capture ${kind}`}
              </button>
            ))}
            <button
              onClick={approveFromLive}
              disabled={!canApprove || approveBusy}
              className="ml-auto rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {approveBusy ? 'Approving…' : 'Approve KYC'}
            </button>
          </div>
          <p className="text-xs text-foreground/55">
            Approval unlocks only after the helper's remote video provides a successfully uploaded selfie, document front, and document back.
          </p>
        </section>
      </main>
    </div>
  );
}
