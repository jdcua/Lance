/**
 * Style Tag System · Illustrator feature.
 * Tags projects with style descriptors via predefined suggestions and custom input.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, X } from 'lucide-react';

type StyleTag = {
  id: string;
  project_id: string;
  tag: string;
};

const PRESET_TAGS = [
  'character',
  'editorial',
  'concept-art',
  "children's-book",
  'portrait',
  'abstract',
  'geometric',
  'other',
];

const TAG_COLORS = [
  'bg-[#3498DB]/15 text-[#3498DB]',
  'bg-[#2ECC71]/15 text-[#2ECC71]',
  'bg-[#9B59B6]/15 text-[#9B59B6]',
  'bg-[#E67E22]/15 text-[#E67E22]',
  'bg-[#E74C3C]/15 text-[#E74C3C]',
  'bg-[#1ABC9C]/15 text-[#1ABC9C]',
  'bg-[#F1C40F]/15 text-[#947500]',
  'bg-amber-500/15 text-amber-600',
];

export default function StyleTagSystem({ projectId }: { projectId: string }) {
  const [tags, setTags] = useState<StyleTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');

  const loadTags = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(StyleTag & Record<string, unknown>)[]>(
        'SELECT id, project_id, tag FROM project_style_tags WHERE project_id = ? ORDER BY id ASC',
        [projectId]
      );
      setTags(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          tag: r.tag as string,
        }))
      );
    } catch (e) {
      console.error('[StyleTagSystem] loadTags failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadTags();
  }, [projectId, loadTags]);

  const handleAdd = async (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed) return;
    if (tags.some((t) => t.tag === trimmed)) return;
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute('INSERT INTO project_style_tags (id, project_id, tag) VALUES (?, ?, ?)', [
        id,
        projectId,
        trimmed,
      ]);
      setTags((prev) => [...prev, { id, project_id: projectId, tag: trimmed }]);
      setInput('');
    } catch (e) {
      console.error('[StyleTagSystem] handleAdd failed:', e);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM project_style_tags WHERE id = ?', [id]);
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error('[StyleTagSystem] handleRemove failed:', e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd(input);
    }
  };

  const getTagColor = (tag: string) => {
    const idx = PRESET_TAGS.indexOf(tag);
    if (idx >= 0) return TAG_COLORS[idx % TAG_COLORS.length];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Style Tags
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Style Tags ({tags.length})
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAdd(input)}
          disabled={!input.trim()}
        >
          <Plus size={12} /> Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESET_TAGS.filter((pt) => !tags.some((t) => t.tag === pt)).map((pt) => (
          <button
            key={pt}
            onClick={() => handleAdd(pt)}
            className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            + {pt}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Type a custom tag and press Enter..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        className={inputClass}
      />

      {tags.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No style tags yet. Click a suggestion or type a custom tag.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t.id}
              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${getTagColor(t.tag)}`}
            >
              {t.tag}
              <button
                onClick={() => handleRemove(t.id)}
                className="hover:opacity-70"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
