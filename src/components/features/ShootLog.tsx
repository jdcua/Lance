/**
 * Shoot Log · Photographer / Filmmaker feature.
 * Logs photo/video shoots with location, type, camera system, hours.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { Plus, Trash2, MapPin, Camera, Clock } from 'lucide-react';

export default function ShootLog({ projectId }: { projectId: string }) {
  const { shoots, loadShoots, addShoot, removeShoot } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ shoot_date: '', location: '', shoot_type: '', camera_system: '', hours_on_location: '', conditions_notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadShoots(); }, [projectId, loadShoots]);

  const list = shoots.filter(s => s.project_id === projectId);

  const handleSave = async () => {
    if (!form.shoot_date.trim()) return;
    setSaving(true);
    try {
      await addShoot({ project_id: projectId, shoot_date: form.shoot_date || undefined, location: form.location || undefined, shoot_type: form.shoot_type || undefined, camera_system: form.camera_system || undefined, hours_on_location: form.hours_on_location ? parseFloat(form.hours_on_location) : undefined, conditions_notes: form.conditions_notes || undefined });
      setForm({ shoot_date: '', location: '', shoot_type: '', camera_system: '', hours_on_location: '', conditions_notes: '' });
      setShowForm(false);
    } catch { /* handled */ }
    setSaving(false);
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Shoots</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Shoot
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="date" value={form.shoot_date} onChange={(e) => setForm({ ...form, shoot_date: e.target.value })} className={inputClass} />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Shoot type" value={form.shoot_type} onChange={(e) => setForm({ ...form, shoot_type: e.target.value })} className={inputClass} />
          </div>
          <input type="text" placeholder="Camera system" value={form.camera_system} onChange={(e) => setForm({ ...form, camera_system: e.target.value })} className={inputClass} />
          <input type="number" placeholder="Hours on location" step="0.5" value={form.hours_on_location} onChange={(e) => setForm({ ...form, hours_on_location: e.target.value })} className={inputClass} />
          <input type="text" placeholder="Conditions / notes" value={form.conditions_notes} onChange={(e) => setForm({ ...form, conditions_notes: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving}>Save</Button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No shoots logged yet.</p>
      ) : (
        <div className="space-y-1">
          {list.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-[var(--text-primary)]">{s.shoot_date?.split('T')[0] || '--'}</span>
                <span className="text-[var(--text-tertiary)] ml-2">
                  {s.location && <><MapPin size={10} className="inline mr-0.5" />{s.location} </>}
                  {s.camera_system && <><Camera size={10} className="inline mr-0.5 ml-1" />{s.camera_system} </>}
                  {s.hours_on_location != null && <><Clock size={10} className="inline mr-0.5 ml-1" />{s.hours_on_location}h</>}
                </span>
              </div>
              <button
                aria-label="Delete shoot log"
                onClick={() => removeShoot(s.id, projectId)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
