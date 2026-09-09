import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import RichEditor from '../components/ui/RichEditor';
import ClientSelect from '../components/ui/ClientSelect';
import { textToHtml } from '../utils/textToHtml';
import { formatDate } from '../utils/format';
import { getCurrencySymbol } from '../lib/currency';
import { ArrowLeft, Sparkles, X, AlertTriangle, Clock } from 'lucide-react';
import { generateProposalBody, checkScopeWarnings, type ScopeWarning } from '../ai/proposalGenerator';
import { useToasts } from '../store/toastStore';
import { checkAndNotify } from '../achievements/notify';
import { sanitizeInput, MAX_LENGTHS } from '../utils/sanitize';
import { getArchetype } from '../archetypes';

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

  // Get archetype config from profile's profession
  const archetype = useMemo(() => getArchetype(profile?.profession || ''), [profile?.profession]);
  const proposalTypes = useMemo(() => archetype?.proposalTypes || ['flat', 'hourly', 'project'], [archetype]);

  const [form, setForm] = useState<{
    client_id: string;
    title: string;
    scope: string;
    timeline: string;
    rate: string;
    rate_type: string;
    project_type: string;
    body: string;
  }>({
    client_id: '',
    title: '',
    scope: '',
    timeline: '',
    rate: '',
    rate_type: proposalTypes[0] || 'flat',
    project_type: 'General',
    body: '',
  });

  useEffect(() => {
    Promise.all([loadClients(), loadProfile()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [loadClients, loadProfile, addToast]);

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
        rateType: (form.rate_type === 'hourly' || form.rate_type === 'per-shoot' || form.rate_type === 'per-session' || form.rate_type === 'per-track' || form.rate_type === 'per-word' || form.rate_type === 'per-track' || form.rate_type === 'per-look' || form.rate_type === 'per-event' || form.rate_type === 'per-commission' || form.rate_type === 'per-plan' || form.rate_type === 'per-closing' || form.rate_type === 'per-campaign' || form.rate_type === 'per-placement' || form.rate_type === 'per-project' || form.rate_type === 'per-track' || form.rate_type === 'milestone' || form.rate_type === 'retainer' || form.rate_type === 'commission-based') ? 'hourly' : 'flat',
        currency: profile?.currency || 'CAD',
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

  const computeExpiry = (): { expiresAt: string | undefined } => {
    if (!profile?.proposal_expiry_days) return { expiresAt: undefined };
    const d = new Date();
    d.setDate(d.getDate() + profile.proposal_expiry_days);
    return { expiresAt: d.toISOString() };
  };

  const handleSave = async (status: 'draft' | 'sent') => {
    if (!form.title.trim() || !form.client_id) return;
    setSaving(true);
    try {
      const expiry = status === 'sent' ? computeExpiry() : { expiresAt: undefined };
      await addProposal({
        client_id: form.client_id,
        title: sanitizeInput(form.title).slice(0, MAX_LENGTHS.title),
        status,
        scope: form.scope ? sanitizeInput(form.scope).slice(0, MAX_LENGTHS.description) : undefined,
        timeline: form.timeline ? sanitizeInput(form.timeline).slice(0, 200) : undefined,
        rate: form.rate ? Math.max(0, parseFloat(form.rate)) : undefined,
        rate_type: (form.rate_type === 'hourly' || form.rate_type === 'per-shoot' || form.rate_type === 'per-session' || form.rate_type === 'per-track' || form.rate_type === 'per-word' || form.rate_type === 'per-track' || form.rate_type === 'per-look' || form.rate_type === 'per-event' || form.rate_type === 'per-commission' || form.rate_type === 'per-plan' || form.rate_type === 'per-closing' || form.rate_type === 'per-campaign' || form.rate_type === 'per-placement' || form.rate_type === 'per-project' || form.rate_type === 'per-track' || form.rate_type === 'milestone' || form.rate_type === 'retainer' || form.rate_type === 'commission-based') ? 'hourly' : 'flat',
        body: form.body,
        expires_at: expiry.expiresAt,
      });
      navigate('/proposals');
      checkAndNotify(useStore.getState(), addToast);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to save proposal', 'error');
    } finally {
      setSaving(false);
    }
  };

  const expiryPreview = profile?.proposal_expiry_days
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() + profile.proposal_expiry_days);
        return `This proposal will expire on ${formatDate(d.toISOString())}`;
      })()
    : null;

  const activeWarnings = warnings.filter((w) => !dismissedWarnings.has(w.pattern));

  const currencySymbol = getCurrencySymbol(profile?.currency || 'CAD');

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
            <ClientSelect
              clients={clients}
              value={form.client_id}
              onChange={(clientId) => setForm({ ...form, client_id: clientId })}
              placeholder="Select a client..."
            />
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
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
            >
              {proposalTypes.map((pt) => (
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
                onChange={(e) => setForm({ ...form, rate_type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              >
                {proposalTypes.map((pt) => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Rate ({form.rate_type === 'hourly' ? `${currencySymbol}/hr` : form.rate_type === 'per-shoot' ? `${currencySymbol}/shoot` : form.rate_type === 'per-word' ? `${currencySymbol}/word` : form.rate_type === 'per-session' ? `${currencySymbol}/session` : form.rate_type === 'per-track' ? `${currencySymbol}/track` : form.rate_type === 'per-look' ? `${currencySymbol}/look` : form.rate_type === 'per-event' ? `${currencySymbol}/event` : form.rate_type === 'per-commission' ? `${currencySymbol}/commission` : form.rate_type === 'per-plan' ? `${currencySymbol}/plan` : form.rate_type === 'per-closing' ? `${currencySymbol}/closing` : form.rate_type === 'per-campaign' ? `${currencySymbol}/campaign` : form.rate_type === 'per-placement' ? `${currencySymbol}/placement` : form.rate_type === 'per-project' ? `${currencySymbol}/project` : form.rate_type === 'per-track' ? `${currencySymbol}/track` : form.rate_type === 'milestone' ? `${currencySymbol}/milestone` : form.rate_type === 'retainer' ? `${currencySymbol}/retainer` : currencySymbol})</label>
              <input
                type="number"
                min={0}
                value={form.rate}
                onChange={(e) => { const v = e.target.value; setForm({ ...form, rate: Number(v) < 0 ? '0' : v }); }}
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
              className="flex items-start gap-2 px-3 py-2 rounded-[8px] bg-[var(--warning-bg)] text-[var(--warning-text)] text-xs"
            >
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">{w.warning}</span>
              <button
                onClick={() => dismissWarning(w.pattern)}
                className="text-[var(--warning-text)]/60 hover:text-[var(--warning-text)] flex-shrink-0"
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

      <div className="flex items-center justify-end gap-2">
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
      {expiryPreview && (
        <p className="text-right text-[10px] text-[var(--text-tertiary)] mt-1 flex items-center justify-end gap-1">
          <Clock size={11} />
          {expiryPreview}
        </p>
      )}
    </div>
  );
}
