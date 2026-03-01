'use server';

import { redirect } from 'next/navigation';

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://superheroobackend.onrender.com';

export async function signupBuyer(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const displayName = String(formData.get('displayName') || '').trim();

  if (!email || !password) {
    redirect('/signup?error=buyer_required');
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/auth/password/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        phone: phone || null,
        displayName: displayName || null,
        role: 'BUYER',
      }),
      cache: 'no-store',
    });
  } catch {
    redirect('/signup?error=backend_unreachable');
  }

  if (!res.ok) {
    redirect('/signup?error=buyer_failed');
  }

  redirect('/signup?success=buyer');
}

export async function signupHelperKyc(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const displayName = String(formData.get('displayName') || '').trim();
  const fullName = String(formData.get('fullName') || '').trim();
  const idNumber = String(formData.get('idNumber') || '').trim();
  const idFront = formData.get('idFront');
  const idBack = formData.get('idBack');
  const selfie = formData.get('selfie');

  if (!email || !password || !fullName || !idNumber || !idFront || !idBack || !selfie) {
    redirect('/signup?error=helper_required');
  }

  const body = new FormData();
  body.append('email', email);
  body.append('password', password);
  if (phone) body.append('phone', phone);
  if (displayName) body.append('displayName', displayName);
  body.append('fullName', fullName);
  body.append('idNumber', idNumber);
  body.append('idFront', idFront as Blob);
  body.append('idBack', idBack as Blob);
  body.append('selfie', selfie as Blob);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/auth/password/signup/helper-kyc`, {
      method: 'POST',
      body,
      cache: 'no-store',
    });
  } catch {
    redirect('/signup?error=backend_unreachable');
  }

  if (!res.ok) {
    redirect('/signup?error=helper_failed');
  }

  redirect('/signup?success=helper');
}
