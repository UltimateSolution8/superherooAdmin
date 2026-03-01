import { useEffect, useState } from 'react';
import { Nav } from '../components/Nav';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PendingHelpersGrid, PendingHelperRow } from '../components/PendingHelpersGrid';

export default function PendingHelpersPage() {
  const { state } = useAuth();
  const [helpers, setHelpers] = useState<PendingHelperRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await apiFetch<PendingHelperRow[]>(
        '/api/v1/admin/helpers/pending',
        undefined,
        state.accessToken,
      );
      if (!active) return;
      if (res.ok && Array.isArray(res.data)) setHelpers(res.data);
      else setError(res.errorText);
    })();
    return () => {
      active = false;
    };
  }, [state.accessToken]);

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        {error ? (
          <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <PendingHelpersGrid helpers={helpers} />
      </main>
    </div>
  );
}
