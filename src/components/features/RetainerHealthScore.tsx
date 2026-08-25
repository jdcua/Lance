/**
 * Retainer Health Score -- Consultant / Agency feature.
 * Computes a 0-100 health score from deliverables, report freshness, and communication recency.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { getDb } from '../../db';
import { Activity, FileCheck, Calendar, MessageSquare } from 'lucide-react';

type Cadence = {
  id: string;
  client_id: string;
  frequency: string;
  last_report_date?: string;
  next_due?: string;
};

export default function RetainerHealthScore({ clientId }: { clientId: string }) {
  const { timeEntries, loadTimeEntries } = useStore();
  const [loading, setLoading] = useState(true);
  const [deliverableScore, setDeliverableScore] = useState(0);
  const [reportScore, setReportScore] = useState(0);
  const [communicationScore, setCommunicationScore] = useState(0);
  const [overallScore, setOverallScore] = useState(0);

  const load = async () => {
    try {
      const db = await getDb();

      const currentPeriod = new Date().toISOString().slice(0, 7);

      const seoRows = await db.select<{ completed: number }[]>(
        'SELECT completed FROM seo_deliverables WHERE client_id = ? AND period = ?',
        [clientId, currentPeriod]
      );
      const total = seoRows.length;
      const completed = seoRows.filter(r => r.completed).length;
      const dScore = total > 0 ? Math.round((completed / total) * 100) : 0;
      setDeliverableScore(dScore);

      const reportRows = await db.select<{ date: string }[]>(
        'SELECT date FROM client_reports WHERE client_id = ? ORDER BY date DESC LIMIT 1',
        [clientId]
      );
      let rScore = 0;
      if (reportRows.length > 0) {
        const lastReportDate = new Date(reportRows[0].date);
        const daysSinceReport = Math.floor((Date.now() - lastReportDate.getTime()) / (1000 * 60 * 60 * 24));

        const cadenceRows = await db.select<{ frequency: string }[]>(
          'SELECT frequency FROM client_report_cadence WHERE client_id = ? LIMIT 1',
          [clientId]
        );
        const freq = cadenceRows.length > 0 ? cadenceRows[0].frequency : 'monthly';
        const maxDays = freq === 'weekly' ? 7 : freq === 'quarterly' ? 90 : 30;

        rScore = Math.max(0, Math.round(100 - (daysSinceReport / maxDays) * 100));
      }
      setReportScore(rScore);

      if (timeEntries.length === 0) {
        await loadTimeEntries();
        return;
      }

      let cScore = 0;
      const clientEntries = timeEntries
        .filter(t => t.client_id === clientId)
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

      if (clientEntries.length > 0) {
        const lastEntry = new Date(clientEntries[0].start_time);
        const daysSince = Math.floor((Date.now() - lastEntry.getTime()) / (1000 * 60 * 60 * 24));
        cScore = Math.max(0, Math.round(100 - (daysSince / 14) * 100));
      }
      setCommunicationScore(cScore);

      setOverallScore(Math.round((dScore + rScore + cScore) / 3));
    } catch (e) { console.error('[RetainerHealthScore] load failed:', e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId]);

  useEffect(() => {
    if (timeEntries.length > 0) {
      let cScore = 0;
      const clientEntries = timeEntries
        .filter(t => t.client_id === clientId)
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

      if (clientEntries.length > 0) {
        const lastEntry = new Date(clientEntries[0].start_time);
        const daysSince = Math.floor((Date.now() - lastEntry.getTime()) / (1000 * 60 * 60 * 24));
        cScore = Math.max(0, Math.round(100 - (daysSince / 14) * 100));
      }
      setCommunicationScore(cScore);
    }
  }, [timeEntries, clientId]);

  const scoreColor = (score: number) => {
    if (score > 75) return 'text-[#2ECC71]';
    if (score >= 50) return 'text-[#F1C40F]';
    return 'text-[#E74C3C]';
  };

  const scoreBg = (score: number) => {
    if (score > 75) return 'bg-[#2ECC71]';
    if (score >= 50) return 'bg-[#F1C40F]';
    return 'bg-[#E74C3C]';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Retainer Health</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  const subScores = [
    { label: 'Deliverables', score: deliverableScore, icon: FileCheck, desc: `${deliverableScore}% complete this month` },
    { label: 'Report Freshness', score: reportScore, icon: Calendar, desc: reportScore > 0 ? `${reportScore}% fresh` : 'No reports yet' },
    { label: 'Communication', score: communicationScore, icon: MessageSquare, desc: communicationScore > 0 ? `Last contact: ${communicationScore}% recent` : 'No time entries yet' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Retainer Health</h4>
      </div>

      <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scoreBg(overallScore)} text-white`}>
            <span className="text-lg font-bold">{overallScore}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">Overall Health Score</p>
            <p className={`text-xs font-medium ${scoreColor(overallScore)}`}>
              {overallScore > 75 ? 'Healthy' : overallScore >= 50 ? 'Needs Attention' : 'At Risk'}
            </p>
          </div>
          <Activity size={16} className="text-[var(--text-tertiary)] ml-auto" />
        </div>

        <div className="space-y-2">
          {subScores.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label}>
                <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] mb-0.5">
                  <div className="flex items-center gap-1">
                    <Icon size={10} />
                    <span>{s.label}</span>
                  </div>
                  <span className={`font-medium ${scoreColor(s.score)}`}>{s.score}%</span>
                </div>
                <div className="h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${scoreBg(s.score)}`} style={{ width: `${Math.max(2, s.score)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
