import { useEffect, useRef, useState } from 'react';
import { X, CreditCard, Calendar, Check } from 'lucide-react';
import { useStore } from '../../store';
import { useToasts } from '../../store/toastStore';
import { openCheckout } from '../../utils/tauri';
import { getTrialValue, computeProRoi, type TrialValueSummary } from '../../utils/trialValue';
import { PRO_PRICES } from '../../lib/pricing';
import { recordTelemetry } from '../../utils/telemetry';
import { formatCurrency } from '../../utils/format';
import Button from '../ui/Button';
import type { LicenseTier } from '../../lib/constants';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerFeature?: string;
}

export default function UpgradeModal({ isOpen, onClose, triggerFeature }: UpgradeModalProps) {
  const { getActiveTier } = useStore();
  const addToast = useToasts((s) => s.add);
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'onetime'>('yearly');
  const [loading, setLoading] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<LicenseTier>('free');
  const [checkoutNotice, setCheckoutNotice] = useState('');
  const [trialValue, setTrialValue] = useState<TrialValueSummary | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentTier(getActiveTier());
    if (isOpen) {
      setTrialValue(getTrialValue());
      recordTelemetry('upgrade_modal_open', { trigger: triggerFeature || 'direct' });
    }
  }, [getActiveTier, isOpen, triggerFeature]);

  // Escape closes the modal; Tab stays trapped inside.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ).filter((el) => el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !panelRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const isPro = ['pro', 'trial', 'lifetime'].includes(currentTier);

  if (!isOpen) return null;

  const handleCheckout = async (tier: 'monthly' | 'yearly' | 'onetime') => {
    setLoading(tier);
    try {
      const opened = await openCheckout(tier);
      if (!opened) {
        setCheckoutNotice('Checkout isn\u2019t configured in this build yet. Contact support to get a license key.');
        addToast('Checkout is not configured in this build', 'info');
      } else {
        onClose();
      }
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      id: 'yearly' as const,
      label: 'Yearly',
      price: `$${PRO_PRICES.yearly}`,
      period: '/yr',
      description: 'Save 29% vs monthly. Cancel anytime.',
      badge: 'Recommended',
      cta: 'Start 30-day free trial',
    },
    {
      id: 'monthly' as const,
      label: 'Monthly',
      price: `$${PRO_PRICES.monthly}`,
      period: '/mo',
      description: 'Billed monthly. Cancel anytime.',
      badge: '',
      cta: 'Start 30-day free trial',
    },
    {
      id: 'onetime' as const,
      label: 'Lifetime',
      price: `$${PRO_PRICES.lifetime}`,
      period: ' one-time',
      description: 'Pay once. Own Pro forever. All future updates.',
      badge: '',
      cta: 'Buy lifetime license',
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Unlock Pro depth"
        className="w-[520px] bg-[var(--bg-card)] rounded-[16px] shadow-2xl px-8 py-8"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-[24px] font-semibold text-[var(--text-primary)]" style={{ fontFamily: "'Syne', sans-serif" }}>
              Unlock Pro depth
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {triggerFeature
                ? `"${triggerFeature}" is a Pro feature. Choose a plan to unlock it.`
                : 'Core is free forever. Pro adds archetype-specific proposals, contracts, invoices, and scope-creep protection.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex gap-2 mb-6" role="tablist">
          {plans.map((plan) => (
            <button
              key={plan.id}
              role="tab"
              aria-selected={activeTab === plan.id}
              onClick={() => setActiveTab(plan.id)}
              className={`flex-1 py-3 px-4 rounded-[10px] text-sm font-medium transition-all ${
                activeTab === plan.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {plan.label}
              {plan.badge && (
                <span className={`ml-2 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                  activeTab === plan.id
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--accent-bg)] text-[var(--accent)]'
                }`}>
                  {plan.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Plan card */}
        <div className="space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`p-5 rounded-[12px] border-2 transition-all ${
                activeTab === plan.id
                  ? 'border-[var(--accent)] bg-[var(--accent-bg)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[28px] font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {plan.price}
                    </span>
                    <span className="text-sm text-[var(--text-tertiary)]">{plan.period}</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{plan.description}</p>
                </div>
                {plan.badge && activeTab === plan.id && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-[var(--accent)] text-white rounded-full">
                    {plan.badge}
                  </span>
                )}
              </div>

              <Button
                variant={activeTab === plan.id ? 'primary' : 'secondary'}
                size="lg"
                className="w-full"
                onClick={() => {
                  if (activeTab !== plan.id) setActiveTab(plan.id);
                  else handleCheckout(plan.id as 'monthly' | 'yearly' | 'onetime');
                }}
                disabled={loading !== null}
              >
                {loading === plan.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Opening checkout…
                  </span>
                ) : (
                  plan.cta
                )}
              </Button>
            </div>
          ))}
        </div>

        {checkoutNotice && (
          <p className="text-[11px] text-[var(--warning-text)] mt-4 text-center">{checkoutNotice}</p>
        )}

        {trialValue && trialValue.total > 0 && currentTier === 'trial' && (
          <div className="mt-4 p-4 rounded-[12px] bg-[var(--accent-bg)] border border-[var(--accent)]/30">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Pro has already earned you {formatCurrency(trialValue.total)}
              {(() => {
                const roi = computeProRoi(trialValue.total);
                return roi.multiple !== null && roi.multiple >= 1
                  ? `, ${roi.multiple}x its price`
                  : '';
              })()}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
              {[
                trialValue.changeOrders > 0 ? `change orders ${formatCurrency(trialValue.changeOrders)}` : '',
                trialValue.lateFees > 0 ? `late fees ${formatCurrency(trialValue.lateFees)}` : '',
                trialValue.topUps > 0 ? `top-ups ${formatCurrency(trialValue.topUps)}` : '',
              ]
                .filter(Boolean)
                .join(' · ')}
              {' '}in your trial so far. One change order typically covers months of Pro.
            </p>
          </div>
        )}

        {/* Current status */}
        <div className="mt-6 pt-4 border-t border-[var(--border-color)]">
          <p className="text-xs text-[var(--text-tertiary)] text-center">
            Current: <strong className="text-[var(--text-primary)] capitalize">{currentTier}</strong>
            {currentTier === 'trial' && (
              <>
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-[var(--accent-bg)] text-[var(--accent)] rounded-full">
                  Trial
                </span>
              </>
            )}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] text-center mt-1">
            Core features (clients, projects, invoices, time tracking, client portal) always stay free.
            Client payments go straight to you. Lance never takes a cut.
          </p>
        </div>
      </div>
    </div>
  );
}