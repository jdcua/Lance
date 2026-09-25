/* 30-day social calendar from the content bank — pre-written, pre-dated.
 * Emits promo/calendar.md (human-readable) + promo/schedule.csv
 * (Buffer/Typefully import: one upload = the whole month scheduled).
 * Usage: npm run promo:calendar
 * Human time after this: ~15 min/day replying (see promo/replies.md).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const promo = join(root, 'promo');
const content = JSON.parse(readFileSync(join(promo, 'content.json'), 'utf8'));
const site = content.brand.site.replace(/\/$/, '');
const link = (s) => `${site}/?utm_source=${s}&utm_medium=social&utm_campaign=launch-v1`;

const crafts = content.crafts;
const F = [
  (c, i, ctag) => `${c.hook} Lance for ${c.label.toLowerCase()}s: proposals → contracts → time → invoices. Offline, free forever. ${link(ctag)}`,
  (c, i, ctag) => `Pricing check for ${c.label.toLowerCase()}s: HoneyBook-style tools ~$450/yr + your data on their servers. Lance Core $0 forever, yours on your machine. ${link(ctag)}`,
  (c, i, ctag) => `Unbilled hours are a pay cut you give yourself. Lance's timer ties every hour to a project and flags what's unbilled. Built for ${c.label.toLowerCase()}s. ${link(ctag)}`,
  (c, i, ctag) => `Free tool: freelance rate calculator — 30 seconds of honest math, no account. Made for ${c.label.toLowerCase()}s: ${site}/tools/rate-calculator`,
  (c, i, ctag) => `Free tool: invoice generator — bill a client in 60 seconds, print a clean PDF, nothing uploaded. ${site}/tools/invoice-generator`,
  (c, i, ctag) => `41 crafts, 7 themes, 0 trackers. Your freelance business, on your machine. v2 brings on-device AI drafting (optional, off by default). ${link(ctag)}`,
];

const start = new Date('2026-10-01T09:00:00-04:00');
const rows = [['date', 'channel', 'text']];
let md = `# 30-day social calendar (auto-generated — edit freely)\n\nImport \`schedule.csv\` into Buffer/Typefully once → the month posts itself.\nDaily human work: reply to comments (~15 min, copy-paste from \`replies.md\`).\n\n`;
for (let d = 0; d < 30; d++) {
  const date = new Date(start.getTime() + d * 864e5);
  const ds = date.toISOString().slice(0, 10);
  const channel = d % 2 === 0 ? 'X' : 'LinkedIn';
  const text = F[d % F.length](crafts[d % crafts.length], d, channel.toLowerCase());
  rows.push([`${ds} 09:00`, channel, `"${text.replace(/"/g, '""')}"`]);
  md += `## Day ${d + 1} — ${ds} (${channel})\n\n${text}\n\n`;
}
mkdirSync(join(promo), { recursive: true });
writeFileSync(join(promo, 'calendar.md'), md);
writeFileSync(join(promo, 'schedule.csv'), rows.map((r) => r.join(',')).join('\n') + '\n');
console.log(`promo: calendar done (30 posts, ${crafts.length} crafts rotated)`);
