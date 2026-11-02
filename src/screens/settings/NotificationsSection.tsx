import type { ChangeEvent } from 'react';
import { useStore } from '../../store';
import { setPref, usePrefs, type MotionPref, type ContrastPref, type TextScalePref } from '../../lib/prefs';
import { getFeatureFlags } from '../../lib/constants';
import Card from '../../components/ui/Card';
import PrefToggle from '../../components/ui/PrefToggle';
import { SectionHead, type SettingsBag } from './shared';

/**
 * Notifications settings: AI features, Personalize, follow-up reminders.
 * Pure relocation. Pro gating (late fees) untouched.
 */
export default function NotificationsSection({ bag }: { bag: SettingsBag }) {
  const { form, autoSave, saved, setSaved } = bag;
  const prefs = usePrefs();
  const saveFollowUpSettings = useStore((s) => s.saveFollowUpSettings);
  const getActiveTier = useStore((s) => s.getActiveTier);
  const markSaved = () => setSaved((prev) => new Set([...prev, 'Personalize']));

  return (
    <>
      {/* Preferences section header */}
      <div className="text-xs text-[var(--text-secondary)] font-semibold mb-4">
        Notifications
      </div>

      {/* AI features */}
      <Card className="mb-6">
        <SectionHead title="AI features" isSaved={saved.has('AI features')} />
        <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mb-4">
          AI-assisted writing, scope warnings, and pricing analysis run locally on your
          machine. No data is sent anywhere.
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            onClick={() => autoSave({ ai_enabled: !form.ai_enabled }, 'AI features')}
            className={`relative w-10 h-6 rounded-full transition-colors ${
              form.ai_enabled ? 'bg-[var(--accent)]' : 'bg-[var(--neutral-border)]'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--bg-card)] shadow transition-transform ${
                form.ai_enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-sm text-[var(--text-primary)]  font-medium">
            {form.ai_enabled ? 'AI features on' : 'AI features off'}
          </span>
        </label>
      </Card>

      {/* Personalize */}
      <Card className="mb-6">
        <SectionHead title="Personalize" isSaved={saved.has('Personalize')} />
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-tertiary)]">
            Motion, glow, badges and nudges. Everything here is local and applies
            instantly.
          </p>
          <div>
            <p className="text-sm text-[var(--text-primary)]">Motion</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5 mb-2">
              Auto follows your operating system setting.
            </p>
            <div
              className="inline-flex gap-1 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1"
              role="group"
              aria-label="Motion preference"
            >
              {(['auto', 'full', 'off'] as MotionPref[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setPref('motion', m);
                    markSaved();
                  }}
                  aria-pressed={prefs.motion === m}
                  className={`px-3 py-1.5 text-xs font-medium rounded-[7px] capitalize transition-colors ${
                    prefs.motion === m
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {m === 'auto' ? 'Auto' : m === 'full' ? 'Full' : 'Off'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-[var(--text-primary)]">Contrast</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5 mb-2">
              Auto follows your operating system setting. High targets 7:1 body text.
            </p>
            <div
              className="inline-flex gap-1 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1"
              role="group"
              aria-label="Contrast preference"
            >
              {(['auto', 'standard', 'high'] as ContrastPref[]).map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setPref('contrast', c);
                    markSaved();
                  }}
                  aria-pressed={prefs.contrast === c}
                  className={`px-3 py-1.5 text-xs font-medium rounded-[7px] capitalize transition-colors ${
                    prefs.contrast === c
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {c === 'auto' ? 'Auto' : c === 'standard' ? 'Standard' : 'High'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-[var(--text-primary)]">Text size</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5 mb-2">
              Scales the whole app. Browser zoom still works on top.
            </p>
            <div
              className="inline-flex gap-1 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1"
              role="group"
              aria-label="Text size preference"
            >
              {(['100', '112', '125'] as TextScalePref[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setPref('textScale', s);
                    markSaved();
                  }}
                  aria-pressed={prefs.textScale === s}
                  className={`px-3 py-1.5 text-xs font-medium rounded-[7px] transition-colors ${
                    prefs.textScale === s
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>

          <PrefToggle
            checked={prefs.sparklines}
            onChange={(v) => {
              setPref('sparklines', v);
              markSaved();
            }}
            label="KPI sparklines"
            hint="Six-month trend lines under dashboard metrics"
          />
          <PrefToggle
            checked={prefs.badges}
            onChange={(v) => {
              setPref('badges', v);
              markSaved();
            }}
            label="Sidebar badges"
            hint="Unread and count pills on navigation"
          />
          <PrefToggle
            checked={prefs.digest}
            onChange={(v) => {
              setPref('digest', v);
              markSaved();
            }}
            label="Weekly digest"
            hint="Your-week summary card on the dashboard"
          />
          <PrefToggle
            checked={prefs.coachTips}
            onChange={(v) => {
              setPref('coachTips', v);
              markSaved();
            }}
            label="Coach tips"
            hint="One-time nudges when you seem stuck. Never leaves your machine."
          />
        </div>
      </Card>

      {/* Follow-up settings */}
      <Card className="mb-6">
        <SectionHead title="Follow-up reminders" isSaved={saved.has('Follow-ups')} />
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-tertiary)]">
            Lance monitors sent proposals and invoices and drafts friendly follow-up
            messages when they need attention. You control everything · messages are never
            sent automatically.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-primary)]">Enable follow-ups</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Draft reminders for overdue proposals and invoices
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={bag.fuEnabled}
                onChange={(e) => {
                  bag.setFuEnabled(e.target.checked);
                  saveFollowUpSettings({ enabled: e.target.checked });
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-colors peer-checked:bg-[var(--accent)]" />
            </label>
          </div>

          {/* Delays */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border-color)]">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Proposal delay (days)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={bag.fuProposalDelay}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
                  bag.setFuProposalDelay(v);
                  saveFollowUpSettings({ proposal_delay_days: v });
                }}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                First follow-up triggers after this many days of no response.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Invoice overdue delay (days)
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={bag.fuInvoiceDelay}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(30, parseInt(e.target.value) || 0));
                  bag.setFuInvoiceDelay(v);
                  saveFollowUpSettings({ invoice_delay_days: v });
                }}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                First reminder triggers after due date passes by this many days.
              </p>
            </div>
          </div>

          {/* Late fees (Pro): accrue per 30 days overdue, shown in drafts */}
          <div className="pt-3 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">Late fees</p>
              {getFeatureFlags(getActiveTier()).smartDunning !== true && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))]">
                  PRO
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mb-3">
              Charge a monthly percent on overdue balances. Accrued fees appear in
              reminder drafts and can be added to the invoice with one click.
            </p>
            {(() => {
              const pro = getFeatureFlags(getActiveTier()).smartDunning === true;
              const guard =
                (fn: (e: ChangeEvent<HTMLInputElement>) => void) =>
                (e: ChangeEvent<HTMLInputElement>) => {
                  if (!pro) {
                    document.dispatchEvent(
                      new CustomEvent('lance:open-upgrade', { detail: 'late fees' }),
                    );
                    return;
                  }
                  fn(e);
                };
              return (
                <div className="flex items-center gap-4">
                  <label
                    className={`flex items-center gap-2 text-xs text-[var(--text-secondary)] ${!pro ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      checked={bag.fuLateFeeEnabled}
                      disabled={!pro}
                      onChange={guard((e) => {
                        const on = (e.target as HTMLInputElement).checked;
                        bag.setFuLateFeeEnabled(on);
                        saveFollowUpSettings({ lateFeeEnabled: on });
                      })}
                      className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent-ink,var(--accent))] focus:ring-[var(--accent)]"
                    />
                    Enable late fees
                  </label>
                  <label
                    className={`flex items-center gap-2 text-xs text-[var(--text-secondary)] ${!pro || !bag.fuLateFeeEnabled ? 'opacity-60' : ''}`}
                  >
                    Percent per month
                    <input
                      type="number"
                      min={0.1}
                      max={10}
                      step={0.1}
                      value={bag.fuLateFeePercent}
                      disabled={!pro || !bag.fuLateFeeEnabled}
                      onChange={guard((e) => {
                        const v = Math.max(
                          0.1,
                          Math.min(10, parseFloat(e.target.value) || 1.5),
                        );
                        bag.setFuLateFeePercent(v);
                        saveFollowUpSettings({ lateFeePercent: v });
                      })}
                      className="w-20 px-2 py-1.5 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                </div>
              );
            })()}
            <p className="text-[10px] text-[var(--text-tertiary)] mt-2">
              Only charge what your contract allows and your local law permits.
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}
