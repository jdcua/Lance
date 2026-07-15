import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { Search, FileText, FolderKanban, Receipt, PenLine, Users, Sparkles, Clock, DollarSign, Paperclip, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { getShortcutModifierLabel } from '../../utils/shortcuts';

type ResultItem = {
  id: string;
  label: string;
  sublabel: string;
  type: 'client' | 'proposal' | 'project' | 'invoice' | 'contract' | 'action' | 'time_entry' | 'expense' | 'asset' | 'footer';
  path: string;
  action?: () => void;
};

const typeIcons: Record<string, typeof Users> = {
  client: Users,
  proposal: FileText,
  project: FolderKanban,
  invoice: Receipt,
  contract: PenLine,
  action: Sparkles,
  time_entry: Clock,
  expense: DollarSign,
  asset: Paperclip,
  footer: ArrowRight,
};

const typeLabels: Record<string, string> = {
  client: 'CLIENTS',
  proposal: 'PROPOSALS',
  project: 'PROJECTS',
  invoice: 'INVOICES',
  contract: 'CONTRACTS',
  time_entry: 'TIME ENTRIES',
  expense: 'EXPENSES',
  asset: 'ASSETS',
  action: 'ACTIONS',
};

const MAX_PER_GROUP: Record<string, number> = {
  client: 4,
  proposal: 4,
  project: 4,
  invoice: 4,
  contract: 4,
  time_entry: 3,
  expense: 3,
  asset: 3,
};

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

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { clients, proposals, projects, invoices, contracts, profile } = useStore();
  const timeEntries = useStore((s) => s.timeEntries);
  const expenses = useStore((s) => s.expenses);
  const allAttachments = useStore((s) => s.allAttachments);
  const loadTimeEntries = useStore((s) => s.loadTimeEntries);
  const loadExpenses = useStore((s) => s.loadExpenses);
  const loadAllAttachments = useStore((s) => s.loadAllAttachments);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const aiEnabled = profile?.ai_enabled ?? false;
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    if (open) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      Promise.all([loadTimeEntries(), loadExpenses(), loadAllAttachments()]).catch(() => {});
    }
  }, [open, loadTimeEntries, loadExpenses, loadAllAttachments]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo((): ResultItem[] => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();

    const items: ResultItem[] = [];

    if (aiEnabled) {
      if (q.includes('generate proposal') || q.includes('new proposal') || q.includes('proposal')) {
        items.push({
          id: 'ai-proposal', label: 'Generate a proposal',
          sublabel: 'AI-assisted proposal writing', type: 'action',
          path: '/proposals/new',
        });
      }
      if (q.includes('summarize') || q.includes('summary') || q.includes('insight')) {
        items.push({
          id: 'ai-summary', label: 'Generate business summary',
          sublabel: 'AI-powered insights', type: 'action',
          path: '/insights',
        });
      }
    }

    clients.forEach((c) => {
      if ((c.name || '').toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q)) {
        items.push({ id: c.id, label: c.name, sublabel: 'Client' + (c.company ? ` — ${c.company}` : ''), type: 'client', path: `/clients` });
      }
    });
    proposals.forEach((p) => {
      if ((p.title || '').toLowerCase().includes(q)) {
        items.push({ id: p.id, label: p.title, sublabel: 'Proposal', type: 'proposal', path: `/proposals` });
      }
    });
    projects.forEach((p) => {
      if ((p.title || '').toLowerCase().includes(q)) {
        items.push({ id: p.id, label: p.title, sublabel: 'Project', type: 'project', path: `/projects` });
      }
    });
    invoices.forEach((inv) => {
      if ((inv.invoice_number || '').toLowerCase().includes(q)) {
        items.push({ id: inv.id, label: inv.invoice_number, sublabel: 'Invoice', type: 'invoice', path: `/invoices` });
      }
    });
    contracts.forEach((c) => {
      if ((c.title || '').toLowerCase().includes(q)) {
        items.push({ id: c.id, label: c.title, sublabel: 'Contract', type: 'contract', path: `/contracts` });
      }
    });

    timeEntries.forEach((t) => {
      if ((t.description || '').toLowerCase().includes(q)) {
        const project = projects.find((p) => p.id === t.project_id);
        const projectName = project?.title || 'Unknown';
        items.push({
          id: t.id,
          label: t.description || 'No description',
          sublabel: `${projectName} — ${formatDateShort(t.start_time)} · ${t.duration_minutes ? formatDuration(t.duration_minutes) : 'In progress'}`,
          type: 'time_entry',
          path: '/time',
        });
      }
    });

    expenses.forEach((e) => {
      if ((e.description || '').toLowerCase().includes(q)) {
        items.push({
          id: e.id,
          label: e.description,
          sublabel: `${e.category} · ${formatCurrency(e.amount)} on ${formatDateShort(e.date)}`,
          type: 'expense',
          path: '/finance',
        });
      }
    });

    allAttachments.forEach((a) => {
      const tags = parseTags(a.tags);
      const nameMatch = (a.filename || '').toLowerCase().includes(q);
      const tagMatch = tags.some((t: string) => (t || '').toLowerCase().includes(q));
      if (nameMatch || tagMatch) {
        const locationLabel = a.entity_type === 'library' ? 'Library' : a.entity_type;
        items.push({
          id: a.id,
          label: a.filename,
          sublabel: `${a.mime_type} · ${locationLabel}`,
          type: 'asset',
          path: `/assets?highlight=${a.id}`,
        });
      }
    });

    const grouped: Record<string, ResultItem[]> = {};
    items.forEach((i) => {
      if (!grouped[i.type]) grouped[i.type] = [];
      const max = MAX_PER_GROUP[i.type] || 4;
      if (grouped[i.type].length < max) grouped[i.type].push(i);
    });

    const flat = Object.values(grouped).flat();

    if (flat.length > 0) {
      flat.push({
        id: 'search-all',
        label: `Search all results for '${debouncedQuery}'`,
        sublabel: '',
        type: 'footer',
        path: `/search?q=${encodeURIComponent(debouncedQuery)}`,
      });
    }

    return flat;
  }, [debouncedQuery, clients, proposals, projects, invoices, contracts, timeEntries, expenses, allAttachments, aiEnabled]);

  const grouped = useMemo(() => {
    const groups: Record<string, ResultItem[]> = {};
    results.forEach((r) => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });
    return groups;
  }, [results]);

  const flatResults = results;

  const handleSelect = (item: ResultItem) => {
    navigate(item.path);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
      handleSelect(flatResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  const modifier = getShortcutModifierLabel();

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed inset-0 bg-black/30" />
      <div
        className="relative bg-[var(--bg-card)] rounded-[12px] shadow-2xl border border-[var(--border-color)] w-[560px] max-h-[420px] flex flex-col overflow-hidden animate-fade-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)]">
          <Search size={16} className="text-[var(--text-tertiary)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search Lance..."
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-[var(--text-tertiary)]"
          />
          <kbd className="text-[10px] text-[var(--text-tertiary)] border border-[var(--border-color)] rounded-[4px] px-1.5 py-0.5">{modifier}K</kbd>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {!debouncedQuery ? (
            <div className="px-4 py-4 space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Keyboard shortcuts</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {[
                    [`${modifier}K`, 'Open command palette'],
                    [`${modifier}1–8`, 'Navigate sections'],
                    [`${modifier}N`, 'New in current section'],
                    [`${modifier},`, 'Open Settings'],
                    [`${modifier}⇧T`, 'Start/Stop timer'],
                    [`${modifier}⇧L`, 'Quick log time'],
                    ...(aiEnabled ? [[`${modifier}⇧P`, 'Toggle AI sidebar (if on)']] : []),
                    ['Esc', 'Close this panel'],
                  ].map(([key, desc]) => (
                    <div key={key as string} className="flex items-center gap-2">
                      <kbd className="text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[4px] px-1.5 py-0.5 font-mono whitespace-nowrap">{key as string}</kbd>
                      <span className="text-xs text-[var(--text-secondary)]">{desc as string}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Quick search</p>
                <p className="text-xs text-[var(--text-tertiary)]">Type to search clients, proposals, projects, invoices, contracts, time entries, expenses, assets&hellip;</p>
              </div>
            </div>
          ) : flatResults.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-[var(--text-tertiary)]">No results found.</p>
            </div>
          ) : (
            <>
              {Object.entries(grouped).map(([type, items]) => {
                const isFooterGroup = type === 'footer';
                return (
                  <div key={type} className="mb-3 last:mb-0">
                    {isFooterGroup && <div className="px-4 mb-1"><div className="border-t border-[var(--border-color)] pt-2" /></div>}
                    {!isFooterGroup && (
                      <p className="px-4 mb-1 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{typeLabels[type] || type}</p>
                    )}
                    {items.map((item) => {
                      const Icon = typeIcons[item.type] || Users;
                      const idx = flatResults.indexOf(item);
                      const isFooter = item.type === 'footer';
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm ${
                            isFooter
                              ? idx === selectedIndex ? 'bg-[var(--accent-bg)]' : 'hover:bg-[var(--bg-secondary)]'
                              : idx === selectedIndex ? 'bg-[var(--accent-bg)]' : 'hover:bg-[var(--bg-secondary)]'
                          }`}
                        >
                          <Icon size={14} className={`flex-shrink-0 ${isFooter ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`} />
                          <span className="flex-1 text-[var(--text-primary)]">{item.label}</span>
                          {!isFooter && <span className="text-xs text-[var(--text-tertiary)]">{item.sublabel}</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
