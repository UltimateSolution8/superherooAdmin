export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; errorText: string };

type BackendErrorShape = {
  code?: string;
  message?: string;
  details?: {
    fields?: Record<string, string>;
  };
};

const AUTH_EXPIRED_EVENT = 'superheroo-admin-auth-expired';
let lastAuthExpiredEmitAt = 0;

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

export function onAuthExpired(handler: () => void): () => void {
  const listener = () => handler();
  window.addEventListener(AUTH_EXPIRED_EVENT, listener);
  return () => window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
}

function emitAuthExpired() {
  const now = Date.now();
  if (now - lastAuthExpiredEmitAt < 1000) return;
  lastAuthExpiredEmitAt = now;
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string | null,
): Promise<ApiResult<T>> {
  const headers = new Headers(init?.headers);
  const isFormDataBody = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  if (!headers.has('Content-Type') && !isFormDataBody) {
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
    return { ok: false, status: 0, errorText: mapErrorToMessage(0, '') };
  }

  if (!res.ok) {
    const rawError = await safeText(res);
    if ((res.status === 401 || res.status === 403) && !path.startsWith('/api/v1/auth/')) {
      emitAuthExpired();
    }
    const errorText = mapErrorToMessage(res.status, rawError);
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

function parseBackendError(raw: string): BackendErrorShape | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BackendErrorShape;
    return typeof parsed === 'object' && parsed != null ? parsed : null;
  } catch {
    return null;
  }
}

function mapErrorToMessage(status: number, raw: string): string {
  const parsed = parseBackendError(raw);
  const code = (parsed?.code || '').toUpperCase();
  const message = (parsed?.message || '').toLowerCase();
  const fields = parsed?.details?.fields ? Object.keys(parsed.details.fields).filter(Boolean) : [];

  if (status === 0) return 'Unable to reach server. Please check your internet and try again.';
  if (status === 401) return 'Session expired. Please sign in again.';
  if (status === 403) return 'You are not authorized to perform this action.';
  if (status === 404) return 'Requested resource was not found.';
  if (status === 429 || code === 'RATE_LIMIT') return 'Too many attempts. Please wait and retry.';

  if (code === 'VALIDATION_ERROR') {
    if (fields.length > 0) return `Please check ${fields.join(', ')} and try again.`;
    return 'Please check your input and try again.';
  }

  if (message.includes('invalid credentials')) return 'Invalid email or password.';
  if (message.includes('admin only')) return 'Admin access only.';
  if (message.includes('role mismatch')) return 'This account is not allowed for this action.';

  if (code === 'CONFLICT') return 'This record already exists.';
  if (code === 'NOT_FOUND') return 'Requested record was not found.';
  if (code === 'BAD_REQUEST') return 'Request could not be processed. Please verify your input.';
  if (code === 'INTERNAL') return 'Something went wrong. Please try again.';

  if (status >= 500) return 'Server error. Please retry in a moment.';
  return 'Request failed. Please try again.';
}
