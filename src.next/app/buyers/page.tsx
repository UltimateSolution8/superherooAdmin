import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Nav } from '@/components/Nav';
import { createBuyer, deleteBuyer, updateBuyer } from './serverActions';

type Buyer = {
  id: string;
  role: string;
  status: string;
  phone: string | null;
  email: string | null;
  displayName: string | null;
  createdAt: string;
};

export default async function BuyersPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  if (!cookieStore.get('him_admin_access')) {
    redirect('/login');
  }

  const sp = searchParams ? await searchParams : undefined;

  const res = await apiFetch<Buyer[]>('/api/v1/admin/buyers');
  const buyers = res.ok && Array.isArray(res.data) ? res.data : [];

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Buyers</h1>
          <p className="text-sm text-foreground/70">Manage buyer accounts and contact details.</p>
          {sp?.error ? <p className="text-sm text-red-600 dark:text-red-400">{sp.error.replaceAll('_', ' ')}</p> : null}
        </header>

        <section className="rounded-2xl border border-foreground/10 p-5">
          <h2 className="text-sm font-semibold">Add buyer</h2>
          <form action={createBuyer} className="mt-4 grid gap-3 sm:grid-cols-5">
            <input name="phone" placeholder="phone" className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" />
            <input name="email" placeholder="email" className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" />
            <input name="displayName" placeholder="display name" className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" />
            <input name="password" placeholder="password (optional)" className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" />
            <select name="status" defaultValue="ACTIVE" className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm">
              <option value="ACTIVE">ACTIVE</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>
            <button className="sm:col-span-5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">Create</button>
          </form>
        </section>

        <div className="overflow-hidden rounded-2xl border border-foreground/10">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-foreground/70">
              <tr>
                <th className="text-left font-medium px-4 py-3">Buyer</th>
                <th className="text-left font-medium px-4 py-3">Contact</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {buyers.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-foreground/70" colSpan={3}>No buyers.</td>
                </tr>
              ) : (
                buyers.map((b) => (
                  <tr key={b.id} className="border-t border-foreground/10 align-top">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-foreground/70">{b.id}</div>
                      <div className="mt-1 text-xs text-foreground/60">{b.status}</div>
                      <div className="mt-1 text-xs text-foreground/60">created {new Date(b.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <form action={updateBuyer} className="space-y-2">
                        <input type="hidden" name="buyerId" value={b.id} />
                        <input name="phone" defaultValue={b.phone ?? ''} placeholder="phone" className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-xs" />
                        <input name="email" defaultValue={b.email ?? ''} placeholder="email" className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-xs" />
                        <input name="displayName" defaultValue={b.displayName ?? ''} placeholder="display name" className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-xs" />
                        <select name="status" defaultValue={b.status} className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-xs">
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="BLOCKED">BLOCKED</option>
                        </select>
                        <button className="w-full rounded-lg border border-foreground/15 px-3 py-2 text-xs hover:bg-foreground/5">Update</button>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <form action={deleteBuyer} className="flex justify-end">
                        <input type="hidden" name="buyerId" value={b.id} />
                        <button className="rounded-lg border border-foreground/15 px-3 py-2 text-xs hover:bg-foreground/5">Delete</button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
