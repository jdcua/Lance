/**
 * Store slice base: shared helpers used by every domain slice.
 *
 * Extracted from the god store so the load/set/error convention is defined
 * once instead of copied ~30 times.
 */
export type LoadingKey = string;
export type ErrorKey = string;

type StoreWithMeta = {
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
};

type StoreSet = (
  partial: Partial<StoreWithMeta> | ((state: StoreWithMeta) => Partial<StoreWithMeta>),
  replace?: boolean,
) => void;
type StoreGet = () => StoreWithMeta;

export function startLoad(set: StoreSet, get: StoreGet, key: LoadingKey) {
  const s = get();
  set({
    loading: { ...s.loading, [key]: true },
    errors: s.errors[key] ? { ...s.errors, [key]: null } : s.errors,
  });
}

export function endLoad(set: StoreSet, get: StoreGet, key: LoadingKey) {
  set({ loading: { ...get().loading, [key]: false } });
}

export function setError(set: StoreSet, get: StoreGet, key: ErrorKey, err: unknown) {
  console.error(`[store] load${key.slice(0, 1).toUpperCase()}${key.slice(1)} failed:`, err);
  set({ errors: { ...get().errors, [key]: String(err) } });
}
