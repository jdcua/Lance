import { useToasts } from '../../store/toastStore';
import Card from '../../components/ui/Card';
import { Lock } from 'lucide-react';
import { THEMES, applyTheme } from '../../themes/themes';
import { SectionHead, ACCENT_COLORS, type SettingsBag } from './shared';

/**
 * Appearance settings: light/dark, density, themes, accent. Pure relocation.
 */
export default function AppearanceSection({ bag }: { bag: SettingsBag }) {
  const { form, autoSave, saved } = bag;
  const addToast = useToasts((s) => s.add);

  return (
    <>
      {/* Preferences section header */}
      <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-4">
        Preferences
      </div>

      {/* Appearance (light/dark, density) */}
      <Card className="mb-6">
        <SectionHead title="Appearance" isSaved={saved.has('Appearance')} />
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => autoSave({ theme: 'light' }, 'Appearance')}
            className={`px-4 py-2 text-sm rounded-[8px] border transition-colors ${
              form.theme === 'light'
                ? 'bg-[var(--accent)] text-[var(--accent-on)] border-[var(--accent)]'
                : 'bg-[var(--bg-card)]  text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] border-[var(--border-color)] '
            }`}
          >
            Light
          </button>
          <button
            onClick={() => autoSave({ theme: 'dark' }, 'Appearance')}
            className={`px-4 py-2 text-sm rounded-[8px] border transition-colors ${
              form.theme === 'dark'
                ? 'bg-[var(--accent)] text-[var(--accent-on)] border-[var(--accent)]'
                : 'bg-[var(--bg-card)]  text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] border-[var(--border-color)] '
            }`}
          >
            Dark
          </button>
        </div>
        {bag.unlockedAchievements.has('three_proposals') && (
          <div className="pt-3 border-t border-[var(--border-color)]">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
              Layout density
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => bag.handleDensityChange('comfortable')}
                className={`px-4 py-2 text-sm rounded-[8px] border transition-colors ${
                  bag.density === 'comfortable'
                    ? 'bg-[var(--accent)] text-[var(--accent-on)] border-[var(--accent)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]'
                }`}
              >
                Comfortable
              </button>
              <button
                onClick={() => bag.handleDensityChange('compact')}
                className={`px-4 py-2 text-sm rounded-[8px] border transition-colors ${
                  bag.density === 'compact'
                    ? 'bg-[var(--accent)] text-[var(--accent-on)] border-[var(--accent)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]'
                }`}
              >
                Compact
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-2">
              Compact mode reduces row heights, padding, and spacing across the interface.
            </p>
          </div>
        )}
      </Card>

      {/* Themes */}
      <Card className="mb-6">
        <SectionHead title="Themes" isSaved={saved.has('Themes')} />
        <div className="space-y-2">
          {THEMES.map((theme) => {
            const isUnlocked = bag.unlockedThemes.has(theme.id);
            const isActive = bag.activeTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => {
                  if (!isUnlocked) return;
                  bag.setActiveTheme(theme.id);
                  localStorage.setItem('lance:theme', theme.id);
                  applyTheme(theme);
                  addToast(`Switched to ${theme.name}`, 'info');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[8px] text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--accent-bg)] border border-[var(--accent)]/30'
                    : isUnlocked
                      ? 'hover:bg-[var(--bg-secondary)]  border border-transparent'
                      : 'opacity-60 cursor-not-allowed border border-transparent'
                }`}
                disabled={!isUnlocked}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'border-[var(--accent)]' : 'border-[var(--neutral-border)]'
                  }`}
                >
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium ${isUnlocked ? 'text-[var(--text-primary)] ' : 'text-[var(--text-tertiary)]'}`}
                  >
                    {theme.name}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {theme.description}
                  </p>
                </div>
                {isUnlocked ? (
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {theme.name}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                    <Lock size={10} />
                    {theme.unlockedBy.replace(/^Always available$/, '') || 'Locked'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Accent color */}
      {bag.unlockedAchievements.has('five_clients') && (
        <Card className="mb-6">
          <SectionHead title="Accent color" isSaved={saved.has('Accent color')} />
          <p className="text-xs text-[var(--text-tertiary)] mb-3">
            Choose a color that personalizes buttons, badges, progress bars, and metric
            cards.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => bag.handleAccentChange(color.id)}
                className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-[8px] border transition-colors ${
                  bag.accentColor === color.id
                    ? 'border-[var(--accent)] bg-[var(--accent-bg)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-[10px] text-[var(--text-primary)]">
                  {color.label}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
