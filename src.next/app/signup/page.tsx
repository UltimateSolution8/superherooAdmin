import { signupBuyer, signupHelperKyc } from './actions';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const success = sp.success;
  const error = sp.error;

  return (
    <main className="min-h-dvh bg-background px-6 py-10">
      <section className="mx-auto max-w-5xl space-y-8">
        <header className="flex items-center gap-3">
          <img src="/superlogo.png" alt="Superheroo" className="h-12 w-12 rounded-xl object-cover" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Create buyer or helper</h1>
            <p className="text-sm text-foreground/70">
              Use these forms to create demo accounts. Helpers will be created with KYC pending review.
            </p>
          </div>
        </header>

        {success ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success === 'buyer' ? 'Buyer account created successfully.' : 'Helper account created and KYC submitted.'}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error.replaceAll('_', ' ')}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <form action={signupBuyer} className="rounded-2xl border border-foreground/10 bg-background/80 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Buyer signup</h2>
            <p className="text-sm text-foreground/60">Creates a buyer account with email + password.</p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium">
                Email
                <input
                  name="email"
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
                  name="password"
                  type="password"
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="Choose a password"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Phone (optional)
                <input
                  name="phone"
                  inputMode="tel"
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="9999999999"
                />
              </label>
              <label className="block text-sm font-medium">
                Display name (optional)
                <input
                  name="displayName"
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="Ravi"
                />
              </label>
              <button className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
                Create buyer
              </button>
            </div>
          </form>

          <form
            action={signupHelperKyc}
            encType="multipart/form-data"
            className="rounded-2xl border border-foreground/10 bg-background/80 p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold">Helper signup + KYC</h2>
            <p className="text-sm text-foreground/60">
              Creates a helper account and uploads KYC documents.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium">
                Email
                <input
                  name="email"
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
                  name="password"
                  type="password"
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="Choose a password"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Phone (optional)
                <input
                  name="phone"
                  inputMode="tel"
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="9999999999"
                />
              </label>
              <label className="block text-sm font-medium">
                Display name (optional)
                <input
                  name="displayName"
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="Akash"
                />
              </label>
              <label className="block text-sm font-medium">
                Full name
                <input
                  name="fullName"
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="Akash Kumar"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                ID number
                <input
                  name="idNumber"
                  className="mt-2 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/25"
                  placeholder="ID1234567"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                ID front
                <input
                  name="idFront"
                  type="file"
                  accept="image/*"
                  className="mt-2 w-full text-sm"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                ID back
                <input
                  name="idBack"
                  type="file"
                  accept="image/*"
                  className="mt-2 w-full text-sm"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Selfie
                <input
                  name="selfie"
                  type="file"
                  accept="image/*"
                  className="mt-2 w-full text-sm"
                  required
                />
              </label>
              <button className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
                Create helper + upload KYC
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
