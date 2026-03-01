'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export async function approveHelper(formData: FormData) {
  const helperId = String(formData.get('helperId') || '').trim();
  if (!helperId) redirect('/helpers/pending');

  const res = await apiFetch<void>(`/api/v1/admin/helpers/${helperId}/approve`, { method: 'POST' });
  if (!res.ok) redirect(`/helpers/pending?error=approve_failed_${res.status}`);
  redirect('/helpers/pending');
}

export async function rejectHelper(formData: FormData) {
  const helperId = String(formData.get('helperId') || '').trim();
  const reason = String(formData.get('reason') || '').trim() || 'Rejected';
  if (!helperId) redirect('/helpers/pending');

  const res = await apiFetch<void>(`/api/v1/admin/helpers/${helperId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) redirect(`/helpers/pending?error=reject_failed_${res.status}`);
  redirect('/helpers/pending');
}
