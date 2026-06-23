export async function validateLicenseKey(key: string): Promise<boolean> {
  if (!key || typeof key !== 'string') return false;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<boolean>('validate_license', { key });
  } catch {
    return false;
  }
}

export function validateLicenseKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const pattern = /^LANCE-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
  return pattern.test(key);
}
