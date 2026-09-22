import { useState, useEffect } from 'react';
import { getRuntimeVersion } from '../lib/version';

export interface ChangelogEntry {
  version: string;
  date: string;
  items: string[];
}

interface GitHubRelease {
  draft?: boolean;
  prerelease?: boolean;
  tag_name: string;
  published_at: string;
  body?: string | null;
}

/**
 * User-facing sanitizer for release notes.
 * GitHub bodies and git logs are written for developers; the "What's new"
 * modal is for freelancers. Drop internal lines (license-key formats,
 * console noise, handler fixes, plumbing) and strip markdown artifacts.
 * When nothing survives, fall back to one plain line so the modal never
 * shows an empty version or leaks internals.
 */
const INTERNAL_PATTERNS = [
  /licen[cs]e key/i,
  /LANCE-[A-Z0-9-]{8,}/,
  /HMAC/i,
  /singleton/i,
  /console/i,
  /\b404\b/,
  /noisy/i,
  /cache fallback/i,
  /dynamic changelog/i,
  /handler fix/i,
  /modal title is dynamic/i,
  /git log/i,
  /invoke\(/i,
  /\btauri\b/i,
  /no longer noisy/i,
];

export function sanitizeChangelogItems(items: string[]): string[] {
  const clean = (items || [])
    .map((line) =>
      String(line)
        .replace(/^[-*]\s*/, '')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/\*\*([^*]*)\*\*/g, '$1')
        .replace(/__([^_]*)__/g, '$1')
        .trim(),
    )
    .filter((line) => line.length > 0 && !INTERNAL_PATTERNS.some((re) => re.test(line)));
  return clean.slice(0, 6);
}

/**
 * Dynamic changelog loader.
 * Priority:
 * 1. GitHub Releases API (production, when online)
 * 2. Local git log parsing (development, offline)
 * 3. Cached localStorage (fast repeat loads)
 * 4. Hardcoded fallback
 *
 * Every source passes through sanitizeChangelogItems so the modal stays
 * plain and user-facing.
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
    const releases = (await response.json()) as GitHubRelease[];
    entries = releases
      .filter((r) => !r.draft && !r.prerelease)
      .map((r) => ({
        version: r.tag_name.replace(/^v/, ''),
        date: r.published_at.split('T')[0],
        items: sanitizeChangelogItems(
          r.body?.split('\n').map((line: string) => line.replace(/^[-*]\s*/, '').trim()) || [],
        ),
      }))
      .map((e) => ({
        ...e,
        items: e.items.length > 0 ? e.items : ['Small fixes and polish in this release.'],
      }));
  } catch {
    /* GitHub API failed · fall through to git log */
  }

  // 3. Fallback: parse local git tags (dev mode, Tauri only)
  if (entries.length === 0 && typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const log = await invoke<string>('get_git_changelog', { limit: 20 });
      entries = parseGitLog(log);
    } catch {
      /* Tauri invoke failed */
    }
  }

  // 4. Hardcoded fallback for current version — plain words only.
  if (entries.length === 0) {
    entries = [
      {
        version: '0.9.3',
        date: new Date().toISOString().split('T')[0],
        items: [
          'Pro licenses and a smoother upgrade flow',
          'New profession profiles with tailored dashboards',
          'Auto-backup keeps working quietly in the background',
          'Faster, quieter update checks',
        ],
      },
      {
        version: '0.9.1',
        date: new Date().toISOString().split('T')[0],
        items: ['"What\'s new" notes now update themselves'],
      },
      {
        version: '0.9.0',
        date: new Date().toISOString().split('T')[0],
        items: [
          'Auto-backup remembers your settings',
          'Contract and export templates that stick around',
          'Smoother follow-ups, timestamps, and empty states',
          '37 small fixes in one sprint',
        ],
      },
    ];
  }

  // Ensure the installed app version always has a changelog entry · a stale
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
  return entries.map((e) => {
    const items = sanitizeChangelogItems(e.items);
    return { ...e, items: items.length > 0 ? items : ['Small fixes and polish in this release.'] };
  });
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