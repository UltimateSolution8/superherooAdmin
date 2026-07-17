import { useEffect, useState, useMemo } from 'react';
import { Nav } from '../components/Nav';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';

type UserRow = {
  id: string;
  displayName: string | null;
  phone: string;
  email: string | null;
};

type SendResult = {
  targetedUsers: number;
  usersWithPushTokens: number;
  deviceTokens: number;
  queued: boolean;
};

type NotificationStatus = {
  firebaseReady: boolean;
  registeredDeviceTokens: number;
  deliveryMode: string;
};

export default function SendNotificationsPage() {
  const { state } = useAuth();
  const [buyers, setBuyers] = useState<UserRow[]>([]);
  const [helpers, setHelpers] = useState<UserRow[]>([]);
  const [mediators, setMediators] = useState<UserRow[]>([]);
  
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sending, setSending] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetRole, setTargetRole] = useState<'ALL' | 'CITIZEN' | 'PARTNER' | 'MEDIATOR'>('ALL');
  const [scope, setScope] = useState<'ALL' | 'SPECIFIC'>('ALL');
  
  // Specific users selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Record<string, boolean>>({});

  // Fetch users list
  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingUsers(true);
      const [buyersRes, helpersRes, mediatorsRes, statusRes] = await Promise.all([
        apiFetch<UserRow[]>('/api/v1/admin/buyers', undefined, state.accessToken),
        apiFetch<UserRow[]>('/api/v1/admin/helpers', undefined, state.accessToken),
        apiFetch<UserRow[]>('/api/v1/admin/mediators', undefined, state.accessToken),
        apiFetch<NotificationStatus>('/api/v1/admin/notifications/status', undefined, state.accessToken),
      ]);
      if (!active) return;
      setLoadingUsers(false);
      
      if (buyersRes.ok && Array.isArray(buyersRes.data)) {
        setBuyers(buyersRes.data);
      }
      if (helpersRes.ok && Array.isArray(helpersRes.data)) {
        setHelpers(helpersRes.data);
      }
      if (mediatorsRes.ok && Array.isArray(mediatorsRes.data)) {
        setMediators(mediatorsRes.data);
      }
      if (statusRes.ok) setNotificationStatus(statusRes.data);
      if (!buyersRes.ok || !helpersRes.ok || !mediatorsRes.ok || !statusRes.ok) {
        setMessage({ type: 'error', text: 'Some audience lists could not be loaded. Refresh and try again.' });
      }
    })();
    return () => {
      active = false;
    };
  }, [state.accessToken]);

  // Reset selection when role or scope changes
  useEffect(() => {
    setSelectedUserIds({});
  }, [targetRole, scope]);

  // Resolve target users list based on selected role
  const targetUsersList = useMemo(() => {
    if (targetRole === 'CITIZEN') {
      return buyers;
    } else if (targetRole === 'PARTNER') {
      return helpers;
    } else if (targetRole === 'MEDIATOR') {
      return mediators;
    } else {
      return [...buyers, ...helpers, ...mediators];
    }
  }, [targetRole, buyers, helpers, mediators]);

  // Filter list by search query
  const filteredUsersList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return targetUsersList;
    return targetUsersList.filter(
      (u) =>
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        u.phone.includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [searchQuery, targetUsersList]);

  // Toggle selection for a single user
  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Toggle all visible filtered users
  const toggleSelectAll = () => {
    const allSelected = filteredUsersList.every((u) => selectedUserIds[u.id]);
    const updated = { ...selectedUserIds };
    filteredUsersList.forEach((u) => {
      updated[u.id] = !allSelected;
    });
    setSelectedUserIds(updated);
  };

  // Form submission handler
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setMessage({ type: 'error', text: 'Title and Message cannot be empty.' });
      return;
    }

    const selectedIds = Object.keys(selectedUserIds).filter((id) => selectedUserIds[id]);
    if (scope === 'SPECIFIC' && selectedIds.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one target user.' });
      return;
    }

    setSending(true);
    setMessage(null);

    const res = await apiFetch<SendResult>(
      '/api/v1/admin/notifications/send',
      {
        method: 'POST',
        body: JSON.stringify({
          role: targetRole,
          userIds: scope === 'SPECIFIC' ? selectedIds : null,
          title: title.trim(),
          body: body.trim(),
        }),
      },
      state.accessToken
    );

    setSending(false);

    if (res.ok && res.data.queued) {
      setMessage({
        type: 'success',
        text: `Notification queued for ${res.data.usersWithPushTokens} user${res.data.usersWithPushTokens === 1 ? '' : 's'} across ${res.data.deviceTokens} registered device${res.data.deviceTokens === 1 ? '' : 's'}.`,
      });
      setTitle('');
      setBody('');
      setSelectedUserIds({});
    } else if (res.ok) {
      setMessage({
        type: 'error',
        text: res.data.targetedUsers > 0
          ? 'The selected users do not have an active push token. Ask them to open and sign in to the latest app.'
          : 'No active users match this audience.',
      });
    } else {
      setMessage({ type: 'error', text: res.errorText || 'Failed to send notifications.' });
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <header className="space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Send Notifications</h1>
          <p className="text-sm text-foreground/60">
            Dispatch real-time push alerts to registered mobile apps by role or individual selections.
          </p>
        </header>

        {message && (
          <div
            className={`rounded-xl border p-4 text-sm ${
              message.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {notificationStatus ? (
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs ${
            notificationStatus.firebaseReady
              ? 'border-emerald-500/25 bg-emerald-500/8 text-foreground'
              : 'border-amber-500/30 bg-amber-500/10 text-foreground'
          }`}>
            <div>
              <span className="font-black">Delivery service: {notificationStatus.deliveryMode}</span>
              <span className="ml-2 text-foreground/60">
                {notificationStatus.registeredDeviceTokens} registered device token{notificationStatus.registeredDeviceTokens === 1 ? '' : 's'}
              </span>
            </div>
            {!notificationStatus.firebaseReady ? (
              <span className="font-semibold text-amber-600 dark:text-amber-300">
                Firebase is unavailable; only Expo tokens can receive alerts.
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Form Composer (2/3 width) */}
          <section className="md:col-span-2 rounded-2xl border border-foreground/10 p-6 bg-foreground/2 space-y-5">
            <h2 className="text-lg font-semibold border-b border-foreground/10 pb-2">Compose Notification</h2>
            
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/75 mb-1.5">
                  Target Role
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(['ALL', 'CITIZEN', 'PARTNER', 'MEDIATOR'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTargetRole(r)}
                      className={`rounded-xl px-4 py-3 text-xs font-bold border transition-all ${
                        targetRole === r
                          ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                          : 'bg-background border-foreground/15 text-foreground hover:bg-foreground/5'
                      }`}
                    >
                      {r === 'ALL'
                        ? 'All App Roles'
                        : r === 'CITIZEN'
                          ? 'Citizens'
                          : r === 'PARTNER'
                            ? 'Partners'
                            : 'Mediators'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/75 mb-1.5">
                  Target Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScope('ALL')}
                    className={`rounded-xl px-4 py-3 text-xs font-bold border transition-all ${
                      scope === 'ALL'
                        ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-background border-foreground/15 text-foreground hover:bg-foreground/5'
                    }`}
                  >
                    Broadcast to All of Role
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('SPECIFIC')}
                    className={`rounded-xl px-4 py-3 text-xs font-bold border transition-all ${
                      scope === 'SPECIFIC'
                        ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-background border-foreground/15 text-foreground hover:bg-foreground/5'
                    }`}
                  >
                    Select Specific Users
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="notif-title" className="block text-xs font-semibold uppercase tracking-wider text-foreground/75 mb-1.5">
                  Notification Title
                </label>
                <input
                  id="notif-title"
                  type="text"
                  placeholder="Enter a clear title (e.g. Special weekend bonus)"
                  maxLength={80}
                  className="w-full rounded-xl border border-foreground/15 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="notif-body" className="block text-xs font-semibold uppercase tracking-wider text-foreground/75 mb-1.5">
                  Message / Body
                </label>
                <textarea
                  id="notif-body"
                  rows={4}
                  placeholder="Enter message details..."
                  className="w-full rounded-xl border border-foreground/15 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={500}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all"
              >
                {sending ? 'Dispatching Push Alerts...' : 'Send Push Notifications'}
              </button>
            </form>
          </section>

          {/* User selector side panel (1/3 width) */}
          <section className="rounded-2xl border border-foreground/10 p-5 bg-foreground/2 flex flex-col h-[520px]">
            <h2 className="text-sm font-semibold mb-3">Target List ({targetUsersList.length})</h2>
            
            {scope === 'ALL' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-foreground/10 rounded-xl bg-background/50">
                <span className="text-3xl mb-2">📢</span>
                <div className="text-xs font-bold text-foreground/75 uppercase tracking-wider">Broadcast Mode</div>
                <div className="text-[11px] text-foreground/50 mt-1">
                  Notifications will be sent to all users with active push tokens matching the selected role.
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                {/* Search input */}
                <input
                  type="text"
                  placeholder="Search user..."
                  className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                {/* Bulk toggles */}
                <div className="flex items-center justify-between text-xs px-1">
                  <button
                    onClick={toggleSelectAll}
                    className="text-indigo-400 font-semibold hover:underline"
                    disabled={filteredUsersList.length === 0}
                  >
                    Select All Visible
                  </button>
                  <span className="text-foreground/50 text-[10px]">
                    {Object.keys(selectedUserIds).filter((k) => selectedUserIds[k]).length} Selected
                  </span>
                </div>

                {/* Scrollable list */}
                <div className="flex-1 overflow-y-auto border border-foreground/10 rounded-xl bg-background divide-y divide-foreground/5">
                  {loadingUsers ? (
                    <div className="p-4 text-center text-xs text-foreground/50">Loading users...</div>
                  ) : filteredUsersList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-foreground/50">No users found</div>
                  ) : (
                    filteredUsersList.map((u) => {
                      const selected = !!selectedUserIds[u.id];
                      return (
                        <label
                          key={u.id}
                          className="flex items-start gap-3 p-3 hover:bg-foreground/3 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleUser(u.id)}
                            className="mt-0.5 rounded border-foreground/20 text-indigo-500 focus:ring-indigo-500"
                          />
                          <div className="min-w-0 leading-tight">
                            <div className="text-xs font-bold text-foreground truncate">
                              {u.displayName || 'Unnamed User'}
                            </div>
                            <div className="text-[10px] text-foreground/50 mt-0.5">
                              {u.phone}
                            </div>
                            {u.email && (
                              <div className="text-[9px] text-foreground/40 truncate">
                                {u.email}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
