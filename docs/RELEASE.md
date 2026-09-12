# Lance Release Process

## One-time setup (do this once, never again)

### 1. Generate signing keypair
```
pnpm tauri signer generate -w ~/.tauri/lance.key
```
- Saves private key to `~/.tauri/lance.key`
- Saves public key to `~/.tauri/lance.key.pub`
- You will be asked for a password. Store it in a password manager

### 2. Add GitHub Secrets
Go to `github.com/jdcua/lance` → Settings → Secrets and variables → Actions → New repository secret

| Secret name | Value |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | contents of `~/.tauri/lance.key` (the whole file) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | the password you set in step 1 |
| `LANCE_LICENSE_SECRET` | shared secret matching the license server (HMAC key validation) |
| `PADDLE_MONTHLY_PRICE_ID` | Paddle price ID for the $14/mo plan |
| `PADDLE_YEARLY_PRICE_ID` | Paddle price ID for the $99/yr plan |
| `PADDLE_ONETIME_PRICE_ID` | Paddle price ID for the $249 lifetime plan |

Without the three `PADDLE_*` secrets, release builds compile fine but every
checkout button reports "not configured". Verify after release: open the
upgrade modal in the shipped build and confirm checkout opens.

### 3. Add public key to tauri.conf.json
Replace `__LANCE_PUBKEY__` in `src-tauri/tauri.conf.json` with the contents of `~/.tauri/lance.key.pub`.

Commit this. The public key is safe to commit.
**NEVER commit the private key.**

## Releasing a new version

```
node scripts/bump-version.cjs 1.2.0
git add -A
git commit -m "chore: bump version to v1.2.0"
git tag -a v1.2.0 -m "Archetype System 2.0: 21 professions, archetype-specific dashboards"
git push origin main --tags
```

GitHub Actions does the rest. In ~10 minutes:
- All 3 platforms built and signed
- GitHub Release created with all installers
- `latest.json` uploaded as a release asset
- Existing Lance installs auto-detect the update within 4 hours

## Hotfix process

Same flow, just bump the patch version (e.g. `1.2.0` → `1.2.1`):

```
node scripts/bump-version.cjs 1.2.1
git add -A
git commit -m "chore: bump version to v1.2.1"
git tag -a v1.2.1 -m "Hotfix: ..."
git push origin main --tags
```

## How updates work

1. Lance checks `https://github.com/jdcua/lance/releases/latest/download/latest.json` every 4 hours
2. If `latest.json` version > installed version, user sees an "Update Now / Later" toast
3. Clicking "Update Now" downloads the appropriate platform binary, verifies its signature against the public key embedded in the app, installs it, and relaunches

## Artifact filenames

Tauri generates deterministic filenames based on the app name and version:

| Platform | File |
|---|---|
| Linux | `Lance_{version}_amd64.AppImage` |
| Linux | `Lance_{version}_amd64.deb` |
| macOS | `Lance_{version}_universal.dmg` |
| macOS | `Lance_{version}_universal.app.tar.gz` |
| Windows | `Lance_{version}_x64-setup.exe` |
| Windows | `Lance_{version}_x64_en-US.msi` |

Each has a corresponding `.sig` file generated when `createUpdaterArtifacts` is enabled.
