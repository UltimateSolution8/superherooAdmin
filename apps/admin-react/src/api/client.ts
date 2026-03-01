const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://159.89.167.248:8081';

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
    throw new Error(text || `HTTP ${res.status}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export async function login(email: string, password: string) {
  return request<{ accessToken: string }>(`/api/v1/admin/login`, {
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
