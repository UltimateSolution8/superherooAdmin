import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import { Nav } from '@/components/Nav';
import { approveHelper, rejectHelper } from './serverActions';

type PendingHelper = {
  helperId: string;
  phone: string | null;
  kycStatus: string;
  kycFullName: string | null;
  kycIdNumber: string | null;
  kycDocFrontUrl: string | null;
  kycDocBackUrl: string | null;
  kycSelfieUrl: string | null;
  kycSubmittedAt: string | null;
  createdAt: string;
};

export default async function PendingHelpersPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get('him_admin_access')) {
    redirect('/login');
  }

  const res = await apiFetch<PendingHelper[]>('/api/v1/admin/helpers/pending');
  const helpers = res.ok ? res.data : [];

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Pending Helpers</h1>
          <p className="text-sm text-foreground/70">Approve KYC to let helpers go online.</p>
        </header>

        <div className="mt-6 overflow-hidden rounded-2xl border border-foreground/10">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-foreground/70">
              <tr>
                <th className="text-left font-medium px-4 py-3">Helper</th>
                <th className="text-left font-medium px-4 py-3">Phone</th>
                <th className="text-left font-medium px-4 py-3">KYC</th>
                <th className="text-left font-medium px-4 py-3">Documents</th>
                <th className="text-left font-medium px-4 py-3">Created</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {helpers.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-foreground/70" colSpan={6}>
                    No pending helpers.
                  </td>
                </tr>
              ) : (
                helpers.map((h) => (
                  <tr key={h.helperId} className="border-t border-foreground/10">
                    <td className="px-4 py-3 font-mono text-xs">{h.helperId}</td>
                    <td className="px-4 py-3">{h.phone ?? '-'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{h.kycFullName ?? '-'}</div>
                      <div className="text-xs text-foreground/60">{h.kycIdNumber ?? '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-wrap gap-2">
                        {h.kycDocFrontUrl ? <a className="underline" href={h.kycDocFrontUrl} target="_blank">Front</a> : <span className="text-foreground/40">Front</span>}
                        {h.kycDocBackUrl ? <a className="underline" href={h.kycDocBackUrl} target="_blank">Back</a> : <span className="text-foreground/40">Back</span>}
                        {h.kycSelfieUrl ? <a className="underline" href={h.kycSelfieUrl} target="_blank">Selfie</a> : <span className="text-foreground/40">Selfie</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground/70">{new Date(h.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <form action={approveHelper}>
                          <input type="hidden" name="helperId" value={h.helperId} />
                          <button className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90">
                            Approve
                          </button>
                        </form>
                        <form action={rejectHelper}>
                          <input type="hidden" name="helperId" value={h.helperId} />
                          <input type="hidden" name="reason" value="Rejected by admin" />
                          <button className="rounded-lg border border-foreground/15 px-3 py-1.5 text-xs hover:bg-foreground/5">
                            Reject
                          </button>
                        </form>
                      </div>
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
