'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export async function postReply(formData: FormData) {
  const ticketId = String(formData.get('ticketId') || '').trim();
  const message = String(formData.get('message') || '').trim();
  if (!ticketId) redirect('/support/tickets');
  if (!message) redirect(`/support/tickets/${encodeURIComponent(ticketId)}`);

  const res = await apiFetch<void>(`/api/v1/admin/support/tickets/${encodeURIComponent(ticketId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  if (!res.ok) redirect(`/support/tickets/${encodeURIComponent(ticketId)}?error=message_failed_${res.status}`);
  redirect(`/support/tickets/${encodeURIComponent(ticketId)}`);
}

export async function setStatus(formData: FormData) {
  const ticketId = String(formData.get('ticketId') || '').trim();
  const status = String(formData.get('status') || '').trim();
  if (!ticketId) redirect('/support/tickets');
  if (!status) redirect(`/support/tickets/${encodeURIComponent(ticketId)}`);

  const res = await apiFetch<void>(`/api/v1/admin/support/tickets/${encodeURIComponent(ticketId)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
  if (!res.ok) redirect(`/support/tickets/${encodeURIComponent(ticketId)}?error=status_failed_${res.status}`);
  redirect(`/support/tickets/${encodeURIComponent(ticketId)}`);
}
