import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Plus, Pencil, Trash2, RotateCw } from 'lucide-react';
import { relativeDate, formatCurrency } from '../../utils/format';
import type { RecurringInvoice as RecurringInvoiceType } from '../../types';
import type { InvoicesBag } from './shared';

/**
 * Recurring list tab: empty state, search-no-match, recurring rows.
 * Pure relocation.
 */
export default function RecurringList({ bag }: { bag: InvoicesBag }) {
  const {
    recurringInvoices, filteredRecurring, search,
    getClientName, handleToggleActive, openEditRecurring, openNewRecurring,
    setConfirmDelete,
  } = bag;
  return (

    recurringInvoices.length === 0 ? (
        <Card className="text-center py-12">
          <RotateCw size={32} className="text-[var(--neutral-border)] mx-auto mb-3" />
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
            No recurring invoices
          </h2>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">
            Set up a recurring invoice for retainer clients or subscriptions.
          </p>
          <Button onClick={openNewRecurring} size="sm" variant="secondary">
            <Plus size={14} />
            New recurring
          </Button>
        </Card>
      ) : filteredRecurring.length === 0 && search ? (
        <Card className="text-center py-12">
          <p className="text-sm text-[var(--text-tertiary)]">
            No recurring invoices match "{search}"
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRecurring.map((ri) => (
            <Card key={ri.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">{ri.title}</h4>
                    <span className="text-xs text-[var(--text-secondary)]">
                      -- {getClientName(ri.client_id)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] mb-1.5">
                    <span>
                      {formatCurrency(ri.total)}/
                      {ri.frequency === 'monthly'
                        ? 'month'
                        : ri.frequency === 'weekly'
                          ? 'week'
                          : ri.frequency === 'biweekly'
                            ? '2 weeks'
                            : 'quarter'}
                    </span>
                    <span>Next: {relativeDate(ri.next_due)}</span>
                    {ri.last_generated && <span>Last: {relativeDate(ri.last_generated)}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(ri)}
                      className={`w-2 h-2 rounded-full ${ri.active ? 'bg-[var(--accent)]' : 'bg-[var(--neutral-border)]'}`}
                      title={ri.active ? 'Active · click to pause' : 'Paused · click to resume'}
                      aria-label={ri.active ? `Pause ${ri.title}` : `Resume ${ri.title}`}
                    />
                    <span
                      className={`text-[10px] ${ri.active ? 'text-[var(--accent-ink,var(--accent))]' : 'text-[var(--text-tertiary)]'}`}
                    >
                      {ri.active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  <button
                    onClick={() => openEditRecurring(ri)}
                    aria-label="Edit recurring invoice"
                    className="p-1.5 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() =>
                      setConfirmDelete({ id: ri.id, label: ri.title, type: 'recurring' })
                    }
                    aria-label="Delete recurring invoice"
                    className="p-1.5 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
    )
  );
}
