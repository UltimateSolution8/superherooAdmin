export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; errorText: string };

function normalizeBase(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return '';
  return trimmed;
}

const envBase = typeof import.meta.env.VITE_API_BASE_URL === 'string'
  ? normalizeBase(import.meta.env.VITE_API_BASE_URL)
  : '';
const API_BASE_URL = envBase || 'https://api.mysuperhero.xyz';

export function getApiBaseUrl() {
  return API_BASE_URL as string;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string | null,
): Promise<ApiResult<T>> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    return { ok: false, status: 0, errorText: 'backend_unreachable' };
  }

  if (!res.ok) {
    const errorText = await safeText(res);
    return { ok: false, status: res.status, errorText };
  }

  const text = await safeText(res);
  if (!text) return { ok: true, data: null as T };
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, status: res.status, errorText: 'invalid_json' };
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
