/**
 * Reports architectural boundary violations described in AGENTS.md.
 * Read-only, warn-only. Use `node scripts/check-boundaries.mjs --strict` to
 * fail once the backlog is cleared.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const files = execFileSync('git', ['ls-files', 'src'], { encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(ts|tsx)$/.test(f));
const violations = [];

function importsOf(file) {
  const text = readFileSync(file, 'utf8');
  const found = [];
  for (const match of text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    found.push(match[1]);
  }
  return found;
}

function report(file, rule, detail) {
  violations.push(`${rule}: ${file} -> ${detail}`);
}

const basenames = new Map();
for (const file of files) {
  // Duplicate basenames in different folders (index.ts in every domain
  // folder, shared.tsx per section) are intentional. Only same-folder
  // duplicates are ambiguous for an agent resolving an import path.
  const name = `${path.dirname(file)}/${path.basename(file)}`;
  basenames.set(name, [...(basenames.get(name) || []), file]);

  const imp = importsOf(file);
  const isUi = file.startsWith('src/components/') || file.startsWith('src/screens/');
  const isLib = file.startsWith('src/lib/') && !file.startsWith('src/lib/engines/');

  if (isUi) {
    for (const spec of imp) {
      if (spec.startsWith('@tauri-apps/')) report(file, 'ui-direct-tauri', spec);
    }
  }
  if (file.startsWith('src/components/')) {
    for (const spec of imp) {
      if (spec.includes('screens/')) report(file, 'component-imports-screen', spec);
    }
  }
  if (isLib) {
    for (const spec of imp) {
      if (/(store|db|screens|components)/.test(spec)) report(file, 'lib-imports-volatile', spec);
    }
  }
  if (file === 'src/db/index.ts') {
    for (const spec of imp) if (spec === './index') report(file, 'self-import', spec);
  }
  if (file !== 'src/store/index.ts') {
    const text = readFileSync(file, 'utf8');
    if (/\bcreate\s*\(\s*</.test(text) && text.includes('zustand')) {
      report(file, 'second-store', 'zustand create()');
    }
  }
}

for (const [name, paths] of basenames) {
  if (paths.length > 1) {
    violations.push(`duplicate-basename: ${name} (${paths.length} files)`);
  }
}

// Import-cycle detection. Resolves the same specifiers importsOf() already
// reads, so no parser or dependency is added. Pass --cycles to enable.
const CYCLE_BASELINE = 'scripts/cycle-baseline.json';
const fileSet = new Set(files);

function resolveSpecifier(fromFile, spec) {
  let target;
  if (spec.startsWith('@/')) {
    target = path.posix.normalize(`src/${spec.slice(2)}`);
  } else if (spec.startsWith('.')) {
    target = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
  } else {
    return null; // bare module, not part of the local import graph
  }
  for (const candidate of [target, `${target}.ts`, `${target}.tsx`, `${target}/index.ts`, `${target}/index.tsx`]) {
    if (fileSet.has(candidate)) return candidate;
  }
  return null;
}

const graph = new Map();
for (const file of files) {
  const edges = new Set();
  for (const spec of importsOf(file)) {
    const target = resolveSpecifier(file, spec);
    if (target) edges.add(target);
  }
  graph.set(file, edges);
}

// Enumerate each elementary cycle once: the traversal only visits nodes whose
// index is >= the start node, so the start node is the smallest in the cycle.
function findCycles() {
  const nodes = [...graph.keys()].sort();
  const index = new Map(nodes.map((node, i) => [node, i]));
  const cycles = [];

  for (const start of nodes) {
    const startIndex = index.get(start);
    const onPath = new Set([start]);
    const trail = [start];

    function walk(node) {
      for (const next of [...graph.get(node)].sort()) {
        if (index.get(next) < startIndex) continue;
        if (next === start) {
          cycles.push([...trail, start]);
        } else if (!onPath.has(next)) {
          onPath.add(next);
          trail.push(next);
          walk(next);
          trail.pop();
          onPath.delete(next);
        }
      }
    }
    walk(start);
  }
  return cycles;
}

if (process.argv.includes('--cycles')) {
  const cycles = findCycles();
  const keys = cycles.map((cycle) => cycle.join(' -> '));

  if (!existsSync(CYCLE_BASELINE)) {
    writeFileSync(CYCLE_BASELINE, `${JSON.stringify(keys.sort(), null, 2)}\n`);
    console.log(`Wrote ${keys.length} baseline import cycle(s) to ${CYCLE_BASELINE}.`);
  } else {
    const baseline = new Set(JSON.parse(readFileSync(CYCLE_BASELINE, 'utf8')));
    const newCycles = keys.filter((key) => !baseline.has(key));
    for (const key of newCycles) console.log(`new-import-cycle: ${key}`);
    console.log(`${newCycles.length} new import cycle(s) (${keys.length} total).`);
    if (newCycles.length) process.exitCode = 1;
  }
}

// Hand-rolled CRUD ratchet. Pass --trackers to enforce the RecordTracker rule.
const TRACKER_BASELINE = 'scripts/tracker-baseline.json';
if (process.argv.includes('--trackers')) {
  const offenders = files
    .filter((f) => f.startsWith('src/components/features/') && f.endsWith('.tsx'))
    .filter((f) => {
      const text = readFileSync(f, 'utf8');
      if (/\bRecordTracker\b/.test(text)) return false;
      const dbCrud = /\bgetDb\b/.test(text) && /INSERT\s+INTO/i.test(text);
      const storeCrud =
        /\buseStore\s*\(/.test(text) &&
        /\bload[A-Z]\w*/.test(text) &&
        /\b(?:add|create)[A-Z]\w*/.test(text) &&
        /\b(?:remove|delete)[A-Z]\w*/.test(text);
      return dbCrud || storeCrud;
    })
    .sort();

  if (!existsSync(TRACKER_BASELINE)) {
    writeFileSync(TRACKER_BASELINE, `${JSON.stringify(offenders, null, 2)}\n`);
    console.log(`Wrote ${offenders.length} tracker baseline(s) to ${TRACKER_BASELINE}.`);
  } else {
    const baseline = new Set(JSON.parse(readFileSync(TRACKER_BASELINE, 'utf8')));
    const added = offenders.filter((f) => !baseline.has(f));
    for (const f of added) console.log(`new-hand-rolled-tracker: ${f}`);
    console.log(`${added.length} new hand-rolled tracker(s) (${offenders.length} total).`);
    if (added.length) process.exitCode = 1;
  }
}

for (const v of violations) console.log(v);
console.log(`${violations.length} boundary warning(s).`);
if (process.argv.includes('--strict') && violations.length) process.exit(1);
