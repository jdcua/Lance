import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { ExternalLink, CheckCircle, AlertCircle, Clock } from 'lucide-react';

type Delivery = {
  id: string;
  project_id: string;
  selects_count?: number;
  delivered_count?: number;
  gallery_link?: string;
  delivery_date?: string;
  notes?: string;
};

type DeliveryFormState = {
  selects_count: string;
  delivered_count: string;
  gallery_link: string;
  delivery_date: string;
  notes: string;
};

type DeliveryStatus = 'pending' | 'partial' | 'complete';

const parseCount = (v: string) => (v ? parseInt(v) : null);
const parseCountOptional = (v: string) => (v ? parseInt(v) : undefined);
const textOrNull = (v: string) => v || null;
const textOrOptional = (v: string) => v || undefined;

function deliveryStatus(delivery: Delivery | null): DeliveryStatus {
  const selects = delivery?.selects_count || 0;
  const delivered = delivery?.delivered_count || 0;
  if (delivered > 0 && delivered < selects) return 'partial';
  if (delivered >= selects && selects > 0) return 'complete';
  return 'pending';
}

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', color: 'text-[var(--warning-text)]' },
  partial: { icon: AlertCircle, label: 'Partial', color: 'text-[var(--warning-text)]' },
  complete: { icon: CheckCircle, label: 'Complete', color: 'text-[var(--accent-ink,var(--accent))]' },
} as const;

const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

function DeliveryForm({
  form,
  setForm,
  delivery,
  saving,
  onSave,
  onCancel,
}: {
  form: DeliveryFormState;
  setForm: React.Dispatch<React.SetStateAction<DeliveryFormState>>;
  delivery: Delivery | null;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input type="number" placeholder="Selects count" value={form.selects_count} onChange={(e) => setForm({ ...form, selects_count: e.target.value })} className={inputClass} />
        <input type="number" placeholder="Delivered count" value={form.delivered_count} onChange={(e) => setForm({ ...form, delivered_count: e.target.value })} className={inputClass} />
      </div>
      <input type="url" placeholder="Gallery link" value={form.gallery_link} onChange={(e) => setForm({ ...form, gallery_link: e.target.value })} className={inputClass} />
      <input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} className={inputClass} />
      <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
      <div className="flex justify-end gap-2">
        {delivery && <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>}
        <Button size="sm" onClick={onSave} loading={saving}>Save</Button>
      </div>
    </div>
  );
}

function DeliveryDisplay({ delivery, status }: { delivery: Delivery; status: DeliveryStatus }) {
  const selects = delivery.selects_count || 0;
  const delivered = delivery.delivered_count || 0;
  const StatusIcon = statusConfig[status].icon;
  return (
    <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[var(--text-tertiary)]">
            <span className="font-medium text-[var(--text-primary)]">{delivered}</span> / {selects} delivered
          </span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[status].color} glass`}>
          <StatusIcon size={10} /> {statusConfig[status].label}
        </span>
      </div>
      {delivery.gallery_link && (
        <a href={delivery.gallery_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--accent-ink,var(--accent))] hover:underline">
          <ExternalLink size={10} /> Gallery
        </a>
      )}
      {delivery.delivery_date && (
        <div className="text-[var(--text-tertiary)]">Delivery date: {delivery.delivery_date.split('T')[0]}</div>
      )}
      {delivery.notes && (
        <div className="text-[var(--text-tertiary)]">{delivery.notes}</div>
      )}
    </div>
  );
}

export default function DeliveryTracker({ projectId }: { projectId: string }) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ selects_count: '', delivered_count: '', gallery_link: '', delivery_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadDelivery = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<Delivery[]>('SELECT * FROM project_deliveries WHERE project_id = $1 LIMIT 1', [projectId]);
      if (rows.length > 0) {
        setDelivery(rows[0]);
        setForm({
          selects_count: rows[0].selects_count?.toString() || '',
          delivered_count: rows[0].delivered_count?.toString() || '',
          gallery_link: rows[0].gallery_link || '',
          delivery_date: rows[0].delivery_date?.split('T')[0] || '',
          notes: rows[0].notes || '',
        });
      }
    } catch { /* handled */ }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadDelivery(); }, [projectId, loadDelivery]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const db = await getDb();
      const values = [parseCount(form.selects_count), parseCount(form.delivered_count), textOrNull(form.gallery_link), textOrNull(form.delivery_date), textOrNull(form.notes)];
      const optional = {
        selects_count: parseCountOptional(form.selects_count),
        delivered_count: parseCountOptional(form.delivered_count),
        gallery_link: textOrOptional(form.gallery_link),
        delivery_date: textOrOptional(form.delivery_date),
        notes: textOrOptional(form.notes),
      };
      if (delivery) {
        await db.execute(
          'UPDATE project_deliveries SET selects_count = $1, delivered_count = $2, gallery_link = $3, delivery_date = $4, notes = $5 WHERE id = $6',
          [...values, delivery.id]
        );
        setDelivery({ ...delivery, ...optional });
      } else {
        const id = crypto.randomUUID();
        await db.execute(
          'INSERT INTO project_deliveries (id, project_id, selects_count, delivered_count, gallery_link, delivery_date, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [id, projectId, ...values]
        );
        setDelivery({ id, project_id: projectId, ...optional });
      }
      setEditing(false);
    } catch { /* handled */ }
    setSaving(false);
  };

  const status = deliveryStatus(delivery);

  if (loading) return <p className="text-xs text-[var(--text-tertiary)] py-2">Loading...</p>;

  const headerLabel = delivery ? (editing ? 'Cancel' : 'Edit') : 'Set Delivery';
  const onHeaderClick = () => delivery ? setEditing(!editing) : handleSave();

  let body: React.ReactNode;
  if (!delivery && !editing) {
    body = <p className="text-xs text-[var(--text-tertiary)] py-2">No delivery record yet.</p>;
  } else if (editing) {
    body = (
      <DeliveryForm
        form={form}
        setForm={setForm}
        delivery={delivery}
        saving={saving}
        onSave={handleSave}
        onCancel={() => setEditing(false)}
      />
    );
  } else {
    body = <DeliveryDisplay delivery={delivery!} status={status} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Delivery</h4>
        <Button variant="ghost" size="sm" onClick={onHeaderClick}>{headerLabel}</Button>
      </div>
      {body}
    </div>
  );
}
