import { useEffect, useRef, useState } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { buildKitToken, createZego } from '../lib/zego';

type LiveKycConfig = {
  appId: number;
  roomId: string;
  token: string;
  userId: string;
  userName: string;
  role?: string;
};

declare global {
  interface Window {
    __LIVE_KYC__?: LiveKycConfig;
  }
}

export default function LiveKycJoinPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cfg = window.__LIVE_KYC__;
    if (!cfg || !cfg.appId || !cfg.token || !cfg.roomId || !cfg.userId) {
      setError('Missing live KYC session.');
      return;
    }
    if (!containerRef.current) return;
    let zp: any = null;
    try {
      const kitToken = buildKitToken({
        appId: Number(cfg.appId),
        roomId: cfg.roomId,
        token: cfg.token,
        userId: cfg.userId,
        userName: cfg.userName || (cfg.role === 'helper' ? 'Superherooo' : 'Admin'),
      });
      zp = createZego(kitToken);
      zp.joinRoom({
        container: containerRef.current,
        scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
        showPreJoinView: false,
        turnOnCameraWhenJoining: true,
        showRoomTimer: true,
      });
    } catch (e) {
      console.error('Zego join failed', e);
      setError('Could not start live call. Please retry.');
      return;
    }
    return () => {
      try {
        zp.destroy();
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <div className="h-dvh w-screen bg-black">
      {error ? (
        <div className="p-4 text-sm text-red-400">{error}</div>
      ) : (
        <div ref={containerRef} className="h-full w-full" />
      )}
    </div>
  );
}
