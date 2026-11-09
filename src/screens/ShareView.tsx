import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';
import { tauriInvoke } from '../utils/tauri';
import { hasTrialPath } from '../demo/isDemo';
import { formatCurrency, formatDate } from '../utils/format';
import type { Client, Contract, Proposal, ShareToken, UserProfile } from '../types';

// ─────────────────────────────────────────────────────────────
// ShareView · public, client-facing portal used by browser-mode
// share links (/share/:token). Mirrors the packaged app's axum
// share server (src-tauri/src/server.rs serve_portal) so links
// work identically in dev.
// ─────────────────────────────────────────────────────────────

const ALLOWED_TAGS = new Set([
  'p',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
  'hr',
  'br',
  'span',
  'div',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
]);

// Elements whose text content is code/markup, never prose. When one of these
// shows up we drop it AND its text; for any other disallowed element we keep
// the text so "…<span>freelance</span>…" still reads as "freelance".
const OPAQUE_TAGS = new Set(['script', 'style', 'template', 'noscript', 'title', 'iframe']);

// Only these attributes survive, and only on these elements. Links are
// freelancer-authored (portfolio, payment URLs), so `a[href]` is allowed —
// but scheme-gated to http/https/mailto with rel=noopener, mirroring the
// Rust sanitize_html url_schemes. Images stay banned outright: unlike a
// visible link, an <img> phones home silently (tracking pixel).
const ALLOWED_ATTRS = 'colspan,rowspan';
const LINK_SCHEMES = /^(https?:|mailto:)/i;

// A malicious body can nest tags thousands deep; rebuilding the tree
// recursively would blow the stack. Past this depth we keep the text only.
const MAX_DEPTH = 100;

function copySafeAttrs(from: Element, to: Element): void {
  for (const name of ALLOWED_ATTRS.split(',')) {
    const value = from.getAttribute(name);
    // setAttribute, never innerHTML: the value cannot become markup.
    if (value !== null && /^\d{1,3}$/.test(value)) to.setAttribute(name, value);
  }
  if (to.tagName.toLowerCase() === 'a') {
    const href = (from.getAttribute('href') || '').trim();
    if (LINK_SCHEMES.test(href)) {
      to.setAttribute('href', href);
      to.setAttribute('rel', 'noopener');
    }
  }
}

function rebuildNode(doc: Document, node: Node, target: Element, depth: number): void {
  if (depth > MAX_DEPTH) return;

  if (node.nodeType === Node.TEXT_NODE) {
    target.appendChild(doc.createTextNode(node.nodeValue ?? ''));
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (OPAQUE_TAGS.has(tag)) return;

  if (!ALLOWED_TAGS.has(tag)) {
    // Unknown wrapper: keep the words inside it, discard the element itself.
    for (const child of Array.from(el.childNodes)) rebuildNode(doc, child, target, depth + 1);
    return;
  }

  const kept = doc.createElement(tag);
  copySafeAttrs(el, kept);
  for (const child of Array.from(el.childNodes)) rebuildNode(doc, child, kept, depth + 1);
  target.appendChild(kept);
}

/**
 * Client-side equivalent of the Rust `sanitize_html` allowlist.
 *
 * This parses with the browser's own HTML parser and rebuilds the tree node by
 * node. It must NOT be a regex filter: HTML5 accepts `/` as an attribute
 * separator (`<img/onerror=alert(1)>`), so any regex that assumes whitespace
 * before attributes is trivially bypassed, which is exactly how the previous
 * version of this function leaked every proposal body in the app.
 */
export function sanitizeShareHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out = doc.createElement('div');
  for (const child of Array.from(doc.body.childNodes)) rebuildNode(doc, child, out, 0);
  return out.innerHTML;
}

const PORTAL_CSS = `
  .share-root { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f7; color: #1d1d1f; min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding: 48px 16px; box-sizing: border-box; }
  .share-card { background: #fff; border-radius: 16px; border: 1px solid #e5e5e7; max-width: 680px; width: 100%; padding: 40px 36px; box-sizing: border-box; box-shadow: 0 8px 30px rgba(0,0,0,0.06); }
  .share-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
  .share-logo { width: 34px; height: 34px; border-radius: 9px; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; }
  .share-brand-name { font-weight: 600; font-size: 15px; }
  .share-brand-tag { font-size: 12px; color: #86868b; }
  .share-prepped { font-size: 12px; color: #86868b; text-transform:; letter-spacing: 0.08em; margin-bottom: 6px; }
  .share-title { font-size: 26px; font-weight: 700; margin: 0 0 6px; line-height: 1.2; }
  .share-subtitle { font-size: 14px; color: #6e6e73; margin-bottom: 24px; }
  .share-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 28px; }
  .share-meta-item { flex: 1 1 140px; background: #f5f5f7; border-radius: 12px; padding: 12px 14px; box-sizing: border-box; }
  .share-meta-label { font-size: 11px; color: #86868b; text-transform:; letter-spacing: 0.06em; margin-bottom: 4px; }
  .share-meta-value { font-size: 15px; font-weight: 600; }
  .share-divider { border: none; border-top: 1px solid #e5e5e7; margin: 24px 0; }
  .share-body { font-size: 15px; line-height: 1.65; color: #1d1d1f; word-break: break-word; }
  .share-body h1, .share-body h2, .share-body h3 { margin: 20px 0 8px; line-height: 1.3; }
  .share-body ul, .share-body ol { padding-left: 22px; margin: 8px 0; }
  .share-body blockquote { border-left: 3px solid #d2d2d7; margin: 12px 0; padding: 4px 14px; color: #515154; }
  .share-body a { color: #0071e3; text-decoration: underline; text-underline-offset: 2px; }
  .share-actions { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e7; }
  .share-field { width: 100%; box-sizing: border-box; padding: 12px 14px; font-size: 15px; border: 1px solid #d2d2d7; border-radius: 10px; margin-bottom: 12px; outline: none; }
  .share-field:focus { border-color: #0071e3; box-shadow: 0 0 0 3px rgba(0,113,227,0.15); }
  .share-field-label { font-size: 13px; font-weight: 600; margin-bottom: 6px; display: block; }
  .share-btn-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .share-btn { flex: 1; min-width: 120px; padding: 13px 18px; font-size: 15px; font-weight: 600; border-radius: 10px; cursor: pointer; border: 1px solid transparent; transition: opacity 0.15s; }
  .share-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .share-btn-primary { background: #111; color: #fff; }
  .share-btn-success { background: #0a7c4b; color: #fff; }
  .share-btn-danger { background: #fff; color: #c41230; border-color: #d2d2d7; }
  .share-btn-secondary { background: #fff; color: #1d1d1f; border-color: #d2d2d7; }
  .share-banner { margin-top: 20px; background: #ecfdf3; border: 1px solid #a7f3d0; color: #065f46; border-radius: 12px; padding: 16px 18px; font-size: 14px; }
  .share-banner-error { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
  .share-signed { background: #ecfdf3; border: 1px solid #a7f3d0; color: #065f46; border-radius: 12px; padding: 16px 18px; font-size: 14px; margin-top: 24px; }
  .share-foot { text-align: center; margin-top: 28px; font-size: 12px; color: #a1a1a6; }
  .share-center { text-align: center; padding: 60px 20px; }
  .share-center h1 { font-size: 20px; margin-bottom: 8px; }
  .share-center p { font-size: 14px; color: #86868b; margin: 0 0 4px; line-height: 1.5; }
`;

type PortalState =
  | { kind: 'loading' }
  | { kind: 'notfound' }
  | { kind: 'expired' }
  | {
      kind: 'ready';
      token: ShareToken;
      entity: Proposal | Contract;
      client?: Client;
      profile?: UserProfile | null;
    };

export default function ShareView() {
  const { token: tokenParam = '' } = useParams();
  const [state, setState] = useState<PortalState>({ kind: 'loading' });
  const [name, setName] = useState('');
  const [signature, setSignature] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [responded, setResponded] = useState<ShareToken | null>(null);
  const viewedRef = useRef(false);

  const loadProfile = useStore((s) => s.loadProfile);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await tauriInvoke<ShareToken | null>('get_share_token', {
          token: tokenParam,
        });
        if (cancelled) return;
        if (!token) {
          setState({ kind: 'notfound' });
          return;
        }
        if (token.expires_at && token.expires_at < new Date().toISOString()) {
          setState({ kind: 'expired' });
          return;
        }
        // Singular fetches: the portal renders one record, so load one
        // record (plus profile for branding) instead of whole tables.
        await loadProfile();
        if (cancelled) return;
        const { profile } = useStore.getState();
        const entity =
          token.entity_type === 'contract'
            ? await tauriInvoke<Contract | null>('get_contract', { id: token.entity_id })
            : await tauriInvoke<Proposal | null>('get_proposal', { id: token.entity_id });
        if (cancelled) return;
        if (!entity) {
          setState({ kind: 'notfound' });
          return;
        }
        const client = await tauriInvoke<Client | null>('get_client', { id: entity.client_id });
        if (cancelled) return;
        setState({ kind: 'ready', token, entity, client: client || undefined, profile });
        if (!viewedRef.current) {
          viewedRef.current = true;
          tauriInvoke('record_share_view', { token: tokenParam }).catch(() => {});
        }
      } catch {
        if (!cancelled) setState({ kind: 'notfound' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenParam, loadProfile]);

  useEffect(() => {
    if (state.kind === 'ready' && state.entity.title) {
      document.title = `${state.entity.title} · Lance`;
    }
    return () => {
      document.title = 'Lance';
    };
  }, [state]);

  if (state.kind === 'loading') {
    return (
      <div className="share-root">
        <style>{PORTAL_CSS}</style>
        <div className="share-card share-center">
          <h1>Loading…</h1>
          <p>Preparing your document.</p>
        </div>
      </div>
    );
  }

  if (state.kind === 'notfound') {
    return (
      <div className="share-root">
        <style>{PORTAL_CSS}</style>
        <div className="share-card share-center">
          <h1>Share link not found</h1>
          <p>This link is invalid or has been revoked.</p>
          <p style={{ marginTop: 16, fontSize: 12, color: '#a1a1a6' }}>
            Ask the sender for a fresh link.
          </p>
        </div>
      </div>
    );
  }

  if (state.kind === 'expired') {
    return (
      <div className="share-root">
        <style>{PORTAL_CSS}</style>
        <div className="share-card share-center">
          <h1>Link expired</h1>
          <p>This share link is no longer active.</p>
          <p style={{ marginTop: 16, fontSize: 12, color: '#a1a1a6' }}>
            Ask the sender for a fresh link.
          </p>
        </div>
      </div>
    );
  }

  const { token, entity, client, profile } = state;
  const isContract = token.entity_type === 'contract';
  const freelancerName = profile?.name?.trim() || 'Freelancer';
  const clientName = client?.name?.trim() || 'Client';
  const currency = profile?.currency || 'CAD';
  const bodyHtml = sanitizeShareHtml(entity.body || '');

  const handleRespond = async (response: 'accepted' | 'declined') => {
    if (state.kind !== 'ready' || responded) return;
    setError('');
    setSubmitting(true);
    try {
      const updated = await tauriInvoke<ShareToken>('respond_share_token', {
        token: token.token,
        response,
        client_name: name,
      });
      setResponded(updated);
    } catch (e) {
      setError(e?.toString?.() || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSign = async () => {
    if (state.kind !== 'ready' || responded) return;
    setError('');
    setSubmitting(true);
    try {
      const updated = await tauriInvoke<ShareToken>('respond_share_token', {
        token: token.token,
        response: 'accepted',
        client_signature: signature,
      });
      setResponded(updated);
    } catch (e) {
      setError(e?.toString?.() || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const respondedName = isContract
    ? responded?.client_signature || token.client_signature
    : responded?.client_name || token.client_name;
  const hasResponded = !!(responded?.client_response || token.client_response);
  const respDate = responded?.client_response_at || token.client_response_at || '';
  const respValue = responded?.client_response || token.client_response;

  return (
    <div className="share-root">
      <style>{PORTAL_CSS}</style>
      <div className="share-card">
        <div className="share-brand">
          <div className="share-logo">{(freelancerName[0] || 'L').toUpperCase()}</div>
          <div>
            <div className="share-brand-name">{freelancerName}</div>
            {profile?.tagline && <div className="share-brand-tag">{profile.tagline}</div>}
          </div>
        </div>

        <div className="share-prepped">Prepared for {clientName}</div>
        <h1 className="font-display share-title">{entity.title}</h1>
        <div className="share-subtitle">
          {isContract ? 'Service agreement' : 'Proposal'} · {formatDate(token.created_at)}
        </div>

        {!isContract && (
          <div className="share-meta">
            {(entity as Proposal).scope && (
              <div className="share-meta-item">
                <div className="share-meta-label">Scope</div>
                <div className="share-meta-value">{(entity as Proposal).scope}</div>
              </div>
            )}
            {(entity as Proposal).timeline && (
              <div className="share-meta-item">
                <div className="share-meta-label">Timeline</div>
                <div className="share-meta-value">{(entity as Proposal).timeline}</div>
              </div>
            )}
            {(entity as Proposal).rate !== undefined && (
              <div className="share-meta-item">
                <div className="share-meta-label">Rate</div>
                <div className="share-meta-value">
                  {formatCurrency((entity as Proposal).rate || 0, currency)}
                  {(entity as Proposal).rate_type === 'hourly' ? '/hr' : ''}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="share-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

        {hasResponded ? (
          <>
            <hr className="share-divider" />
            <div className="share-signed">
              <strong>
                {isContract
                  ? `Signed by ${respondedName || clientName}`
                  : `${respondedName || clientName} ${respValue} this proposal`}
              </strong>
              <br />
              {formatDate(respDate)}
            </div>
          </>
        ) : (
          <div className="share-actions">
            {isContract ? (
              <>
                <label className="share-field-label" htmlFor="share-signature">
                  Type your full name to sign
                </label>
                <input
                  id="share-signature"
                  className="share-field"
                  type="text"
                  placeholder="e.g. Jane Smith"
                  value={signature}
                  maxLength={200}
                  onChange={(e) => setSignature(e.target.value)}
                />
                <div className="share-btn-row">
                  <button
                    className="share-btn share-btn-success"
                    disabled={submitting || signature.trim().length === 0}
                    onClick={handleSign}
                  >
                    {submitting ? 'Signing…' : 'Sign contract'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="share-field-label" htmlFor="share-name">
                  Your name
                </label>
                <input
                  id="share-name"
                  className="share-field"
                  type="text"
                  placeholder="e.g. Jane Smith"
                  value={name}
                  maxLength={200}
                  onChange={(e) => setName(e.target.value)}
                />
                <div className="share-btn-row">
                  <button
                    className="share-btn share-btn-primary"
                    disabled={submitting || name.trim().length === 0}
                    onClick={() => handleRespond('accepted')}
                  >
                    {submitting ? 'Sending…' : 'Accept proposal'}
                  </button>
                  <button
                    className="share-btn share-btn-danger"
                    disabled={submitting || name.trim().length === 0}
                    onClick={() => handleRespond('declined')}
                  >
                    Decline
                  </button>
                </div>
              </>
            )}
            {error && <div className="share-banner share-banner-error">{error}</div>}
          </div>
        )}

        <div className="share-foot">
          Powered by Lance ·{' '}
          {hasTrialPath()
            ? 'Trial demo: this client view runs in your browser only'
            : 'This link only works while Lance is open'}
        </div>
      </div>
    </div>
  );
}
