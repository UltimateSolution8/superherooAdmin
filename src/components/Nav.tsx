import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';

const navItems = [
  { label: 'Dashboard', href: '/', icon: '📊' },
  { label: 'Superherooos', href: '/helpers', icon: '👥' },
  { label: 'Pending', href: '/helpers/pending', icon: '⏳' },
  { label: 'Live KYC', href: '/kyc/live', icon: '📹' },
  { label: 'Citizens', href: '/buyers', icon: '🛒' },
  { label: 'Mediators', href: '/mediators', icon: '🧭' },
  { label: 'Tasks', href: '/tasks', icon: '📋' },
  { label: 'Bulk Requests', href: '/bulk-requests', icon: '🧾' },
  { label: 'Learn', href: '/learn', icon: '🎓' },
  { label: 'Support', href: '/support/tickets', icon: '💬' },
  { label: 'Send Alerts', href: '/notifications/send', icon: '📢' },
  { label: 'Create User', href: '/signup', icon: '➕' },
];

type ActionItem = {
  type: string;
  title: string;
  description: string;
  count: number;
  href: string;
  severity: string;
};

type ActionCenterResponse = {
  actionCount: number;
  items: ActionItem[];
  generatedAt: string;
};

export function Nav() {
  const { logout, state } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [actionCenter, setActionCenter] = useState<ActionCenterResponse | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const previousActionCount = useRef<number | null>(null);

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

  useEffect(() => {
    if (!state.accessToken) return;
    let active = true;
    const loadActions = async () => {
      const result = await apiFetch<ActionCenterResponse>(
        '/api/v1/admin/notifications/action-center',
        undefined,
        state.accessToken,
      );
      if (!active || !result.ok) return;
      const previous = previousActionCount.current;
      setActionCenter(result.data);
      previousActionCount.current = result.data.actionCount;
      if (
        previous != null
        && result.data.actionCount > previous
        && typeof Notification !== 'undefined'
        && Notification.permission === 'granted'
      ) {
        new Notification('Superheroo admin action required', {
          body: `${result.data.actionCount} item${result.data.actionCount === 1 ? '' : 's'} need attention.`,
        });
      }
    };
    void loadActions();
    const interval = window.setInterval(loadActions, 30_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadActions();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [state.accessToken]);

  const enableBrowserAlerts = async () => {
    if (typeof Notification === 'undefined') return;
    await Notification.requestPermission();
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-foreground/8">
      <div className="mx-auto flex max-w-7xl flex-nowrap items-center gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="group flex shrink-0 items-center gap-3">
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
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label="Open action center"
              aria-expanded={actionsOpen}
              onClick={() => setActionsOpen((open) => !open)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-foreground/15 text-base text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              🔔
              {(actionCenter?.actionCount || 0) > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-black leading-4 text-white shadow-sm">
                  {Math.min(actionCenter?.actionCount || 0, 99)}{(actionCenter?.actionCount || 0) > 99 ? '+' : ''}
                </span>
              ) : null}
            </button>
            {actionsOpen ? (
              <div className="absolute right-0 top-12 z-[70] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-foreground/10 bg-background shadow-2xl shadow-black/20">
                <div className="border-b border-foreground/10 px-4 py-3">
                  <div className="text-sm font-black">Action center</div>
                  <div className="mt-0.5 text-[11px] text-foreground/55">Live operational items requiring attention</div>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {actionCenter?.items?.length ? actionCenter.items.map((item) => (
                    <Link
                      key={item.type}
                      to={item.href}
                      onClick={() => setActionsOpen(false)}
                      className="flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-foreground/5"
                    >
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.count > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3 text-xs font-black">
                          <span>{item.title}</span>
                          <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-[10px]">{item.count}</span>
                        </span>
                        <span className="mt-1 block text-[11px] leading-4 text-foreground/55">{item.description}</span>
                      </span>
                    </Link>
                  )) : (
                    <div className="px-4 py-8 text-center text-xs text-foreground/55">No action is waiting. Operations are clear.</div>
                  )}
                </div>
                {typeof Notification !== 'undefined' && Notification.permission === 'default' ? (
                  <button
                    type="button"
                    onClick={enableBrowserAlerts}
                    className="w-full border-t border-foreground/10 px-4 py-3 text-left text-xs font-bold text-indigo-500 hover:bg-foreground/5"
                  >
                    Enable browser alerts
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="shrink-0 rounded-lg border border-foreground/15 px-3 py-2 text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-foreground/5"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
