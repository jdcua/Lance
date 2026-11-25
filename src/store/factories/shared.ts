/**
 * Primitives shared by the single store and its action factories.
 *
 * The store remains ONE zustand create() call in ../index.ts; these are plain
 * functions/types, never a second store. Keeping the invoke seam and the
 * trash snapshot here avoids duplicating them in each factory.
 */
import type { UnifiedStore } from '../types';
import { pushTrashEntry, trashLabel } from '../../utils/trash';

export type StoreSet = (
  partial: Partial<UnifiedStore> | ((state: UnifiedStore) => Partial<UnifiedStore>),
  replace?: boolean,
) => void;
export type StoreGet = () => UnifiedStore;

export const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  const { tauriInvoke } = await import('../../utils/tauri');
  return tauriInvoke<T>(cmd, args);
};

/** Snapshot a row into the trash bin before a destructive delete. */
export function snapshotForTrash(
  table: string,
  id: string,
  row: Record<string, unknown> | undefined,
): void {
  if (!row) return;
  try {
    pushTrashEntry(table, id, trashLabel(table, row), { ...row });
  } catch {
    /* trash is best-effort; the delete still proceeds */
  }
}
