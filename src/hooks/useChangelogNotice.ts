/**
 * "What's new" notice logic.
 *
 * Owns the runtime version and the one-shot changelog-seen check. The entries
 * themselves are supplied by useChangelog() so the network fetch happens once.
 */
import { useEffect, useState } from 'react';
import { getRuntimeVersion } from '../lib/version';
import type { ChangelogEntry } from '../utils/changelog';

export function useChangelogNotice(changelog: ChangelogEntry[]) {
  const [appVersion, setAppVersion] = useState<string>('');
  const [showChangelog, setShowChangelog] = useState(false);

  useEffect(() => {
    getRuntimeVersion().then(setAppVersion);
  }, []);

  // Changelog check on mount. Depends on appVersion: getRuntimeVersion()
  // resolves after mount, so an empty-deps effect bails on the initial ''
  // and the "What's new" modal never appears. Re-running is safe: dismiss
  // persists changelog-seen, which stops repeat shows.
  // Brand-new users (no seen version AND no previous run on record) have
  // nothing to catch up on: mark the current version seen silently instead
  // of ambushing them with release notes on first launch.
  useEffect(() => {
    if (!appVersion) return;
    const seen = localStorage.getItem('lance:changelog-seen');
    const lastRun = localStorage.getItem('lance:last-run-version');
    try {
      localStorage.setItem('lance:last-run-version', appVersion);
    } catch {
      /* private mode */
    }
    if (seen === appVersion) return;
    // If onboarding hasn't been completed yet, defer changelog to next session
    // (the version check will still find it unseen)
    const onboardingCompleted = localStorage.getItem('lance:onboarding-completed') === 'true';
    if (!onboardingCompleted) return;
    if (!seen && !lastRun) {
      try {
        localStorage.setItem('lance:changelog-seen', appVersion);
      } catch {
        /* private mode */
      }
      return;
    }
    setShowChangelog(true);
  }, [appVersion]);

  const dismissChangelog = () => {
    const latestVersion = changelog[0]?.version || appVersion;
    // Never persist a "seen" version older than the installed app, otherwise
    // the changelog modal re-shows with stale notes on every launch.
    const seenVersion =
      latestVersion.localeCompare(appVersion, undefined, { numeric: true }) >= 0
        ? latestVersion
        : appVersion;
    localStorage.setItem('lance:changelog-seen', seenVersion);
    setShowChangelog(false);
  };

  return { showChangelog, dismissChangelog, appVersion };
}
