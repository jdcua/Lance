#!/usr/bin/env node
/**
 * Aggregate MONKEY swarm-2 agent reports.
 * Usage: node scripts/qa/aggregate-swarm2.mjs
 * Reads .qa/swarm2/*.json, writes .qa/swarm2/AGGREGATE.json and AGGREGATE.md
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), '.qa', 'swarm2');
let files = [];
try {
  files = readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)).sort();
} catch {
  console.error('No .qa/swarm2 directory yet.');
  process.exit(1);
}

const agents = [];
for (const f of files) {
  try {
    const raw = readFileSync(join(dir, f), 'utf8');
    const data = JSON.parse(raw);
    agents.push({ file: f, ...data });
  } catch (e) {
    agents.push({ file: f, parse_error: String(e.message || e) });
  }
}

const allBugs = agents.flatMap((a) =>
  (Array.isArray(a.bugs) ? a.bugs : []).map((b) => ({
    agent: a.file.replace('.json', ''),
    persona: a.persona ?? a.role ?? '?',
    ...b,
  })),
);

const allFriction = agents.flatMap((a) =>
  (Array.isArray(a.friction) ? a.friction : []).map((b) => ({
    agent: a.file.replace('.json', ''),
    persona: a.persona ?? a.role ?? '?',
    ...b,
  })),
);

const severities = ['critical', 'high', 'medium', 'low'];
const bySeverity = Object.fromEntries(
  severities.map((s) => [s, allBugs.filter((b) => String(b.severity).toLowerCase() === s).length]),
);

const summary = {
  generated_at: new Date().toISOString(),
  agents_total: files.length,
  agents_with_reports: agents.filter((a) => !a.parse_error).length,
  agents_with_parse_errors: agents.filter((a) => a.parse_error).length,
  goals_succeeded: agents.filter((a) => a.success === true).length,
  goals_failed: agents.filter((a) => a.success === false).length,
  bugs_total: allBugs.length,
  bugs_by_severity: bySeverity,
  friction_total: allFriction.length,
  agents,
  bugs: allBugs,
  friction: allFriction,
};

writeFileSync(join(dir, 'AGGREGATE.json'), JSON.stringify(summary, null, 2));

const md = [];
md.push('# MONKEY Swarm 2 — Aggregate\n');
md.push(`Generated: ${summary.generated_at}\n`);
md.push(`- Agents reporting: **${summary.agents_with_reports}/${summary.agents_total}**`);
md.push(`- Goals succeeded: **${summary.goals_succeeded}**, failed: **${summary.goals_failed}**`);
md.push(`- Bugs: **${summary.bugs_total}** (critical ${bySeverity.critical}, high ${bySeverity.high}, medium ${bySeverity.medium}, low ${bySeverity.low})`);
md.push(`- Friction: **${summary.friction_total}**\n`);
md.push('## Agents\n');
for (const a of agents) {
  md.push(`### ${a.file}\n`);
  md.push(`- Persona: ${a.persona ?? a.role ?? '?'}`);
  md.push(`- Goal: ${a.goal ?? '—'}`);
  md.push(`- Success: ${a.success ?? '—'}`);
  if (a.verdict) md.push(`- Verdict: ${a.verdict}`);
  md.push(`- Bugs: ${Array.isArray(a.bugs) ? a.bugs.length : 0}, friction: ${Array.isArray(a.friction) ? a.friction.length : 0}`);
  if (a.parse_error) md.push(`- **PARSE ERROR:** ${a.parse_error}`);
  md.push('');
}
md.push('## Bugs (deduped by title later)\n');
for (const b of allBugs) {
  md.push(`- **[${b.severity ?? '?'}]** ${b.title ?? b.description ?? 'Untitled'} — agent ${b.agent}, persona ${b.persona}`);
}
md.push('\n## Friction\n');
for (const f of allFriction) {
  md.push(`- **${f.persona}** — ${f.moment ?? f.description ?? ''} (${f.feeling ?? ''})`);
}

writeFileSync(join(dir, 'AGGREGATE.md'), md.join('\n'));
console.log(`Aggregated ${files.length} report(s) → .qa/swarm2/AGGREGATE.{json,md}`);
console.log(`Bugs: ${allBugs.length} · Friction: ${allFriction.length}`);
