import React, { useCallback, useEffect, useState } from 'react';
import { actionVideoKyc, listVideoKyc, VideoKycItem } from '../api/client';

export function VideoKycPanel({ token }: { token: string }) {
  const [items, setItems] = useState<VideoKycItem[]>([]);
  const [status, setStatus] = useState<string>('REVIEW');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setBusy(true);
    setError(null);
    listVideoKyc(token, status === 'ALL' ? null : status)
      .then((res) => setItems(res.content || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setBusy(false));
  }, [status, token]);

  useEffect(() => {
    load();
  }, [load]);

  const onAction = useCallback(
    async (id: string, action: 'APPROVE' | 'REJECT') => {
      const remarks = action === 'REJECT' ? window.prompt('Reason for rejection?') || '' : '';
      try {
        await actionVideoKyc(token, id, action, remarks);
        load();
      } catch (err: any) {
        setError(err?.message || 'Failed to update');
      }
    },
    [load, token],
  );

  return (
    <div className="card wide">
      <div className="row between">
        <div>
          <h2>Video KYC</h2>
          <p className="muted">Review helper video KYC submissions.</p>
        </div>
        <div className="row gap">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="REVIEW">Review</option>
            <option value="PENDING_PROCESSING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All</option>
          </select>
          <button onClick={load}>Refresh</button>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
      {busy ? <div className="muted">Loading…</div> : null}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Helper</th>
              <th>Status</th>
              <th>Created</th>
              <th>Video</th>
              <th>Doc Front</th>
              <th>Doc Back</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div>{item.helperName || '—'}</div>
                  <div className="muted small">{item.helperId}</div>
                </td>
                <td>
                  <span className={`badge ${item.status.toLowerCase()}`}>{item.status}</span>
                </td>
                <td>{new Date(item.createdAt).toLocaleString()}</td>
                <td>
                  {item.videoUrl ? (
                    <a href={item.videoUrl} target="_blank" rel="noreferrer">
                      View
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {item.docFrontUrl ? (
                    <a href={item.docFrontUrl} target="_blank" rel="noreferrer">
                      View
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {item.docBackUrl ? (
                    <a href={item.docBackUrl} target="_blank" rel="noreferrer">
                      View
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="row gap">
                  <button onClick={() => onAction(item.id, 'APPROVE')}>Approve</button>
                  <button className="danger" onClick={() => onAction(item.id, 'REJECT')}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  No KYC requests.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
