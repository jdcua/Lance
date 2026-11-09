/**
 * Portal polling engine: when a client opens a shared proposal, Pro and trial
 * users get pinged with one-click actions (open it, draft a follow-up).
 * Free tiers still see passive open badges on the Proposals screen.
 * Polls on the same 30s cadence as the dashboard feed.
 */
import { useEffect } from 'react';
import { useStore } from '../../store';
import { useToasts } from '../../store/toastStore';
import { useNavigate } from 'react-router-dom';
import { detectNewOpens, snapshotOpens } from '../../utils/portalActivity';
import { getFeatureFlags } from '../../lib/constants';

export function usePortalPolling() {
  const addToast = useToasts((s) => s.add);
  const navigate = useNavigate();

  useEffect(() => {
    let stopped = false;
    const seenRef: { current: Record<string, number> } = { current: {} };
    const check = async () => {
      try {
        const store = useStore.getState();
        await store.loadPortalActivity();
        if (stopped) return;
        const fresh = detectNewOpens(useStore.getState().portalActivity, seenRef.current);
        seenRef.current = snapshotOpens(useStore.getState().portalActivity);
        if (fresh.length === 0) return;
        if (getFeatureFlags(store.getActiveTier()).advancedInsights !== true) return;
        const proposals = useStore.getState().proposals;
        for (const item of fresh) {
          const proposal = proposals.find((p) => p.id === item.proposalId);
          if (!proposal) continue;
          addToast(`Client opened "${proposal.title}" (${item.opens}x)`, 'info', undefined, [
            {
              label: 'Open proposal',
              onClick: () => navigate('/proposals'),
            },
            {
              label: 'Draft follow-up',
              onClick: () => {
                useStore
                  .getState()
                  .createFollowUp({ entity_type: 'proposal', entity_id: item.proposalId, stage: 1 })
                  .then(() => addToast('Follow-up drafted', 'success'))
                  .catch(() => addToast('Could not draft the follow-up', 'error'));
              },
            },
          ]);
        }
      } catch {
        /* portal polling is best-effort */
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
