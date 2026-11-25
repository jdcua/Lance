/**
 * Report Log · SEO Specialist feature.
 * Timeline list of client reports with expandable details.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ChevronDown, ChevronRight, FileText } from 'lucide-react';

type Report = {
  id: string;
  client_id: string;
  date: string;
  traffic_notes?: string;
  ranking_notes?: string;
  conversion_notes?: string;
  summary?: string;
};

export default function ReportLog({ clientId }: { clientId: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    traffic_notes: '',
    ranking_notes: '',
    conversion_notes: '',
    summary: '',
  });
  const [saving, setSaving] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Report & Record<string, unknown>)[]>(
        'SELECT id, client_id, date, traffic_notes, ranking_notes, conversion_notes, summary FROM client_reports WHERE client_id = ? ORDER BY date DESC',
        [clientId],
      );
      setReports(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          date: r.date as string,
          traffic_notes: r.traffic_notes as string | undefined,
          ranking_notes: r.ranking_notes as string | undefined,
          conversion_notes: r.conversion_notes as string | undefined,
          summary: r.summary as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[ReportLog] loadReports failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadReports();
  }, [clientId, loadReports]);

  const handleSave = async () => {
    if (!form.date.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO client_reports (id, client_id, date, traffic_notes, ranking_notes, conversion_notes, summary) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          clientId,
          form.date,
          form.traffic_notes || null,
          form.ranking_notes || null,
          form.conversion_notes || null,
          form.summary || null,
        ],
      );
      const item: Report = {
        id,
        client_id: clientId,
        date: form.date,
        traffic_notes: form.traffic_notes || undefined,
        ranking_notes: form.ranking_notes || undefined,
        conversion_notes: form.conversion_notes || undefined,
        summary: form.summary || undefined,
      };
      setReports((prev) => {
        const next = [item, ...prev];
        next.sort((a, b) => b.date.localeCompare(a.date));
        return next;
      });
      setForm({
        date: new Date().toISOString().split('T')[0],
        traffic_notes: '',
        ranking_notes: '',
        conversion_notes: '',
        summary: '',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[ReportLog] addReport failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM client_reports WHERE id = ?', [id]);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error('[ReportLog] delete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Reports</h4>
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
          Reports ({reports.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Report
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Traffic notes"
            value={form.traffic_notes}
            onChange={(e) => setForm({ ...form, traffic_notes: e.target.value })}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Ranking notes"
            value={form.ranking_notes}
            onChange={(e) => setForm({ ...form, ranking_notes: e.target.value })}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Conversion notes"
            value={form.conversion_notes}
            onChange={(e) => setForm({ ...form, conversion_notes: e.target.value })}
            className={inputClass}
          />
          <textarea
            placeholder="Summary"
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.date.trim()}>
              Save
            </Button>
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No reports yet. Add your first report.
        </p>
      ) : (
        <div className="space-y-1">
          {reports.map((r) => {
            const isExpanded = expandedId === r.id;
            return (
              <div
                key={r.id}
                className="bg-[var(--bg-secondary)] rounded-xs text-xs overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--border-color)]/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown size={12} className="text-[var(--text-tertiary)]" />
                    ) : (
                      <ChevronRight size={12} className="text-[var(--text-tertiary)]" />
                    )}
                    <FileText size={10} className="text-[var(--text-tertiary)]" />
                    <span className="font-medium text-[var(--text-primary)]">{r.date}</span>
                    {r.summary && (
                      <span className="text-[var(--text-tertiary)] truncate max-w-[200px] hidden sm:inline">
                        {r.summary}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(r.id);
                    }}
                    className="text-[var(--text-tertiary)] hover:text-[#A32D2D]"
                  >
                    <Trash2 size={12} />
                  </button>
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 space-y-2 border-t border-[var(--border-color)]">
                    {r.traffic_notes && (
                      <div>
                        <p className="text-[10px] font-semibold text-[var(--text-secondary)] mb-0.5">
                          Traffic
                        </p>
                        <p className="text-[var(--text-primary)]">{r.traffic_notes}</p>
                      </div>
                    )}
                    {r.ranking_notes && (
                      <div>
                        <p className="text-[10px] font-semibold text-[var(--text-secondary)] mb-0.5">
                          Rankings
                        </p>
                        <p className="text-[var(--text-primary)]">{r.ranking_notes}</p>
                      </div>
                    )}
                    {r.conversion_notes && (
                      <div>
                        <p className="text-[10px] font-semibold text-[var(--text-secondary)] mb-0.5">
                          Conversions
                        </p>
                        <p className="text-[var(--text-primary)]">{r.conversion_notes}</p>
                      </div>
                    )}
                    {r.summary && (
                      <div>
                        <p className="text-[10px] font-semibold text-[var(--text-secondary)] mb-0.5">
                          Summary
                        </p>
                        <p className="text-[var(--text-primary)]">{r.summary}</p>
                      </div>
                    )}
                    {!r.traffic_notes && !r.ranking_notes && !r.conversion_notes && !r.summary && (
                      <p className="text-[var(--text-tertiary)] italic">No details recorded.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
