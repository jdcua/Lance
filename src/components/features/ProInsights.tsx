import { useEffect, useMemo } from 'react';
import { Lock, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store';
import { getFeatureFlags } from '../../lib/constants';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import { formatCurrency } from '../../utils/format';
import { commands } from '../../lib/commands';
import { getTrialValue, computeProRoi } from '../../utils/trialValue';
import {
  computeForecast,
  computeEffectiveRate,
  computeClientWinRates,
  isProposalResolved,
} from '../../utils/proInsightsMath';

// ── Locked teaser shell ──────────────────────────────────────────────────

function LockedPanel({
  title,
  headline,
  blurb,
  feature,
}: {
  title: string;
  headline: string;
  blurb: string;
  feature: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Lock size={14} className="text-[var(--text-tertiary)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))]">
          PRO
        </span>
      </div>
      <p className="text-[26px] font-semibold text-[var(--text-primary)]">
        {headline}
      </p>
      <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4 leading-relaxed">{blurb}</p>
      <Button
        size="sm"
        className="w-full"
        onClick={() => commands.dispatch('lance:open-upgrade', feature)}
      >
        Unlock with Pro
      </Button>
    </Card>
  );
}

// ── Section ──────────────────────────────────────────────────────────────

export default function ProInsights() {
  const {
    invoices,
    proposals,
    timeEntries,
    recurringInvoices,
    loadRecurringInvoices,
    clients,
    profile,
    getActiveTier,
  } = useStore();

  const flags = getFeatureFlags(getActiveTier());
  const unlocked = flags.advancedInsights === true;
  const currency = profile?.currency;

  const winRateFraction = useMemo(() => {
    const resolved = proposals.filter(isProposalResolved);
    if (resolved.length === 0) return 0;
    return resolved.filter((p) => p.status === 'accepted').length / resolved.length;
  }, [proposals]);

  const forecast = useMemo(
    () => computeForecast(invoices, proposals, recurringInvoices, winRateFraction),
    [invoices, proposals, recurringInvoices, winRateFraction],
  );

  const totalPaid = useMemo(
    () => invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0),
    [invoices],
  );
  const totalMinutes = useMemo(
    () => timeEntries.reduce((s, t) => s + (t.duration_minutes || 0), 0),
    [timeEntries],
  );
  const rate = useMemo(
    () => computeEffectiveRate(totalPaid, totalMinutes, profile?.hourly_rate ?? null),
    [totalPaid, totalMinutes, profile],
  );

  const clientRates = useMemo(() => computeClientWinRates(proposals, clients), [proposals, clients]);

  const bestRate = clientRates.length > 0 ? clientRates[0] : null;
  const totalLost = clientRates.reduce((s, c) => s + c.lostRevenue, 0);
  const trialRoi = useMemo(() => computeProRoi(getTrialValue().total), []);

  useEffect(() => {
    loadRecurringInvoices().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!unlocked) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-[var(--text-tertiary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Projections and Signals</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <LockedPanel
            title="3-Month Forecast"
            headline={formatCurrency(forecast.total, currency)}
            blurb="Projected revenue from your run rate, active retainers, and open pipeline."
            feature="3-month revenue forecast"
          />
          <LockedPanel
            title="Effective Rate"
            headline={
              rate.effective !== null
                ? `${formatCurrency(Math.round(rate.effective * 100) / 100, currency)}/h`
                : 'No hours yet'
            }
            blurb="What you actually earn per hour after discounts and unbilled time."
            feature="effective rate tracking"
          />
          <LockedPanel
            title="Win Rate by Client"
            headline={bestRate && bestRate.rate !== null ? `${bestRate.rate}%` : 'No data yet'}
            blurb={
              bestRate
                ? `Best close rate: ${bestRate.name}. See every client plus lost revenue.`
                : 'See which clients say yes, and what no costs you.'
            }
            feature="win rate by client"
          />
        </div>
      </div>
    );
  }

  const maxMonth = Math.max(...forecast.months.map((m) => m.total), 1);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-[var(--accent-ink,var(--accent))]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Projections and Signals</h3>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))]">
          PRO
        </span>
      </div>
      {trialRoi.multiple !== null && trialRoi.multiple >= 1 && (
        <div className="mb-4 px-4 py-3 rounded-[10px] bg-[var(--accent-bg)] border border-[var(--accent)]/30">
          <p className="text-xs text-[var(--text-primary)] leading-relaxed">
            <strong>Pro paid for itself {trialRoi.multiple}x over:</strong> {formatCurrency(trialRoi.earned, currency)} found
            through change orders, late fees, and top-ups. That covers {trialRoi.monthsCovered} month{trialRoi.monthsCovered === 1 ? '' : 's'} of Pro.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">3-Month Forecast</h3>
          <p className="text-[26px] font-semibold text-[var(--text-primary)]">
            {formatCurrency(Math.round(forecast.total), currency)}
          </p>
          <div className="space-y-2.5 mt-4">
            {forecast.months.map((m) => (
              <div key={m.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">{m.label}</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatCurrency(Math.round(m.total), currency)}
                  </span>
                </div>
                <ProgressBar value={m.total} max={maxMonth} size="sm" showPercent={false} />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-4 leading-relaxed">
            Run rate {formatCurrency(Math.round(forecast.runRate), currency)}/mo, retainers{' '}
            {formatCurrency(Math.round(forecast.recurringMonthly), currency)}/mo, pipeline{' '}
            {formatCurrency(Math.round(forecast.pipelineValue), currency)} weighted by your win rate.
            {forecast.flatOnly && ' Hourly proposals carry no fixed value, so they stay out of the math.'}
          </p>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Effective Rate</h3>
          {rate.effective === null ? (
            <p className="text-xs text-[var(--text-tertiary)] mt-2 leading-relaxed">
              Log time and get paid to see what you really earn per hour.
            </p>
          ) : (
            <>
              <p className="text-[26px] font-semibold text-[var(--text-primary)]">
                {formatCurrency(Math.round(rate.effective * 100) / 100, currency)}/h
              </p>
              {rate.stated !== null && (
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  vs {formatCurrency(rate.stated, currency)}/h stated
                </p>
              )}
              <div className="mt-4">
                {rate.alert && rate.leakPerHour !== null ? (
                  <div className="flex items-start gap-2 p-3 rounded-sm bg-[var(--warning-bg)]">
                    <AlertTriangle size={14} className="text-[var(--warning-text)] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[var(--warning-text)] leading-relaxed">
                      You keep about {Math.round((rate.effective / (rate.stated || 1)) * 100)}% of your
                      stated rate. That is {formatCurrency(Math.round(rate.leakPerHour * 100) / 100, currency)} leaking
                      per hour to discounts or unbilled time.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 p-3 rounded-sm bg-[var(--accent-bg)]">
                    <CheckCircle2 size={14} className="text-[var(--accent-ink,var(--accent))] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {rate.stated !== null
                        ? 'Holding at or above your stated rate. Keep it there.'
                        : 'Set an hourly rate in Settings to unlock leak detection.'}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Win Rate by Client</h3>
          {clientRates.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] mt-2 leading-relaxed">
              Resolve a proposal (accepted or declined) to see per-client close rates.
            </p>
          ) : (
            <>
              <div className="space-y-3 mt-2">
                {clientRates.slice(0, 5).map((c) => (
                  <div key={c.clientId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-primary)] truncate">{c.name}</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {c.rate !== null ? `${c.rate}%` : 'n/a'}
                        <span className="text-[var(--text-tertiary)] font-normal ml-1.5">
                          {c.accepted}/{c.resolved}
                        </span>
                      </span>
                    </div>
                    <ProgressBar
                      value={c.rate || 0}
                      max={100}
                      size="sm"
                      showPercent={false}
                    />
                  </div>
                ))}
              </div>
              {totalLost > 0 && (
                <p className="text-[11px] text-[var(--text-tertiary)] mt-4 leading-relaxed">
                  Declined flat-rate proposals left about {formatCurrency(Math.round(totalLost), currency)} on
                  the table.
                </p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
