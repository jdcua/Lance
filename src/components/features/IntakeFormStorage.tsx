/**
 * Intake Form Storage · Wellness feature.
 * Single record per client. Form data as large textarea, save in place.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Save, FileText } from 'lucide-react';

type IntakeForm = {
  id: string;
  client_id: string;
  form_data?: string;
  created_at: string;
};

export default function IntakeFormStorage({ clientId }: { clientId: string }) {
  const [intake, setIntake] = useState<IntakeForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const loadIntake = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(IntakeForm & Record<string, unknown>)[]>(
        'SELECT id, client_id, form_data, created_at FROM intake_forms WHERE client_id = ? ORDER BY created_at DESC LIMIT 1',
        [clientId],
      );
      if (rows.length > 0) {
        const r = rows[0];
        const item: IntakeForm = {
          id: r.id as string,
          client_id: r.client_id as string,
          form_data: r.form_data as string | undefined,
          created_at: r.created_at as string,
        };
        setIntake(item);
        setFormData(item.form_data || '');
      }
    } catch (e) {
      console.error('[IntakeFormStorage] loadIntake failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadIntake();
  }, [clientId, loadIntake]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const db = await getDb();
      if (intake) {
        await db.execute('UPDATE intake_forms SET form_data = ? WHERE id = ?', [
          formData,
          intake.id,
        ]);
        setIntake({ ...intake, form_data: formData });
      } else {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await db.execute(
          'INSERT INTO intake_forms (id, client_id, form_data, created_at) VALUES (?, ?, ?, ?)',
          [id, clientId, formData, now],
        );
        setIntake({ id, client_id: clientId, form_data: formData, created_at: now });
      }
      setLastSaved(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('[IntakeFormStorage] save failed:', e);
    }
    setSaving(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Intake Form</h4>
        </div>
        <div className="h-32 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Intake Form</h4>
        <div className="flex items-center gap-2">
          {intake && (
            <span className="text-[10px] text-[var(--text-tertiary)]">
              Created {formatDate(intake.created_at)}
            </span>
          )}
          <Button size="sm" onClick={handleSave} loading={saving}>
            <Save size={12} /> Save
          </Button>
        </div>
      </div>

      {lastSaved && (
        <p className="text-[10px] text-[var(--text-tertiary)]">Last saved at {lastSaved}</p>
      )}

      <div className="space-y-1">
        <div className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
          <FileText size={10} />
          <span>Form data (JSON or free text)</span>
        </div>
        <textarea
          value={formData}
          onChange={(e) => setFormData(e.target.value)}
          rows={12}
          placeholder="Enter intake form data..."
          className={inputClass + ' resize-y font-mono text-[11px]'}
        />
      </div>
    </div>
  );
}
