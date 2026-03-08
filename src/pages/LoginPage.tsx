import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getApiBaseUrl } from '../lib/api';

const showDevOtp = (import.meta.env.VITE_DEV_SHOW_OTP || 'false').toLowerCase() === 'true';

export default function LoginPage() {
  const { loginWithPassword, startOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'start' | 'otp'>('start');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apiBase = useMemo(() => getApiBaseUrl(), []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await loginWithPassword(email.trim(), password.trim());
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'login_failed');
      return;
    }
    navigate('/');
  };

  const handleStartOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await startOtp(phone.trim());
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'otp_start_failed');
      return;
    }
    setDevOtp(showDevOtp ? res.devOtp ?? null : null);
    setStep('otp');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await verifyOtp(phone.trim(), otp.trim());
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'otp_verify_failed');
      return;
    }
    navigate('/');
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background text-foreground px-6">
      <div className="w-full max-w-4xl grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-foreground/10 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <img src="/superlogo.png" className="h-10 w-10 rounded-xl" alt="Superheroo" />
            <div>
              <div className="text-lg font-semibold">Superheroo Admin</div>
              <div className="text-xs text-foreground/60">API: {apiBase}</div>
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in with email</h1>
          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}
          <form className="space-y-3" onSubmit={handlePasswordLogin}>
            <input
              className="w-full rounded-xl border border-foreground/15 bg-transparent px-3 py-2 text-sm"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="w-full rounded-xl border border-foreground/15 bg-transparent px-3 py-2 text-sm"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              disabled={busy}
              className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-foreground/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Sign in with OTP</h2>
            <span className="text-xs text-foreground/50">Admin only</span>
          </div>
          {step === 'start' ? (
            <form className="space-y-3" onSubmit={handleStartOtp}>
              <input
                className="w-full rounded-xl border border-foreground/15 bg-transparent px-3 py-2 text-sm"
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <button
                disabled={busy}
                className="w-full rounded-xl border border-foreground/20 px-3 py-2 text-sm font-semibold hover:bg-foreground/5 disabled:opacity-60"
              >
                {busy ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={handleVerifyOtp}>
              <div className="text-xs text-foreground/60">OTP sent to {phone}</div>
              {showDevOtp && devOtp && (
                <div className="text-xs text-foreground/60">Dev OTP: <span className="font-mono">{devOtp}</span></div>
              )}
              <input
                className="w-full rounded-xl border border-foreground/15 bg-transparent px-3 py-2 text-sm"
                placeholder="OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('start')}
                  className="flex-1 rounded-xl border border-foreground/20 px-3 py-2 text-sm"
                >
                  Back
                </button>
                <button
                  disabled={busy}
                  className="flex-1 rounded-xl bg-foreground text-background px-3 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {busy ? 'Verifying…' : 'Verify OTP'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
