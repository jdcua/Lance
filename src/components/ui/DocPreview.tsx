import { sanitizeShareHtml } from '../../utils/shareHtml';

export interface DocLine {
  description: string;
  detail?: string;
  amount: string;
}

export interface DocTotal {
  label: string;
  value: string;
  strong?: boolean;
}

/**
 * Live document preview shared by the invoice, proposal and contract
 * builders. Renders the same data the save/export flows consume — what you
 * see is what the client gets (styled for screen; the PDF renderer lays out
 * identically-structured content). Body HTML is allowlist-sanitized.
 */
export default function DocPreview({
  eyebrow,
  title,
  from,
  to,
  meta = [],
  lines = [],
  totals = [],
  bodyHtml,
  notes,
}: {
  eyebrow: string;
  title: string;
  from?: string;
  to?: string;
  meta?: [string, string][];
  lines?: DocLine[];
  totals?: DocTotal[];
  bodyHtml?: string;
  notes?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 overflow-hidden">
      <div className="px-3 py-1.5 border-b border-[var(--border-color)]">
        <p className="text-[10px] font-semibold text-[var(--text-tertiary)]">
          Live preview
        </p>
      </div>
      <div className="p-5 bg-[var(--bg-card)]">
        <p className="text-[10px] font-semibold text-[var(--text-tertiary)] mb-1">
          {eyebrow}
        </p>
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3 break-words">
          {title || 'Untitled'}
        </h3>
        {(from || to) && (
          <div className="flex justify-between gap-4 text-xs mb-3">
            {from && (
              <div className="min-w-0">
                <p className="text-[10px] text-[var(--text-tertiary)]">From</p>
                <p className="text-[var(--text-primary)] font-medium truncate">{from}</p>
              </div>
            )}
            {to && (
              <div className="min-w-0 text-right">
                <p className="text-[10px] text-[var(--text-tertiary)]">To</p>
                <p className="text-[var(--text-primary)] font-medium truncate">{to}</p>
              </div>
            )}
          </div>
        )}
        {meta.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
            {meta.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 min-w-0">
                <dt className="text-[var(--text-tertiary)]">{k}</dt>
                <dd className="text-[var(--text-primary)] truncate">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {lines.length > 0 && (
          <div className="border-t border-[var(--border-color)] pt-2 mb-2 space-y-1.5">
            {lines.map((l, i) => (
              <div key={i} className="flex justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="text-[var(--text-primary)] truncate">{l.description || '—'}</p>
                  {l.detail && <p className="text-[var(--text-tertiary)]">{l.detail}</p>}
                </div>
                <p className="text-[var(--text-primary)] tnum flex-shrink-0">{l.amount}</p>
              </div>
            ))}
          </div>
        )}
        {bodyHtml && (
          <div
            className="text-xs text-[var(--text-primary)] leading-relaxed border-t border-[var(--border-color)] pt-2 mb-2 [&_h1]:text-sm [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-xs [&_h3]:font-semibold [&_p]:mb-1.5"
            dangerouslySetInnerHTML={{ __html: sanitizeShareHtml(bodyHtml) }}
          />
        )}
        {totals.length > 0 && (
          <div className="border-t border-[var(--border-color)] pt-2 space-y-1">
            {totals.map((t) => (
              <div key={t.label} className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">{t.label}</span>
                <span
                  className={`tnum ${t.strong ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}
                >
                  {t.value}
                </span>
              </div>
            ))}
          </div>
        )}
        {notes && (
          <p className="text-[11px] text-[var(--text-tertiary)] mt-3 whitespace-pre-wrap">{notes}</p>
        )}
      </div>
    </div>
  );
}
