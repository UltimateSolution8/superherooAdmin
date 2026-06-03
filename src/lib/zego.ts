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
  // Do not pass cloudProxyConfig here. Zego's UIKit treats those hosts as a
  // proxy service and appends /proxy/ws, while this project receives standard
  // Web SDK room hosts from Zego. Let the SDK resolve the correct room server.
  return ZegoUIKitPrebuilt.create(kitToken);
}
