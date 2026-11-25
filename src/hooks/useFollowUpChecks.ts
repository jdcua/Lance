/**
 * Follow-up engines: the periodic draft checker and the proposal expiry sweep.
 *
 * Both are best-effort startup engines gated on the profile being loaded. The
 * pure helpers they share stay colocated here rather than in App.tsx.
 */
import { useEffect } from 'react';
import { useStore, type AppStore } from '../store';
import { useToasts } from '../store/toastStore';
import type { FollowUpSettings } from '../types';
import { parseDateString, DAY_MS } from '../utils/format';
import type { getStage, getTemplateKey } from '../utils/followUpTemplates';

type FollowUpFns = {
  getStage: typeof getStage;
  getTemplateKey: typeof getTemplateKey;
};

/** A stage is skipped when already pending or already actioned in history. */
function followUpStageHandled(
  state: AppStore,
  entityType: 'proposal' | 'invoice',
  entityId: string,
  stage: number,
): boolean {
  const alreadyPending = state.pendingFollowUps.some(
    (l) => l.entity_type === entityType && l.entity_id === entityId && l.stage === stage,
  );
  const alreadyLogged = (state.followUpLogs[`${entityType}:${entityId}`] || []).some(
    (l) => l.stage === stage,
  );
  return alreadyPending || alreadyLogged;
}

async function checkProposalFollowUps(
  state: AppStore,
  settings: FollowUpSettings,
  now: Date,
  fns: FollowUpFns,
): Promise<void> {
  for (const p of state.proposals) {
    if (p.status !== 'sent') continue;
    const client = state.clients.find((c) => c.id === p.client_id);
    if (!client?.email) {
      console.warn(`Skipping proposal follow-up for "${p.title}" · client has no email`);
      continue;
    }
    const sentDate = p.sent_at ? new Date(p.sent_at) : new Date(p.created_at);
    const daysElapsed = Math.floor((now.getTime() - sentDate.getTime()) / DAY_MS);
    if (daysElapsed < settings.proposal_delay_days) continue;
    const stage = fns.getStage('proposal', daysElapsed - settings.proposal_delay_days);
    if (followUpStageHandled(state, 'proposal', p.id, stage)) continue;
    const templateKey = fns.getTemplateKey('proposal', daysElapsed, settings.proposal_delay_days);
    if (!templateKey) continue;
    await state.logFollowUp({ entity_type: 'proposal', entity_id: p.id, stage });
  }
}

async function processInvoiceFollowUp(
  inv: AppStore['invoices'][number],
  state: AppStore,
  settings: FollowUpSettings,
  now: Date,
  fns: FollowUpFns,
): Promise<void> {
  if (inv.status !== 'sent' && inv.status !== 'overdue') return;
  if (!inv.due_date) return;
  const client = state.clients.find((c) => c.id === inv.client_id);
  if (!client?.email) {
    console.warn(`Skipping invoice follow-up for "${inv.invoice_number}" · client has no email`);
    return;
  }
  const dueDate = parseDateString(inv.due_date);
  const daysElapsed = Math.floor((now.getTime() - dueDate.getTime()) / DAY_MS);
  if (inv.status === 'sent' && daysElapsed >= 1) {
    try {
      await state.updateInvoice({ ...inv, status: 'overdue' });
    } catch {
      /* non-critical; follow-up still queues below */
    }
  }
  if (daysElapsed < settings.invoice_delay_days) return;
  const stage = fns.getStage('invoice', daysElapsed);
  if (followUpStageHandled(state, 'invoice', inv.id, stage)) return;
  const templateKey = fns.getTemplateKey('invoice', daysElapsed, settings.invoice_delay_days);
  if (!templateKey) return;
  await state.logFollowUp({ entity_type: 'invoice', entity_id: inv.id, stage });
}

async function checkInvoiceFollowUps(
  state: AppStore,
  settings: FollowUpSettings,
  now: Date,
  fns: FollowUpFns,
): Promise<void> {
  for (const inv of state.invoices) {
    await processInvoiceFollowUp(inv, state, settings, now, fns);
  }
}

export function useFollowUpChecks(): void {
  const profileLoaded = useStore((s) => s.profileLoaded);
  const loadFollowUpSettings = useStore((s) => s.loadFollowUpSettings);
  const addToast = useToasts((s) => s.add);

  // Follow-up checker · deferred after first render, runs every 30 minutes
  useEffect(() => {
    if (!profileLoaded) return;
    loadFollowUpSettings();

    const checkFollowUps = async () => {
      try {
        const fns = await import('../utils/followUpTemplates');
        const state = useStore.getState();
        const settings = state.followUpSettings;
        if (!settings.enabled) return;

        await state.loadProposals();
        await state.loadInvoices();
        await state.loadClients();
        await state.loadPendingFollowUps();
        // Full history (keyed entity_type:entity_id) so we never re-draft a
        // stage already actioned (sent/dismissed); the pending-only guard
        // would re-create an identical draft every run after actioning.
        await state.loadAllFollowUpLogs();
        const current = useStore.getState();
        const now = new Date();
        await checkProposalFollowUps(current, settings, now, fns);
        await checkInvoiceFollowUps(current, settings, now, fns);
      } catch {
        /* follow-up check is non-critical */
      }
    };

    const initialHandle = requestIdleCallback(() => checkFollowUps());
    const interval = setInterval(checkFollowUps, 30 * 60 * 1000);
    return () => {
      cancelIdleCallback(initialHandle);
      clearInterval(interval);
    };
  }, [profileLoaded, loadFollowUpSettings]);

  // Proposal expiry engine · deferred after first render, runs every hour
  useEffect(() => {
    if (!profileLoaded) return;

    const checkExpiry = async () => {
      try {
        // Shared invoke (NOT @tauri-apps/api/core directly): the browser
        // shim implements this command, and a direct import throws outside
        // Tauri — which used to silently disable expiry for browser users.
        const { tauriInvoke } = await import('../utils/tauri');
        const expired = await tauriInvoke<Array<{ id: string; client_id: string; title: string }>>(
          'expire_sent_proposals',
          {},
        );
        if (expired.length === 0) return;

        const state = useStore.getState();
        await state.loadClients();
        await state.loadProposals();
        const settings = state.followUpSettings;

        for (const ep of expired) {
          const client = state.clients.find((c) => c.id === ep.client_id);
          const clientName = client?.name || 'Unknown';

          // Retire pre-expiry nudges first: a "chase this proposal" draft
          // for a now-expired proposal is stale (the expiry engine bypasses
          // store.updateProposal, so its auto-resolve doesn't run here).
          try {
            await state.loadPendingFollowUps();
            for (const l of useStore
              .getState()
              .pendingFollowUps.filter(
                (f) => f.entity_type === 'proposal' && f.entity_id === ep.id,
              )) {
              await state.updateFollowUpStatus(l.id, 'dismissed', 'auto-resolved');
            }
          } catch {
            /* expiry stands regardless */
          }

          await state.addCommunication({
            id: crypto.randomUUID(),
            client_id: ep.client_id,
            type: 'note',
            summary: `Proposal '${ep.title}' expired automatically`,
            date: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });

          if (settings.enabled && client?.email) {
            await state.logFollowUp({ entity_type: 'proposal', entity_id: ep.id, stage: 3 });
          }

          if (settings.enabled) {
            addToast(`Proposal '${ep.title}' for ${clientName} has expired`, 'info');
          }
        }
      } catch {
        /* expiry check is non-critical */
      }
    };

    const initialHandle = requestIdleCallback(() => checkExpiry());
    const interval = setInterval(checkExpiry, 60 * 60 * 1000);
    return () => {
      cancelIdleCallback(initialHandle);
      clearInterval(interval);
    };
  }, [profileLoaded, addToast]);
}
