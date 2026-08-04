import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './auth';

type AdminRealtimeState = {
  connected: boolean;
  kycRevision: number;
  actionRevision: number;
};

const AdminRealtimeContext = createContext<AdminRealtimeState>({
  connected: false,
  kycRevision: 0,
  actionRevision: 0,
});

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://api.mysuperhero.xyz';

export function AdminRealtimeProvider({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const [connected, setConnected] = useState(false);
  const [kycRevision, setKycRevision] = useState(0);
  const [actionRevision, setActionRevision] = useState(0);

  useEffect(() => {
    if (!state.accessToken) {
      setConnected(false);
      return;
    }
    const socket = io(SOCKET_URL, {
      auth: { token: state.accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelayMax: 5_000,
    });
    const onConnected = () => setConnected(true);
    const onDisconnected = () => setConnected(false);
    const onKycSubmitted = () => {
      setKycRevision((value) => value + 1);
      setActionRevision((value) => value + 1);
    };
    const onActionRequired = () => setActionRevision((value) => value + 1);
    socket.on('connect', onConnected);
    socket.on('disconnect', onDisconnected);
    socket.on('connect_error', onDisconnected);
    socket.on('kyc.request_submitted', onKycSubmitted);
    socket.on('admin.action_required', onActionRequired);
    return () => {
      socket.removeAllListeners();
      socket.close();
      setConnected(false);
    };
  }, [state.accessToken]);

  const value = useMemo(
    () => ({ connected, kycRevision, actionRevision }),
    [connected, kycRevision, actionRevision],
  );
  return <AdminRealtimeContext.Provider value={value}>{children}</AdminRealtimeContext.Provider>;
}

export function useAdminRealtime() {
  return useContext(AdminRealtimeContext);
}
