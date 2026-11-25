import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_CURRENCY } from '../lib/constants';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';
import { tauriInvoke } from '../utils/tauri';
import { formatCurrency, formatDate } from '../utils/format';
import { sanitizeShareHtml } from '../utils/shareHtml';
import type { Client, Contract, Proposal, ShareToken, UserProfile } from '../types';

// ─────────────────────────────────────────────────────────────
// ShareView · public, client-facing portal used by browser-mode
// share links (/share/:token). Mirrors the packaged app's axum
// share server (src-tauri/src/server.rs serve_portal) so links
// work identically in dev.
// ─────────────────────────────────────────────────────────────

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

function shareStatusScreen(kind: 'loading' | 'notfound' | 'expired'): ReactNode {
  if (kind === 'loading') {
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
  if (kind === 'notfound') {
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

function ShareBrand({ name, tagline }: { name: string; tagline?: string }) {
  return (
    <div className="share-brand">
      <div className="share-logo">{(name[0] || 'L').toUpperCase()}</div>
      <div>
        <div className="share-brand-name">{name}</div>
        {tagline && <div className="share-brand-tag">{tagline}</div>}
      </div>
    </div>
  );
}

function ProposalMeta({ entity, currency }: { entity: Proposal; currency: string }) {
  return (
    <div className="share-meta">
      {entity.scope && (
        <div className="share-meta-item">
          <div className="share-meta-label">Scope</div>
          <div className="share-meta-value">{entity.scope}</div>
        </div>
      )}
      {entity.timeline && (
        <div className="share-meta-item">
          <div className="share-meta-label">Timeline</div>
          <div className="share-meta-value">{entity.timeline}</div>
        </div>
      )}
      {entity.rate !== undefined && (
        <div className="share-meta-item">
          <div className="share-meta-label">Rate</div>
          <div className="share-meta-value">
            {formatCurrency(entity.rate || 0, currency)}
            {entity.rate_type === 'hourly' ? '/hr' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

function ResponseStatus({
  isContract,
  respondedName,
  respDate,
  respValue,
  clientName,
}: {
  isContract: boolean;
  respondedName: string | undefined;
  respDate: string;
  respValue: string | undefined;
  clientName: string;
}) {
  return (
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
  );
}

function ShareActions({
  isContract,
  submitting,
  name,
  signature,
  error,
  onRespond,
  onSign,
  setName,
  setSignature,
}: {
  isContract: boolean;
  submitting: boolean;
  name: string;
  signature: string;
  error: string;
  onRespond: (response: 'accepted' | 'declined') => void;
  onSign: () => void;
  setName: (value: string) => void;
  setSignature: (value: string) => void;
}) {
  return (
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
              onClick={onSign}
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
              onClick={() => onRespond('accepted')}
            >
              {submitting ? 'Sending…' : 'Accept proposal'}
            </button>
            <button
              className="share-btn share-btn-danger"
              disabled={submitting || name.trim().length === 0}
              onClick={() => onRespond('declined')}
            >
              Decline
            </button>
          </div>
        </>
      )}
      {error && <div className="share-banner share-banner-error">{error}</div>}
    </div>
  );
}

function sharePresentation(
  profile: UserProfile | null | undefined,
  client: Client | undefined,
  body: string | undefined,
) {
  return {
    freelancerName: profile?.name?.trim() || 'Freelancer',
    clientName: client?.name?.trim() || 'Client',
    currency: profile?.currency || DEFAULT_CURRENCY,
    bodyHtml: sanitizeShareHtml(body || ''),
  };
}

function respondedDisplay(isContract: boolean, responded: ShareToken | null, token: ShareToken) {
  const respondedName = isContract
    ? responded?.client_signature || token.client_signature
    : responded?.client_name || token.client_name;
  const hasResponded = !!(responded?.client_response || token.client_response);
  const respDate = responded?.client_response_at || token.client_response_at || '';
  const respValue = responded?.client_response || token.client_response;
  return { respondedName, hasResponded, respDate, respValue };
}

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

  if (state.kind !== 'ready') return shareStatusScreen(state.kind);

  const { token, entity, client, profile } = state;
  const isContract = token.entity_type === 'contract';
  const { freelancerName, clientName, currency, bodyHtml } = sharePresentation(
    profile,
    client,
    entity.body,
  );
  const { respondedName, hasResponded, respDate, respValue } = respondedDisplay(
    isContract,
    responded,
    token,
  );

  const submitResponse = async (payload: Record<string, string>) => {
    if (state.kind !== 'ready' || responded) return;
    setError('');
    setSubmitting(true);
    try {
      const updated = await tauriInvoke<ShareToken>('respond_share_token', {
        token: token.token,
        ...payload,
      });
      setResponded(updated);
    } catch (e) {
      setError(e?.toString?.() || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = (response: 'accepted' | 'declined') =>
    submitResponse({ response, client_name: name });
  const handleSign = () => submitResponse({ response: 'accepted', client_signature: signature });

  return (
    <div className="share-root">
      <style>{PORTAL_CSS}</style>
      <div className="share-card">
        <ShareBrand name={freelancerName} tagline={profile?.tagline} />

        <div className="share-prepped">Prepared for {clientName}</div>
        <h1 className="font-display share-title">{entity.title}</h1>
        <div className="share-subtitle">
          {isContract ? 'Service agreement' : 'Proposal'} · {formatDate(token.created_at)}
        </div>

        {!isContract && <ProposalMeta entity={entity as Proposal} currency={currency} />}

        <div className="share-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

        {hasResponded ? (
          <ResponseStatus
            isContract={isContract}
            respondedName={respondedName}
            respDate={respDate}
            respValue={respValue}
            clientName={clientName}
          />
        ) : (
          <ShareActions
            isContract={isContract}
            submitting={submitting}
            name={name}
            signature={signature}
            error={error}
            onRespond={handleRespond}
            onSign={handleSign}
            setName={setName}
            setSignature={setSignature}
          />
        )}

        <div className="share-foot">
          Powered by Lance · This link only works while Lance is open
        </div>
      </div>
    </div>
  );
}
