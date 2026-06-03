import { useEffect, useState, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import AIBar from './components/layout/AIBar';
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import ToastContainer from './components/ui/Toast';
import CommandPalette from './components/ui/CommandPalette';
import { useStore } from './store';
import { useToasts } from './store/toastStore';
import { shouldGenerate, getNextDueDate } from './utils/recurringEngine';
import { generateInvoiceNumber } from './utils/invoiceNumber';

export default function App() {
  const {
    profile, profileLoaded, loadProfile, saveProfile,
    recurringInvoices, loadRecurringInvoices, updateRecurringInvoice,
    invoices, loadInvoices, addInvoice,
    clients, loadClients,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const navigate = useNavigate();
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingForm, setOnboardingForm] = useState({
    name: '', email: '', currency: 'CAD' as string, hourly_rate: '', payment_terms: '14',
  });
  const [saving, setSaving] = useState(false);
  const [ranAutoGen, setRanAutoGen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profile?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [profile?.theme]);

  useEffect(() => {
    if (profileLoaded && !profile) {
      setShowOnboarding(true);
      setOnboardingStep(1);
    }
  }, [profileLoaded, profile]);

  // Auto-generate recurring invoices on startup
  useEffect(() => {
    if (!profileLoaded || ranAutoGen) return;
    const run = async () => {
      setRanAutoGen(true);
      await loadRecurringInvoices();
      await loadInvoices();
      await loadClients();
    };
    run();
  }, [profileLoaded, ranAutoGen, loadRecurringInvoices, loadInvoices, loadClients]);

  useEffect(() => {
    if (!ranAutoGen || recurringInvoices.length === 0) return;
    const generate = async () => {
      const paymentTerms = profile?.payment_terms ?? 14;
      const due = recurringInvoices.filter(shouldGenerate);
      for (const ri of due) {
        const currentInvoices = useStore.getState().invoices;
        const invNumber = generateInvoiceNumber(currentInvoices);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + paymentTerms);
        await addInvoice({
          client_id: ri.client_id,
          project_id: ri.project_id,
          invoice_number: invNumber,
          status: 'draft',
          line_items: ri.line_items,
          subtotal: ri.subtotal,
          tax_rate: ri.tax_rate,
          total: ri.total,
          due_date: dueDate.toISOString().split('T')[0],
          notes: ri.notes,
        });
        const now = new Date();
        await updateRecurringInvoice({
          ...ri,
          next_due: getNextDueDate(ri.frequency, new Date(ri.next_due)).toISOString(),
          last_generated: now.toISOString(),
        });
        const client = useStore.getState().clients.find((c) => c.id === ri.client_id);
        addToast(`Invoice generated for ${client?.name || ri.client_id}`, 'success');
      }
    };
    generate();
  }, [ranAutoGen]);

  // Keyboard shortcuts
  const isEditing = useCallback((): boolean => {
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return true;
    if (document.activeElement?.closest('[contenteditable="true"]') ||
        document.activeElement?.closest('.tiptap')) return true;
    return false;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }
      if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!isEditing()) navigate('/settings');
        return;
      }
      if (isEditing()) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'n') {
        e.preventDefault();
        const path = location.pathname;
        if (path.startsWith('/proposals')) navigate('/proposals/new');
        else if (path.startsWith('/clients')) {
          // Trigger client add modal via doc event
          document.dispatchEvent(new CustomEvent('lance:add-client'));
        } else if (path.startsWith('/invoices')) {
          document.dispatchEvent(new CustomEvent('lance:add-invoice'));
        } else if (path.startsWith('/projects')) {
          document.dispatchEvent(new CustomEvent('lance:add-project'));
        } else if (path.startsWith('/time')) {
          document.dispatchEvent(new CustomEvent('lance:add-time'));
        }
      }
      if (mod && !e.shiftKey && e.key >= '1' && e.key <= '8') {
        e.preventDefault();
        const routes = ['/proposals', '/contracts', '/projects', '/time', '/invoices', '/clients', '/finance', '/insights'];
        navigate(routes[parseInt(e.key) - 1]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, location, isEditing]);

  const handleOnboardingNext = () => setOnboardingStep((s) => s + 1);
  const handleOnboardingBack = () => setOnboardingStep((s) => s - 1);

  const handleOnboardingFinish = async () => {
    if (!onboardingForm.name.trim()) return;
    setSaving(true);
    try {
      await saveProfile({
        name: onboardingForm.name,
        email: onboardingForm.email || undefined,
        currency: onboardingForm.currency,
        hourly_rate: onboardingForm.hourly_rate ? parseFloat(onboardingForm.hourly_rate) : undefined,
        payment_terms: parseInt(onboardingForm.payment_terms) || 14,
      });
      setShowOnboarding(false);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20";
  const labelClass = "block text-xs font-medium text-[#6B6B67] mb-1";

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

      {/* 3-step Onboarding */}
      <Modal open={showOnboarding} onClose={() => {}} title="" size="sm">
        <div className="space-y-5">
          <div className="flex justify-center gap-2 mb-1">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-all ${
                  step <= onboardingStep ? 'bg-[#1D9E75]' : 'bg-[#E5E5E3]'
                }`}
              />
            ))}
          </div>

          {onboardingStep === 1 && (
            <>
              <div className="text-center space-y-3">
                <h3 className="text-lg font-semibold text-[#1C1C1A]">Welcome to Lance</h3>
                <p className="text-sm text-[#6B6B67] leading-relaxed">
                  Your freelance business, all in one place.
                </p>
              </div>
              <Button onClick={handleOnboardingNext} className="w-full" size="md">
                Get started &rarr;
              </Button>
            </>
          )}

          {onboardingStep === 2 && (
            <>
              <div className="text-center mb-2">
                <h3 className="text-lg font-semibold text-[#1C1C1A]">Tell us about yourself</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Full name</label>
                  <input
                    type="text"
                    value={onboardingForm.name}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
                    placeholder="Your full name"
                    className={inputClass}
                    autoFocus
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={onboardingForm.email}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, email: e.target.value })}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Currency</label>
                  <select
                    value={onboardingForm.currency}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, currency: e.target.value })}
                    className={inputClass}
                  >
                    <option value="CAD">CAD ($)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="secondary" onClick={handleOnboardingBack} size="sm">&larr; Back</Button>
                <Button onClick={handleOnboardingNext} size="sm">Continue &rarr;</Button>
              </div>
            </>
          )}

          {onboardingStep === 3 && (
            <>
              <div className="text-center mb-2">
                <h3 className="text-lg font-semibold text-[#1C1C1A]">Set your defaults</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Hourly rate</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#A3A39E]">$</span>
                    <input
                      type="number"
                      value={onboardingForm.hourly_rate}
                      onChange={(e) => setOnboardingForm({ ...onboardingForm, hourly_rate: e.target.value })}
                      placeholder="0.00"
                      className={`${inputClass} pl-7`}
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-[#A3A39E] mt-1">You can change this anytime in Settings.</p>
                </div>
                <div>
                  <label className={labelClass}>Payment terms (days)</label>
                  <input
                    type="number"
                    value={onboardingForm.payment_terms}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, payment_terms: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="secondary" onClick={handleOnboardingBack} size="sm">&larr; Back</Button>
                <Button onClick={handleOnboardingFinish} loading={saving} disabled={!onboardingForm.name.trim()} size="sm">
                  Start using Lance &rarr;
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <CommandPalette open={showCommandPalette} onClose={() => setShowCommandPalette(false)} />

      <ToastContainer />
    </div>
  );
}
