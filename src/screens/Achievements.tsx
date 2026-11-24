import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { ACHIEVEMENTS } from '../achievements';
import { Trophy, Lock, Sparkles } from 'lucide-react';

export default function AchievementsPage() {
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../achievements/checker')
      .then(({ getUnlockedAchievementKeys }) => getUnlockedAchievementKeys())
      .then((keys) => setUnlocked(new Set(keys)))
      .catch(() => { /* achievement check is non-critical; silently fall back to empty set */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Achievements</h2>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy size={20} className="text-[var(--accent-ink,var(--accent))]" />
        <h1 className="font-display text-lg font-semibold text-[var(--text-primary)]">Achievements</h1>
        <Badge variant="info">{unlocked.size} / {ACHIEVEMENTS.length}</Badge>
      </div>

      {ACHIEVEMENTS.length === 0 ? (
        <Card className="text-center py-16">
          <Trophy size={40} className="text-[var(--text-tertiary)] mx-auto mb-4" />
          <p className="text-sm text-[var(--text-secondary)]">No achievements defined yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {ACHIEVEMENTS.map((ach) => {
            const isUnlocked = unlocked.has(ach.key);
            return (
              <Card
                key={ach.key}
                className={isUnlocked ? '' : 'border border-[var(--border-color)]/40 bg-[var(--bg-secondary)]/10'}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isUnlocked ? 'bg-[var(--accent-bg)]' : 'bg-[var(--bg-secondary)]'
                  }`}>
                    {isUnlocked ? (
                      <Sparkles size={18} className="text-[var(--accent-ink,var(--accent))]" />
                    ) : (
                      <Lock size={16} className="text-[var(--text-tertiary)]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{ach.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{ach.description}</p>
                    <p className="text-[10px] text-[var(--accent-ink,var(--accent))] mt-1.5 font-medium">{ach.reward}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
