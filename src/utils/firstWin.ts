/**
 * First-win paywall moment (wave3/15). After the user's first proposal is
 * sent, free/expired-tier users see the upgrade modal once — at the moment
 * of value, backed by the trial-value proof already in the modal. Rules:
 * - Once ever per install (localStorage flag, set before dispatch).
 * - Trial users already have Pro and licensed users need nothing: flag is
 *   recorded, modal stays shut.
 * - No countdown, no pressure copy here; the modal's own "Continue free"
 *   path is always equally visible. Trial clock logic untouched.
 */
import { commands } from '../lib/commands';

const KEY = 'lance:first-send-paywall';

export function maybeFirstSendMoment(getTier: () => string): boolean {
  try {
    if (localStorage.getItem(KEY)) return false;
    const tier = getTier();
    localStorage.setItem(KEY, 'done');
    if (tier !== 'free' && tier !== 'expired') return false;
    commands.dispatch('lance:open-upgrade');
    return true;
  } catch {
    return false;
  }
}
