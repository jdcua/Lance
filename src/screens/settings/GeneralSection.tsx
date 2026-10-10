import { useStore, licenseWorkerUnconfigured } from '../../store';
import { useToasts } from '../../store/toastStore';
import { trialDaysRemaining } from '../../lib/trial';
import { getCurrencySymbol } from '../../lib/currency';
import { PRO_PRICES } from '../../lib/pricing';
import { getTrialValue } from '../../utils/trialValue';
import { formatCurrency } from '../../utils/format';
import { openCheckout } from '../../utils/tauri';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { getArchetype, ARCHETYPE_LIST } from '../../archetypes';
import { getTheme, applyTheme } from '../../themes/themes';
import {
  SectionHead,
  labelClass,
  inputClass,
  currencies,
  writingStyles,
  labelForStyle,
  type SettingsBag,
} from './shared';

/**
 * General settings: License (moved byte-for-byte — same copy, same handlers,
 * same tier logic), profile, rates, proposal voice/defaults, profession.
 * Pure relocation from Settings.tsx; all behavior lives where it did.
 */
export default function GeneralSection({ bag }: { bag: SettingsBag }) {
  const { form, setForm, autoSave, saved } = bag;
  const isLicensed = useStore((s) => s.isLicensed);
  const profile = useStore((s) => s.profile);
  const getActiveTier = useStore((s) => s.getActiveTier);
  const saveProfile = useStore((s) => s.saveProfile);
  const addToast = useToasts((s) => s.add);

  return (
    <>
      {/* Profile section header */}
      <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-4">
        Profile
      </div>

      {/* License */}
      <Card className="mb-6">
        <SectionHead title="License" isSaved={saved.has('License')} />
        {isLicensed ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-[var(--accent-ink,var(--accent))]" />
              <span className="text-sm font-medium text-[var(--accent-ink,var(--accent))]">
                Licensed
              </span>
              <span className="text-[10px] text-[var(--accent-ink,var(--accent))] bg-[var(--accent-bg)] px-1.5 py-0.5 rounded-full">
                Licensed
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mb-2">
              All themes unlocked. Thank you for supporting Lance.
            </p>
            {form.licensed_at && (
              <p className="text-xs text-[var(--text-tertiary)] mb-1">
                Licensed since {new Date(form.licensed_at).toLocaleDateString()}.
              </p>
            )}
            <p className="text-xs text-[var(--text-tertiary)] mb-4">
              Studio, Terminal, Craft, Motion, Lens, and Scale themes are unlocked.
            </p>
            <button
              onClick={() => bag.setShowRemoveLicenseConfirm(true)}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--danger)] underline transition-colors"
            >
              Remove license
            </button>
          </div>
        ) : (
          <div>
            {getActiveTier() === 'trial' && (
              <p className="text-sm text-[var(--text-primary)] mb-2">
                Pro trial:{' '}
                <strong className="text-[var(--accent-ink,var(--accent))]">
                  {trialDaysRemaining(profile?.trial_started_at)} days left
                </strong>
                . Everything is unlocked. Keep it with a license before it ends.
                {getTrialValue().total > 0 && (
                  <span className="block text-xs text-[var(--text-secondary)] mt-1">
                    It has already earned you {formatCurrency(getTrialValue().total)}.
                  </span>
                )}
              </p>
            )}
            {getActiveTier() === 'expired' && (
              <p className="text-sm text-[var(--text-primary)] mb-2">
                Your Pro trial ended. Your data is intact and Core stays free forever.
                Resubscribe anytime to unlock Pro depth again.
              </p>
            )}
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mb-4">
              Lance is free to use. A license removes the launch screen and unlocks all
              themes immediately.
            </p>
            {licenseWorkerUnconfigured() && (
              <p className="text-xs text-[var(--danger)] mb-3">
                This build has no license server configured, so a key cannot be
                checked online. Offline validation still works.
              </p>
            )}
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  bag.setLicenseKey('');
                  bag.setLicenseError('');
                  bag.setShowLicenseModal(true);
                }}
                size="sm"
              >
                Enter license key
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  openCheckout('yearly').then((ok) => {
                    if (!ok) addToast('Checkout is not configured in this build', 'info');
                  });
                }}
                size="sm"
              >
                Get Pro (${PRO_PRICES.yearly}/yr)
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Your profile */}
      <Card className="mb-6">
        <SectionHead title="Your profile" isSaved={saved.has('Your profile')} />
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Full name</label>
            <input
              type="text"
              maxLength={100}
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onBlur={() => autoSave({ name: form.name }, 'Your profile')}
              placeholder="Your full name"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              maxLength={254}
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              onBlur={() => {
                const email = (form.email || '').trim();
                if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                  addToast('Please enter a valid email address', 'error');
                  return;
                }
                autoSave({ email }, 'Your profile');
              }}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Default currency</label>
            <select
              value={form.currency}
              aria-label="Default currency"
              onChange={(e) => autoSave({ currency: e.target.value }, 'Your profile')}
              className={inputClass}
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
              You can override this per-client or per-invoice.
            </p>
          </div>
        </div>
      </Card>

      {/* Rates */}
      <Card className="mb-6">
        <SectionHead title="Rates" isSaved={saved.has('Rates')} />
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Default hourly rate</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-secondary)]">
                {getCurrencySymbol(form.currency || profile?.currency || 'CAD')}
              </span>
              <input
                type="number"
                min={0}
                max={10000}
                step="0.01"
                value={form.hourly_rate ?? ''}
                onChange={(e) => {
                  const v = e.target.value ? parseFloat(e.target.value) : 0;
                  setForm({
                    ...form,
                    hourly_rate: Number.isFinite(v) ? Math.max(0, Math.min(10000, v)) : 0,
                  });
                }}
                onBlur={() => autoSave({ hourly_rate: form.hourly_rate }, 'Rates')}
                placeholder="0.00"
                className={`${inputClass} pl-7`}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Default VAT / sales tax (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.tax_rate ?? ''}
              onChange={(e) => {
                const v = e.target.value ? parseFloat(e.target.value) : 0;
                setForm({
                  ...form,
                  tax_rate: Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0,
                });
              }}
              onBlur={() => autoSave({ tax_rate: form.tax_rate }, 'Rates')}
              placeholder="0"
              className={inputClass}
            />
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
              Invoice math only, applied to new invoices as entered. Not tax advice.
            </p>
          </div>
          <div>
            <label className={labelClass}>Payment terms (days)</label>
            <input
              type="number"
              min={0}
              max={365}
              aria-label="Payment terms (days)"
              value={form.payment_terms ?? 14}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                setForm({
                  ...form,
                  payment_terms: Number.isFinite(v) ? Math.max(0, Math.min(365, v)) : 14,
                });
              }}
              onBlur={() => autoSave({ payment_terms: form.payment_terms }, 'Rates')}
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass}>Payment instructions (printed on invoices)</label>
          <textarea
            value={form.payment_instructions || ''}
            onChange={(e) => setForm({ ...form, payment_instructions: e.target.value })}
            onBlur={() =>
              autoSave({ payment_instructions: form.payment_instructions }, 'Rates')
            }
            placeholder={
              'e.g. Bank transfer to First National, routing 123456, account 987654321. Or pay online at example.com/pay.'
            }
            rows={3}
            className={`${inputClass} resize-none leading-relaxed`}
          />
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
            Bank details, payment links, or anything your clients need to pay you. Stays
            on your machine, shown only on your invoices.
          </p>
        </div>
      </Card>

      {/* Proposal voice */}
      <Card className="mb-6">
        <SectionHead title="Proposal voice" isSaved={saved.has('Proposal voice')} />
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Writing style</label>
            <select
              value={form.writing_style || 'professional'}
              aria-label="Writing style"
              onChange={(e) =>
                autoSave({ writing_style: e.target.value }, 'Proposal voice')
              }
              className={inputClass}
            >
              {writingStyles.map((s) => (
                <option key={s} value={s}>
                  {labelForStyle(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Writing voice description</label>
            <textarea
              maxLength={1000}
              value={form.writing_voice || ''}
              onChange={(e) => setForm({ ...form, writing_voice: e.target.value })}
              onBlur={() =>
                autoSave({ writing_voice: form.writing_voice }, 'Proposal voice')
              }
              placeholder="e.g. I'm a senior full-stack developer who explains things clearly and avoids jargon"
              rows={2}
              className={`${inputClass} resize-none`}
            />
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
              Describe your voice and expertise. This helps the AI write proposals that
              sound like you.
            </p>
          </div>
          <div>
            <label className={labelClass}>Tagline / positioning</label>
            <input
              type="text"
              maxLength={200}
              value={form.tagline || ''}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              onBlur={() => autoSave({ tagline: form.tagline }, 'Proposal voice')}
              placeholder="e.g. I help startups ship beautiful products fast."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>What I always include</label>
            <textarea
              maxLength={2000}
              value={form.always_include || ''}
              onChange={(e) => setForm({ ...form, always_include: e.target.value })}
              onBlur={() =>
                autoSave({ always_include: form.always_include }, 'Proposal voice')
              }
              placeholder="Anything you always want in proposals..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </Card>

      {/* Proposal defaults */}
      <Card className="mb-6">
        <SectionHead title="Proposal defaults" isSaved={saved.has('Proposal defaults')} />
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Proposals expire after</label>
            <select
              value={form.proposal_expiry_days ?? ''}
              aria-label="Proposals expire after"
              onChange={(e) => {
                const v = e.target.value ? parseInt(e.target.value) : undefined;
                setForm({ ...form, proposal_expiry_days: v });
                autoSave({ proposal_expiry_days: v }, 'Proposal defaults');
              }}
              className={inputClass}
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="">Never</option>
            </select>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
              Sent proposals will automatically expire after this period.
            </p>
          </div>
        </div>
      </Card>

      {/* Profession / Archetype */}
      <Card className="mb-6">
        <SectionHead title="Profession" isSaved={saved.has('Profession')} />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-primary)]">Your Archetype</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {(() => {
                  const arch = getArchetype(profile?.profession || 'default');
                  return `${arch.emoji} ${arch.label}`;
                })()}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                document.dispatchEvent(new CustomEvent('lance:open-archetype-picker'));
              }}
            >
              Change <ArrowRight size={14} />
            </Button>
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">
            Your archetype customizes your sidebar layout, dashboard metrics, insights
            panels, and rate label. You can switch anytime · your data stays the same.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ARCHETYPE_LIST.filter((a) => a.id !== 'default' && a.id !== 'custom')
              .slice(0, 8)
              .map((archetype) => (
                <button
                  key={archetype.id}
                  onClick={async () => {
                    const theme = getTheme(archetype.theme);
                    applyTheme(theme);
                    localStorage.setItem('lance:theme', archetype.theme);
                    if (profile) {
                      try {
                        await saveProfile({ ...profile, profession: archetype.id });
                        addToast(`Switched to ${archetype.label}`, 'success');
                      } catch {
                        /* archetype switch is non-critical */ addToast(
                          'Failed to switch',
                          'error',
                        );
                      }
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-xs text-left transition-colors hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] bg-[var(--bg-card)]"
                >
                  <span>{archetype.emoji}</span>
                  <span className="text-[var(--text-primary)] truncate">
                    {archetype.label}
                  </span>
                </button>
              ))}
          </div>
        </div>
      </Card>
    </>
  );
}
