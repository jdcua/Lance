import { useStore } from '../../store';
import { DEFAULT_CURRENCY, CURRENCIES } from '../../lib/constants';
import { useToasts } from '../../store/toastStore';
import { getCurrencySymbol } from '../../lib/currency';
import Card from '../../components/ui/Card';
import {
  SectionHead,
  labelClass,
  inputClass,
  writingStyles,
  labelForStyle,
  type SettingsBag,
} from './shared';

/**
 * General settings: profile, rates, proposal voice/defaults, profession.
 */
export default function GeneralSection({ bag }: { bag: SettingsBag }) {
  const { form, setForm, autoSave, saved } = bag;
  const profile = useStore((s) => s.profile);
  const addToast = useToasts((s) => s.add);

  return (
    <>
      {/* Profile section header */}
      <div className="text-xs text-[var(--text-secondary)] font-semibold mb-4">
        Profile
      </div>

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
              {CURRENCIES.map((c) => (
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
                {getCurrencySymbol(form.currency || profile?.currency || DEFAULT_CURRENCY)}
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

    </>
  );
}
