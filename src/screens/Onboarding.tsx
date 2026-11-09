import { useState, useCallback, useEffect } from 'react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { CheckCircle, Users, FolderKanban, Clock, FileText, Receipt, Bell, Search, Trophy, BarChart3, Columns3, Banknote, FileEdit } from 'lucide-react';
import { useStore } from '../store';
import { applyTheme, getTheme } from '../themes/themes';

interface FeatureItem {
  key: string;
  label: string;
  icon: React.ElementType;
}

const FEATURES: FeatureItem[] = [
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'time', label: 'Time tracking', icon: Clock },
  { key: 'proposals', label: 'Proposals', icon: FileText },
  { key: 'invoices', label: 'Invoices', icon: Receipt },
  { key: 'contracts', label: 'Contracts', icon: FileEdit },
  { key: 'followUps', label: 'Follow-ups', icon: Bell },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'achievements', label: 'Achievements', icon: Trophy },
  { key: 'insights', label: 'Insights', icon: BarChart3 },
  { key: 'pipeline', label: 'Pipeline', icon: Columns3 },
  { key: 'finance', label: 'Finance', icon: Banknote },
];

const SCHEMES = [
  { id: 'amber', label: 'Amber', base: '#FFAD00', secondary: '#FFC24D', accent: '#FFAD00' },
  { id: 'sage', label: 'Sage', base: '#D4F0DC', secondary: '#60A5FA', accent: '#1EC98A' },
  { id: 'rose', label: 'Rose', base: '#FBB1BA', secondary: '#F472B6', accent: '#E11D48' },
  { id: 'sky', label: 'Sky', base: '#DBEAFE', secondary: '#93C5FD', accent: '#0EA5E9' },
  { id: 'violet', label: 'Violet', base: '#F3E8FF', secondary: '#C4B5FD', accent: '#8B5CF6' },
  { id: 'teal', label: 'Teal', base: '#CCF3F0', secondary: '#5EEAD4', accent: '#14B8A6' },
  { id: 'slate', label: 'Slate', base: '#E2E8F0', secondary: '#94A3B8', accent: '#64748B' },
  { id: 'indigo', label: 'Indigo', base: '#EDE9FE', secondary: '#A78BFA', accent: '#6366F1' },
  { id: 'gold', label: 'Gold', base: '#FEF3C7', secondary: '#FBBF24', accent: '#D97706' },
];

const PROFESSIONS: { id: string; label: string; features: string[]; schemeId: string }[] = [
  { id: 'developer', label: 'Developer', features: ['clients','projects','time','proposals','invoices','contracts','followUps','search','achievements','insights','pipeline','finance'], schemeId: 'slate' },
  { id: 'designer', label: 'Designer', features: ['clients','projects','time','proposals','invoices','contracts','followUps','search','achievements','insights'], schemeId: 'violet' },
  { id: 'writer', label: 'Writer', features: ['clients','projects','time','proposals','invoices','contracts','followUps','search','achievements','insights'], schemeId: 'amber' },
  { id: 'consultant', label: 'Consultant', features: ['clients','projects','time','proposals','invoices','contracts','followUps','search','achievements','insights','pipeline','finance'], schemeId: 'indigo' },
  { id: 'photographer', label: 'Photographer', features: ['clients','projects','time','proposals','invoices','contracts','followUps','search','achievements'], schemeId: 'slate' },
  { id: 'marketer', label: 'Marketer', features: ['clients','projects','time','proposals','invoices','contracts','followUps','search','achievements','insights','pipeline'], schemeId: 'sky' },
];

interface OnboardingProps {
  visible?: boolean;
  onClose?: () => void;
}

export default function Onboarding({ visible = true, onClose = () => {} }: OnboardingProps = {}) {
  const { saveProfile, profile, profileLoaded } = useStore();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    currency: 'CAD',
    hourly_rate: '',
    payment_terms: '14',
    writing_style: 'professional',
    ai_enabled: false,
  });
  const [featureChecked, setFeatureChecked] = useState<Record<string, boolean>>({
    clients: true, projects: true, time: true, proposals: true, invoices: true,
    contracts: true, followUps: true, search: true, achievements: true,
    insights: true, pipeline: true, finance: true,
  });
  const [schemeId, setSchemeId] = useState('amber');
  const [currentScheme, setCurrentScheme] = useState(SCHEMES[0]);
  const [selectedProfession, setSelectedProfession] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  useEffect(() => {
    if (!profileLoaded || !profile) return;
    setForm({
      name: profile.name || '',
      email: profile.email || '',
      currency: profile.currency || 'CAD',
      hourly_rate: profile.hourly_rate?.toString() || '',
      payment_terms: (profile.payment_terms ?? 14).toString(),
      writing_style: profile.writing_style || 'professional',
      ai_enabled: profile.ai_enabled ?? false,
    });
    setStep(1);
    setIsResuming(true);
  }, [profile, profileLoaded]);

  const persist = useCallback(async (s: number) => {
    localStorage.setItem('lance:onboarding-step', s.toString());
    try {
      await saveProfile({
        ...form,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : undefined,
        payment_terms: form.payment_terms ? Number(form.payment_terms) : 14,
      });
    } catch { /* best-effort */ }
  }, [form, saveProfile]);

  const applyScheme = useCallback((scheme: typeof SCHEMES[number]) => {
    setCurrentScheme(scheme);
    localStorage.setItem('lance:scheme-id', scheme.id);
    const t = getTheme('default');
    applyTheme(t);
    const root = document.documentElement;
    root.style.setProperty('--colour-base', scheme.base);
    root.style.setProperty('--colour-secondary', scheme.secondary);
    root.style.setProperty('--colour-accent', scheme.accent);
    try {
      localStorage.setItem('lance:colour-base', scheme.base);
      localStorage.setItem('lance:colour-secondary', scheme.secondary);
      localStorage.setItem('lance:colour-accent', scheme.accent);
    } catch { /* private mode */ }
    const mode = localStorage.getItem('lance:theme-mode') || 'light';
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, []);

  const handleNext = () => {
    persist((step + 1) as number);
    setStep((step + 1) as number);
  };
  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const finish = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      await saveProfile({
        name: form.name,
        email: form.email || undefined,
        currency: form.currency,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : undefined,
        payment_terms: parseInt(form.payment_terms) || 14,
        writing_style: form.writing_style,
        ai_enabled: form.ai_enabled,
      });
      localStorage.setItem('lance:onboarding-completed', 'true');
      localStorage.setItem('lance:onboarding-step', 'complete');
    } finally {
      setIsSaving(false);
    }
  };

  const STEP_LABELS = ['Profession (optional)', 'Features & colour', 'Rates & finish'];
  const clamped = Math.min(Math.max(step, 1), 3);

  return (
    <div className="flex flex-col h-full">
      <Modal open={visible} onClose={onClose} title="Set up Lance" size="md">
        <div className="space-y-5">
          {isResuming && (
            <div className="text-center text-xs text-[var(--text-secondary)] bg-[var(--accent-bg)] py-1.5 px-3 rounded-xs">
              Welcome back. Pick up where you left off.
            </div>
          )}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--text-tertiary)]" aria-live="polite">
              Step {clamped} of {STEP_LABELS.length} · {STEP_LABELS[clamped - 1]}
            </span>
          </div>
          <div className="flex justify-center gap-2 mb-1">
            {STEP_LABELS.map((label, i) => (
              <div
                key={label}
                aria-hidden="true"
                className={`w-2 h-2 rounded-full transition-colors ${
                  i + 1 <= clamped ? 'bg-[var(--accent)]' : 'bg-[var(--border-color)]'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Profession suggestion (optional) */}
          {step === 1 && (
            <>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">What do you do?</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-1 mb-3">
                Optional. Pick a suggestion to pre-tick features and colours; you can skip and set up later.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {PROFESSIONS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProfession(p.id);
                      const checked: Record<string, boolean> = {};
                      for (const f of FEATURES) checked[f.key] = p.features.includes(f.key);
                      setFeatureChecked(checked);
                      const scheme = SCHEMES.find((s) => s.id === p.schemeId) || SCHEMES[0];
                      applyScheme(scheme);
                      setSchemeId(scheme.id);
                    }}
                    className={`px-3 py-2 rounded-sm text-xs text-left border transition-colors ${
                      selectedProfession === p.id
                        ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-[11px] text-[var(--text-tertiary)]">Optional · skip anytime</span>
                <Button onClick={handleNext} size="sm">Continue →</Button>
              </div>
            </>
          )}

          {/* Step 2: Feature checklist + Colour picker */}
          {step === 2 && (
            <>
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Features</span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">Tap to toggle</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {FEATURES.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFeatureChecked((prev) => ({ ...prev, [f.key]: !prev[f.key] }))}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-left text-xs transition-colors ${
                        featureChecked[f.key]
                          ? 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                          : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)]'
                      }`}
                    >
                      <f.icon size={14} className={featureChecked[f.key] ? 'text-[var(--accent)]' : ''} />
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Colours</span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">Pick a scheme</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {SCHEMES.map((scheme) => {
                    const active = currentScheme.id === scheme.id;
                    return (
                      <button
                        key={scheme.id}
                        onClick={() => applyScheme(scheme)}
                        className={`relative w-full rounded-lg border-2 p-3 transition-colors ${
                          active ? 'border-[var(--accent)] shadow-[0_0_0_2px_rgba(255,173,0,0.2)]' : 'border-[var(--border-color)] hover:border-[var(--accent)]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-medium text-[var(--text-primary)]">{scheme.label}</span>
                          {active && (
                            <div className="w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: scheme.accent }} />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[scheme.base, scheme.secondary, scheme.accent].map((c, i) => (
                            <div key={i} className="h-6 w-6 rounded-md flex-shrink-0" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between pt-1">
                <Button variant="secondary" onClick={handleBack} size="sm">← Back</Button>
                <Button onClick={handleNext} size="sm">Continue →</Button>
              </div>
            </>
          )}

          {/* Step 3: Rates & finish */}
          {step === 3 && (
            <>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Rates &amp; sample data
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-1">
                Defaults you can override per client or invoice. Last step, then we&rsquo;ll show you around.
              </p>
              <div className="space-y-3">
                <div>
                  <label className={`form-label`}>Default Hourly Rate ({form.currency}) <span className="font-normal text-[var(--text-tertiary)]">(optional)</span></label>
                  <input
                    type="number"
                    value={form.hourly_rate}
                    onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))}
                    placeholder="e.g. 75"
                    className={`w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 bg-[var(--bg-card)] text-[var(--text-primary)]`}
                  />
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Leave blank if you primarily do flat-rate projects.</p>
                </div>
                <div>
                  <label className="form-label">Default Payment Terms</label>
                  <select
                    aria-label="Default Payment Terms"
                    value={form.payment_terms}
                    onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20`}
                  >
                    <option value="0">Due on receipt</option>
                    <option value="7">Net 7</option>
                    <option value="14">Net 14</option>
                    <option value="30">Net 30</option>
                  </select>
                </div>
              </div>
              <div className="p-3 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">Start with sample data?</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed mt-0.5">
                      See Lance fully populated so you know what to expect. Easy to clear anytime in Settings → Data.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={finish} disabled={isSaving || !form.name.trim()} className="flex-1">
                    Skip · start fresh
                  </Button>
                  <Button size="sm" onClick={finish} disabled={isSaving || !form.name.trim()} className="flex-1">
                    Yes, show me around
                  </Button>
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="secondary" onClick={handleBack} size="sm" disabled={isSaving}>← Back</Button>
                <span className="text-[11px] text-[var(--text-tertiary)] self-center">You can revisit setup anytime in Settings</span>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
