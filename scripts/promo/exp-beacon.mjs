/* Anonymous A/B counters — first-party, aggregate only. No IP storage.
 * Wire into _worker.js fetch() in build phase P1 (kept separate for review).
 * Endpoints: POST /api/exp-hit {exp,variant,goal} → {ok:true}
 * GET /api/exp-report → JSON counters (for promo/exp-report.md refresh).
 */
const counters = new Map(); // key: exp:variant:goal[:hour] → n
const hour = () => new Date().toISOString().slice(0, 13);
export function recordHit(exp, variant, goal) {
  exp = String(exp || '').slice(0, 40);
  variant = String(variant || '').slice(0, 8);
  goal = String(goal || '').slice(0, 24);
  if (!/^[a-z0-9-]+$/.test(exp) || !/^[ABC]$/.test(variant)) return false;
  if (!['dl-click', 'pricing-view', 'trial-cta', 'contact-submit', 'issue-submit', 'view'].includes(goal)) return false;
  const k = `${exp}:${variant}:${goal}:${hour()}`;
  counters.set(k, (counters.get(k) || 0) + 1);
  return true;
}
export function report() {
  const out = {};
  for (const [k, n] of counters) {
    const [exp, variant, goal] = k.split(':');
    (out[exp] ??= {})[variant] ??= {};
    out[exp][variant][goal] = (out[exp][variant][goal] || 0) + n;
  }
  return out;
}
