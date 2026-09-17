/**
 * TEMPORARY local-release helper (until GitHub Actions minutes renew Oct 1).
 *
 * 1. Build locally:  npx tauri build
 * 2. Publish:        node scripts/prepare-local-release.cjs "Release notes here"
 * 3. Commit + push landing/downloads/ — the worker serves the .dmg and
 *    updater bundle from there as the "latest" mac release. Win/Linux keep
 *    coming from the latest GitHub release.
 * 4. Revert later:   git rm -r landing/downloads && git commit && git push
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const notes = process.argv[2] || 'Bug fixes and improvements';
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

function collect(dir, test, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, test, out);
    else if (test(entry.name)) out.push(full);
  }
  return out;
}

const bundleDir = path.join(root, 'src-tauri', 'target', 'release', 'bundle');
const dmgs = collect(bundleDir, (n) => n.endsWith('.dmg'));
const tarballs = collect(bundleDir, (n) => n.endsWith('.app.tar.gz'));

if (dmgs.length === 0) {
  console.error('No .dmg found. Run `npx tauri build` first.');
  process.exit(1);
}
if (tarballs.length === 0) {
  console.error('No .app.tar.gz found. Run `npx tauri build` first.');
  process.exit(1);
}
const dmg = dmgs[0];
const bundle = tarballs[0];
// Signing needs TAURI_SIGNING_PRIVATE_KEY at build time. Without a .sig the
// .dmg still ships via the download button, but there are no auto-update
// entries for mac until a signed build is published.
const sigPath = `${bundle}.sig`;
const signed = fs.existsSync(sigPath);
if (!signed) {
  console.warn(`WARNING: no signature file at ${sigPath}`);
  console.warn('The .dmg will be downloadable, but mac auto-update stays off for this release.');
}

const outDir = path.join(root, 'landing', 'downloads');
fs.mkdirSync(outDir, { recursive: true });
for (const file of [dmg, bundle]) {
  fs.copyFileSync(file, path.join(outDir, path.basename(file)));
}

const mac = { dmg: path.basename(dmg) };
if (signed) {
  mac.bundle = path.basename(bundle);
  mac.bundleSignature = fs.readFileSync(sigPath, 'utf8').trim();
}
const manifest = { version, notes, mac };
fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log('Local release staged:');
console.log(`  version: ${version}`);
console.log(`  dmg:     ${mac.dmg}`);
console.log(`  updater: ${signed ? `signed (${mac.bundle})` : 'OFF — unsigned build'}`);
console.log('Next: git add landing/downloads && git commit -m "chore: publish local mac release" && git push');
