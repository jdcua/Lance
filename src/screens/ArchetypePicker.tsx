import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useToasts } from '../store/toastStore';
import { getArchetype, ARCHETYPE_LIST, ARCHETYPE_CATEGORIES } from '../archetypes';
import type { ArchetypeConfig, ArchetypeId } from '../archetypes';
import { applyTheme, getTheme } from '../themes/themes';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Search, Check, Sparkles, ArrowRight } from 'lucide-react';

interface ArchetypePickerProps {
  onSelect?: (id: ArchetypeId) => void;
  onClose?: () => void;
  showApply?: boolean;
  currentId?: string;
}

const CATEGORIES = ['All', 'Creative', 'Technical', 'Strategic', 'Service', 'Custom'];

export default function ArchetypePicker({ onSelect, onClose, showApply = true, currentId = 'default' }: ArchetypePickerProps) {
  const { profile, saveProfile, loadProfile, setArchetypeAppliedAt } = useStore();
  const addToast = useToasts((s) => s.add);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  // Seed selection from the stored profile so the standalone /archetype route
  // reflects the currently applied archetype instead of always defaulting to 'default'.
  const [selected, setSelected] = useState<string>(profile?.profession || currentId);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = ARCHETYPE_LIST;
    if (category !== 'All') {
      const catIds = ARCHETYPE_CATEGORIES[category] || [];
      list = catIds.map((id) => getArchetype(id)).filter(Boolean);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          (a.label || '').toLowerCase().includes(q) ||
          (a.tagline || '').toLowerCase().includes(q) ||
          (a.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, category]);

  const handleSelect = (id: string) => {
    setSelected(id);
    if (onSelect) {
      onSelect(id as ArchetypeId);
    }
  };

  const handleApply = async () => {
    console.trace('[ArchetypePicker] handleApply starting, selected:', selected);
    const archetype = getArchetype(selected);
    if (!profile) {
      console.trace('[ArchetypePicker] no profile, aborting');
      return;
    }

    try {
      const profilePayload = {
        ...profile,
        profession: selected as string,
        ...(selected === 'custom' ? { custom_archetype_config: JSON.stringify(archetype) } : {}),
      };
      console.trace('[ArchetypePicker] saving profile', profilePayload);
      await saveProfile(profilePayload);

      console.trace('[ArchetypePicker] reloading profile from backend');
      await loadProfile();

      const theme = getTheme(archetype.theme);
      console.trace('[ArchetypePicker] applying theme', archetype.theme);
      applyTheme(theme);
      localStorage.setItem('lance:theme', archetype.theme);

      setArchetypeAppliedAt(Date.now());

      addToast(`Switched to ${archetype.label}`, 'success');

      console.trace('[ArchetypePicker] navigation', onClose ? 'onClose' : 'navigate to /');
      if (onClose) onClose();
      else navigate('/');
    } catch (err) {
      console.trace('[ArchetypePicker] apply failed', err);
      addToast('Failed to apply archetype', 'error');
    }
  };

  const getThemeColors = (themeId: string) => {
    const theme = getTheme(themeId);
    return {
      accent: theme.colors['--accent'],
      bg: theme.colors['--bg-primary'],
      border: theme.colors['--border-color'],
    };
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
          What do you do?
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Pick your profession to tailor Lance to your workflow. You can change this anytime.
        </p>
      </div>

      {/* Search and filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search professions..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                category === cat
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {filtered.map((archetype) => {
          const isSelected = selected === archetype.id;
          const isExpanded = expanded === archetype.id;
          const isCustom = archetype.id === 'custom';
          const themeColors = getThemeColors(archetype.theme);

          return (
            <button
              key={archetype.id}
              onClick={() => handleSelect(archetype.id)}
              onMouseEnter={() => setExpanded(archetype.id)}
              onMouseLeave={() => setExpanded(null)}
              className={`relative text-left p-4 rounded-[12px] border transition-all duration-200 ${
                isSelected
                  ? 'bg-[var(--accent-bg)] ring-2 ring-[var(--accent)] border-[var(--accent)]'
                  : isCustom
                  ? 'bg-[var(--bg-secondary)] border-dashed border-[var(--border-color)]'
                  : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--accent)]/30'
              }`}
            >
              {/* Accent stripe */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-[12px]"
                style={{ backgroundColor: themeColors.accent }}
              />

              {/* Selected check */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}

              <div className="flex items-start gap-3 mb-2 mt-1">
                <span className="text-2xl">{archetype.emoji}</span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {archetype.label}
                  </h3>
                  <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">
                    {archetype.tagline}
                  </p>
                </div>
              </div>

              {/* Expanded details on hover */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-[var(--border-color)] animate-fade-in">
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">
                    {archetype.psychProfile}
                  </p>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Key Features</p>
                    {archetype.archetypeFeatures.slice(0, 3).map((f) => (
                      <div key={f.id} className="flex items-center gap-1.5">
                        <Sparkles size={10} className="text-[var(--accent)] flex-shrink-0" />
                        <span className="text-xs text-[var(--text-secondary)]">{f.name}</span>
                      </div>
                    ))}
                    {archetype.archetypeFeatures.length === 0 && (
                      <p className="text-xs text-[var(--text-tertiary)]">All core Lance features</p>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Apply button */}
      {showApply && (
        <div className="sticky bottom-0 pt-4 pb-2 bg-[var(--bg-primary)] border-t border-[var(--border-color)] flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-secondary)]">
              Selected: <span className="font-medium text-[var(--text-primary)]">{getArchetype(selected).label}</span>
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              This will reorder your sidebar and dashboard. Your data stays the same.
            </p>
          </div>
          <Button onClick={handleApply} size="sm">
            Apply <ArrowRight size={14} />
          </Button>
        </div>
      )}

      {/* Cancel */}
      {onClose && (
        <div className="text-center mt-4">
          <button onClick={onClose} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
