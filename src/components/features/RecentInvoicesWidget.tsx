import { useStore } from '../../store';
import { Check } from 'lucide-react';

export default function RecentInvoicesWidget() {
  const invoices = useStore((s) => s.invoices);
  const clients = useStore((s) => s.clients);

  const recent = [...invoices]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (recent.length === 0) {
    return <p className="text-xs text-[var(--text-secondary)] py-2">No invoices yet.</p>;
  }

  const statusColor = (status: string) => {
    if (status === 'paid') return 'text-green-500';
    if (status === 'overdue') return 'text-red-500';
    return 'text-[var(--text-tertiary)]';
  };

  return (
    <div className="space-y-1">
      {recent.map((inv) => {
        const client = clients.find((c) => c.id === inv.client_id);
        return (
          <div
            key={inv.id}
            className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-secondary)] rounded-xs text-xs"
          >
            <div className="flex-1 min-w-0">
              <span className="text-[var(--text-primary)]">{inv.invoice_number}</span>
              {client && <span className="text-[var(--text-tertiary)] ml-1">-- {client.name}</span>}
            </div>
            <div className="flex items-center gap-2 ml-2 shrink-0">
              <span className="text-[var(--text-primary)] font-medium">
                ${inv.total.toFixed(2)}
              </span>
              <span className={`${statusColor(inv.status)} capitalize text-[10px]`}>
                {inv.status === 'paid' && <Check size={10} className="inline mr-0.5" />}
                {inv.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
