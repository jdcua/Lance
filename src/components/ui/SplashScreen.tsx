import { useEffect, useState } from 'react';
import BrandLogo from '../ui/BrandLogo';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { getRuntimeVersion } from '../../lib/version';
import { openCheckout } from '../../utils/tauri';

interface SplashScreenProps {
  onDismiss: () => void;
}

export default function SplashScreen({ onDismiss }: SplashScreenProps) {
  const { isLicensed } = useStore();
  const [appVersion, setAppVersion] = useState('0.0.0');

  useEffect(() => {
    getRuntimeVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    if (isLicensed) return;
    const timer = setTimeout(onDismiss, 2000);
    return () => clearTimeout(timer);
  }, [isLicensed, onDismiss]);

  if (isLicensed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
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
          Core is free forever. Pro adds archetype depth — proposals, contracts, invoices, scope-creep protection.
        </p>

        <div className="flex items-center justify-center gap-3 mb-6">
          <Button variant="primary" onClick={() => openCheckout('monthly')} size="md">
            Try Pro free for 30 days &mdash; $14/mo
          </Button>
          <Button variant="secondary" onClick={onDismiss} size="md">
            Continue free
          </Button>
        </div>

        <p className="text-xs text-[var(--text-tertiary)]">Try free 30 days • $14/mo or $120/yr • Lifetime license available</p>
      </div>
    </div>
  );
}
