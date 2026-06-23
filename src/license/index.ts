declare const __LANCE_LICENSE_HASH__: string;

const LICENSE_PRIME = 999999937n;

async function hmacSha256(message: string, secret: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', key, msgData);
}

export async function validateLicenseKey(key: string): Promise<boolean> {
  if (!key || typeof key !== 'string') return false;

  const pattern = /^LANCE-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
  if (!pattern.test(key)) return false;

  const stripped = key.replace('LANCE-', '').replace(/-/g, '');
  const hash = await hmacSha256(stripped, __LANCE_LICENSE_HASH__ || '');
  const view = new DataView(hash);
  const check = view.getBigUint64(0, false);
  return check % LICENSE_PRIME === 0n;
}

export function validateLicenseKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const pattern = /^LANCE-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
  return pattern.test(key);
}
