/**
 * Revision Counter · compact panel showing revision count vs limit.
 * Uses store for revisions and proposals; auto-increments round_number on add.
 * Pro (scopeCreepProtection): rounds past the limit convert into a draft
 * change-order invoice with one click. Free tiers see the counter plus a
 * locked teaser for change orders.
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { getFeatureFlags } from '../../lib/constants';
import { generateInvoiceNumber } from '../../utils/invoiceNumber';
import { recordTrialValue } from '../../utils/trialValue';
import { recordTelemetry } from '../../utils/telemetry';
import { useToasts } from '../../store/toastStore';
import Button from '../ui/Button';
import { Plus, RotateCcw, Lock, FilePlus2 } from 'lucide-react';
import { getArchetype } from '../../archetypes';

export default function RevisionCounter({ projectId }: { projectId: string }) {
  const { revisions, loadRevisions, addRevision, profile, projects, invoices, addInvoice, getActiveTier } = useStore();
  const addToast = useToasts((s) => s.add);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderAmount, setOrderAmount] = useState('');

  const unlocked = getFeatureFlags(getActiveTier()).scopeCreepProtection === true;

  useEffect(() => { loadRevisions(); }, [projectId, loadRevisions]);

  const list = revisions.filter(r => r.project_id === projectId);
  const nextRound = list.length > 0 ? Math.max(...list.map((r) => r.round_number)) + 1 : 1;

  const archetype = useMemo(() => getArchetype(profile?.profession || ''), [profile?.profession]);
  const revisionLimit = useMemo(() => archetype?.maxRevisions ?? 3, [archetype]);

  const currentRound = list.length;
  const overLimit = currentRound > revisionLimit;
  const atLimit = currentRound === revisionLimit;
  const overBy = overLimit ? currentRound - revisionLimit : 0;

  const project = projects.find((p) => p.id === projectId);
  const defaultAmount = profile?.hourly_rate != null ? String(profile.hourly_rate) : '';

  const handleChangeOrder = async () => {
    const amount = parseFloat(orderAmount || defaultAmount || '0');
    if (!project || !(amount > 0)) return;
    setOrdering(true);
    try {
      const due = new Date();
      due.setDate(due.getDate() + (profile?.payment_terms ?? 14));
      await addInvoice({
        client_id: project.client_id,
        project_id: projectId,
        invoice_number: generateInvoiceNumber(invoices || []),
        status: 'draft',
        line_items: [
          {
            id: crypto.randomUUID(),
            description: `Change order: ${overBy} extra revision round${overBy === 1 ? '' : 's'} on ${project.title}`,
            quantity: 1,
            unit_price: amount,
            total: amount,
          },
        ],
        subtotal: amount,
        total: amount,
        due_date: due.toISOString().split('T')[0],
        currency: profile?.currency || '',
        rate_type: 'flat',
      });
      addToast('Change order draft created', 'success');
      recordTrialValue('change-order', amount);
      recordTelemetry('pro_feature_used', { feature: 'change-order' });
      navigate('/invoices');
    } catch {
      addToast('Could not create the change order', 'error');
    }
    setOrdering(false);
  };

  const countColor = overLimit ? 'text-[#E74C3C]' : atLimit ? 'text-[#E67E22]' : 'text-[#2ECC71]';
  const bgColor = overLimit ? 'bg-[#E74C3C]/10' : atLimit ? 'bg-[#E67E22]/10' : 'bg-[#2ECC71]/10';

  const handleAddRound = async () => {
    setSaving(true);
    try {
      await addRevision({ project_id: projectId, round_number: nextRound, change_summary: `Revision round ${nextRound}`, approved: false });
    } catch { /* handled */ }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Revisions</h4>
        <Button variant="ghost" size="sm" onClick={handleAddRound} loading={saving}>
          <Plus size={12} /> Add Round
        </Button>
      </div>

      <div className={`flex items-center justify-center gap-3 px-4 py-3 rounded-[8px] ${bgColor}`}>
        <RotateCcw size={16} className={countColor} />
        <span className={`text-lg font-semibold ${countColor}`}>
          {currentRound} / {revisionLimit}
        </span>
        <span className={`text-xs ${countColor}`}>
          {overLimit ? 'Over limit' : atLimit ? 'At limit' : 'Under limit'}
        </span>
      </div>

      {overLimit && (
        <div className="px-4 py-3 rounded-[8px] bg-[var(--warning-bg)] space-y-2.5">
          <p className="text-xs text-[var(--warning-text)] leading-relaxed">
            {overBy} round{overBy === 1 ? '' : 's'} past your {revisionLimit}-round limit. Bill it instead of absorbing it.
          </p>
          {unlocked ? (
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={orderAmount}
                onChange={(e) => setOrderAmount(e.target.value)}
                placeholder={defaultAmount || 'Amount'}
                aria-label="Change order amount"
                className="w-24 px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <Button
                size="sm"
                className="flex-1"
                disabled={ordering || !(parseFloat(orderAmount || defaultAmount || '0') > 0) || !project}
                onClick={handleChangeOrder}
              >
                <FilePlus2 size={12} />
                {ordering ? 'Creating...' : 'Generate change order'}
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="w-full"
              onClick={() =>
                document.dispatchEvent(
                  new CustomEvent('lance:open-upgrade', { detail: 'scope-creep change orders' }),
                )
              }
            >
              <Lock size={12} />
              Unlock change orders with Pro
            </Button>
          )}
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No revisions yet. Add your first round.</p>
      ) : (
        <div className="space-y-1">
          {list.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${r.approved ? 'bg-[var(--accent)] text-[var(--accent-on)]' : 'bg-[var(--border-color)] text-[var(--text-secondary)]'}`}>
                  {r.round_number}
                </span>
                <span className="text-[var(--text-primary)]">{r.change_summary || 'No summary'}</span>
              </div>
              {r.approved && <span className="text-[10px] text-[var(--accent-ink,var(--accent))]">Approved</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
