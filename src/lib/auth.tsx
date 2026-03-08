import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { apiFetch } from './api';

export type AuthUser = {
  id?: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
};

type AuthContextValue = {
  state: AuthState;
  loginWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  startOtp: (phone: string) => Promise<{ ok: boolean; devOtp?: string; error?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  hydrate: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_KEY = 'superheroo_admin_access';
const REFRESH_KEY = 'superheroo_admin_refresh';
const USER_KEY = 'superheroo_admin_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const accessToken = localStorage.getItem(ACCESS_KEY);
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    const user = userRaw ? (JSON.parse(userRaw) as AuthUser) : null;
    return { accessToken, refreshToken, user };
  });

  const persist = useCallback((next: AuthState) => {
    setState(next);
    if (next.accessToken) localStorage.setItem(ACCESS_KEY, next.accessToken);
    else localStorage.removeItem(ACCESS_KEY);
    if (next.refreshToken) localStorage.setItem(REFRESH_KEY, next.refreshToken);
    else localStorage.removeItem(REFRESH_KEY);
    if (next.user) localStorage.setItem(USER_KEY, JSON.stringify(next.user));
    else localStorage.removeItem(USER_KEY);
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ accessToken: string; refreshToken: string; user: AuthUser }>(
      '/api/v1/auth/password/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
    );
    if (!res.ok) return { ok: false, error: res.errorText };
    if (res.data.user?.role !== 'ADMIN') return { ok: false, error: 'admin_only' };
    persist({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken, user: res.data.user });
    return { ok: true };
  }, [persist]);

  const startOtp = useCallback(async (phone: string) => {
    const res = await apiFetch<{ devOtp?: string }>(
      '/api/v1/auth/otp/start',
      {
        method: 'POST',
        body: JSON.stringify({ phone, role: 'ADMIN' }),
      },
    );
    if (!res.ok) return { ok: false, error: res.errorText };
    return { ok: true, devOtp: res.data?.devOtp };
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    const res = await apiFetch<{ accessToken: string; refreshToken: string; user: AuthUser }>(
      '/api/v1/auth/otp/verify',
      {
        method: 'POST',
        body: JSON.stringify({ phone, otp, role: 'ADMIN' }),
      },
    );
    if (!res.ok) return { ok: false, error: res.errorText };
    if (res.data.user?.role !== 'ADMIN') return { ok: false, error: 'admin_only' };
    persist({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken, user: res.data.user });
    return { ok: true };
  }, [persist]);

  const logout = useCallback(() => {
    persist({ accessToken: null, refreshToken: null, user: null });
  }, [persist]);

  const hydrate = useCallback(() => {
    const accessToken = localStorage.getItem(ACCESS_KEY);
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    const user = userRaw ? (JSON.parse(userRaw) as AuthUser) : null;
    setState({ accessToken, refreshToken, user });
  }, []);

  const value = useMemo(
    () => ({ state, loginWithPassword, startOtp, verifyOtp, logout, hydrate }),
    [state, loginWithPassword, startOtp, verifyOtp, logout, hydrate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider missing');
  return ctx;
}
