/**
 * Style Guide · Writer feature.
 * Per-client style guide with tone, formatting rules, banned words, and reference.
 * One record per client. Edit-in-place.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Save, X } from 'lucide-react';

type StyleGuide = {
  id: string;
  client_id: string;
  tone?: string;
  formatting_rules?: string;
  banned_words?: string;
  style_guide_ref?: string;
  notes?: string;
};

const STYLE_REF_OPTIONS = ['AP', 'Chicago', 'House', 'Other'];

export default function StyleGuide({ clientId }: { clientId: string }) {
  const [guide, setGuide] = useState<StyleGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tone: '',
    formatting_rules: '',
    banned_words: '',
    style_guide_ref: '',
    notes: '',
  });
  const [bannedWordsList, setBannedWordsList] = useState<string[]>([]);
  const [bannedWordInput, setBannedWordInput] = useState('');

  const loadGuide = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(StyleGuide & Record<string, unknown>)[]>(
        'SELECT id, client_id, tone, formatting_rules, banned_words, style_guide_ref, notes FROM client_style_guides WHERE client_id = ?',
        [clientId]
      );
      if (rows.length > 0) {
        const g: StyleGuide = {
          id: rows[0].id as string,
          client_id: rows[0].client_id as string,
          tone: rows[0].tone as string | undefined,
          formatting_rules: rows[0].formatting_rules as string | undefined,
          banned_words: rows[0].banned_words as string | undefined,
          style_guide_ref: rows[0].style_guide_ref as string | undefined,
          notes: rows[0].notes as string | undefined,
        };
        setGuide(g);
        setForm({
          tone: g.tone || '',
          formatting_rules: g.formatting_rules || '',
          banned_words: g.banned_words || '',
          style_guide_ref: g.style_guide_ref || '',
          notes: g.notes || '',
        });
        setBannedWordsList(
          g.banned_words
            ? g.banned_words.split(',').map((w) => w.trim()).filter(Boolean)
            : []
        );
      } else {
        setGuide(null);
        setForm({ tone: '', formatting_rules: '', banned_words: '', style_guide_ref: '', notes: '' });
        setBannedWordsList([]);
      }
    } catch (e) {
      console.error('[StyleGuide] loadGuide failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadGuide();
  }, [clientId, loadGuide]);

  const addBannedWord = () => {
    const w = bannedWordInput.trim();
    if (!w) return;
    if (bannedWordsList.includes(w)) {
      setBannedWordInput('');
      return;
    }
    setBannedWordsList((prev) => [...prev, w]);
    setBannedWordInput('');
  };

  const removeBannedWord = (word: string) => {
    setBannedWordsList((prev) => prev.filter((w) => w !== word));
  };

  const handleBannedWordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBannedWord();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const db = await getDb();
      const bannedWordsStr = bannedWordsList.join(', ');
      if (guide) {
        await db.execute(
          'UPDATE client_style_guides SET tone = ?, formatting_rules = ?, banned_words = ?, style_guide_ref = ?, notes = ? WHERE id = ?',
          [
            form.tone || null,
            form.formatting_rules || null,
            bannedWordsStr || null,
            form.style_guide_ref || null,
            form.notes || null,
            guide.id,
          ]
        );
        setGuide({
          ...guide,
          tone: form.tone || undefined,
          formatting_rules: form.formatting_rules || undefined,
          banned_words: bannedWordsStr || undefined,
          style_guide_ref: form.style_guide_ref || undefined,
          notes: form.notes || undefined,
        });
      } else {
        const id = crypto.randomUUID();
        await db.execute(
          'INSERT INTO client_style_guides (id, client_id, tone, formatting_rules, banned_words, style_guide_ref, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            id,
            clientId,
            form.tone || null,
            form.formatting_rules || null,
            bannedWordsStr || null,
            form.style_guide_ref || null,
            form.notes || null,
          ]
        );
        setGuide({
          id,
          client_id: clientId,
          tone: form.tone || undefined,
          formatting_rules: form.formatting_rules || undefined,
          banned_words: bannedWordsStr || undefined,
          style_guide_ref: form.style_guide_ref || undefined,
          notes: form.notes || undefined,
        });
      }
    } catch (e) {
      console.error('[StyleGuide] handleSave failed:', e);
    }
    setSaving(false);
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';
  const selectClass =
    'w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Style Guide
          </h4>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Style Guide
        </h4>
        <Button size="sm" onClick={handleSave} loading={saving}>
          <Save size={12} /> Save
        </Button>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1 block">Tone & Voice</label>
          <textarea
            placeholder="Describe the client's preferred tone and voice..."
            value={form.tone}
            onChange={(e) => setForm({ ...form, tone: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
        </div>

        <div>
          <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1 block">
            Formatting Rules
          </label>
          <textarea
            placeholder="Oxford comma, em-dash, title case, etc."
            value={form.formatting_rules}
            onChange={(e) => setForm({ ...form, formatting_rules: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
        </div>

        <div>
          <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1 block">
            Banned Words
          </label>
          <div className="flex items-center gap-1.5 mb-1.5">
            <input
              type="text"
              placeholder="Type a word and press Enter..."
              value={bannedWordInput}
              onChange={(e) => setBannedWordInput(e.target.value)}
              onKeyDown={handleBannedWordKeyDown}
              className={inputClass + ' flex-1'}
            />
            <Button variant="ghost" size="sm" onClick={addBannedWord} disabled={!bannedWordInput.trim()}>
              <Plus size={12} />
            </Button>
          </div>
          {bannedWordsList.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {bannedWordsList.map((word) => (
                <span
                  key={word}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#DC2626]/15 text-[#DC2626] font-medium"
                >
                  {word}
                  <button
                    aria-label="Close"
                    onClick={() => removeBannedWord(word)} className="hover:opacity-70">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1 block">
            Style Guide Reference
          </label>
          <select aria-label="Style Guide Ref"
            value={form.style_guide_ref}
            onChange={(e) => setForm({ ...form, style_guide_ref: e.target.value })}
            className={selectClass}
          >
            <option value="">-- None --</option>
            {STYLE_REF_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1 block">
            General Notes
          </label>
          <textarea
            placeholder="Any additional style notes..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
        </div>
      </div>
    </div>
  );
}

const Plus = ({ size, className }: { size: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
