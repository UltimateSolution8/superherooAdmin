import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Nav } from '@/components/Nav';
import { HelpersGrid } from '@/components/HelpersGrid';
import { createHelper } from './serverActions';

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
  const helpers = res.ok && Array.isArray(res.data) ? res.data : [];

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        {sp?.error ? (
          <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
            {sp.error.replaceAll('_', ' ')}
          </p>
        ) : null}

        {/* Add Helper Form */}
        <section className="rounded-2xl border border-foreground/10 p-5">
          <h2 className="text-sm font-semibold mb-4">Add Helper</h2>
          <form action={createHelper} className="grid gap-3 sm:grid-cols-5">
            <input name="phone" placeholder="Phone" className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            <input name="email" placeholder="Email" className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            <input name="displayName" placeholder="Display name" className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            <input name="password" placeholder="Password (optional)" className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
              Create
            </button>
          </form>
        </section>

        {/* Helpers Grid */}
        <HelpersGrid helpers={helpers} />
      </main>
    </div>
  );
}
