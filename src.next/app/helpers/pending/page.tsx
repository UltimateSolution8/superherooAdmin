import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import { Nav } from '@/components/Nav';
import { PendingHelpersGrid } from '@/components/PendingHelpersGrid';

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
  const helpers = res.ok && Array.isArray(res.data) ? res.data : [];

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <PendingHelpersGrid helpers={helpers} />
      </main>
    </div>
  );
}
