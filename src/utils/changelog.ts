import { useState, useEffect } from 'react';
import { getRuntimeVersion } from '../lib/version';

export interface ChangelogEntry {
  version: string;
  date: string;
  items: string[];
}

/**
 * Dynamic changelog loader.
 * Priority:
 * 1. GitHub Releases API (production, when online)
 * 2. Local git log parsing (development, offline)
 * 3. Cached localStorage (fast repeat loads)
 * 4. Hardcoded fallback
 */
export async function loadChangelog(): Promise<ChangelogEntry[]> {
  const cacheKey = 'lance:changelog-cache';
  const cacheExpiryKey = 'lance:changelog-cache-expiry';
  const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

  // 1. Check cache first (still ensure installed version is represented)
  try {
    const cached = localStorage.getItem(cacheKey);
    const expiry = localStorage.getItem(cacheExpiryKey);
    if (cached && expiry && Date.now() < parseInt(expiry, 10)) {
      return ensureRuntimeVersion(JSON.parse(cached) as ChangelogEntry[]);
    }
  } catch {
    /* ignore cache errors */
  }

  let entries: ChangelogEntry[] = [];

  // 2. Try GitHub Releases API (works in browser via CORS)
  try {
    const response = await fetch('https://api.github.com/repos/jdcua/Lance/releases?per_page=20', {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const releases = await response.json();
    entries = releases
      .filter((r: any) => !r.draft && !r.prerelease)
      .map((r: any) => ({
        version: r.tag_name.replace(/^v/, ''),
        date: r.published_at.split('T')[0],
        items: r.body
          ?.split('\n')
          .map((line: string) => line.replace(/^[-*]\s*/, '').trim())
          .filter((line: string) => line.length > 0) || [],
      }));
  } catch {
    /* GitHub API failed -- fall through to git log */
  }

  // 3. Fallback: parse local git tags (dev mode, Tauri only)
  if (entries.length === 0 && typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const log = await invoke<string>('get_git_changelog', { limit: 20 });
      entries = parseGitLog(log);
    } catch {
      /* Tauri invoke failed */
    }
  }

  // 4. Hardcoded fallback for current version
  if (entries.length === 0) {
    entries = [
      {
        version: '0.9.3',
        date: new Date().toISOString().split('T')[0],
        items: [
          'Monetization: license tiers, Pro upgrade flow, and archetype depth',
          'Dynamic changelog from GitHub Releases API with local cache fallback',
          'License key format aligned to 4 groups (LANCE-XXXX-XXXX-XXXX-XXXX)',
          'Auto-backup singleton update handler fix',
          'GitHub API 404 no longer noisy in console; changelog modal title is dynamic',
        ],
      },
      {
        version: '0.9.1',
        date: new Date().toISOString().split('T')[0],
        items: [
          'Dynamic changelog from GitHub Releases API with local cache fallback',
          '"What\'s new" modal now pulls latest release notes automatically',
        ],
      },
      {
        version: '0.9.0',
        date: new Date().toISOString().split('T')[0],
        items: [
          'Auto-backup toggle now persists across reloads (browser + Tauri)',
          'Contract/Export templates persist in browser mode',
          'Follow-ups "Add" button navigates to Clients for no-email clients',
          'Relative timestamps now use created_at (fixes "13h ago" bug)',
          'Client status dot shows "Has communication log" when applicable',
          'Phases counter decrements correctly on delete',
          'Negative metric values rejected with error toast',
          'Empty contract body shows helpful empty-state message',
          'Email field validates format on blur',
          'Invoice payment card shows "Paid: just now"',
          '37 bugs fixed in v0.9.0 sprint',
        ],
      },
    ];
  }

  // Ensure the installed app version always has a changelog entry -- a stale
  // cache (or an older GitHub release list) must not make the "What's new"
  // modal show older notes than the running build.
  entries = await ensureRuntimeVersion(entries);

  // Cache result
  try {
    localStorage.setItem(cacheKey, JSON.stringify(entries));
    localStorage.setItem(cacheExpiryKey, String(Date.now() + CACHE_TTL_MS));
  } catch {
    /* ignore */
  }

  return entries;
}

async function ensureRuntimeVersion(entries: ChangelogEntry[]): Promise<ChangelogEntry[]> {
  try {
    const runtimeVersion = await getRuntimeVersion();
    if (runtimeVersion && !entries.some((e) => e.version === runtimeVersion)) {
      return [
        {
          version: runtimeVersion,
          date: new Date().toISOString().split('T')[0],
          items: ['Release notes unavailable for this version \u2014 check GitHub for details.'],
        },
        ...entries,
      ];
    }
  } catch {
    /* version detection is non-critical */
  }
  return entries;
}

function parseGitLog(log: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;

  for (const line of log.split('\n')) {
    const tagMatch = line.match(/^tag:\s*(v?[\d.]+)/);
    if (tagMatch) {
      if (current) entries.push(current);
      current = { version: tagMatch[1].replace(/^v/, ''), date: '', items: [] };
      continue;
    }
    const dateMatch = line.match(/^date:\s*(.+)/);
    if (dateMatch && current) {
      current.date = dateMatch[1].split('T')[0];
      continue;
    }
    const itemMatch = line.match(/^\s*[-*]\s*(.+)/);
    if (itemMatch && current) {
      current.items.push(itemMatch[1].trim());
    }
  }
  if (current) entries.push(current);
  return entries;
}

/**
 * Hook for components to load changelog reactively
 */
export function useChangelog() {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    loadChangelog().then((entries) => {
      if (mounted) {
        setChangelog(entries);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  return { changelog, loading };
}