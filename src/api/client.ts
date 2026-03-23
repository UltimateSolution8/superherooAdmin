const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'https://api.mysuperhero.xyz';

function sanitizeError(status: number): string {
  if (status === 401) return 'Session expired. Please sign in again.';
  if (status === 403) return 'You are not authorized to perform this action.';
  if (status === 404) return 'Requested resource was not found.';
  if (status === 429) return 'Too many attempts. Please wait and retry.';
  if (status >= 500) return 'Server error. Please retry in a moment.';
  return 'Request failed. Please try again.';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(sanitizeError(res.status));
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export async function login(email: string, password: string) {
  return request<{ accessToken: string }>(`/api/v1/auth/password/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getSummary(token: string) {
  return request(`/api/v1/admin/summary`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export type VideoKycItem = {
  id: string;
  helperId?: string | null;
  helperName?: string | null;
  status: string;
  createdAt: string;
  videoUrl?: string | null;
  docFrontUrl?: string | null;
  docBackUrl?: string | null;
  recommendation?: string | null;
  faceMatchScore?: number | null;
  livenessScore?: number | null;
  reviewerNotes?: string | null;
};

export type PageResponse<T> = {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
};

export async function listVideoKyc(token: string, status?: string | null): Promise<PageResponse<VideoKycItem>> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/api/v1/admin/video-kyc${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function actionVideoKyc(token: string, id: string, action: 'APPROVE' | 'REJECT', remarks?: string) {
  return request(`/api/v1/admin/video-kyc/${id}/action`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, remarks: remarks || '' }),
  });
}
