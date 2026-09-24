/* Promo screenshot pipeline — deterministic, frozen animations.
 * Serves landing/ locally, captures hero panes + SEO page samples.
 * Usage: npm run promo:shots  (requires playwright browsers; output: promo/assets/)
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const landing = join(root, 'landing');
const out = join(root, 'promo', 'assets');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  try {
    let path = new URL(req.url, 'http://x').pathname;
    if (path === '/') path = '/index.html';
    const m = path.match(/^\/(craft|alternatives|use)\/[^/.]+$/);
    if (m) path = path + '.html'; // mirror _worker.js clean-URL rewrite
    const data = await readFile(join(landing, decodeURIComponent(path)));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('nope');
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const shots = [];
async function shot(url, name, setup) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  if (setup) await setup();
  await page.waitForTimeout(900); // panein .35s entrance must finish
  await page.screenshot({ path: join(out, name) });
  shots.push(name);
  console.log('promo: shot', name);
}

await shot(`${base}/?static=1`, 'landing-hero.png');
for (const pane of ['proposals', 'time', 'invoices']) {
  await shot(`${base}/?static=1`, `pane-${pane}.png`, () => page.click(`.ms-item[data-pane="${pane}"]`));
}
await shot(`${base}/craft/photographer`, 'craft-photographer.png');
await shot(`${base}/use/invoicing`, 'use-invoicing.png');
await shot(`${base}/alternatives/honeybook`, 'alt-honeybook.png');

await browser.close();
server.close();
console.log(`promo: shots done (${shots.length})`);
