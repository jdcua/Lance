/**
 * Offline validation.
 *
 * Uses `tauriInvoke`, not `invoke` from @tauri-apps/api directly: in the
 * browser (and therefore in the trial, where someone may well redeem a key they
 * were emailed) `window.__TAURI_INTERNALS__` is undefined, the raw invoke
 * throws, and the catch returned `false`, so every trial buyer saw "Invalid
 * license key" no matter what they typed.
 *
 * It is still only the OFFLINE HMAC check. It proves a key was minted by us; it
 * says nothing about tier or revocation. Both of those come from the worker.
 */
export async function validateLicenseKey(key: string): Promise<boolean> {
  if (!key || typeof key !== 'string') return false;
  // Coerce to a real boolean. In browser mode tauriInvoke returns {} for
  // commands the shim does not implement, and {} is truthy: every string,
  // including "hello", validated as a license and granted Pro. Requiring
  // `true` makes an unimplemented or malformed response mean "not valid",
  // which is the only safe reading.
  try {
    const { tauriInvoke } = await import('../utils/tauri');
    const result = await tauriInvoke<unknown>('validate_license', { key });
    return result === true;
  } catch {
    return false;
  }
}

export function validateLicenseKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const pattern = /^LANCE-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
  return pattern.test(key);
}
