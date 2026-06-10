import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import RichEditor from '../components/ui/RichEditor';
import { textToHtml } from '../utils/textToHtml';
import { ArrowLeft, Sparkles, X, AlertTriangle } from 'lucide-react';
import { generateProposalBody, checkScopeWarnings, type ScopeWarning } from '../ai/proposalGenerator';
import { useToasts } from '../store/toastStore';
import { checkAndNotify } from '../achievements/notify';

const projectTypes = [
  'Brand identity',
  'Web design',
  'Development',
  'Consulting',
  'Content writing',
  'Photography',
  'Marketing',
  'Video editing',
  'Animation',
  'SEO audit',
  'Social media',
  'Other',
];

export default function NewProposal() {
  const { clients, loadClients, addProposal, profile, loadProfile } = useStore();
  const addToast = useToasts((s) => s.add);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [warnings, setWarnings] = useState<ScopeWarning[]>([]);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const aiEnabled = profile?.ai_enabled ?? false;
  const [form, setForm] = useState({
    client_id: '',
    title: '',
    scope: '',
    timeline: '',
    rate: '',
    rate_type: 'flat' as 'flat' | 'hourly',
    project_type: 'Web design',
    body: '',
  });

  useEffect(() => {
    Promise.all([loadClients(), loadProfile()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [loadClients, loadProfile]);

  const handleGenerate = () => {
    if (!form.scope.trim()) return;
    setGenerating(true);
    setTimeout(() => {
      const client = clients.find((c) => c.id === form.client_id);
      const plainText = generateProposalBody({
        clientName: client?.name || 'the client',
        projectType: form.project_type,
        scope: form.scope,
        timeline: form.timeline,
        rate: form.rate ? parseFloat(form.rate) : 0,
        rateType: form.rate_type,
        freelancerName: profile?.name || 'Freelancer',
        writingVoice: profile?.writing_style || profile?.writing_voice || 'professional',
        tagline: profile?.tagline,
        alwaysInclude: profile?.always_include,
      });
      const body = textToHtml(plainText);
      const scopeWarnings = checkScopeWarnings(form.scope);
      setForm({ ...form, body });
      setWarnings(scopeWarnings);
      setDismissedWarnings(new Set());
      setGenerating(false);
    }, 600);
  };

  const handleRegenerate = () => {
    setForm({ ...form, body: '' });
    setWarnings([]);
    setDismissedWarnings(new Set());
  };

  const dismissWarning = (pattern: string) => {
    setDismissedWarnings((prev) => new Set([...prev, pattern]));
  };

  const handleSave = async (status: 'draft' | 'sent') => {
    if (!form.title.trim() || !form.client_id) return;
    setSaving(true);
    try {
      await addProposal({
        client_id: form.client_id,
        title: form.title,
        status,
        scope: form.scope,
        timeline: form.timeline || undefined,
        rate: form.rate ? parseFloat(form.rate) : undefined,
        rate_type: form.rate_type,
        body: form.body,
      });
      navigate('/proposals');
      checkAndNotify(useStore.getState(), addToast);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to save proposal', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activeWarnings = warnings.filter((w) => !dismissedWarnings.has(w.pattern));

  const currencySymbol = profile?.currency === 'USD' || profile?.currency === 'CAD' || profile?.currency === 'AUD' ? '$' : profile?.currency === 'EUR' ? '€' : profile?.currency === 'GBP' ? '£' : '$';

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" /></div>

  return (
    <div className="p-6 max-w-2xl">
      <button
        onClick={() => navigate('/proposals')}
        className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Proposals
      </button>

      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">New Proposal</h2>

      <Card className="mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Client *</label>
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Proposal Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Website Redesign Proposal"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Project Type</label>
            <select
              value={form.project_type}
              onChange={(e) => setForm({ ...form, project_type: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
            >
              {projectTypes.map((pt) => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Scope of Work</label>
            <textarea
              value={form.scope}
              onChange={(e) => { setForm({ ...form, scope: e.target.value }); setWarnings([]); setDismissedWarnings(new Set()); }}
              placeholder="Describe the scope of work..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Rate Type</label>
              <select
                value={form.rate_type}
                onChange={(e) => setForm({ ...form, rate_type: e.target.value as 'flat' | 'hourly' })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              >
                <option value="flat">Flat</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Rate ({form.rate_type === 'hourly' ? `${currencySymbol}/hr` : currencySymbol})</label>
              <input
                type="number"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Timeline</label>
              <input
                type="text"
                value={form.timeline}
                onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                placeholder="e.g. 4 weeks"
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center pt-2 gap-2">
            <Button
              onClick={handleGenerate}
              loading={generating}
              disabled={!form.scope.trim() || !aiEnabled}
              size="md"
            >
              {generating ? (
                'Writing...'
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate proposal
                </>
              )}
            </Button>
            {!aiEnabled && (
              <p className="text-xs text-[var(--text-tertiary)]">
                AI features are off. Enable them in Settings &rarr; AI features.
              </p>
            )}
          </div>
        </div>
      </Card>

      {activeWarnings.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {activeWarnings.map((w) => (
            <div
              key={w.pattern}
              className="flex items-start gap-2 px-3 py-2 rounded-[8px] bg-[#FAEEDA] text-[#854F0B] text-xs"
            >
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">{w.warning}</span>
              <button
                onClick={() => dismissWarning(w.pattern)}
                className="text-[#854F0B]/60 hover:text-[#854F0B] flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {form.body && (
        <Card className="mb-6">
          <RichEditor
            content={form.body}
            onChange={(html) => setForm({ ...form, body: html })}
            placeholder="Your proposal will appear here after generation..."
            minHeight={280}
          />
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => navigate('/proposals')} size="md">
          Cancel
        </Button>
        {form.body && (
          <Button variant="secondary" onClick={handleRegenerate} disabled={generating} size="md">
            Regenerate
          </Button>
        )}
        <Button variant="secondary" onClick={() => handleSave('draft')} loading={saving} disabled={!form.title.trim() || !form.client_id} size="md">
          Save Draft
        </Button>
        <Button onClick={() => handleSave('sent')} loading={saving} disabled={!form.title.trim() || !form.client_id} size="md">
          Save &amp; Send
        </Button>
      </div>
    </div>
  );
}
