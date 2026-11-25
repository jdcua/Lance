import type { UnifiedStore } from '../index';

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
