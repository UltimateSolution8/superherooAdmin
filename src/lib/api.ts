import 'server-only';

import { cookies } from 'next/headers';

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://superheroobackend.onrender.com';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; errorText: string };

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const cookieStore = await cookies();
  const access = cookieStore.get('him_admin_access')?.value;

  const headers = new Headers(init?.headers);
  headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');
  if (access) headers.set('Authorization', `Bearer ${access}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 0, errorText: 'backend_unreachable' };
  }

  if (!res.ok) {
    const errorText = await safeText(res);
    return { ok: false, status: res.status, errorText };
  }

  const text = await safeText(res);
  const data = (text ? JSON.parse(text) : null) as T;
  return { ok: true, data };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
