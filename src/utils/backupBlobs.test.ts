import { describe, it, expect, beforeEach } from 'vitest';
import {
  fetchAttachmentBlobs,
  performImport,
  base64ToBytes,
  ATTACHMENT_BLOB_TABLE,
  type BackupEnvelope,
} from './backup';
import { putAssetFile } from '../demo/assetStore';
import { getDb } from '../db';

function png(): Blob {
  return new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' });
}

describe('portable attachment blobs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exports trial bytes as base64 blobs', async () => {
    const db = await getDb();
    await db.execute(
      `INSERT INTO attachments (id, filename, mime_type, file_path) VALUES (?, ?, ?, ?)`,
      ['b1', 'red.png', 'image/png', await putAssetFile('b1', png())],
    );
    const { blobs, skipped } = await fetchAttachmentBlobs();
    expect(skipped).toBe(0);
    expect(blobs).toHaveLength(1);
    expect(blobs[0].id).toBe('b1');
    expect(Array.from(base64ToBytes(blobs[0].data))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it('restores blobs on import and rewrites file_path', async () => {
    const { blobs } = await (async () => {
      const db = await getDb();
      await db.execute(
        `INSERT INTO attachments (id, filename, mime_type, file_path) VALUES (?, ?, ?, ?)`,
        ['b2', 'red.png', 'image/png', await putAssetFile('b2', png())],
      );
      return fetchAttachmentBlobs();
    })();
    expect(blobs).toHaveLength(1);
    const envelope: BackupEnvelope = {
      lance_backup: true,
      version: '0.9.9',
      exported_at: new Date().toISOString(),
      schema_version: 2,
      data: {
        attachments: [
          {
            id: 'b2',
            user_id: 1,
            entity_type: 'library',
            entity_id: 'root',
            filename: 'red.png',
            file_path: '/old/disk/path.png',
            mime_type: 'image/png',
            size_bytes: 8,
            tags: '[]',
            created_at: new Date().toISOString(),
          },
        ],
        [ATTACHMENT_BLOB_TABLE]: blobs,
      },
    };
    const written: Record<string, string> = {};
    const result = await performImport(envelope, 'additive', async (id, bytes, mime, filename) => {
      expect(Array.from(bytes)).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(mime).toBe('image/png');
      const path = `idb-restored:${filename}`;
      written[id] = path;
      return path;
    });
    expect(result.blobsRestored).toBe(1);
    expect(result.blobsSkipped).toBe(0);
    expect(written.b2).toBe('idb-restored:red.png');
    const db = await getDb();
    const rows = await db.select<{ file_path: string }[]>(
      `SELECT file_path FROM attachments WHERE id = 'b2'`,
    );
    expect(rows[0]?.file_path).toBe('idb-restored:red.png');
  });

  it('skips oversized blobs without failing the import', async () => {
    const big = {
      id: 'big',
      filename: 'huge.bin',
      mime_type: 'application/octet-stream',
      size_bytes: 1,
      data: 'AAAA',
    };
    const envelope: BackupEnvelope = {
      lance_backup: true,
      version: '0.9.9',
      exported_at: new Date().toISOString(),
      schema_version: 2,
      data: {
        attachments: [],
        [ATTACHMENT_BLOB_TABLE]: [big, { id: 'broken' }],
      },
    };
    // 'AAAA' decodes to 3 bytes — valid but tiny; craft an oversized entry instead.
    const huge = { ...big, data: 'A'.repeat(4 * 1024 * 1024) };
    (envelope.data[ATTACHMENT_BLOB_TABLE] as unknown[]).push(huge);
    const result = await performImport(envelope, 'additive', async () => 'x');
    expect(result.blobsRestored).toBe(1);
    expect(result.blobsSkipped).toBe(2);
    expect(result.failed).toBe(0);
  });
});
