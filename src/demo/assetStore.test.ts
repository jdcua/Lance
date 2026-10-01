import { describe, it, expect } from 'vitest';
import {
  putAssetFile,
  getAssetFile,
  deleteAssetFile,
  clearAssetFiles,
  IDB_PREFIX,
} from './assetStore';

function png(): Blob {
  // Minimal 1x1 PNG bytes; content doesn't matter, round-trip does.
  return new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' });
}

describe('trial asset store', () => {
  it('round-trips bytes under an idb: path', async () => {
    const path = await putAssetFile('a1', png());
    expect(path).toBe(`${IDB_PREFIX}a1`);
    const back = await getAssetFile('a1');
    expect(back).not.toBeNull();
    expect(back?.type).toBe('image/png');
    expect(back?.size).toBe(8);
  });

  it('returns null for unknown ids', async () => {
    expect(await getAssetFile('nope')).toBeNull();
  });

  it('delete removes bytes', async () => {
    await putAssetFile('a2', png());
    await deleteAssetFile('a2');
    expect(await getAssetFile('a2')).toBeNull();
  });

  it('clear removes everything', async () => {
    await putAssetFile('a3', png());
    await putAssetFile('a4', png());
    await clearAssetFiles();
    expect(await getAssetFile('a3')).toBeNull();
    expect(await getAssetFile('a4')).toBeNull();
  });
});
