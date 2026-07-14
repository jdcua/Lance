import { useEffect } from 'react';
import BrandLogo from '../ui/BrandLogo';
import { useStore } from '../../store';
import Button from '../ui/Button';

interface SplashScreenProps {
  onDismiss: () => void;
}

export default function SplashScreen({ onDismiss }: SplashScreenProps) {
  const { isLicensed } = useStore();

  useEffect(() => {
    if (isLicensed) return;
    const timer = setTimeout(onDismiss, 2000);
    return () => clearTimeout(timer);
  }, [isLicensed, onDismiss]);

  const handleGetLicense = () => {
    window.open('https://lance.placeholderlabsincorporatedlimited.yabbadabbadoo/license', '_blank', 'noopener,noreferrer');
  };

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

        <p className="text-xs text-[var(--text-tertiary)] mb-5">Version 1.2.5 &middot; Built by Placeholder Labs Incorporated Limited</p>

        <div className="border-t border-[var(--border-color)] my-5" />

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
          Lance is free to use, forever.
        </p>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-7">
          If it's saving you time and making you money, consider supporting its development.
        </p>

        <div className="flex items-center justify-center gap-3 mb-6">
          <Button variant="primary" onClick={handleGetLicense} size="md">
            Get a license &mdash; $59
          </Button>
          <Button variant="secondary" onClick={onDismiss} size="md">
            Continue
          </Button>
        </div>

        <p className="text-xs text-[var(--text-tertiary)]">lance.placeholderlabsincorporatedlimited.yabbadabbadoo</p>
      </div>
    </div>
  );
}
