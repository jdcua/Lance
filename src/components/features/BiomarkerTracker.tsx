/**
 * Biomarker Tracker · Nutritionist feature.
 * Track health biomarkers with latest value prominently shown.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type Biomarker = {
  id: string;
  client_id: string;
  name: string;
  value: number;
  unit?: string;
  date: string;
  reference_range?: string;
  notes?: string;
};

export default function BiomarkerTracker({ clientId }: { clientId: string }) {
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    value: '',
    unit: '',
    date: new Date().toISOString().split('T')[0],
    reference_range: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadBiomarkers = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Biomarker & Record<string, unknown>)[]>(
        'SELECT id, client_id, name, value, unit, date, reference_range, notes FROM biomarkers WHERE client_id = ? ORDER BY name ASC, date DESC',
        [clientId],
      );
      setBiomarkers(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          name: r.name as string,
          value: r.value as number,
          unit: r.unit as string | undefined,
          date: r.date as string,
          reference_range: r.reference_range as string | undefined,
          notes: r.notes as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[BiomarkerTracker] loadBiomarkers failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadBiomarkers();
  }, [clientId, loadBiomarkers]);

  const latestByType = biomarkers.reduce<Record<string, Biomarker>>((acc, b) => {
    if (!acc[b.name] || b.date > acc[b.name].date) {
      acc[b.name] = b;
    }
    return acc;
  }, {});

  const handleSave = async () => {
    if (!form.name.trim() || !form.value) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO biomarkers (id, client_id, name, value, unit, date, reference_range, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          clientId,
          form.name.trim(),
          parseFloat(form.value),
          form.unit || null,
          form.date,
          form.reference_range || null,
          form.notes || null,
        ],
      );
      const biomarker: Biomarker = {
        id,
        client_id: clientId,
        name: form.name.trim(),
        value: parseFloat(form.value),
        unit: form.unit || undefined,
        date: form.date,
        reference_range: form.reference_range || undefined,
        notes: form.notes || undefined,
      };
      setBiomarkers((prev) =>
        [...prev, biomarker].sort(
          (a, b) => a.name.localeCompare(b.name) || b.date.localeCompare(a.date),
        ),
      );
      setForm({
        name: '',
        value: '',
        unit: '',
        date: new Date().toISOString().split('T')[0],
        reference_range: '',
        notes: '',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[BiomarkerTracker] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM biomarkers WHERE id = ?', [id]);
      setBiomarkers((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      console.error('[BiomarkerTracker] handleDelete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Biomarkers</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Biomarkers ({biomarkers.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Reading
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Biomarker name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              step="0.01"
              placeholder="Value"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className={inputClass}
            />
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass}
            />
          </div>
          <input
            type="text"
            placeholder="Reference range (e.g. 60-100)"
            value={form.reference_range}
            onChange={(e) => setForm({ ...form, reference_range: e.target.value })}
            className={inputClass}
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!form.name.trim() || !form.value}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {biomarkers.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No biomarker readings yet.</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(latestByType).map(([name, b]) => (
              <div key={name} className="px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs">
                <p className="text-[10px] text-[var(--text-tertiary)]">{name}</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {b.value}
                  {b.unit ? ` ${b.unit}` : ''}
                </p>
                {b.reference_range && (
                  <p className="text-[10px] text-[var(--text-tertiary)]">{b.reference_range}</p>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {biomarkers.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs"
              >
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">{b.name}</span>
                  <span className="text-[var(--text-primary)] font-mono">
                    {b.value}
                    {b.unit ? ` ${b.unit}` : ''}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {b.date?.split('T')[0]}
                  </span>
                  {b.reference_range && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {b.reference_range}
                    </span>
                  )}
                  {b.notes && (
                    <span className="text-[10px] text-[var(--text-tertiary)] truncate">
                      {b.notes}
                    </span>
                  )}
                </div>
                <button
                  aria-label="Delete biomarker tracker"
                  onClick={() => handleDelete(b.id)}
                  className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
