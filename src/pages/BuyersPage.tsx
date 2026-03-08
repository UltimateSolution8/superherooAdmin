import { useEffect, useState } from 'react';
import { Nav } from '../components/Nav';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import { BuyersGrid, BuyerRow } from '../components/BuyersGrid';

export default function BuyersPage() {
  const { state } = useAuth();
  const [buyers, setBuyers] = useState<BuyerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ phone: '', email: '', displayName: '', password: '', status: 'ACTIVE' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await apiFetch<BuyerRow[]>('/api/v1/admin/buyers', undefined, state.accessToken);
      if (!active) return;
      if (res.ok && Array.isArray(res.data)) setBuyers(res.data);
      else setError(res.errorText);
    })();
    return () => {
      active = false;
    };
  }, [state.accessToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await apiFetch<BuyerRow>(
      '/api/v1/admin/buyers',
      {
        method: 'POST',
        body: JSON.stringify({
          phone: form.phone || null,
          email: form.email || null,
          displayName: form.displayName || null,
          password: form.password || null,
          status: form.status || 'ACTIVE',
        }),
      },
      state.accessToken,
    );
    setCreating(false);
    if (!res.ok) {
      setError(res.errorText);
      return;
    }
    setBuyers((prev) => [res.data, ...prev]);
    setForm({ phone: '', email: '', displayName: '', password: '', status: 'ACTIVE' });
  };

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        {error ? (
          <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <section className="rounded-2xl border border-foreground/10 p-5">
          <h2 className="text-sm font-semibold mb-4">Add Buyer</h2>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-5">
            <input
              name="phone"
              placeholder="Phone"
              className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <input
              name="email"
              placeholder="Email"
              className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <input
              name="displayName"
              placeholder="Display name"
              className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
            <input
              name="password"
              placeholder="Password (optional)"
              className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <select
              name="status"
              className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>
            <button
              disabled={creating}
              className="sm:col-span-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create Buyer'}
            </button>
          </form>
        </section>

        <BuyersGrid buyers={buyers} />
      </main>
    </div>
  );
}
