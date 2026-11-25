/**
 * Reports cyclomatic and cognitive complexity above a threshold (default 15).
 * Use `npm run complexity -- 12` for a stricter pass, or `-- --strict` to
 * exit non-zero when offenders exist (used as a CI gate).
 */
import { spawnSync } from 'node:child_process';

const strict = process.argv.includes('--strict');
const thresholdArg = process.argv.find((arg) => /^\d+$/.test(arg));
const threshold = Number(thresholdArg) || 15;
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
    if (message.ruleId !== 'complexity' && message.ruleId !== 'sonarjs/cognitive-complexity') {
      continue;
    }
    const match =
      message.message.match(/complexity of (\d+)/) ||
      message.message.match(/Complexity from (\d+)/);
    offenders.push({
      kind: message.ruleId === 'complexity' ? 'cyclomatic' : 'cognitive',
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
  for (const o of offenders) {
    console.log(`  ${String(o.score).padStart(3)}  ${o.kind.padEnd(10)} ${o.file}:${o.line}`);
  }
  if (strict) process.exitCode = 1;
}
