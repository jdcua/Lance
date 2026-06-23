const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Usage: node scripts/bump-version.cjs <version>');
  process.exit(1);
}

const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
if (!semverRegex.test(newVersion)) {
  console.error(`Invalid semver: ${newVersion}`);
  process.exit(1);
}

const root = path.resolve(__dirname, '..');

const files = [
  {
    path: path.join(root, 'package.json'),
    replace: (c) => c.replace(/"version":\s*"[^"]+"/, `"version": "${newVersion}"`),
  },
  {
    path: path.join(root, 'src-tauri', 'tauri.conf.json'),
    replace: (c) => c.replace(/"version":\s*"[^"]+"/, `"version": "${newVersion}"`),
  },
  {
    path: path.join(root, 'src-tauri', 'Cargo.toml'),
    replace: (c) => c.replace(/^version\s*=\s*"[^"]+"/m, `version = "${newVersion}"`),
  },
];

let count = 0;
for (const file of files) {
  const content = fs.readFileSync(file.path, 'utf8');
  const updated = file.replace(content);
  if (updated !== content) {
    fs.writeFileSync(file.path, updated);
    count++;
  }
}

console.log(`✓ Version bumped to ${newVersion} in ${count} files`);
console.log(`Now commit, tag (git tag v${newVersion}), and push to trigger release`);
