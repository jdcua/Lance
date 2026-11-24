# Lance Signing Keys

## Windows
Generate with: `tauri signer generate -w signing/lance.key`
Set environment variables:
- TAURI_SIGNING_PRIVATE_KEY=<contents of lance.key>
- TAURI_SIGNING_PRIVATE_KEY_PASSWORD=<your password>

## macOS
Requires Apple Developer account.
Set environment variables:
- APPLE_SIGNING_IDENTITY=<Developer ID Application: ...>
- APPLE_ID=<your Apple ID>
- APPLE_PASSWORD=<app-specific password>
- APPLE_TEAM_ID=<your team ID>

## Updater keypair
Generate with: `tauri signer generate`
Public key goes in tauri.conf.json plugins.updater.pubkey
Private key goes in TAURI_SIGNING_PRIVATE_KEY env var

Never commit any keys or .p12 files.
