'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export async function setTaskStatus(formData: FormData) {
  const taskId = String(formData.get('taskId') || '').trim();
  const status = String(formData.get('status') || '').trim();
  if (!taskId) redirect('/tasks');
  if (!status) redirect(`/tasks/${encodeURIComponent(taskId)}`);

  const res = await apiFetch<void>(`/api/v1/admin/tasks/${encodeURIComponent(taskId)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
  if (!res.ok) redirect(`/tasks/${encodeURIComponent(taskId)}?error=status_failed_${res.status}`);

  redirect(`/tasks/${encodeURIComponent(taskId)}`);
}
