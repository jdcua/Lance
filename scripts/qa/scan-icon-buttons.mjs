/**
 * Static scan: icon-only <button> elements with no accessible name.
 * A button whose whole body is an icon and that carries no aria-label /
 * title / aria-labelledby is invisible to screen readers — a critical axe
 * `button-name` violation.
 *
 * The opening tag is found with a hand-rolled scanner (brace depth + quote
 * state) rather than a regex: `<button onClick={() => f()}>` contains a `>`
 * inside an expression, and every regex shortcut for "up to the first >"
 * mis-parses it.
 *
 * Usage: node scripts/qa/scan-icon-buttons.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}

/** End index (exclusive) of the tag starting at `start`, brace/quote aware. */
function endOfTag(src, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return i + 1;
  }
  return -1;
}

const findings = [];
const files = walk(path.join(ROOT, 'src')).filter((f) => !/\.test\./.test(f));

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let i = 0;
  while (true) {
    const at = src.indexOf('<button', i);
    if (at === -1) break;
    const after = src[at + 7];
    if (after && /[A-Za-z0-9_$]/.test(after)) {
      i = at + 7;
      continue; // <Button ...> component, not a DOM button
    }
    const openEnd = endOfTag(src, at + 7);
    if (openEnd === -1) break;
    const closeAt = src.indexOf('</button>', openEnd);
    if (closeAt === -1) {
      i = openEnd;
      continue;
    }
    const openTag = src.slice(at, openEnd);
    const inner = src.slice(openEnd, closeAt).trim();
    i = closeAt + 9;

    if (!/<[A-Z]/.test(inner) && !/<svg/i.test(inner)) continue; // renders an icon
    // Anything left once tags are removed is user-visible: literal words, or
    // an expression ({item.name}, {count}, {cond && 'Copy'}).
    const content = inner.replace(/<[^>]*\/?>/g, ' ').trim();
    if (content) continue;
    if (/\b(aria-label|aria-labelledby|title)\s*=/.test(openTag)) continue;

    findings.push({
      file: path.relative(ROOT, file),
      line: src.slice(0, at).split('\n').length,
      index: at,
      icons: [
        ...new Set((inner.match(/<([A-Z][A-Za-z0-9]*)/g) || []).map((s) => s.slice(1))),
      ].join(','),
      snippet: (openTag + inner + '</button>').replace(/\s+/g, ' ').slice(0, 150),
    });
  }
}

console.log(`icon-only buttons with no accessible name: ${findings.length}\n`);
const byFile = {};
for (const f of findings) (byFile[f.file] ||= []).push(f);
for (const [file, list] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${String(list.length).padStart(2)}  ${file}`);
}
fs.writeFileSync(path.join(ROOT, '.qa/icon-buttons.json'), JSON.stringify(findings, null, 1));

if (process.argv.includes('--write')) {
  // Record-level actions name the record ("Delete shoot log"); UI controls
  // stand on their own ("Close", "Previous month") and take no subject.
  const RECORD_VERBS = new Set(['Delete', 'Edit', 'View', 'Confirm', 'Reorder', 'Duplicate']);
  const verbFor = (icons) => {
    if (/Trash/.test(icons)) return 'Delete';
    if (/Pencil|SquarePen|Edit|Pen\b/.test(icons)) return 'Edit';
    if (/LayoutGrid|Grid|Layout/.test(icons)) return 'Switch to grid view';
    if (/List/.test(icons)) return 'Switch to list view';
    if (/ChevronLeft|ArrowLeft/.test(icons)) return 'Previous';
    if (/ChevronRight|ArrowRight/.test(icons)) return 'Next';
    if (/ChevronUp|ArrowUp/.test(icons)) return 'Move up';
    if (/ChevronDown|ArrowDown/.test(icons)) return 'Move down';
    if (/Chevrons|Chevron/.test(icons)) return 'Expand';
    if (/^X$|Cross|Close/.test(icons)) return 'Close';
    if (/Minus/.test(icons)) return 'Remove';
    if (/Copy|Clipboard/.test(icons)) return 'Copy';
    if (/Check/.test(icons)) return 'Confirm';
    if (/Eye/.test(icons)) return 'View';
    if (/Download/.test(icons)) return 'Download';
    if (/Link|Share/.test(icons)) return 'Copy link';
    if (/Plus/.test(icons)) return 'Add';
    if (/Calendar/.test(icons)) return 'Open date picker';
    if (/Grip|Drag|Move/.test(icons)) return 'Reorder';
    if (/Rotate|Refresh|RefreshCw/.test(icons)) return 'Refresh';
    if (/Play/.test(icons)) return 'Start';
    if (/Pause/.test(icons)) return 'Pause';
    if (/Filter/.test(icons)) return 'Filter';
    if (/Search/.test(icons)) return 'Search';
    return 'Do action on';
  };
  const subjectFor = (file) =>
    path
      .basename(file, '.tsx')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .toLowerCase();

  let fixed = 0;
  const perFile = {};
  for (const f of findings) (perFile[f.file] ||= []).push(f);

  for (const [file, list] of Object.entries(perFile)) {
    const abs = path.join(ROOT, file);
    let text = fs.readFileSync(abs, 'utf8');
    const subject = subjectFor(file);
    // Descending index: an earlier insertion must not shift a later offset.
    for (const f of list.sort((a, b) => b.index - a.index)) {
      if (text.indexOf('<button', f.index) !== f.index) continue;
      const verb = verbFor(f.icons);
      const label = RECORD_VERBS.has(verb) ? `${verb} ${subject}` : verb;
      text =
        text.slice(0, f.index + 7) + ` aria-label="${label}"` + text.slice(f.index + 7);
      fixed++;
    }
    fs.writeFileSync(abs, text);
  }
  console.log(`\nlabelled ${fixed} buttons`);
}
