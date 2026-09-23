import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { getFeatureFlags } from '../../lib/constants';
import { getDb } from '../../db';
import {
  computeBurn,
  minutesByClient,
  currentMonthBounds,
  type RetainerRow,
} from '../../utils/retainerBurn';
import { generateInvoiceNumber } from '../../utils/invoiceNumber';
import { recordTrialValue } from '../../utils/trialValue';
import { recordTelemetry } from '../../utils/telemetry';
import { formatCurrency } from '../../utils/format';
import { useToasts } from '../../store/toastStore';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import { Flame, Lock, FilePlus2 } from 'lucide-react';

/**
 * Retainer burn-down overview (all active retainers, this month).
 * Burn bars are your own data and always visible. Drafting a top-up
 * invoice for overage is scope-creep protection: a Pro feature.
 */
export default function RetainerBurnDown() {
  const { timeEntries, loadTimeEntries, clients, invoices, addInvoice, profile, getActiveTier } = useStore();
  const addToast = useToasts((s) => s.add);
  const navigate = useNavigate();
  const [retainers, setRetainers] = useState<RetainerRow[]>([]);
  const [orderingId, setOrderingId] = useState<string | null>(null);

  const unlocked = getFeatureFlags(getActiveTier()).scopeCreepProtection === true;

  useEffect(() => {
    loadTimeEntries();
    (async () => {
      try {
        const db = await getDb();
        const rows = await db.select<(RetainerRow & Record<string, unknown>)[]>(
          'SELECT id, client_id, monthly_hours, rate, renewal_date, active FROM retainers WHERE active = 1',
        );
        setRetainers(
          rows.map((r) => ({
            id: r.id as string,
            client_id: r.client_id as string,
            monthly_hours: r.monthly_hours as number,
            rate: r.rate as number,
            renewal_date: r.renewal_date as string | undefined,
            active: !!r.active,
          })),
        );
      } catch {
        /* no retainers table or db unavailable */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bounds = useMemo(() => currentMonthBounds(), []);
  const minutes = useMemo(
    () => minutesByClient(timeEntries, bounds.start, bounds.end),
    [timeEntries, bounds],
  );

  const rows = useMemo(
    () =>
      retainers.map((r) => ({
        retainer: r,
        clientName: clients.find((c) => c.id === r.client_id)?.name || 'Unknown client',
        burn: computeBurn(r.monthly_hours, minutes[r.client_id] || 0),
      })),
    [retainers, clients, minutes],
  );

  if (retainers.length === 0) return null;

  const handleTopUp = async (clientId: string, clientName: string, overByHours: number, rate: number) => {
    if (!unlocked) {
      document.dispatchEvent(new CustomEvent('lance:open-upgrade', { detail: 'retainer top-up invoices' }));
      return;
    }
    const amount = Math.round(overByHours * rate * 100) / 100;
    if (!(amount > 0)) return;
    setOrderingId(clientId);
    try {
      const due = new Date();
      due.setDate(due.getDate() + (profile?.payment_terms ?? 14));
      await addInvoice({
        client_id: clientId,
        invoice_number: generateInvoiceNumber(invoices || []),
        status: 'draft',
        line_items: [
          {
            id: crypto.randomUUID(),
            description: `Retainer top-up: ${overByHours} extra hours at ${formatCurrency(rate, profile?.currency)}/h`,
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
      addToast(`Top-up draft for ${clientName} created`, 'success');
      recordTrialValue('topup', amount);
      recordTelemetry('pro_feature_used', { feature: 'topup' });
      navigate('/invoices');
    } catch {
      addToast('Could not create the top-up invoice', 'error');
    }
    setOrderingId(null);
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <Flame size={16} className="text-[var(--text-tertiary)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Retainer burn-down ({bounds.label})
        </h2>
      </div>
      <p className="text-xs text-[var(--text-tertiary)] mb-4">
        Monthly hours used per active retainer. Over 80% deserves attention; past 100% is billable.
      </p>
      <div className="space-y-4">
        {rows.map(({ retainer, clientName, burn }) => {
          const rate = retainer.rate || profile?.hourly_rate || 0;
          const barColor =
            burn.status === 'over'
              ? '[&_[role=progressbar]]:bg-[var(--danger)]'
              : burn.status === 'watch'
                ? '[&_[role=progressbar]]:bg-[var(--warning-text)]'
                : '';
          return (
            <div key={retainer.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-primary)] font-medium truncate">{clientName}</span>
                <span className="text-[var(--text-secondary)] flex-shrink-0 ml-2">
                  {burn.hoursLogged} / {retainer.monthly_hours}h
                  {burn.status === 'over' && (
                    <span className="text-[var(--danger)] font-semibold ml-1.5">
                      +{burn.overByHours}h over
                    </span>
                  )}
                  {burn.status === 'watch' && (
                    <span className="text-[var(--warning-text)] font-medium ml-1.5">{burn.percent}%</span>
                  )}
                </span>
              </div>
              <ProgressBar value={Math.min(burn.percent, 100)} max={100} size="sm" showPercent={false} className={barColor} />
              {burn.status === 'over' && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  disabled={orderingId === retainer.client_id}
                  onClick={() => handleTopUp(retainer.client_id, clientName, burn.overByHours, rate)}
                >
                  {unlocked ? <FilePlus2 size={12} /> : <Lock size={12} />}
                  {orderingId === retainer.client_id
                    ? 'Creating...'
                    : unlocked
                      ? `Draft top-up invoice (${formatCurrency(Math.round(burn.overByHours * rate * 100) / 100, profile?.currency)})`
                      : 'Unlock top-up invoices with Pro'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
