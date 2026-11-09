/**
 * Program Tracker Widget · Trainer feature.
 * Read-only list of active programs for a client from the programs table.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import { Dumbbell, CalendarDays, Clock } from 'lucide-react';

type Program = {
  id: string;
  client_id: string;
  name: string;
  duration_weeks?: number;
  sessions_per_week?: number;
  notes?: string;
};

export default function ProgramTrackerWidget({ clientId }: { clientId: string }) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (e) { console.error('[ProgramTrackerWidget] loadPrograms failed:', e); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { loadPrograms(); }, [clientId, loadPrograms]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Active Programs</h4>
        </div>
        <div className="space-y-1">
          {[1, 2].map(i => <div key={i} className="h-10 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Active Programs ({programs.length})</h4>
      </div>

      {programs.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No active programs. Go to Programs to create one.</p>
      ) : (
        <div className="space-y-1">
          {programs.map((program) => (
            <div key={program.id} className="px-3 py-2.5 bg-[var(--bg-secondary)] rounded-xs text-xs">
              <div className="flex items-center gap-2 mb-1">
                <Dumbbell size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                <span className="font-semibold text-[var(--text-primary)]">{program.name}</span>
              </div>
              <div className="flex items-center gap-3 ml-5">
                {program.duration_weeks != null && (
                  <span className="text-[var(--text-tertiary)] flex items-center gap-0.5">
                    <CalendarDays size={9} />
                    {program.duration_weeks} weeks
                  </span>
                )}
                {program.sessions_per_week != null && (
                  <span className="text-[var(--text-tertiary)] flex items-center gap-0.5">
                    <Clock size={9} />
                    {program.sessions_per_week}x per week
                  </span>
                )}
              </div>
              {program.notes && (
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1 ml-5">{program.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
