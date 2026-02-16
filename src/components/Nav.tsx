import Link from 'next/link';

export function Nav() {
  return (
    <nav className="flex items-center justify-between border-b border-foreground/10 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-foreground text-background grid place-items-center font-semibold">H</div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Superheroo</div>
          <div className="text-xs text-foreground/60">Admin Console</div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <Link className="text-foreground/80 hover:text-foreground" href="/helpers">
          Helpers
        </Link>
        <Link className="text-foreground/80 hover:text-foreground" href="/helpers/pending">
          Pending Helpers
        </Link>
        <Link className="text-foreground/80 hover:text-foreground" href="/buyers">
          Buyers
        </Link>
        <Link className="text-foreground/80 hover:text-foreground" href="/support/tickets">
          Support
        </Link>
        <Link className="text-foreground/80 hover:text-foreground" href="/tasks">
          Tasks
        </Link>
        <Link className="text-foreground/80 hover:text-foreground" href="/">
          Dashboard
        </Link>
      </div>
    </nav>
  );
}
