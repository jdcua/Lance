import { useCallback, useEffect, useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useToasts } from '../store/toastStore';
import { useStore } from '../store';
import { tauriInvoke, isTauri } from '../utils/tauri';
import { Copy, Link, Trash2, Eye, Clock } from 'lucide-react';
import type { ShareToken } from '../types';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  entityType: 'proposal' | 'contract';
  entityId: string;
}

const EXPIRY_OPTIONS = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: 'Never', value: 'never' },
] as const;

function shareUrlFor(token: ShareToken, port: number): string {
  // In browser dev mode there is no separate share server, so share links
  // point at the running Lance app itself (avoids a dead 1421 port).
  if (!isTauri()) {
    return `${window.location.origin}/share/${token.token}`;
  }
  return `http://localhost:${port}/share/${token.token}`;
}

function CreateShareView({
  entityType,
  expiry,
  setExpiry,
  onCreate,
  loading,
  shareDisabled,
  shareTooltip,
}: {
  entityType: 'proposal' | 'contract';
  expiry: string;
  setExpiry: (value: string) => void;
  onCreate: () => void;
  loading: boolean;
  shareDisabled: boolean;
  shareTooltip?: string;
}) {
  return (
    <>
      <p className="text-sm text-[var(--text-secondary)]">
        Create a shareable link to let your client view this{' '}
        {entityType === 'proposal' ? 'proposal' : 'contract'} in their browser.
      </p>

      <div>
        <label className="form-label">Link expiry</label>
        <div className="flex gap-2">
          {EXPIRY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setExpiry(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-xs border transition-colors ${
                expiry === opt.value
                  ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))] font-medium'
                  : 'border-[var(--border-color)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <Button onClick={onCreate} loading={loading} disabled={shareDisabled} size="sm" title={shareTooltip}>
          <Link size={14} />
          Generate Share Link
        </Button>
        {shareTooltip && (
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{shareTooltip}</p>
        )}
      </div>
    </>
  );
}

function ShareLinkView({
  token,
  entityType,
  entityLabel,
  url,
  onCopy,
  onRevoke,
  revoking,
}: {
  token: ShareToken;
  entityType: 'proposal' | 'contract';
  entityLabel: string;
  url: string | null;
  onCopy: () => void;
  onRevoke: () => void;
  revoking: boolean;
}) {
  return (
    <>
      {token.client_response && (
        <div
          className={`px-3 py-2 rounded-sm text-xs font-medium ${
            token.client_response === 'accepted'
              ? 'bg-[var(--success-bg)] text-[var(--success-text)]'
              : 'bg-[var(--danger-bg)] text-[var(--danger-text)]'
          }`}
        >
          {entityType === 'contract'
            ? `Signed by ${token.client_signature || 'client'} on ${token.client_signed_at ? new Date(token.client_signed_at).toLocaleDateString() : '--'}`
            : `${token.client_name || 'Client'} ${token.client_response} this ${entityLabel}`}
          {token.client_response_at &&
            ` on ${new Date(token.client_response_at).toLocaleDateString()}`}
        </div>
      )}

      <div>
        <label className="form-label">Share link</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={url || ''}
            className="flex-1 px-3 py-2 text-xs border border-[var(--border-color)] rounded-sm bg-[var(--bg-secondary)] text-[var(--text-primary)] select-all"
          />
          <Button onClick={onCopy} size="sm" variant="secondary">
            <Copy size={14} />
            Copy
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
        {token.view_count > 0 && (
          <span className="flex items-center gap-1">
            <Eye size={12} />
            Viewed {token.view_count} time{token.view_count !== 1 ? 's' : ''}
          </span>
        )}
        {token.expires_at && (
          <span className="flex items-center gap-1">
            <Clock size={12} />
            Expires {new Date(token.expires_at).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
        <Button onClick={onRevoke} loading={revoking} variant="danger" size="sm">
          <Trash2 size={14} />
          Revoke Link
        </Button>
        {!token.client_response && (
          <Button onClick={onCopy} size="sm" variant="secondary">
            <Copy size={14} />
            Copy Link
          </Button>
        )}
      </div>
    </>
  );
}

export default function ShareModal({ open, onClose, entityType, entityId }: ShareModalProps) {
  const addToast = useToasts((s) => s.add);
  const portalPort = useStore((s) => s.portalPort);
  const portalFailed = useStore((s) => s.portalFailed);
  const [token, setToken] = useState<ShareToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [expiry, setExpiry] = useState<string>('never');
  const [port, setPort] = useState<number>(0);

  const loadToken = useCallback(async () => {
    setLoading(true);
    try {
      const existing = await tauriInvoke<ShareToken | null>('get_share_token_for_entity', {
        entityType,
        entityId,
      });

      let serverPort = portalPort;
      if (!serverPort) {
        try {
          serverPort = await tauriInvoke<number>('get_share_server_port');
        } catch {
          // server not ready yet, handled by empty state
        }
      }
      if (serverPort) setPort(serverPort);

      if (existing) {
        setToken(existing);
      }
    } catch (e) {
      addToast(e?.toString?.() || 'Failed to load share info', 'error');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, addToast, portalPort]);

  useEffect(() => {
    if (!open) return;
    loadToken();
  }, [open, loadToken]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      let expiresAt: string | null = null;
      if (expiry === '7d') {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        expiresAt = d.toISOString();
      } else if (expiry === '30d') {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        expiresAt = d.toISOString();
      }

      const newToken = await tauriInvoke<ShareToken>('create_share_token', {
        payload: { entity_type: entityType, entity_id: entityId, expires_at: expiresAt },
      });
      setToken(newToken);
      addToast('Share link created', 'success');
    } catch (e) {
      addToast(e?.toString?.() || 'Failed to create share link', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!token) return;
    const url = shareUrlFor(token, port);
    try {
      await navigator.clipboard.writeText(url);
      addToast('Link copied to clipboard', 'success');
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  const handleRevoke = async () => {
    if (!token) return;
    setRevoking(true);
    try {
      await tauriInvoke('revoke_share_token', { token: token.token });
      setToken(null);
      addToast('Share link revoked', 'info');
    } catch (e) {
      addToast(e?.toString?.() || 'Failed to revoke', 'error');
    } finally {
      setRevoking(false);
    }
  };

  const url = token && port ? shareUrlFor(token, port) : null;

  const entityLabel = entityType === 'proposal' ? 'Proposal' : 'Contract';
  const isServerReady = port > 0;
  const shareDisabled = !isServerReady;
  const shareTooltip = portalFailed
    ? 'Portal unavailable \u2014 see Settings'
    : !isServerReady
      ? 'Portal starting...'
      : undefined;

  return (
    <Modal open={open} onClose={onClose} title={`Share ${entityLabel}`} size="md">
      <div className="space-y-4">
        {!token ? (
          <CreateShareView
            entityType={entityType}
            expiry={expiry}
            setExpiry={setExpiry}
            onCreate={handleCreate}
            loading={loading}
            shareDisabled={shareDisabled}
            shareTooltip={shareTooltip}
          />
        ) : (
          <ShareLinkView
            token={token}
            entityType={entityType}
            entityLabel={entityLabel}
            url={url}
            onCopy={handleCopyLink}
            onRevoke={handleRevoke}
            revoking={revoking}
          />
        )}

        <p className="text-[10px] text-[var(--text-tertiary)] text-center pt-2 border-t border-[var(--border-color)]">
          This link only works while Lance is open. Your client can view it on any device with a
          browser.
        </p>
      </div>
    </Modal>
  );
}
