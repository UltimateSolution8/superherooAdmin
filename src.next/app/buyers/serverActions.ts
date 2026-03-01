'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export async function createBuyer(formData: FormData) {
  const phone = String(formData.get('phone') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const displayName = String(formData.get('displayName') || '').trim();
  const password = String(formData.get('password') || '').trim();
  const status = String(formData.get('status') || '').trim();

  const res = await apiFetch(`/api/v1/admin/buyers`, {
    method: 'POST',
    body: JSON.stringify({ phone: phone || null, email: email || null, displayName: displayName || null, password: password || null, status: status || null }),
  });
  if (!res.ok) redirect(`/buyers?error=create_failed_${res.status}`);
  redirect('/buyers');
}

export async function updateBuyer(formData: FormData) {
  const buyerId = String(formData.get('buyerId') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const displayName = String(formData.get('displayName') || '').trim();
  const status = String(formData.get('status') || '').trim();
  if (!buyerId) redirect('/buyers');

  const res = await apiFetch(`/api/v1/admin/buyers/${encodeURIComponent(buyerId)}/update`, {
    method: 'POST',
    body: JSON.stringify({ phone: phone || null, email: email || null, displayName: displayName || null, status: status || null }),
  });
  if (!res.ok) redirect(`/buyers?error=update_failed_${res.status}`);
  redirect('/buyers');
}

export async function deleteBuyer(formData: FormData) {
  const buyerId = String(formData.get('buyerId') || '').trim();
  if (!buyerId) redirect('/buyers');

  const res = await apiFetch(`/api/v1/admin/buyers/${encodeURIComponent(buyerId)}/delete`, {
    method: 'POST',
  });
  if (!res.ok) redirect(`/buyers?error=delete_failed_${res.status}`);
  redirect('/buyers');
}
