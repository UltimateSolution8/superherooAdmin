import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

type LiveSessionTokenInput = {
  appId: number;
  roomId: string;
  token: string;
  userId: string;
  userName?: string | null;
};

type LegacyKitPayload = {
  appID?: number;
  roomID?: string;
  userID?: string;
  userName?: string;
  token?: string;
};

function safeDecodeBase64Json<T>(value: string): T | null {
  try {
    return JSON.parse(atob(value)) as T;
  } catch {
    return null;
  }
}

function decodeUserName(value?: string | null): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseProxyHost(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^wss?:\/\//i.test(trimmed) ? trimmed : `wss://${trimmed}`;
    return new URL(withProtocol).hostname || null;
  } catch {
    return null;
  }
}

function zegoProxyHosts(): string[] {
  const defaults = [
    'webliveroom1400407177-api.coolzcloud.com',
    'webliveroom1400407177-api-bak.coolzcloud.com',
  ];
  const fromEnv = [
    import.meta.env.VITE_ZEGO_WS_PRIMARY as string | undefined,
    import.meta.env.VITE_ZEGO_WS_SECONDARY as string | undefined,
  ]
    .map((v) => (v ? parseProxyHost(v) : null))
    .filter((v): v is string => Boolean(v));

  return fromEnv.length > 0 ? fromEnv : defaults;
}

export function buildKitToken(input: LiveSessionTokenInput): string {
  const raw = (input.token || '').trim();
  if (!raw) throw new Error('missing_token');

  // Already in kit token format (roomToken#payload).
  if (raw.includes('#')) return raw;

  // Token04 room token (recommended).
  if (raw.startsWith('04')) {
    return ZegoUIKitPrebuilt.generateKitTokenForProduction(
      Number(input.appId),
      raw,
      input.roomId,
      input.userId,
      input.userName || 'Admin',
    );
  }

  // Backward compatibility for older backend payloads (base64 JSON).
  const legacy = safeDecodeBase64Json<LegacyKitPayload>(raw);
  if (legacy?.token && legacy.appID && legacy.roomID && legacy.userID) {
    return ZegoUIKitPrebuilt.generateKitTokenForProduction(
      Number(legacy.appID),
      legacy.token,
      legacy.roomID,
      legacy.userID,
      decodeUserName(legacy.userName) || input.userName || 'Admin',
    );
  }

  // Last fallback: treat raw as room token for current room/user.
  return ZegoUIKitPrebuilt.generateKitTokenForProduction(
    Number(input.appId),
    raw,
    input.roomId,
    input.userId,
    input.userName || 'Admin',
  );
}

export function createZego(kitToken: string) {
  const hosts = zegoProxyHosts();
  if (hosts.length === 0) {
    return ZegoUIKitPrebuilt.create(kitToken);
  }
  return ZegoUIKitPrebuilt.create(kitToken, {
    cloudProxyConfig: {
      proxyList: hosts.map((hostName) => ({ hostName })),
    },
  });
}
