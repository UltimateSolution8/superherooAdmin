import { useEffect, useRef, useState } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

type LiveKycConfig = {
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
    if (!cfg || !cfg.token || !cfg.roomId) {
      setError('Missing live KYC session.');
      return;
    }
    if (!containerRef.current) return;
    const zp = ZegoUIKitPrebuilt.create(cfg.token);
    zp.joinRoom({
      container: containerRef.current,
      scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
      showPreJoinView: false,
      turnOnCameraWhenJoining: true,
      showRoomTimer: true,
    });
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
