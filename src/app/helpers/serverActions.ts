'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export async function createHelper(formData: FormData) {
  const phone = String(formData.get('phone') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const displayName = String(formData.get('displayName') || '').trim();
  const password = String(formData.get('password') || '').trim();
  const status = String(formData.get('status') || '').trim();

  const res = await apiFetch(`/api/v1/admin/helpers`, {
    method: 'POST',
    body: JSON.stringify({ phone: phone || null, email: email || null, displayName: displayName || null, password: password || null, status: status || null }),
  });
  if (!res.ok) redirect(`/helpers?error=create_failed_${res.status}`);
  redirect('/helpers');
}

export async function updateHelper(formData: FormData) {
  const helperId = String(formData.get('helperId') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const displayName = String(formData.get('displayName') || '').trim();
  const status = String(formData.get('status') || '').trim();
  if (!helperId) redirect('/helpers');

  const res = await apiFetch(`/api/v1/admin/helpers/${encodeURIComponent(helperId)}/update`, {
    method: 'POST',
    body: JSON.stringify({ phone: phone || null, email: email || null, displayName: displayName || null, status: status || null }),
  });
  if (!res.ok) redirect(`/helpers?error=update_failed_${res.status}`);
  redirect('/helpers');
}

export async function deleteHelper(formData: FormData) {
  const helperId = String(formData.get('helperId') || '').trim();
  if (!helperId) redirect('/helpers');

  const res = await apiFetch(`/api/v1/admin/helpers/${encodeURIComponent(helperId)}/delete`, {
    method: 'POST',
  });
  if (!res.ok) redirect(`/helpers?error=delete_failed_${res.status}`);
  redirect('/helpers');
}
