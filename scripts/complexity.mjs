/**
 * Reports cyclomatic complexity above a threshold (default 15).
 * Read-only. Use `npm run complexity -- 12` for a stricter pass.
 */
import { spawnSync } from 'node:child_process';

const threshold = Number(process.argv[2]) || 15;
const result = spawnSync(
  'npx',
  ['eslint', 'src/', '--rule', JSON.stringify({ complexity: ['warn', threshold] }), '-f', 'json'],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
);

if (result.error || !result.stdout) {
  console.error(result.error?.message || 'eslint produced no output');
  process.exit(1);
}

const reports = JSON.parse(result.stdout);
const offenders = [];
for (const file of reports) {
  for (const message of file.messages) {
    if (message.ruleId !== 'complexity') continue;
    const match = message.message.match(/complexity of (\d+)/);
    offenders.push({
      file: file.filePath.replace(process.cwd() + '/', ''),
      line: message.line,
      score: match ? Number(match[1]) : 0,
    });
  }
}

offenders.sort((a, b) => b.score - a.score);
if (offenders.length === 0) {
  console.log(`No functions above complexity ${threshold}.`);
} else {
  console.log(`${offenders.length} functions above complexity ${threshold}:`);
  for (const o of offenders) console.log(`  ${String(o.score).padStart(3)}  ${o.file}:${o.line}`);
}
