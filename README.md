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

The desktop shell is Tauri 2 with a Rust backend; the UI is React 18 and TypeScript built with Vite. All business data lives in SQLite on the user's machine, accessed through Tauri commands and a single Zustand store. Six onboarding presets choose which trackers appear; those trackers are resolved from a feature-component registry, and six are rendered by the generic `RecordTracker` so far. There is no account and no remote server: a small activity log stays on the device and never makes a network call. A localhost-only HTTP server serves read-only client share links. The app reaches the network only to verify signed update bundles and fetch public release notes.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the module map and
[STANDARDS.md](STANDARDS.md) for the code quality bar.

## Quick start

```bash
git clone https://github.com/jdcua/Lance.git && cd Lance && npm install && npm run tauri dev
```

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
[AGENTS.md](AGENTS.md).
