/**
 * Student Roster -- Tutor feature.
 * Simple list of students per client with inline editing.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, GraduationCap, Check, X } from 'lucide-react';

type Student = {
  id: string;
  client_id: string;
  grade_level?: string;
  subject?: string;
  hourly_rate?: number;
  status: string;
};

const STATUS_OPTIONS = ['active', 'inactive'] as const;

const statusBadgeClasses: Record<string, string> = {
  active: 'bg-[#16A34A]/15 text-[#16A34A]',
  inactive: 'bg-[var(--border-color)] text-[var(--text-tertiary)]',
};

export default function StudentRoster({ clientId }: { clientId: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ grade_level: '', subject: '', hourly_rate: '', status: 'active' });
  const [saving, setSaving] = useState(false);

  const loadStudents = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Student & Record<string, unknown>)[]>(
        'SELECT id, client_id, grade_level, subject, hourly_rate, status FROM students WHERE client_id = ? ORDER BY subject ASC, grade_level ASC',
        [clientId]
      );
      setStudents(rows.map(r => ({
        id: r.id as string,
        client_id: r.client_id as string,
        grade_level: r.grade_level as string | undefined,
        subject: r.subject as string | undefined,
        hourly_rate: r.hourly_rate as number | undefined,
        status: r.status as string,
      })));
    } catch (e) { console.error('[StudentRoster] loadStudents failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadStudents(); }, [clientId]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO students (id, client_id, grade_level, subject, hourly_rate, status) VALUES (?, ?, ?, ?, ?, ?)',
        [id, clientId, addForm.grade_level || null, addForm.subject || null, addForm.hourly_rate ? parseFloat(addForm.hourly_rate) : null, addForm.status]
      );
      const student: Student = { id, client_id: clientId, grade_level: addForm.grade_level || undefined, subject: addForm.subject || undefined, hourly_rate: addForm.hourly_rate ? parseFloat(addForm.hourly_rate) : undefined, status: addForm.status };
      setStudents(prev => [...prev, student].sort((a, b) => (a.subject || '').localeCompare(b.subject || '') || (a.grade_level || '').localeCompare(b.grade_level || '')));
      setAddForm({ grade_level: '', subject: '', hourly_rate: '', status: 'active' });
      setShowAdd(false);
    } catch (e) { console.error('[StudentRoster] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM students WHERE id = ?', [id]);
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error('[StudentRoster] delete failed:', e); }
  };

  const handleEditToggle = (student: Student) => {
    if (editingId === student.id) {
      setEditingId(null);
      setEditForm({});
    } else {
      setEditingId(student.id);
      setEditForm({
        grade_level: student.grade_level,
        subject: student.subject,
        hourly_rate: student.hourly_rate,
        status: student.status,
      });
    }
  };

  const handleEditSave = async (studentId: string) => {
    try {
      const db = await getDb();
      const updates: string[] = [];
      const values: unknown[] = [];
      if (editForm.grade_level !== undefined) { updates.push('grade_level = ?'); values.push(editForm.grade_level); }
      if (editForm.subject !== undefined) { updates.push('subject = ?'); values.push(editForm.subject); }
      if (editForm.hourly_rate !== undefined) { updates.push('hourly_rate = ?'); values.push(editForm.hourly_rate); }
      if (editForm.status !== undefined) { updates.push('status = ?'); values.push(editForm.status); }
      if (updates.length > 0) {
        values.push(studentId);
        await db.execute(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`, values);
      }
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, grade_level: editForm.grade_level ?? s.grade_level, subject: editForm.subject ?? s.subject, hourly_rate: editForm.hourly_rate as number | undefined ?? s.hourly_rate, status: editForm.status ?? s.status } : s));
      setEditingId(null);
      setEditForm({});
    } catch (e) { console.error('[StudentRoster] edit failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Students</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Students ({students.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={12} /> Add Student
        </Button>
      </div>

      {showAdd && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Grade level" value={addForm.grade_level} onChange={(e) => setAddForm({ ...addForm, grade_level: e.target.value })} className={inputClass} autoFocus />
            <input type="text" placeholder="Subject" value={addForm.subject} onChange={(e) => setAddForm({ ...addForm, subject: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="0.01" placeholder="Hourly rate" value={addForm.hourly_rate} onChange={(e) => setAddForm({ ...addForm, hourly_rate: e.target.value })} className={inputClass} />
            <select value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value })} className={selectClass}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving}>Add</Button>
          </div>
        </div>
      )}

      {students.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No students added yet.</p>
      ) : (
        <div className="space-y-1">
          {students.map((student) => (
            <div key={student.id}>
              {editingId === student.id ? (
                <div className="p-2 bg-[var(--bg-card)] border border-[var(--accent)] rounded-[6px] space-y-1.5">
                  <div className="grid grid-cols-2 gap-1">
                    <input type="text" placeholder="Grade level" value={editForm.grade_level as string || ''} onChange={(e) => setEditForm({ ...editForm, grade_level: e.target.value })} className={inputClass} autoFocus />
                    <input type="text" placeholder="Subject" value={editForm.subject as string || ''} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <input type="number" step="0.01" placeholder="Hourly rate" value={editForm.hourly_rate ?? ''} onChange={(e) => setEditForm({ ...editForm, hourly_rate: e.target.value ? parseFloat(e.target.value) : undefined })} className={inputClass} />
                    <select value={editForm.status as string || ''} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className={selectClass}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end gap-1">
                    <Button variant="secondary" size="sm" onClick={() => { setEditingId(null); setEditForm({}); }}>Cancel</Button>
                    <Button size="sm" onClick={() => handleEditSave(student.id)}>Save</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs cursor-pointer hover:brightness-110" onClick={() => handleEditToggle(student)}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <GraduationCap size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                    <span className="font-medium text-[var(--text-primary)]">
                      {student.grade_level || '--'} · {student.subject || '--'}
                    </span>
                    {student.hourly_rate != null && (
                      <span className="text-[var(--text-tertiary)] flex-shrink-0">${student.hourly_rate.toFixed(2)}/hr</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClasses[student.status] || statusBadgeClasses.inactive}`}>
                      {student.status}
                    </span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(student.id); }} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
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
