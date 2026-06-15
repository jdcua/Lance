import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { Search, FileText, FolderKanban, Receipt, PenLine, Users, Sparkles } from 'lucide-react';

type ResultItem = {
  id: string;
  label: string;
  sublabel: string;
  type: 'client' | 'proposal' | 'project' | 'invoice' | 'contract' | 'action';
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
};

const typeLabels: Record<string, string> = {
  client: 'CLIENTS',
  proposal: 'PROPOSALS',
  project: 'PROJECTS',
  invoice: 'INVOICES',
  contract: 'CONTRACTS',
  action: 'ACTIONS',
};

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { clients, proposals, projects, invoices, contracts, profile } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const aiEnabled = profile?.ai_enabled ?? false;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo((): ResultItem[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    // AI actions first if AI is enabled
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
      if (c.name.toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q)) {
        items.push({ id: c.id, label: c.name, sublabel: 'Client' + (c.company ? ` — ${c.company}` : ''), type: 'client', path: `/clients` });
      }
    });
    proposals.forEach((p) => {
      if (p.title.toLowerCase().includes(q)) {
        items.push({ id: p.id, label: p.title, sublabel: 'Proposal', type: 'proposal', path: `/proposals` });
      }
    });
    projects.forEach((p) => {
      if (p.title.toLowerCase().includes(q)) {
        items.push({ id: p.id, label: p.title, sublabel: 'Project', type: 'project', path: `/projects` });
      }
    });
    invoices.forEach((inv) => {
      if (inv.invoice_number.toLowerCase().includes(q)) {
        items.push({ id: inv.id, label: inv.invoice_number, sublabel: 'Invoice', type: 'invoice', path: `/invoices` });
      }
    });
    contracts.forEach((c) => {
      if (c.title.toLowerCase().includes(q)) {
        items.push({ id: c.id, label: c.title, sublabel: 'Contract', type: 'contract', path: `/contracts` });
      }
    });

    // Max 4 per group
    const grouped: Record<string, ResultItem[]> = {};
    items.forEach((i) => {
      if (!grouped[i.type]) grouped[i.type] = [];
      if (grouped[i.type].length < 4) grouped[i.type].push(i);
    });
    return Object.values(grouped).flat();
  }, [query, clients, proposals, projects, invoices, contracts, aiEnabled]);

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

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]" onClick={onClose}>
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
          <kbd className="text-[10px] text-[var(--text-tertiary)] border border-[var(--border-color)] rounded-[4px] px-1.5 py-0.5">⌘K</kbd>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {!query ? (
            <div className="px-4 py-4 space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Keyboard shortcuts</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {[
                    ['⌘K', 'Open command palette'],
                    ['⌘1–8', 'Navigate sections'],
                    ['⌘N', 'New in current section'],
                    ['⌘,', 'Open Settings'],
                    ['⌘⇧P', 'Toggle AI sidebar (if on)'],
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
                <p className="text-xs text-[var(--text-tertiary)]">Type to search clients, proposals, projects, invoices, contracts&hellip;</p>
              </div>
            </div>
          ) : flatResults.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-[var(--text-tertiary)]">No results found.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type} className="mb-3 last:mb-0">
                <p className="px-4 mb-1 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{typeLabels[type]}</p>
                {items.map((item) => {
                  const Icon = typeIcons[item.type] || Users;
                  const idx = flatResults.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm ${
                        idx === selectedIndex ? 'bg-[var(--accent-bg)]' : 'hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <Icon size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
                      <span className="flex-1 text-[var(--text-primary)]">{item.label}</span>
                      <span className="text-xs text-[var(--text-tertiary)]">{item.sublabel}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
