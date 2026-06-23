const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const artifactsDir = process.env.ARTIFACTS_DIR || 'artifacts';
const repo = process.env.GITHUB_REPOSITORY;
const tagRef = process.env.GITHUB_REF || '';
const tag = tagRef.replace('refs/tags/', '');

if (!tag) {
  console.error('GITHUB_REF is not set');
  process.exit(1);
}
if (!repo) {
  console.error('GITHUB_REPOSITORY is not set');
  process.exit(1);
}

const version = tag.replace(/^v/, '');

let notes;
try {
  notes = execSync(`git tag -l --format='%(contents)' "${tag}"`, { encoding: 'utf8' }).trim();
} catch {
  notes = '';
}
if (!notes) notes = 'Bug fixes and improvements';
notes = notes.replace(/[\n\r]+/g, ' ').trim();

const pubDate = new Date().toISOString();

function findFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = findFiles(artifactsDir);

const updatedFiles = [];
const sigFiles = new Set();
for (const f of allFiles) {
  if (f.endsWith('.sig')) {
    sigFiles.add(f);
  } else {
    updatedFiles.push(f);
  }
}

function findByPattern(pattern, label) {
  const matches = updatedFiles.filter((f) => new RegExp(pattern).test(f));
  if (matches.length === 0) {
    console.error(`Missing ${label} artifact (pattern: ${pattern})`);
    process.exit(1);
  }
  const match = matches[0];
  const sigPath = match + '.sig';
  if (!sigFiles.has(sigPath)) {
    console.error(`Missing .sig file for ${label}: expected at ${sigPath}`);
    process.exit(1);
  }
  return {
    path: match,
    sig: fs.readFileSync(sigPath, 'utf8'),
  };
}

const linuxAppImage = findByPattern(/\.AppImage$/, 'linux-x86_64 AppImage');
const macAppTarGz = findByPattern(/\.app\.tar\.gz$/, 'darwin .app.tar.gz');
const winNsis = findByPattern(/-setup\.exe$/, 'windows-x86_64 NSIS installer');

const baseUrl = `https://github.com/${repo}/releases/download/${tag}`;

const latest = {
  version,
  notes,
  pub_date: pubDate,
  platforms: {
    "darwin-aarch64": {
      url: `${baseUrl}/${path.basename(macAppTarGz.path)}`,
      signature: macAppTarGz.sig,
    },
    "darwin-x86_64": {
      url: `${baseUrl}/${path.basename(macAppTarGz.path)}`,
      signature: macAppTarGz.sig,
    },
    "linux-x86_64": {
      url: `${baseUrl}/${path.basename(linuxAppImage.path)}`,
      signature: linuxAppImage.sig,
    },
    "windows-x86_64": {
      url: `${baseUrl}/${path.basename(winNsis.path)}`,
      signature: winNsis.sig,
    },
  },
};

fs.writeFileSync('latest.json', JSON.stringify(latest, null, 2) + '\n');
console.log('✓ latest.json generated');
console.log(`  Version:  ${version}`);
console.log(`  Platforms: darwin-aarch64, darwin-x86_64, linux-x86_64, windows-x86_64`);
