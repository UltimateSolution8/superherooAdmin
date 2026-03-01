import { useState } from 'react';
import { Nav } from '../components/Nav';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function SignupPage() {
  const { state } = useAuth();
  const [buyer, setBuyer] = useState({ email: '', password: '', phone: '', displayName: '' });
  const [helper, setHelper] = useState({
    email: '',
    password: '',
    phone: '',
    displayName: '',
    fullName: '',
    idNumber: '',
  });
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const createBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const res = await apiFetch(
      '/api/v1/auth/password/signup',
      {
        method: 'POST',
        body: JSON.stringify({
          email: buyer.email,
          password: buyer.password,
          phone: buyer.phone || null,
          displayName: buyer.displayName || null,
          role: 'BUYER',
        }),
      },
      state.accessToken,
    );
    if (!res.ok) {
      setMessage(`Buyer signup failed: ${res.errorText}`);
      return;
    }
    setMessage('Buyer account created successfully.');
    setBuyer({ email: '', password: '', phone: '', displayName: '' });
  };

  const createHelper = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!idFront || !idBack || !selfie) {
      setMessage('Helper KYC images are required.');
      return;
    }
    const body = new FormData();
    body.append('email', helper.email);
    body.append('password', helper.password);
    if (helper.phone) body.append('phone', helper.phone);
    if (helper.displayName) body.append('displayName', helper.displayName);
    body.append('fullName', helper.fullName);
    body.append('idNumber', helper.idNumber);
    body.append('idFront', idFront);
    body.append('idBack', idBack);
    body.append('selfie', selfie);

    const res = await apiFetch(
      '/api/v1/auth/password/signup/helper-kyc',
      {
        method: 'POST',
        body,
        headers: {},
      },
      state.accessToken,
    );

    if (!res.ok) {
      setMessage(`Helper signup failed: ${res.errorText}`);
      return;
    }
    setMessage('Helper account created and KYC submitted.');
    setHelper({ email: '', password: '', phone: '', displayName: '', fullName: '', idNumber: '' });
    setIdFront(null);
    setIdBack(null);
    setSelfie(null);
  };

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <header className="flex items-center gap-3">
          <img src="/superlogo.png" alt="Superheroo" className="h-12 w-12 rounded-xl object-cover" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Create buyer or helper</h1>
            <p className="text-sm text-foreground/70">
              Use these forms to create demo accounts. Helpers will be created with KYC pending review.
            </p>
          </div>
        </header>

        {message ? (
          <div className="rounded-xl border border-foreground/15 bg-foreground/5 px-4 py-3 text-sm text-foreground/80">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={createBuyer} className="rounded-2xl border border-foreground/10 bg-background/80 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Buyer signup</h2>
            <p className="text-sm text-foreground/60">Creates a buyer account with email + password.</p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium">
                Email
                <input
                  value={buyer.email}
                  onChange={(e) => setBuyer((b) => ({ ...b, email: e.target.value }))}
                  inputMode="email"
                  autoComplete="email"
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="buyer@example.com"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Password
                <input
                  value={buyer.password}
                  onChange={(e) => setBuyer((b) => ({ ...b, password: e.target.value }))}
                  type="password"
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="Choose a password"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Phone (optional)
                <input
                  value={buyer.phone}
                  onChange={(e) => setBuyer((b) => ({ ...b, phone: e.target.value }))}
                  inputMode="tel"
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="9999999999"
                />
              </label>
              <label className="block text-sm font-medium">
                Display name (optional)
                <input
                  value={buyer.displayName}
                  onChange={(e) => setBuyer((b) => ({ ...b, displayName: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="Ravi"
                />
              </label>
              <button className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
                Create buyer
              </button>
            </div>
          </form>

          <form onSubmit={createHelper} className="rounded-2xl border border-foreground/10 bg-background/80 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Helper signup + KYC</h2>
            <p className="text-sm text-foreground/60">Creates a helper account and uploads KYC documents.</p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium">
                Email
                <input
                  value={helper.email}
                  onChange={(e) => setHelper((h) => ({ ...h, email: e.target.value }))}
                  inputMode="email"
                  autoComplete="email"
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="helper@example.com"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Password
                <input
                  value={helper.password}
                  onChange={(e) => setHelper((h) => ({ ...h, password: e.target.value }))}
                  type="password"
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="Choose a password"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Phone (optional)
                <input
                  value={helper.phone}
                  onChange={(e) => setHelper((h) => ({ ...h, phone: e.target.value }))}
                  inputMode="tel"
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="9999999999"
                />
              </label>
              <label className="block text-sm font-medium">
                Display name (optional)
                <input
                  value={helper.displayName}
                  onChange={(e) => setHelper((h) => ({ ...h, displayName: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="Akash"
                />
              </label>
              <label className="block text-sm font-medium">
                Full name
                <input
                  value={helper.fullName}
                  onChange={(e) => setHelper((h) => ({ ...h, fullName: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="Akash Kumar"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                ID number
                <input
                  value={helper.idNumber}
                  onChange={(e) => setHelper((h) => ({ ...h, idNumber: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="ID1234567"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                ID front
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 w-full text-sm"
                  onChange={(e) => setIdFront(e.target.files?.[0] ?? null)}
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                ID back
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 w-full text-sm"
                  onChange={(e) => setIdBack(e.target.files?.[0] ?? null)}
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Selfie
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 w-full text-sm"
                  onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
                  required
                />
              </label>
              <button className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
                Create helper + upload KYC
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
