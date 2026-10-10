import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  FileText, PenLine, Receipt, Banknote, MessageCircle, Link2, FolderKanban,
} from 'lucide-react';
import { relativeDate } from '../../utils/format';

export type TimelineKind =
  | 'proposal' | 'contract' | 'project' | 'invoice' | 'payment' | 'message' | 'portal';

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  /** ISO timestamp, newest first after sort */
  date: string;
  title: string;
  sub?: string;
  /** detail revealed on expand */
  detail?: string;
  to?: string;
}

const KIND_ICON: Record<TimelineKind, typeof FileText> = {
  proposal: FileText,
  contract: PenLine,
  project: FolderKanban,
  invoice: Receipt,
  payment: Banknote,
  message: MessageCircle,
  portal: Link2,
};

function byDateDesc(a: TimelineItem, b: TimelineItem) {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

/**
 * Relationship timeline. One rail component, two skins: `app` for the
 * workspace, `portal` for the client-facing view (ships with the hosted
 * relay; same data shape, branded calm styling). Rows expand inline with a
 * layout animation; navigation is instant and interruptible. Nothing here
 * invents data — callers pass real entities only.
 */
export default function Timeline({
  items,
  skin = 'app',
}: {
  items: TimelineItem[];
  skin?: 'app' | 'portal';
}) {
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);
  const sorted = [...items].sort(byDateDesc);
  // Portal skin is self-contained (light, branded, calm) — it must not depend
  // on ShareView's injected PORTAL_CSS, which only exists on that route.
  const card =
    skin === 'portal'
      ? 'bg-white border border-[#e5e5e7] rounded-[16px] px-5 py-4 text-[#1d1d1f]'
      : 'bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-3';

  if (sorted.length === 0) {
    return (
      <p className="text-xs text-[var(--text-tertiary)] py-4 text-center">
        No history yet — proposals, invoices, payments and messages will line up here.
      </p>
    );
  }

  return (
    <div className={card}>
      <div className="relative">
        <div
          className="absolute left-[13px] top-2 bottom-2 w-px bg-[var(--border-color)]"
          aria-hidden="true"
        />
        <div className="space-y-1">
          {sorted.map((item) => {
            const Icon = KIND_ICON[item.kind];
            const open = openId === item.id;
            return (
              <motion.div key={item.id} layout transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                <button
                  onClick={() => {
                    if (item.detail) setOpenId(open ? null : item.id);
                    else if (item.to) navigate(item.to);
                  }}
                  className="w-full flex items-start gap-3 py-2 text-left group rounded-lg"
                >
                  <span className="relative z-10 w-7 h-7 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] grid place-items-center flex-shrink-0">
                    <Icon size={12} className="text-[var(--text-secondary)]" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-medium text-[var(--text-primary)] truncate">
                      {item.title}
                    </span>
                    {item.sub && (
                      <span className="block text-[11px] text-[var(--text-tertiary)] truncate">{item.sub}</span>
                    )}
                    {open && item.detail && (
                      <span className="block text-xs text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">
                        {item.detail}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 ml-2 mt-1">
                    {relativeDate(item.date)}
                  </span>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
