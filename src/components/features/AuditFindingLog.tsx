/**
 * Audit Finding Log · Blockchain / Cybersecurity feature.
 * Track audit findings with severity, contract reference, description, and resolution.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

type Finding = {
  id: string;
  project_id: string;
  title: string;
  severity: string;
  contract_id: string;
  description: string;
  resolved: number;
  created_at: string;
};

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'] as const;

const severityDotColors: Record<string, string> = {
  low: 'text-[#16A34A]',
  medium: 'text-[#D97706]',
  high: 'text-[#DC2626]',
  critical: 'text-[#991B1B]',
};

const severityBadgeClasses: Record<string, string> = {
  low: 'bg-[#16A34A]/15 text-[#16A34A]',
  medium: 'bg-[#D97706]/15 text-[#D97706]',
  high: 'bg-[#DC2626]/15 text-[#DC2626]',
  critical: 'bg-[#991B1B]/15 text-[#991B1B]',
};

export default function AuditFindingLog({ projectId }: { projectId: string }) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    severity: 'medium',
    contract_id: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  const loadFindings = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Finding & Record<string, unknown>)[]>(
        "SELECT * FROM audit_findings WHERE project_id = ? ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, created_at DESC",
        [projectId],
      );
      setFindings(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          title: r.title as string,
          severity: r.severity as string,
          contract_id: r.contract_id as string,
          description: r.description as string,
          resolved: r.resolved as number,
          created_at: r.created_at as string,
        })),
      );
    } catch (e) {
      console.error('[AuditFindingLog] loadFindings failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadFindings();
  }, [projectId, loadFindings]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO audit_findings (id, project_id, title, severity, contract_id, description, resolved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.title.trim(),
          form.severity,
          form.contract_id.trim() || null,
          form.description.trim() || null,
          0,
          new Date().toISOString(),
        ],
      );
      const finding: Finding = {
        id,
        project_id: projectId,
        title: form.title.trim(),
        severity: form.severity,
        contract_id: form.contract_id.trim() || '',
        description: form.description.trim() || '',
        resolved: 0,
        created_at: new Date().toISOString(),
      };
      setFindings((prev) => {
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return [finding, ...prev].sort(
          (a, b) => (priorityOrder[a.severity] ?? 2) - (priorityOrder[b.severity] ?? 2),
        );
      });
      setForm({ title: '', severity: 'medium', contract_id: '', description: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[AuditFindingLog] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM audit_findings WHERE id = ?', [id]);
      setFindings((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      console.error('[AuditFindingLog] delete failed:', e);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE audit_findings SET resolved = ? WHERE id = ?', [1, id]);
      setFindings((prev) => prev.map((f) => (f.id === id ? { ...f, resolved: 1 } : f)));
    } catch (e) {
      console.error('[AuditFindingLog] resolve failed:', e);
    }
  };

  const openCount = findings.filter((f) => !f.resolved).length;
  const criticalCount = findings.filter((f) => !f.resolved && f.severity === 'critical').length;

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';
  const selectClass =
    'w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Audit Findings
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
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Audit Findings ({findings.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Finding
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Finding title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Severity"
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              className={selectClass}
            >
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Contract ID"
              value={form.contract_id}
              onChange={(e) => setForm({ ...form, contract_id: e.target.value })}
              className={inputClass}
            />
          </div>
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.title.trim()}>
              Add
            </Button>
          </div>
        </div>
      )}

      {findings.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No audit findings yet.</p>
      ) : (
        <div className="space-y-1">
          {findings.map((finding) => (
            <div key={finding.id}>
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <AlertTriangle
                    size={8}
                    className={`${severityDotColors[finding.severity] || severityDotColors.medium} fill-current flex-shrink-0`}
                  />
                  <button
                    onClick={() => setExpanded(expanded === finding.id ? null : finding.id)}
                    className={`font-medium text-left truncate ${finding.resolved ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'} hover:underline`}
                  >
                    {finding.title}
                  </button>
                  {finding.contract_id && (
                    <span className="text-[10px] font-mono text-[var(--accent-ink,var(--accent))] flex-shrink-0">
                      {finding.contract_id}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${severityBadgeClasses[finding.severity] || severityBadgeClasses.medium}`}
                  >
                    {finding.severity}
                  </span>
                  {finding.resolved ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#16A34A]/15 text-[#16A34A] flex-shrink-0">
                      resolved
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-secondary)] flex-shrink-0">
                      open
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                  {!finding.resolved && (
                    <button
                      aria-label="Confirm audit finding log"
                      onClick={() => handleResolve(finding.id)}
                      className="text-[var(--text-tertiary)] hover:text-[#16A34A]"
                    >
                      <CheckCircle2 size={12} />
                    </button>
                  )}
                  <button
                    aria-label="Delete audit finding log"
                    onClick={() => handleDelete(finding.id)}
                    className="text-[var(--text-tertiary)] hover:text-[#A32D2D]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {expanded === finding.id && (
                <div className="mt-1 px-3 py-2 bg-[var(--bg-secondary)]/50 rounded-[6px] text-xs space-y-1">
                  {finding.description && (
                    <p className="text-[var(--text-secondary)]">{finding.description}</p>
                  )}
                  {!finding.description && (
                    <p className="text-[var(--text-tertiary)] italic">No additional details.</p>
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="flex items-center gap-3 px-3 py-1.5 mt-1 text-[10px] text-[var(--text-tertiary)]">
            <span>{openCount} open</span>
            {criticalCount > 0 && <span className="text-[#DC2626]">{criticalCount} critical</span>}
          </div>
        </div>
      )}
    </div>
  );
}
