let cached: Promise<string> | null = null;

function isTauri() {
  return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
}

/**
 * Single source of truth for the app version at runtime.
 * - Tauri: reads the compiled version via @tauri-apps/api/app getVersion()
 * - Browser: uses the version injected at build time via vite `define`
 * The vite injection reads the same package.json the Rust build uses, so
 * both environments always agree.
 */
export function getRuntimeVersion(): Promise<string> {
  if (cached) return cached;
  cached = (async () => {
    if (isTauri()) {
      try {
        const { getVersion } = await import('@tauri-apps/api/app');
        return await getVersion();
      } catch {
        /* fall through to injected constant */
      }
    }
    return typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';
  })();
  return cached;
}