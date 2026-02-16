import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Nav } from '@/components/Nav';
import { createHelper, deleteHelper, updateHelper } from './serverActions';

type Helper = {
  id: string;
  role: string;
  status: string;
  phone: string | null;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  helperKycStatus: string | null;
  helperKycFullName: string | null;
  helperKycIdNumber: string | null;
  helperKycDocFrontUrl: string | null;
  helperKycDocBackUrl: string | null;
  helperKycSelfieUrl: string | null;
  helperKycSubmittedAt: string | null;
};

export default async function HelpersPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  if (!cookieStore.get('him_admin_access')) {
    redirect('/login');
  }

  const sp = searchParams ? await searchParams : undefined;

  const res = await apiFetch<Helper[]>('/api/v1/admin/helpers');
  const helpers = res.ok ? res.data : [];

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Helpers</h1>
          <p className="text-sm text-foreground/70">Manage helper accounts and contact details.</p>
          {sp?.error ? <p className="text-sm text-red-600 dark:text-red-400">{sp.error.replaceAll('_', ' ')}</p> : null}
        </header>

        <section className="rounded-2xl border border-foreground/10 p-5">
          <h2 className="text-sm font-semibold">Add helper</h2>
          <form action={createHelper} className="mt-4 grid gap-3 sm:grid-cols-5">
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
                <th className="text-left font-medium px-4 py-3">Helper</th>
                <th className="text-left font-medium px-4 py-3">Contact</th>
                <th className="text-left font-medium px-4 py-3">KYC</th>
                <th className="text-left font-medium px-4 py-3">Docs</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {helpers.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-foreground/70" colSpan={5}>No helpers.</td>
                </tr>
              ) : (
                helpers.map((h) => (
                  <tr key={h.id} className="border-t border-foreground/10 align-top">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-foreground/70">{h.id}</div>
                      <div className="mt-1 text-xs text-foreground/60">{h.status}</div>
                      <div className="mt-1 text-xs text-foreground/60">created {new Date(h.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <form action={updateHelper} className="space-y-2">
                        <input type="hidden" name="helperId" value={h.id} />
                        <input name="phone" defaultValue={h.phone ?? ''} placeholder="phone" className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-xs" />
                        <input name="email" defaultValue={h.email ?? ''} placeholder="email" className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-xs" />
                        <input name="displayName" defaultValue={h.displayName ?? ''} placeholder="display name" className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-xs" />
                        <select name="status" defaultValue={h.status} className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-xs">
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="BLOCKED">BLOCKED</option>
                        </select>
                        <button className="w-full rounded-lg border border-foreground/15 px-3 py-2 text-xs hover:bg-foreground/5">Update</button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-medium">{h.helperKycStatus ?? '-'}</div>
                      <div className="text-foreground/60">{h.helperKycFullName ?? '-'}</div>
                      <div className="text-foreground/60">{h.helperKycIdNumber ?? '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-wrap gap-2">
                        {h.helperKycDocFrontUrl ? <a className="underline" href={h.helperKycDocFrontUrl} target="_blank">Front</a> : <span className="text-foreground/40">Front</span>}
                        {h.helperKycDocBackUrl ? <a className="underline" href={h.helperKycDocBackUrl} target="_blank">Back</a> : <span className="text-foreground/40">Back</span>}
                        {h.helperKycSelfieUrl ? <a className="underline" href={h.helperKycSelfieUrl} target="_blank">Selfie</a> : <span className="text-foreground/40">Selfie</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <form action={deleteHelper} className="flex justify-end">
                        <input type="hidden" name="helperId" value={h.id} />
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
