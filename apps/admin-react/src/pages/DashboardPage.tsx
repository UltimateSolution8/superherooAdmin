import React, { useEffect, useState } from 'react';
import { getSummary } from '../api/client';

export function DashboardPage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getSummary(token)
      .then((res) => mounted && setData(res))
      .catch((err) => mounted && setError(err instanceof Error ? err.message : 'Failed'));
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <div className="page">
      <div className="card">
        <h1>Dashboard</h1>
        <p className="muted">Fast summary endpoint.</p>
        {error ? <div className="error">{error}</div> : null}
        <pre>{data ? JSON.stringify(data, null, 2) : 'Loading...'}</pre>
      </div>
    </div>
  );
}
