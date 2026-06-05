import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const navItems = [
  { label: 'Dashboard', href: '/', icon: '📊' },
  { label: 'Helpers', href: '/helpers', icon: '👥' },
  { label: 'Pending', href: '/helpers/pending', icon: '⏳' },
  { label: 'Live KYC', href: '/kyc/live', icon: '📹' },
  { label: 'Buyers', href: '/buyers', icon: '🛒' },
  { label: 'Tasks', href: '/tasks', icon: '📋' },
  { label: 'Bulk Requests', href: '/bulk-requests', icon: '🧾' },
  { label: 'Learn', href: '/learn', icon: '🎓' },
  { label: 'Support', href: '/support/tickets', icon: '💬' },
  { label: 'Create User', href: '/signup', icon: '➕' },
];

export function Nav() {
  const { logout, state } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const role = state.user?.role || 'ADMIN';
  const allowedNavItems = navItems.filter((item) => {
    if (role === 'ADMIN') return true;
    if (role === 'KYC') {
      return ['/kyc/live', '/helpers/pending', '/signup', '/'].includes(item.href);
    }
    if (role === 'SUPPORT') {
      return ['/support/tickets', '/tasks', '/buyers', '/helpers', '/'].includes(item.href);
    }
    return false;
  });

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-foreground/8">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3 px-6 py-3">
        <Link to="/" className="flex items-center gap-3 group">
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
        <div className="flex flex-wrap items-center gap-1">
          {allowedNavItems.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  active ? 'bg-foreground/10 text-foreground' : 'text-foreground/65 hover:text-foreground hover:bg-foreground/5'
                }`}
                to={item.href}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="rounded-lg border border-foreground/15 px-3 py-2 text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-foreground/5"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
