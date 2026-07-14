import { useEffect, useState } from 'react';
import { Nav } from '../components/Nav';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import { MediatorsGrid, MediatorRow } from '../components/MediatorsGrid';
import {
  normalizeEmailOrNull,
  normalizeIndianPhoneOrNull,
  validateEmailOrNull,
  validateIndianPhoneOrNull,
} from '../lib/validation';

export default function MediatorsPage() {
  const { state } = useAuth();
  const isSuperAdmin = state.user?.role === 'ADMIN';
  const [mediators, setMediators] = useState<MediatorRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ phone: '', email: '', displayName: '', password: '', status: 'ACTIVE' });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    if (!isSuperAdmin) return;
    const res = await apiFetch<MediatorRow[]>('/api/v1/admin/mediators', undefined, state.accessToken);
    if (res.ok) {
      setMediators(res.data);
      setError(null);
    } else {
      setError(res.errorText);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isSuperAdmin) return;
      const res = await apiFetch<MediatorRow[]>('/api/v1/admin/mediators', undefined, state.accessToken);
      if (!active) return;
      if (res.ok) setMediators(res.data);
      else setError(res.errorText);
    })();
    return () => {
      active = false;
    };
  }, [isSuperAdmin, state.accessToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = normalizeIndianPhoneOrNull(form.phone);
    const email = normalizeEmailOrNull(form.email);
    if (!validateIndianPhoneOrNull(phone) || !phone) {
      setError('Enter a valid Indian mobile number. Phone is required for mediator OTP login.');
      return;
    }
    if (!validateEmailOrNull(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setCreating(true);
    setError(null);
    const res = await apiFetch<MediatorRow>(
      '/api/v1/admin/mediators',
      {
        method: 'POST',
        body: JSON.stringify({
          phone,
          email: email || null,
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
    setMediators((prev) => [res.data, ...prev]);
    setForm({ phone: '', email: '', displayName: '', password: '', status: 'ACTIVE' });
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-dvh">
        <Nav />
        <main className="mx-auto max-w-7xl px-6 py-10">
          <section className="rounded-2xl border border-foreground/10 p-6">
            <h1 className="text-xl font-semibold">Super admin only</h1>
            <p className="mt-2 text-sm text-foreground/60">Mediator accounts can only be created or managed by a full admin.</p>
          </section>
        </main>
      </div>
    );
  }

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
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Add Mediator</h2>
              <p className="text-xs text-foreground/60">Admin-created mediator accounts can sign in to the mediator app with OTP.</p>
            </div>
            <button type="button" onClick={() => void load()} className="rounded-lg border border-foreground/15 px-3 py-2 text-xs font-semibold hover:bg-foreground/5">
              Refresh
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-5">
            <input
              name="phone"
              placeholder="Phone (required)"
              type="tel"
              inputMode="tel"
              pattern="[6-9][0-9]{9}"
              className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <input
              name="email"
              placeholder="Email (optional)"
              type="email"
              inputMode="email"
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
              {creating ? 'Creating...' : 'Create Mediator'}
            </button>
          </form>
        </section>

        <MediatorsGrid mediators={mediators} />
      </main>
    </div>
  );
}
