# Lance

[![CI](https://github.com/jdcua/Lance/actions/workflows/ci.yml/badge.svg)](https://github.com/jdcua/Lance/actions/workflows/ci.yml)

Lance is an offline-first desktop app that runs your entire freelance business on your own machine.

## What it does

- Manage clients, projects, milestones, time entries, expenses, and recurring invoices in one local SQLite database.
- Write proposals and contracts from templates, export them as PDF or DOCX, and track when clients open them.
- Send reminders for overdue invoices and quiet proposals, with optional late fees you review before anything goes out.
- See forecasts, effective hourly rates, client win rates, retainer burn-down, and year-end tax summaries.
- Give clients a read-only share link to their projects and invoices, served by a local-only HTTP server. No account required.

## How it works

The desktop shell is Tauri 2 with a Rust backend; the UI is React 18 and TypeScript built with Vite. All business data lives in SQLite on the user's machine, accessed through Tauri commands and a single Zustand store. Six onboarding presets choose which trackers appear; those trackers are resolved from the feature-component registry at `src/components/features/registry.ts`, and new entity screens use the generic `RecordTracker`. There is no account and no remote server: a small activity log stays on the device and never makes a network call. A localhost-only HTTP server serves read-only client share links. By default the app reaches the network only to check for and verify signed update bundles and fetch public release notes; both checks can be disabled in Settings.

### Network access & privacy

Lance makes three kinds of network request by default: an unauthenticated GET to `api.github.com` for public release notes (at startup, cached for one hour); a silent update check to `github.com/jdcua/Lance/releases/latest/download/latest.json` (3 seconds after launch, then every 4 hours), with signed bundles downloaded only if you choose Install; and a loopback-only HTTP server on `127.0.0.1` ports 39821–39830 that serves client share links while the app is open. No request carries your business data, account, or telemetry. No accounts or remote storage exist. The release-notes GET and the update check are enabled by default and can be turned off together with the "Release and update checks" switch in Settings → General; the loopback share server is not affected. The switch takes effect for future checks only: release notes already cached stay visible until the one-hour cache expires or the app is remounted, and the updater picks up the change on its next scheduled check.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the module map and
[STANDARDS.md](STANDARDS.md) for the code quality bar.

## Quick start

```bash
git clone https://github.com/jdcua/Lance.git && cd Lance
npm ci                 # exact lockfile install (what CI uses)
npm run doctor         # read-only toolchain check; does not check OS libs
npm run verify         # typecheck + lint + test + build + audit:oss + licenses + boundaries
npm run tauri dev      # requires Tauri 2 OS libraries on Linux
```

On Linux, install `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev
patchelf` first (see Requirements below). The Playwright E2E suite, which also
runs in CI, is documented in [CONTRIBUTING.md](CONTRIBUTING.md#browser-e2e-tests).

## Requirements

- Node.js 22+ and npm
- Rust stable via [rustup](https://rustup.rs)
- Tauri 2 system dependencies for your platform ([setup guide](https://v2.tauri.app/start/prerequisites/))
  - Linux: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`
- No accounts, API keys, or environment variables are required

Useful commands: `npm run doctor`, `npm run verify`, and `npm run tauri build`. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for more.

## License

MIT — see [LICENSE.md](LICENSE.md).

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and
[docs/ROADMAP.md](docs/ROADMAP.md); agent instructions live in
[AGENTS.md](AGENTS.md). Architecture decisions (single store, typed command
registry, MIT/keep-history) are recorded in
[docs/adr/README.md](docs/adr/README.md).
