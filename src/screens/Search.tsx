import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { Project } from '../types';
import { Search, FileText, FolderKanban, Receipt, PenLine, Users, Clock, DollarSign, Paperclip, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../utils/format';

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function parseTags(tags: string): string[] {
  try { return JSON.parse(tags); } catch { return []; }
}

const SECTIONS = [
  { type: 'client', label: 'Clients', Icon: Users },
  { type: 'proposal', label: 'Proposals', Icon: FileText },
  { type: 'project', label: 'Projects', Icon: FolderKanban },
  { type: 'invoice', label: 'Invoices', Icon: Receipt },
  { type: 'contract', label: 'Contracts', Icon: PenLine },
  { type: 'time_entry', label: 'Time Entries', Icon: Clock },
  { type: 'expense', label: 'Expenses', Icon: DollarSign },
  { type: 'asset', label: 'Assets', Icon: Paperclip },
] as const;

type SearchResult = {
  id: string;
  label: string;
  sublabel: string;
  type: string;
  path: string;
};

export default function SearchScreen() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const clients = useStore((s) => s.clients);
  const proposals = useStore((s) => s.proposals);
  const projects = useStore((s) => s.projects);
  const invoices = useStore((s) => s.invoices);
  const contracts = useStore((s) => s.contracts);
  const timeEntries = useStore((s) => s.timeEntries);
  const expenses = useStore((s) => s.expenses);
  const allAttachments = useStore((s) => s.allAttachments);
  const loadClients = useStore((s) => s.loadClients);
  const loadProposals = useStore((s) => s.loadProposals);
  const loadProjects = useStore((s) => s.loadProjects);
  const loadInvoices = useStore((s) => s.loadInvoices);
  const loadContracts = useStore((s) => s.loadContracts);
  const loadTimeEntries = useStore((s) => s.loadTimeEntries);
  const loadExpenses = useStore((s) => s.loadExpenses);
  const loadAllAttachments = useStore((s) => s.loadAllAttachments);

  useEffect(() => {
    Promise.all([
      loadClients(),
      loadProposals(),
      loadProjects(),
      loadInvoices(),
      loadContracts(),
      loadTimeEntries(),
      loadExpenses(),
      loadAllAttachments(),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadClients, loadProposals, loadProjects, loadInvoices, loadContracts, loadTimeEntries, loadExpenses, loadAllAttachments]);

  const results = useMemo((): Record<string, SearchResult[]> => {
    if (!query.trim()) return {};
    const q = query.toLowerCase();

    const groups: Record<string, SearchResult[]> = {};

    groups.client = clients
      .filter((c) => (c.name || '').toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q))
      .map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: c.company ? `Company: ${c.company}` : 'Client',
        type: 'client',
        path: '/clients',
      }));

    groups.proposal = proposals
      .filter((p) => (p.title || '').toLowerCase().includes(q))
      .map((p) => ({
        id: p.id,
        label: p.title,
        sublabel: 'Proposal',
        type: 'proposal',
        path: '/proposals',
      }));

    groups.project = projects
      .filter((p) => (p.title || '').toLowerCase().includes(q))
      .map((p) => ({
        id: p.id,
        label: p.title,
        sublabel: 'Project',
        type: 'project',
        path: '/projects',
      }));

    groups.invoice = invoices
      .filter((inv) => (inv.invoice_number || '').toLowerCase().includes(q))
      .map((inv) => ({
        id: inv.id,
        label: inv.invoice_number,
        sublabel: `Total: ${formatCurrency(inv.total)}`,
        type: 'invoice',
        path: '/invoices',
      }));

    groups.contract = contracts
      .filter((c) => (c.title || '').toLowerCase().includes(q))
      .map((c) => ({
        id: c.id,
        label: c.title,
        sublabel: 'Contract',
        type: 'contract',
        path: '/contracts',
      }));

    groups.time_entry = timeEntries
      .filter((t) => (t.description || '').toLowerCase().includes(q))
      .map((t) => {
        const project = projects.find((p: Project) => p.id === t.project_id);
        return {
          id: t.id,
          label: t.description || 'No description',
          sublabel: `${project?.title || 'Unknown'} — ${formatDateShort(t.start_time)} · ${t.duration_minutes ? formatDuration(t.duration_minutes) : 'In progress'}`,
          type: 'time_entry',
          path: '/time',
        };
      });

    groups.expense = expenses
      .filter((e) => (e.description || '').toLowerCase().includes(q))
      .map((e) => ({
        id: e.id,
        label: e.description,
        sublabel: `${e.category} · ${formatCurrency(e.amount)} — ${formatDateShort(e.date)}`,
        type: 'expense',
        path: '/finance',
      }));

    groups.asset = allAttachments
      .filter((a) => {
        const tags = parseTags(a.tags);
        return (a.filename || '').toLowerCase().includes(q) || tags.some((t) => (t || '').toLowerCase().includes(q));
      })
      .map((a) => ({
        id: a.id,
        label: a.filename,
        sublabel: `${a.mime_type} · ${a.entity_type === 'library' ? 'Library' : a.entity_type}`,
        type: 'asset',
        path: `/assets?highlight=${a.id}`,
      }));

    return groups;
  }, [query, clients, proposals, projects, invoices, contracts, timeEntries, expenses, allAttachments]);

  const totalResults = Object.values(results).reduce((sum, items) => sum + items.length, 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-[var(--bg-secondary)] rounded skeleton-pulse mb-6" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-4 w-24 bg-[var(--bg-secondary)] rounded skeleton-pulse mb-2" />
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-12 bg-[var(--bg-secondary)] rounded-[8px] skeleton-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          Search results for "<span className="text-[var(--accent)]">{query}</span>"
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {totalResults} result{totalResults !== 1 ? 's' : ''} across {SECTIONS.filter((s) => (results[s.type]?.length || 0) > 0).length} categor{totalResults !== 1 ? 'ies' : 'y'}
        </p>
      </div>

      {totalResults === 0 ? (
        <div className="text-center py-16 flex flex-col items-center">
          <Search size={40} className="text-[var(--text-tertiary)] mb-4" />
          <h3 className="text-[15px] font-medium text-[var(--text-secondary)] mb-1.5">No results found</h3>
          <p className="text-[13px] text-[var(--text-tertiary)] max-w-xs">Try a different search term or browse from the sidebar.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const items = results[section.type];
            if (!items || items.length === 0) return null;
            const { Icon } = section;
            return (
              <div key={section.type}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={14} className="text-[var(--text-tertiary)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{section.label}</h3>
                  <span className="text-xs text-[var(--text-tertiary)]">({items.length})</span>
                </div>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[8px] hover:bg-[var(--bg-secondary)] transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] truncate">{item.label}</p>
                        <p className="text-xs text-[var(--text-tertiary)] truncate">{item.sublabel}</p>
                      </div>
                      <ChevronRight size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
