import { useEffect, useRef, useState } from 'react';
import BrandLogo from '../ui/BrandLogo';
import { useStore } from '../../store';
import { useToasts } from '../../store/toastStore';
import Button from '../ui/Button';
import { getRuntimeVersion } from '../../lib/version';
import { openCheckout } from '../../utils/tauri';
import { PRO_PRICES } from '../../lib/pricing';

interface SplashScreenProps {
  onDismiss: () => void;
}

export default function SplashScreen({ onDismiss }: SplashScreenProps) {
  const { isLicensed } = useStore();
  const addToast = useToasts((s) => s.add);
  const [appVersion, setAppVersion] = useState('0.0.0');
  const [checkoutNotice, setCheckoutNotice] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getRuntimeVersion().then(setAppVersion);
  }, []);

  // Frequency-cap accounting: count one view per mount against this version.
  // Skipped for licensed users (splash never shows for them) and only runs
  // when actually mounted, so suppressed sessions don't burn views.
  useEffect(() => {
    if (isLicensed) return;
    getRuntimeVersion().then((v) => {
      const key = `lance:splash-views:${v}`;
      const n = parseInt(localStorage.getItem(key) || '0', 10) || 0;
      localStorage.setItem(key, String(n + 1));
    });
  }, [isLicensed]);

  // No auto-dismiss: this screen asks the user to make a real choice
  // (start trial vs continue free). Auto-closing it mid-read was
  // reported as the modal "disappearing". Explicit buttons + Escape only.

  // Escape dismisses the splash (matching modal behavior) and Tab stays trapped.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
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
  }, [onDismiss]);

  if (isLicensed) return null;

  const handleTryPro = async () => {
    const opened = await openCheckout('monthly');
    if (!opened) {
      setCheckoutNotice('Checkout isn\u2019t configured in this build yet. Contact support to get a license key.');
      addToast('Checkout is not configured in this build', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Lance Pro"
        className="w-[480px] bg-[var(--bg-card)] rounded-[16px] shadow-2xl px-10 py-10 text-center"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <BrandLogo size={32} className="text-[var(--accent)] mx-auto mb-2" />
        <h1 className="text-[28px] font-semibold text-[var(--text-primary)] mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
          Lance
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">Freelancer OS</p>

        <p className="text-xs text-[var(--text-tertiary)] mb-5">Version {appVersion} &middot; Built by Placeholder Labs Incorporated Limited</p>

        <div className="border-t border-[var(--border-color)] my-5" />

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
          Core is free forever. Pro adds archetype depth · proposals, contracts, invoices, scope-creep protection.
        </p>

        <div className="flex items-center justify-center gap-3 mb-6">
          <Button variant="primary" onClick={handleTryPro} size="md">
            Try Pro free for 30 days
          </Button>
          <Button variant="secondary" onClick={onDismiss} size="md">
            Continue free
          </Button>
        </div>

        {checkoutNotice && (
          <p className="text-[11px] text-[var(--warning-text)] mb-3">{checkoutNotice}</p>
        )}

        <p className="text-xs text-[var(--text-tertiary)]">{`Try free 30 days • $${PRO_PRICES.yearly}/yr or $${PRO_PRICES.monthly}/mo • Lifetime license available`}</p>
      </div>
    </div>
  );
}