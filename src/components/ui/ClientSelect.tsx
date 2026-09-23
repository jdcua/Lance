import { useState, useRef, useEffect } from 'react';
import type { Client } from '../../types';
import { ChevronDown, Check } from 'lucide-react';

interface ClientSelectProps {
  clients: Client[];
  value: string;
  onChange: (clientId: string) => void;
  placeholder?: string;
}

export default function ClientSelect({ clients, value, onChange, placeholder = 'Select a client...' }: ClientSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  const selected = clients.find(c => c.id === value);

  const filtered = clients.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[activeIndex]) {
          onChange(filtered[activeIndex].id);
          setOpen(false);
          setSearch('');
          setActiveIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        setSearch('');
        setActiveIndex(-1);
        break;
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 bg-[var(--bg-card)] text-[var(--text-primary)]";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={placeholder || 'Select a client'}
        onClick={() => { setOpen(!open); setActiveIndex(0); }}
        onKeyDown={handleKeyDown}
        className={`${inputClass} text-left flex items-center justify-between`}
      >
        <span className={selected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] truncate'}>
          {selected ? `${selected.name}${selected.company ? ` (${selected.company})` : ''}` : placeholder}
        </span>
        <ChevronDown size={14} className={`text-[var(--text-tertiary)] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[8px] shadow-lg z-20 max-h-[220px] overflow-hidden flex flex-col">
          <div className="p-2 border-b border-[var(--border-color)]">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] bg-[var(--bg-secondary)]"
              autoFocus
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto" role="listbox">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-[var(--text-tertiary)] text-center">No clients found</p>
            ) : (
              filtered.map((c, idx) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={c.id === value}
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                    setSearch('');
                    setActiveIndex(-1);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                    idx === activeIndex ? 'bg-[var(--accent-bg)]' : ''
                  } ${
                    c.id === value ? 'bg-[var(--accent-bg)]' : 'hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <div className="min-w-0">
                    <span className={`truncate block ${c.id === value ? 'text-[var(--accent)] font-medium' : 'text-[var(--text-primary)]'}`}>
                      {c.name}
                    </span>
                    {c.company && <span className="text-[10px] text-[var(--text-tertiary)]">{c.company}</span>}
                  </div>
                  {c.id === value && <Check size={14} className="text-[var(--accent)] flex-shrink-0 ml-2" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
