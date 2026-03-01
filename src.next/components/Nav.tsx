import Link from 'next/link';

const navItems = [
  { label: 'Dashboard', href: '/', icon: '📊' },
  { label: 'Helpers', href: '/helpers', icon: '👥' },
  { label: 'Pending', href: '/helpers/pending', icon: '⏳' },
  { label: 'Buyers', href: '/buyers', icon: '🛒' },
  { label: 'Tasks', href: '/tasks', icon: '📋' },
  { label: 'Support', href: '/support/tickets', icon: '💬' },
  { label: 'Create User', href: '/signup', icon: '➕' },
];

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-foreground/8">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/superlogo.png"
            alt="Superheroo"
            className="h-9 w-9 rounded-xl object-cover ring-2 ring-foreground/5 group-hover:ring-indigo-500/30 transition-shadow"
          />
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight">Superheroo</div>
            <div className="text-[10px] text-foreground/50 font-medium uppercase tracking-wider">Admin Console</div>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className="rounded-lg px-3 py-2 text-xs font-medium text-foreground/65 hover:text-foreground hover:bg-foreground/5 transition-colors"
              href={item.href}
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
