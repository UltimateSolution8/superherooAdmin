'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://superheroobackend.onrender.com';

function isDevOtpEnabled() {
  return (process.env.DEV_SHOW_OTP || 'false').toLowerCase() === 'true';
}

export async function startAdminOtp(formData: FormData) {
  const phone = String(formData.get('phone') || '').trim();
  if (!phone) {
    redirect('/login?error=phone_required');
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/auth/otp/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, role: 'ADMIN' }),
      cache: 'no-store',
    });
  } catch {
    redirect('/login?error=backend_unreachable');
  }

  if (!res.ok) {
    redirect('/login?error=otp_start_failed');
  }

  const json = (await res.json()) as { devOtp?: string };
  const cookieStore = await cookies();
  cookieStore.set('him_admin_login_phone', phone, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/login',
    maxAge: 10 * 60,
  });

  if (isDevOtpEnabled() && json.devOtp) {
    cookieStore.set('him_admin_login_dev_otp', json.devOtp, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/login',
      maxAge: 10 * 60,
    });
  } else {
    cookieStore.delete('him_admin_login_dev_otp');
  }

  redirect('/login?step=otp');
}

export async function verifyAdminOtp(formData: FormData) {
  const otp = String(formData.get('otp') || '').trim();
  const cookieStore = await cookies();
  const phone = cookieStore.get('him_admin_login_phone')?.value;

  if (!phone) {
    redirect('/login?error=missing_phone');
  }
  if (!otp) {
    redirect('/login?step=otp&error=otp_required');
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, role: 'ADMIN' }),
      cache: 'no-store',
    });
  } catch {
    redirect('/login?step=otp&error=backend_unreachable');
  }

  if (!res.ok) {
    redirect('/login?step=otp&error=otp_invalid');
  }

  const json = (await res.json()) as { accessToken: string; refreshToken: string };
  cookieStore.set('him_admin_access', json.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });
  cookieStore.set('him_admin_refresh', json.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  cookieStore.delete('him_admin_login_phone');
  cookieStore.delete('him_admin_login_dev_otp');

  redirect('/');
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete('him_admin_access');
  cookieStore.delete('him_admin_refresh');
  redirect('/login');
}

export async function loginAdminPassword(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();
  if (!email || !password) {
    redirect('/login?error=email_password_required');
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/auth/password/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch {
    redirect('/login?error=backend_unreachable');
  }

  if (!res.ok) {
    redirect('/login?error=invalid_credentials');
  }

  const json = (await res.json()) as { accessToken: string; refreshToken: string; user?: { role?: string } };
  if (!json.user || json.user.role !== 'ADMIN') {
    redirect('/login?error=admin_only');
  }

  const cookieStore = await cookies();
  cookieStore.set('him_admin_access', json.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });
  cookieStore.set('him_admin_refresh', json.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  cookieStore.delete('him_admin_login_phone');
  cookieStore.delete('him_admin_login_dev_otp');

  redirect('/');
}
