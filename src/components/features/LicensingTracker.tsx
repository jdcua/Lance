/**
 * Licensing Tracker · Illustrator / Musician feature.
 * Tracks asset licenses with revenue totals, grouped by license type.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, DollarSign } from 'lucide-react';

type AssetLicense = {
  id: string;
  asset_id: string;
  license_type: string;
  licensee?: string;
  term?: string;
  fee?: number;
  currency: string;
  created_at: string;
};

const LICENSE_TYPES = [
  'commercial',
  'editorial',
  'exclusive',
  'print-rights',
  'web-only',
  'other',
];

export default function LicensingTracker({ assetId }: { assetId?: string }) {
  const [licenses, setLicenses] = useState<AssetLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    license_type: LICENSE_TYPES[0],
    licensee: '',
    term: '',
    fee: '',
    currency: 'CAD',
  });
  const [saving, setSaving] = useState(false);

  const loadLicenses = useCallback(async () => {
    try {
      const db = await getDb();
      let rows: (AssetLicense & Record<string, unknown>)[];
      if (assetId) {
        rows = await db.select<(AssetLicense & Record<string, unknown>)[]>(
          'SELECT id, asset_id, license_type, licensee, term, fee, currency, created_at FROM asset_licenses WHERE asset_id = ? ORDER BY created_at DESC',
          [assetId]
        );
      } else {
        rows = await db.select<(AssetLicense & Record<string, unknown>)[]>(
          'SELECT id, asset_id, license_type, licensee, term, fee, currency, created_at FROM asset_licenses ORDER BY created_at DESC'
        );
      }
      setLicenses(
        rows.map((r) => ({
          id: r.id as string,
          asset_id: r.asset_id as string,
          license_type: r.license_type as string,
          licensee: r.licensee as string | undefined,
          term: r.term as string | undefined,
          fee: r.fee as number | undefined,
          currency: r.currency as string,
          created_at: r.created_at as string,
        }))
      );
    } catch (e) {
      console.error('[LicensingTracker] loadLicenses failed:', e);
    }
    setLoading(false);
  }, [assetId]);

  useEffect(() => {
    loadLicenses();
  }, [assetId, loadLicenses]);

  const handleSave = async () => {
    if (!form.license_type) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const assetIdValue = assetId || '';
      const db = await getDb();
      await db.execute(
        'INSERT INTO asset_licenses (id, asset_id, license_type, licensee, term, fee, currency, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          assetIdValue,
          form.license_type,
          form.licensee || null,
          form.term || null,
          form.fee ? parseFloat(form.fee) : null,
          form.currency,
          new Date().toISOString(),
        ]
      );
      const item: AssetLicense = {
        id,
        asset_id: assetIdValue,
        license_type: form.license_type,
        licensee: form.licensee || undefined,
        term: form.term || undefined,
        fee: form.fee ? parseFloat(form.fee) : undefined,
        currency: form.currency,
        created_at: new Date().toISOString(),
      };
      setLicenses((prev) => {
        const next = [item, ...prev];
        next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return next;
      });
      setForm({
        license_type: LICENSE_TYPES[0],
        licensee: '',
        term: '',
        fee: '',
        currency: 'CAD',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[LicensingTracker] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM asset_licenses WHERE id = ?', [id]);
      setLicenses((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      console.error('[LicensingTracker] handleDelete failed:', e);
    }
  };

  const totalRevenue = licenses.reduce((sum, l) => sum + (l.fee || 0), 0);

  const grouped: Record<string, AssetLicense[]> = {};
  for (const l of licenses) {
    if (!grouped[l.license_type]) grouped[l.license_type] = [];
    grouped[l.license_type].push(l);
  }

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Licenses
          </h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {licenses.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded-[8px] text-xs">
          <DollarSign size={14} className="text-[var(--accent-ink,var(--accent))]" />
          <span className="text-[var(--text-secondary)]">Total licensing revenue:</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {new Intl.NumberFormat('en-CA', {
              style: 'currency',
              currency: licenses[0]?.currency || 'CAD',
            }).format(totalRevenue)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Licenses ({licenses.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add License
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <select
            value={form.license_type}
            onChange={(e) => setForm({ ...form, license_type: e.target.value })}
            className={inputClass}
          >
            {LICENSE_TYPES.map((lt) => (
              <option key={lt} value={lt}>
                {lt}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Licensee"
              value={form.licensee}
              onChange={(e) => setForm({ ...form, licensee: e.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Term (e.g. 1 year)"
              value={form.term}
              onChange={(e) => setForm({ ...form, term: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Fee"
              value={form.fee}
              onChange={(e) => setForm({ ...form, fee: e.target.value })}
              className={inputClass}
              min="0"
              step="0.01"
            />
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className={inputClass}
            >
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              Save
            </Button>
          </div>
        </div>
      )}

      {licenses.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No licenses yet. Add your first asset license.
        </p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">
                  {type}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  ({items.length})
                </span>
              </div>
              <div className="space-y-1">
                {items.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs"
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="font-medium text-[var(--text-primary)]">
                        {l.licensee || '--'}
                      </span>
                      {l.term && (
                        <span className="text-[10px] text-[var(--text-tertiary)]">{l.term}</span>
                      )}
                      {l.fee != null && (
                        <span className="text-[10px] font-semibold text-[var(--accent-ink,var(--accent))]">
                          {new Intl.NumberFormat('en-CA', {
                            style: 'currency',
                            currency: l.currency,
                          }).format(l.fee)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(l.id)}
                      className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
