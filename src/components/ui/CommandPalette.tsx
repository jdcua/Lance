import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { Search, FileText, FolderKanban, Receipt, PenLine, Users } from 'lucide-react';

type ResultItem = {
  id: string;
  label: string;
  sublabel: string;
  type: 'client' | 'proposal' | 'project' | 'invoice' | 'contract';
  path: string;
};

const typeIcons: Record<string, typeof Users> = {
  client: Users,
  proposal: FileText,
  project: FolderKanban,
  invoice: Receipt,
  contract: PenLine,
};

const typeLabels: Record<string, string> = {
  client: 'CLIENTS',
  proposal: 'PROPOSALS',
  project: 'PROJECTS',
  invoice: 'INVOICES',
  contract: 'CONTRACTS',
};

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { clients, proposals, projects, invoices, contracts } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const items: ResultItem[] = [];

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
  }, [query, clients, proposals, projects, invoices, contracts]);

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
        className="relative bg-white rounded-[12px] shadow-2xl border border-[#E5E5E3] w-[560px] max-h-[420px] flex flex-col overflow-hidden animate-fade-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E5E3]">
          <Search size={16} className="text-[#A3A39E]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search Lance..."
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-[#A3A39E]"
          />
          <kbd className="text-[10px] text-[#A3A39E] border border-[#E5E5E3] rounded-[4px] px-1.5 py-0.5">⌘K</kbd>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {!query ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-[#A3A39E]">Search clients, proposals, projects, invoices, contracts&hellip;</p>
            </div>
          ) : flatResults.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-[#A3A39E]">No results found.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type} className="mb-3 last:mb-0">
                <p className="px-4 mb-1 text-[10px] font-semibold text-[#A3A39E] uppercase tracking-wider">{typeLabels[type]}</p>
                {items.map((item) => {
                  const Icon = typeIcons[item.type] || Users;
                  const idx = flatResults.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm ${
                        idx === selectedIndex ? 'bg-[#E6F5EE]' : 'hover:bg-[#F2F2F0]'
                      }`}
                    >
                      <Icon size={14} className="text-[#A3A39E] flex-shrink-0" />
                      <span className="flex-1 text-[#1C1C1A]">{item.label}</span>
                      <span className="text-xs text-[#A3A39E]">{item.sublabel}</span>
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
