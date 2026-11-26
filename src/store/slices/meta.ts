import type { UnifiedStore } from '../index';

// The preference lives in this slice; keep its store typing here too so the
// owning module does not need a type-only import back from the store index.
declare module '../types' {
  interface UnifiedStore {
    networkChecksEnabled: boolean;
    setNetworkChecksEnabled: (enabled: boolean) => void;
  }
}

const NETWORK_CHECKS_KEY = 'lance:network-checks-enabled';

/** Default-on: anything other than the literal string 'false' enables checks. */
function readNetworkChecksEnabled(): boolean {
  try {
    return localStorage.getItem(NETWORK_CHECKS_KEY) !== 'false';
  } catch {
    return true;
  }
}

/**
 * Meta slice: loading states, errors, initialization, portal state.
 * One place for the load/error convention instead of ~30 copies.
 */
export type MetaSlice = {
  initialized: boolean;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  portalPort: number | null;
  portalFailed: boolean;
  archetypeAppliedAt: number | null;
  networkChecksEnabled: boolean;
  setNetworkChecksEnabled: (enabled: boolean) => void;
  startLoad: (key: string) => void;
  endLoad: (key: string) => void;
  setError: (key: string, err: unknown) => void;
};

type GetMeta = () => {
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
};
type SetMeta = (
  partial: Partial<UnifiedStore> | ((state: UnifiedStore) => Partial<UnifiedStore>),
  replace?: boolean,
) => void;

export function createMetaSlice(set: SetMeta, get: GetMeta): MetaSlice {
  return {
    initialized: false,
    loading: {},
    errors: {},
    portalPort: null,
    portalFailed: false,
    archetypeAppliedAt: null,
    networkChecksEnabled: readNetworkChecksEnabled(),
    setNetworkChecksEnabled: (enabled) => {
      try {
        localStorage.setItem(NETWORK_CHECKS_KEY, String(enabled));
      } catch {
        /* private mode: preference is session-only */
      }
      set({ networkChecksEnabled: enabled });
    },
    startLoad: (key) => {
      const s = get();
      set({
        loading: { ...s.loading, [key]: true },
        errors: s.errors[key] ? { ...s.errors, [key]: null } : s.errors,
      });
    },
    endLoad: (key) => set({ loading: { ...get().loading, [key]: false } }),
    setError: (key, err) => set({ errors: { ...get().errors, [key]: String(err) } }),
  };
}
