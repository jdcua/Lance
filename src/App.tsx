import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import AIBar from './components/layout/AIBar';
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import { useStore } from './store';

export default function App() {
  const { profile, profileLoaded, loadProfile, saveProfile } = useStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({ name: '', currency: 'CAD' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profileLoaded && !profile) {
      setShowOnboarding(true);
    }
  }, [profileLoaded, profile]);

  const handleOnboardingSave = async () => {
    if (!onboardingForm.name.trim()) return;
    setSaving(true);
    try {
      await saveProfile({
        name: onboardingForm.name,
        currency: onboardingForm.currency,
      });
      setShowOnboarding(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex bg-[#FAFAF9]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <AIBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <Modal open={showOnboarding} onClose={() => {}} title="Welcome to Lance" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[#6B6B67]">
            Let's get you set up. This information stays on your machine.
          </p>
          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Your Name *</label>
            <input
              type="text"
              value={onboardingForm.name}
              onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
              placeholder="Your full name"
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Currency</label>
            <select
              value={onboardingForm.currency}
              onChange={(e) => setOnboardingForm({ ...onboardingForm, currency: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
            >
              <option value="CAD">CAD ($)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="AUD">AUD ($)</option>
            </select>
          </div>
          <Button onClick={handleOnboardingSave} loading={saving} disabled={!onboardingForm.name.trim()} className="w-full" size="md">
            Get Started
          </Button>
        </div>
      </Modal>
    </div>
  );
}
