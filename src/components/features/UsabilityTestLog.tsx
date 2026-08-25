/**
 * Usability Test Log -- UX Designer feature.
 * Table with usability test sessions, severity badges, participants, and issues.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Users, AlertTriangle } from 'lucide-react';

type UsabilityTest = {
  id: string;
  project_id: string;
  date: string;
  participants: number;
  tasks_tested: string;
  issues_found: string;
  severity: string;
};

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'] as const;

const severityBadgeClasses: Record<string, string> = {
  low: 'bg-[#16A34A]/15 text-[#16A34A]',
  medium: 'bg-[#D97706]/15 text-[#D97706]',
  high: 'bg-[#DC2626]/15 text-[#DC2626]',
  critical: 'bg-[#991B1B]/15 text-[#991B1B]',
};

export default function UsabilityTestLog({ projectId }: { projectId: string }) {
  const [tests, setTests] = useState<UsabilityTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], participants: '', tasks_tested: '', issues_found: '', severity: 'medium' });
  const [saving, setSaving] = useState(false);

  const loadTests = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(UsabilityTest & Record<string, unknown>)[]>(
        'SELECT id, project_id, date, participants, tasks_tested, issues_found, severity FROM usability_tests WHERE project_id = ? ORDER BY date DESC, id DESC',
        [projectId]
      );
      setTests(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        date: r.date as string,
        participants: (r.participants as number) || 0,
        tasks_tested: r.tasks_tested as string,
        issues_found: r.issues_found as string,
        severity: r.severity as string,
      })));
    } catch (e) { console.error('[UsabilityTestLog] loadTests failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadTests(); }, [projectId]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const participants = parseInt(form.participants, 10) || 0;
      const db = await getDb();
      await db.execute(
        'INSERT INTO usability_tests (id, project_id, date, participants, tasks_tested, issues_found, severity) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.date, participants, form.tasks_tested.trim() || null, form.issues_found.trim() || null, form.severity]
      );
      const item: UsabilityTest = {
        id, project_id: projectId, date: form.date, participants,
        tasks_tested: form.tasks_tested.trim() || '',
        issues_found: form.issues_found.trim() || '',
        severity: form.severity,
      };
      setTests(prev => {
        const next = [item, ...prev];
        next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));
        return next;
      });
      setForm({ date: new Date().toISOString().split('T')[0], participants: '', tasks_tested: '', issues_found: '', severity: 'medium' });
      setShowForm(false);
    } catch (e) { console.error('[UsabilityTestLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM usability_tests WHERE id = ?', [id]);
      setTests(prev => prev.filter(t => t.id !== id));
    } catch (e) { console.error('[UsabilityTestLog] delete failed:', e); }
  };

  const totalTests = tests.length;
  const totalParticipants = tests.reduce((s, t) => s + (t.participants || 0), 0);
  const criticalCount = tests.filter(t => t.severity === 'critical').length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Usability Tests</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Usability Tests ({totalTests})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Test
        </Button>
      </div>

      {/* Summary */}
      {totalTests > 0 && (
        <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            <Users size={11} className="text-[var(--text-tertiary)]" />
            <span className="font-medium">{totalParticipants}</span> total participants
          </span>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-[#991B1B]">
              <AlertTriangle size={11} />
              <span className="font-medium">{criticalCount}</span> critical
            </span>
          )}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Participants" value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} className={inputClass} min="0" />
          </div>
          <textarea
            placeholder="Tasks tested..."
            value={form.tasks_tested}
            onChange={(e) => setForm({ ...form, tasks_tested: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <textarea
            placeholder="Issues found..."
            value={form.issues_found}
            onChange={(e) => setForm({ ...form, issues_found: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
            autoFocus
          />
          <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={selectClass}>
            {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving}>Save</Button>
          </div>
        </div>
      )}

      {/* Table */}
      {tests.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No usability tests logged yet. Record your first test session.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Date</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Participants</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Tasks Tested</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Issues Found</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Severity</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-hover)]">
                  <td className="py-1.5 px-2 text-[var(--text-primary)]">{formatDate(t.date)}</td>
                  <td className="py-1.5 px-2 text-[var(--text-primary)]">{t.participants || 0}</td>
                  <td className="py-1.5 px-2 text-[var(--text-secondary)] max-w-[200px] truncate">{t.tasks_tested || '--'}</td>
                  <td className="py-1.5 px-2 text-[var(--text-secondary)] max-w-[200px] truncate">{t.issues_found || '--'}</td>
                  <td className="py-1.5 px-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${severityBadgeClasses[t.severity] || severityBadgeClasses.medium}`}>
                      {t.severity}
                    </span>
                  </td>
                  <td className="py-1.5 px-2">
                    <button onClick={() => handleDelete(t.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
