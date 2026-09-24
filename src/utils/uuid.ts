/**
 * UUID generation that survives non-secure contexts. crypto.randomUUID
 * requires https/localhost/Tauri — over plain http (LAN IPs, some WebViews)
 * it is undefined and all 170+ bare call sites would throw. The fallback
 * prefers getRandomValues (available everywhere) and degrades to Math.random
 * only where even that is missing. v4 shape in all cases.
 */
export function safeRandomUUID(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
