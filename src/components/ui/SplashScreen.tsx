import { useEffect } from 'react';
import { Scale } from 'lucide-react';
import { useStore } from '../../store';
import Button from '../ui/Button';

interface SplashScreenProps {
  onDismiss: () => void;
}

export default function SplashScreen({ onDismiss }: SplashScreenProps) {
  const { isLicensed } = useStore();

  useEffect(() => {
    if (isLicensed) {
      onDismiss();
      return;
    }
    const timer = setTimeout(onDismiss, 2000);
    return () => clearTimeout(timer);
  }, [isLicensed, onDismiss]);

  const handleGetLicense = () => {
    window.open('https://lance.decentra.co/license', '_blank');
  };

  if (isLicensed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-[480px] bg-white rounded-[16px] shadow-2xl px-10 py-10 text-center"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Scale size={32} className="text-[#1D9E75] mx-auto mb-2" />
        <h1 className="text-[28px] font-semibold text-[#1C1C1A] mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Lance
        </h1>
        <p className="text-sm text-[#6B6B67] mb-6">Freelancer OS</p>

        <p className="text-xs text-[#A3A39E] mb-5">Version 1.0.0 &middot; Built by Decentra</p>

        <div className="border-t border-[#E5E5E3] my-5" />

        <p className="text-sm text-[#6B6B67] leading-relaxed mb-3">
          Lance is free to use, forever.
        </p>
        <p className="text-sm text-[#6B6B67] leading-relaxed mb-7">
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

        <p className="text-xs text-[#A3A39E]">lance.decentra.co</p>
      </div>
    </div>
  );
}
