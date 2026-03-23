const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/;
const IN_PHONE_RE = /^[6-9]\d{9}$/;

export function normalizeEmailOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeIndianPhoneOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const raw = value.trim();
  if (!raw) return null;

  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits || null;
}

export function validateEmailOrNull(value: string | null | undefined): boolean {
  const normalized = normalizeEmailOrNull(value);
  if (normalized == null) return true;
  if (normalized.length > 254 || normalized.includes('..')) return false;
  return EMAIL_RE.test(normalized);
}

export function validateIndianPhoneOrNull(value: string | null | undefined): boolean {
  const normalized = normalizeIndianPhoneOrNull(value);
  if (normalized == null) return true;
  return IN_PHONE_RE.test(normalized);
}
