/**
 * Program Builder · Trainer feature.
 * Manage training programs with name, duration, sessions/wk, and inline editing.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Dumbbell, Clock, CalendarDays } from 'lucide-react';

type Program = {
  id: string;
  client_id: string;
  name: string;
  duration_weeks?: number;
  sessions_per_week?: number;
  notes?: string;
};

export default function ProgramBuilder({ clientId }: { clientId: string }) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Program>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', duration_weeks: '', sessions_per_week: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadPrograms = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Program & Record<string, unknown>)[]>(
        'SELECT id, client_id, name, duration_weeks, sessions_per_week, notes FROM programs WHERE client_id = ? ORDER BY name ASC',
        [clientId]
      );
      setPrograms(rows.map(r => ({
        id: r.id as string,
        client_id: r.client_id as string,
        name: r.name as string,
        duration_weeks: r.duration_weeks as number | undefined,
        sessions_per_week: r.sessions_per_week as number | undefined,
        notes: r.notes as string | undefined,
      })));
    } catch (e) { console.error('[ProgramBuilder] loadPrograms failed:', e); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { loadPrograms(); }, [clientId, loadPrograms]);

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO programs (id, client_id, name, duration_weeks, sessions_per_week, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [id, clientId, addForm.name.trim(), addForm.duration_weeks ? parseInt(addForm.duration_weeks) : null, addForm.sessions_per_week ? parseInt(addForm.sessions_per_week) : null, addForm.notes || null]
      );
      const program: Program = { id, client_id: clientId, name: addForm.name.trim(), duration_weeks: addForm.duration_weeks ? parseInt(addForm.duration_weeks) : undefined, sessions_per_week: addForm.sessions_per_week ? parseInt(addForm.sessions_per_week) : undefined, notes: addForm.notes || undefined };
      setPrograms(prev => [...prev, program].sort((a, b) => a.name.localeCompare(b.name)));
      setAddForm({ name: '', duration_weeks: '', sessions_per_week: '', notes: '' });
      setShowAdd(false);
    } catch (e) { console.error('[ProgramBuilder] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM programs WHERE id = ?', [id]);
      setPrograms(prev => prev.filter(p => p.id !== id));
    } catch (e) { console.error('[ProgramBuilder] delete failed:', e); }
  };

  const handleEditToggle = (program: Program) => {
    if (editingId === program.id) {
      setEditingId(null);
      setEditForm({});
    } else {
      setEditingId(program.id);
      setEditForm({
        name: program.name,
        duration_weeks: program.duration_weeks,
        sessions_per_week: program.sessions_per_week,
        notes: program.notes,
      });
    }
  };

  const handleEditSave = async (programId: string) => {
    try {
      const db = await getDb();
      const updates: string[] = [];
      const values: unknown[] = [];
      if (editForm.name !== undefined) { updates.push('name = ?'); values.push(editForm.name); }
      if (editForm.duration_weeks !== undefined) { updates.push('duration_weeks = ?'); values.push(editForm.duration_weeks); }
      if (editForm.sessions_per_week !== undefined) { updates.push('sessions_per_week = ?'); values.push(editForm.sessions_per_week); }
      if (editForm.notes !== undefined) { updates.push('notes = ?'); values.push(editForm.notes); }
      if (updates.length > 0) {
        values.push(programId);
        await db.execute(`UPDATE programs SET ${updates.join(', ')} WHERE id = ?`, values);
      }
      setPrograms(prev => prev.map(p => p.id === programId ? { ...p, name: editForm.name ?? p.name, duration_weeks: editForm.duration_weeks as number | undefined ?? p.duration_weeks, sessions_per_week: editForm.sessions_per_week as number | undefined ?? p.sessions_per_week, notes: editForm.notes ?? p.notes } : p));
      setEditingId(null);
      setEditForm({});
    } catch (e) { console.error('[ProgramBuilder] edit failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Programs</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Programs ({programs.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={12} /> New Program
        </Button>
      </div>

      {showAdd && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input type="text" placeholder="Program name" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Duration (weeks)" value={addForm.duration_weeks} onChange={(e) => setAddForm({ ...addForm, duration_weeks: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Sessions / week" value={addForm.sessions_per_week} onChange={(e) => setAddForm({ ...addForm, sessions_per_week: e.target.value })} className={inputClass} />
          </div>
          <input type="text" placeholder="Notes" value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!addForm.name.trim()}>Add</Button>
          </div>
        </div>
      )}

      {programs.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No programs created yet.</p>
      ) : (
        <div className="space-y-1">
          {programs.map((program) => (
            <div key={program.id}>
              {editingId === program.id ? (
                <div className="p-2 glass border border-[var(--accent)] rounded-xs space-y-1.5">
                  <input type="text" placeholder="Program name" value={editForm.name as string || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputClass} autoFocus />
                  <div className="grid grid-cols-2 gap-1">
                    <input type="number" placeholder="Weeks" value={editForm.duration_weeks ?? ''} onChange={(e) => setEditForm({ ...editForm, duration_weeks: e.target.value ? parseInt(e.target.value) : undefined })} className={inputClass} />
                    <input type="number" placeholder="Sessions/wk" value={editForm.sessions_per_week ?? ''} onChange={(e) => setEditForm({ ...editForm, sessions_per_week: e.target.value ? parseInt(e.target.value) : undefined })} className={inputClass} />
                  </div>
                  <input type="text" placeholder="Notes" value={editForm.notes as string || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className={inputClass} />
                  <div className="flex justify-end gap-1">
                    <Button variant="secondary" size="sm" onClick={() => { setEditingId(null); setEditForm({}); }}>Cancel</Button>
                    <Button size="sm" onClick={() => handleEditSave(program.id)}>Save</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs cursor-pointer hover:brightness-110" onClick={() => handleEditToggle(program)}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Dumbbell size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                    <span className="font-medium text-[var(--text-primary)] truncate">{program.name}</span>
                    {program.duration_weeks != null && (
                      <span className="text-[var(--text-tertiary)] flex items-center gap-0.5 flex-shrink-0">
                        <CalendarDays size={9} />
                        {program.duration_weeks}w
                      </span>
                    )}
                    {program.sessions_per_week != null && (
                      <span className="text-[var(--text-tertiary)] flex items-center gap-0.5 flex-shrink-0">
                        <Clock size={9} />
                        {program.sessions_per_week}x/wk
                      </span>
                    )}
                    {program.notes && (
                      <span className="text-[var(--text-tertiary)] truncate">{program.notes}</span>
                    )}
                  </div>
                  <button
                    aria-label="Delete program builder"
                    onClick={(e) => { e.stopPropagation(); handleDelete(program.id); }} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
