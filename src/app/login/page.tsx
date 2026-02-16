import { cookies } from 'next/headers';
import { loginAdminPassword, startAdminOtp, verifyAdminOtp } from './actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const step = sp.step || 'phone';
  const error = sp.error;

  const cookieStore = await cookies();
  const devOtp = cookieStore.get('him_admin_login_dev_otp')?.value;

  return (
    <main className="min-h-dvh grid place-items-center px-6">
      <section className="w-full max-w-md rounded-2xl border border-foreground/10 bg-background/80 backdrop-blur p-6 shadow-sm">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Superheroo Admin</h1>
          <p className="text-sm text-foreground/70">
            Sign in with phone OTP or email/password. For production, OTP is delivered via SMS.
          </p>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error.replaceAll('_', ' ')}</p>
          ) : null}
          {devOtp ? (
            <p className="text-xs text-foreground/70">
              Dev OTP: <span className="font-mono">{devOtp}</span>
            </p>
          ) : null}
        </header>

        {step === 'otp' ? (
          <form action={verifyAdminOtp} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              OTP
              <input
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                placeholder="Enter 6-digit OTP"
              />
            </label>
            <button className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
              Verify
            </button>
          </form>
        ) : (
          <form action={startAdminOtp} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              Phone
              <input
                name="phone"
                inputMode="tel"
                className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                placeholder="9999999999"
              />
            </label>
            <button className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
              Send OTP
            </button>
          </form>
        )}

        <div className="my-6 border-t border-foreground/10" />

        <form action={loginAdminPassword} className="space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input
              name="email"
              inputMode="email"
              autoComplete="email"
              className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
              placeholder="admin@helpinminutes.app"
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
              placeholder="Admin@12345"
            />
          </label>
          <button className="w-full rounded-lg border border-foreground/15 px-4 py-2 text-sm font-medium hover:bg-foreground/5">
            Sign in with password
          </button>
        </form>
      </section>
    </main>
  );
}
