/**
 * Brand Voice Notes · Copywriter feature.
 * Single brand voice record per client with save-in-place editing.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Save, Trash2 } from 'lucide-react';

type BrandVoice = {
  id: string;
  client_id: string;
  name?: string;
  attributes?: string;
  examples?: string;
  dos_donts?: string;
};

export default function BrandVoiceNotes({ clientId }: { clientId: string }) {
  const [brandVoice, setBrandVoice] = useState<BrandVoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    attributes: '',
    examples: '',
    dos_donts: '',
  });

  const loadBrandVoice = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(BrandVoice & Record<string, unknown>)[]>(
        'SELECT id, client_id, name, attributes, examples, dos_donts FROM brand_voices WHERE client_id = ? ORDER BY id ASC LIMIT 1',
        [clientId]
      );
      if (rows.length > 0) {
        const bv: BrandVoice = {
          id: rows[0].id as string,
          client_id: rows[0].client_id as string,
          name: rows[0].name as string | undefined,
          attributes: rows[0].attributes as string | undefined,
          examples: rows[0].examples as string | undefined,
          dos_donts: rows[0].dos_donts as string | undefined,
        };
        setBrandVoice(bv);
        setForm({
          name: bv.name || '',
          attributes: bv.attributes || '',
          examples: bv.examples || '',
          dos_donts: bv.dos_donts || '',
        });
      } else {
        setBrandVoice(null);
        setForm({ name: '', attributes: '', examples: '', dos_donts: '' });
      }
    } catch (e) {
      console.error('[BrandVoiceNotes] loadBrandVoice failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadBrandVoice();
  }, [clientId, loadBrandVoice]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const db = await getDb();
      if (brandVoice) {
        await db.execute(
          'UPDATE brand_voices SET name = ?, attributes = ?, examples = ?, dos_donts = ? WHERE id = ?',
          [form.name || null, form.attributes || null, form.examples || null, form.dos_donts || null, brandVoice.id]
        );
        setBrandVoice({
          ...brandVoice,
          name: form.name || undefined,
          attributes: form.attributes || undefined,
          examples: form.examples || undefined,
          dos_donts: form.dos_donts || undefined,
        });
      } else {
        const id = crypto.randomUUID();
        await db.execute(
          'INSERT INTO brand_voices (id, client_id, name, attributes, examples, dos_donts) VALUES (?, ?, ?, ?, ?, ?)',
          [id, clientId, form.name || null, form.attributes || null, form.examples || null, form.dos_donts || null]
        );
        setBrandVoice({
          id,
          client_id: clientId,
          name: form.name || undefined,
          attributes: form.attributes || undefined,
          examples: form.examples || undefined,
          dos_donts: form.dos_donts || undefined,
        });
      }
      setShowForm(false);
    } catch (e) {
      console.error('[BrandVoiceNotes] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!brandVoice) return;
    try {
      const db = await getDb();
      await db.execute('DELETE FROM brand_voices WHERE id = ?', [brandVoice.id]);
      setBrandVoice(null);
      setForm({ name: '', attributes: '', examples: '', dos_donts: '' });
    } catch (e) {
      console.error('[BrandVoiceNotes] handleDelete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Brand Voice</h4>
        </div>
        <div className="h-20 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Brand Voice</h4>
        <div className="flex items-center gap-1">
          {brandVoice && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
                {showForm ? 'Cancel' : 'Edit'}
              </Button>
              <button
                aria-label="Delete brand voice notes"
                onClick={handleDelete} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] p-1">
                <Trash2 size={12} />
              </button>
            </>
          )}
          {!brandVoice && (
            <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
              Define Brand Voice
            </Button>
          )}
        </div>
      </div>

      {(showForm || !brandVoice) && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Brand voice name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <textarea
            placeholder="Brand attributes (tone, voice qualities)"
            value={form.attributes}
            onChange={(e) => setForm({ ...form, attributes: e.target.value })}
            rows={3}
            className={inputClass + ' resize-none'}
          />
          <textarea
            placeholder="Examples of ideal copy"
            value={form.examples}
            onChange={(e) => setForm({ ...form, examples: e.target.value })}
            rows={3}
            className={inputClass + ' resize-none'}
          />
          <textarea
            placeholder="Do's and Don'ts"
            value={form.dos_donts}
            onChange={(e) => setForm({ ...form, dos_donts: e.target.value })}
            rows={3}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            {brandVoice && (
              <Button variant="secondary" size="sm" onClick={() => { setShowForm(false); loadBrandVoice(); }}>Cancel</Button>
            )}
            <Button size="sm" onClick={handleSave} loading={saving}>
              <Save size={12} /> Save
            </Button>
          </div>
        </div>
      )}

      {brandVoice && !showForm && (
        <div className="space-y-2">
          {brandVoice.name && (
            <div className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <p className="font-medium text-[var(--text-primary)]">{brandVoice.name}</p>
            </div>
          )}
          {brandVoice.attributes && (
            <div className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] mb-1">Attributes</p>
              <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{brandVoice.attributes}</p>
            </div>
          )}
          {brandVoice.examples && (
            <div className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] mb-1">Examples</p>
              <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{brandVoice.examples}</p>
            </div>
          )}
          {brandVoice.dos_donts && (
            <div className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] mb-1">Do's / Don'ts</p>
              <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{brandVoice.dos_donts}</p>
            </div>
          )}
          {!brandVoice.name && !brandVoice.attributes && !brandVoice.examples && !brandVoice.dos_donts && (
            <p className="text-xs text-[var(--text-tertiary)] py-2">No brand voice defined yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
