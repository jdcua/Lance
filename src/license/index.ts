declare const __LANCE_LICENSE_HASH__: string;

const LICENSE_SECRET_HASH = __LANCE_LICENSE_HASH__ || '';

export function validateLicenseKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;

  const pattern = /^LANCE-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
  if (!pattern.test(key)) return false;

  const stripped = key.replace('LANCE-', '').replace(/-/g, '');
  const check = simpleHash(stripped + LICENSE_SECRET_HASH);
  return check % 97 === 0;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
