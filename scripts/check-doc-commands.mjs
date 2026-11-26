/**
 * Verifies that every `npm run <script>` referenced in agent/contributor docs
 * actually exists in package.json. Read-only; zero dependencies.
 *
 * Run with `npm run check:doc-commands` (wired into CI's lint job, not `verify`,
 * to keep the local loop fast).
 *
 * Detection: any `npm run NAME` occurrence on a scanned line is checked,
 * whether it is backtick-quoted prose or a plain command in a fenced block.
 * Extra arguments (`npm run tauri dev`, `npm run complexity -- --strict`) are
 * ignored: only the token immediately after `npm run` is the script name.
 *
 * False positives (e.g. an intentionally invalid command shown as an example)
 * can be exempted per line with an explicit marker embedded in a Markdown
 * comment, with a short reason:
 *
 *   `npm run does-not-exist` <!-- check-doc-commands: ignore: deliberate bad example -->
 *
 * A line carrying the marker `check-doc-commands: ignore` is skipped entirely.
 * Drift is reported as `file:line` for every mismatch and exits non-zero.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve from this file's location, not process.cwd(), so the check behaves
// the same when invoked from the repo root, a subdirectory, or a temp copy.
const root = dirname(dirname(fileURLToPath(import.meta.url)));

const DOCS = [
  'AGENTS.md',
  'STANDARDS.md',
  'CONTRIBUTING.md',
  'docs/AGENT_GUIDE.md',
  'docs/DEVELOPMENT.md',
  '.github/copilot-instructions.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  'README.md',
];

const COMMAND_RE = /\bnpm run\s+([A-Za-z0-9_:.-]+)/g;
const IGNORE_MARKER = 'check-doc-commands: ignore';

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const scripts = pkg.scripts ?? {};
const hasScript = (name) => Object.hasOwn(scripts, name);

const mismatches = [];
let references = 0;
let scanned = 0;

for (const doc of DOCS) {
  const path = join(root, doc);
  if (!existsSync(path)) continue; // docs may be added/removed over time
  scanned += 1;
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes(IGNORE_MARKER)) return; // explicit exemption
    for (const match of line.matchAll(COMMAND_RE)) {
      const name = match[1];
      references += 1;
      if (!hasScript(name)) mismatches.push(`${doc}:${index + 1}: npm run ${name}`);
    }
  });
}

if (mismatches.length) {
  console.error(`check-doc-commands: FAIL (${mismatches.length} mismatch${mismatches.length === 1 ? '' : 'es'})`);
  for (const mismatch of mismatches) console.error(`  - ${mismatch}`);
  console.error(`  Add the script to package.json, fix the doc, or exempt the line with '${IGNORE_MARKER}'.`);
  process.exit(1);
}

console.log(`check-doc-commands: PASS (${references} npm run references across ${scanned} docs)`);
