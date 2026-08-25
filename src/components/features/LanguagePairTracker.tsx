/**
 * Language Pair Tracker -- Translator feature.
 * Multi-select language pairs per project with common pair suggestions and custom entry.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { X, Globe } from 'lucide-react';

type LanguagePair = {
  id: string;
  project_id: string;
  source_lang: string;
  target_lang: string;
};

const COMMON_PAIRS = [
  { source: 'EN', target: 'FR' },
  { source: 'EN', target: 'ES' },
  { source: 'EN', target: 'DE' },
  { source: 'EN', target: 'IT' },
  { source: 'EN', target: 'PT' },
  { source: 'EN', target: 'JA' },
  { source: 'EN', target: 'ZH' },
  { source: 'EN', target: 'AR' },
  { source: 'EN', target: 'RU' },
  { source: 'FR', target: 'EN' },
  { source: 'ES', target: 'EN' },
  { source: 'DE', target: 'EN' },
  { source: 'FR', target: 'ES' },
  { source: 'IT', target: 'EN' },
  { source: 'PT', target: 'EN' },
];

const LANGUAGE_NAMES: Record<string, string> = {
  EN: 'English',
  FR: 'French',
  ES: 'Spanish',
  DE: 'German',
  IT: 'Italian',
  PT: 'Portuguese',
  JA: 'Japanese',
  ZH: 'Chinese',
  AR: 'Arabic',
  RU: 'Russian',
  KO: 'Korean',
  NL: 'Dutch',
  PL: 'Polish',
  SV: 'Swedish',
  DA: 'Danish',
  FI: 'Finnish',
  NO: 'Norwegian',
  TR: 'Turkish',
  HE: 'Hebrew',
  HI: 'Hindi',
  TH: 'Thai',
  VI: 'Vietnamese',
  CS: 'Czech',
  RO: 'Romanian',
  EL: 'Greek',
  HU: 'Hungarian',
  BG: 'Bulgarian',
  UK: 'Ukrainian',
};

const PAIR_COLORS = [
  'bg-[#3498DB]/15 text-[#3498DB]',
  'bg-[#2ECC71]/15 text-[#2ECC71]',
  'bg-[#9B59B6]/15 text-[#9B59B6]',
  'bg-[#E67E22]/15 text-[#E67E22]',
  'bg-[#1ABC9C]/15 text-[#1ABC9C]',
  'bg-[#E74C3C]/15 text-[#E74C3C]',
  'bg-[#F1C40F]/15 text-[#B8860B]',
];

export default function LanguagePairTracker({ projectId }: { projectId: string }) {
  const [pairs, setPairs] = useState<LanguagePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [customSource, setCustomSource] = useState('');
  const [customTarget, setCustomTarget] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPairs = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(LanguagePair & Record<string, unknown>)[]>(
        'SELECT id, project_id, source_lang, target_lang FROM project_language_pairs WHERE project_id = ? ORDER BY id ASC',
        [projectId]
      );
      setPairs(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          source_lang: r.source_lang as string,
          target_lang: r.target_lang as string,
        }))
      );
    } catch (e) {
      console.error('[LanguagePairTracker] loadPairs failed:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPairs();
  }, [projectId]);

  const pairKey = (source: string, target: string) => `${source}→${target}`;

  const isPairAdded = (source: string, target: string) =>
    pairs.some((p) => p.source_lang === source && p.target_lang === target);

  const handleTogglePair = async (source: string, target: string) => {
    const existing = pairs.find((p) => p.source_lang === source && p.target_lang === target);
    if (existing) {
      try {
        const db = await getDb();
        await db.execute('DELETE FROM project_language_pairs WHERE id = ?', [existing.id]);
        setPairs((prev) => prev.filter((p) => p.id !== existing.id));
      } catch (e) {
        console.error('[LanguagePairTracker] remove failed:', e);
      }
    } else {
      setSaving(true);
      try {
        const id = crypto.randomUUID();
        const db = await getDb();
        await db.execute(
          'INSERT INTO project_language_pairs (id, project_id, source_lang, target_lang) VALUES (?, ?, ?, ?)',
          [id, projectId, source, target]
        );
        setPairs((prev) => [...prev, { id, project_id: projectId, source_lang: source, target_lang: target }]);
      } catch (e) {
        console.error('[LanguagePairTracker] add failed:', e);
      }
      setSaving(false);
    }
  };

  const handleDeletePair = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM project_language_pairs WHERE id = ?', [id]);
      setPairs((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('[LanguagePairTracker] delete failed:', e);
    }
  };

  const handleAddCustom = async () => {
    const src = customSource.trim().toUpperCase();
    const tgt = customTarget.trim().toUpperCase();
    if (!src || !tgt) return;
    if (src === tgt) return;
    if (isPairAdded(src, tgt)) {
      setCustomSource('');
      setCustomTarget('');
      return;
    }
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO project_language_pairs (id, project_id, source_lang, target_lang) VALUES (?, ?, ?, ?)',
        [id, projectId, src, tgt]
      );
      setPairs((prev) => [...prev, { id, project_id: projectId, source_lang: src, target_lang: tgt }]);
      setCustomSource('');
      setCustomTarget('');
    } catch (e) {
      console.error('[LanguagePairTracker] custom add failed:', e);
    }
    setSaving(false);
  };

  const getLangName = (code: string) => LANGUAGE_NAMES[code] || code;

  const getPairColor = (index: number) => PAIR_COLORS[index % PAIR_COLORS.length];

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Language Pairs</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Language Pairs</h4>
      </div>

      {/* Selected pairs */}
      {pairs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pairs.map((p, idx) => (
            <span
              key={p.id}
              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${getPairColor(idx)}`}
            >
              <Globe size={10} />
              {getLangName(p.source_lang)} → {getLangName(p.target_lang)}
              <button onClick={() => handleDeletePair(p.id)} className="hover:opacity-70">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Common pair suggestions */}
      <div>
        <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Common Pairs</p>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_PAIRS.map((pair) => {
            const selected = isPairAdded(pair.source, pair.target);
            return (
              <button
                key={pairKey(pair.source, pair.target)}
                onClick={() => handleTogglePair(pair.source, pair.target)}
                disabled={saving}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                  selected
                    ? PAIR_COLORS[0]
                    : 'bg-[var(--border-color)] text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {pair.source} → {pair.target}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom entry */}
      <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
        <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Custom Pair</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Source (e.g. EN)"
            value={customSource}
            onChange={(e) => setCustomSource(e.target.value)}
            className={inputClass + ' flex-1'}
            maxLength={5}
          />
          <span className="text-[var(--text-tertiary)] text-xs">→</span>
          <input
            type="text"
            placeholder="Target (e.g. FR)"
            value={customTarget}
            onChange={(e) => setCustomTarget(e.target.value)}
            className={inputClass + ' flex-1'}
            maxLength={5}
          />
          <Button
            size="sm"
            onClick={handleAddCustom}
            loading={saving}
            disabled={!customSource.trim() || !customTarget.trim() || customSource.trim().toUpperCase() === customTarget.trim().toUpperCase()}
          >
            Add
          </Button>
        </div>
      </div>

      {pairs.length === 0 && (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No language pairs set yet. Select a common pair or add a custom one.</p>
      )}
    </div>
  );
}
