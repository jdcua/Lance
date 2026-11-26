# Local Development

## Prerequisites

- Node.js 22+
- Rust stable (via [rustup](https://rustup.rs))
- On Linux: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

## Setup

```bash
git clone https://github.com/jdcua/Lance.git && cd Lance
npm ci                 # exact lockfile install (what CI uses)
git config core.hooksPath .githooks   # opt in to the gitleaks pre-commit hook
npm run doctor         # read-only toolchain check; does not check OS libs
npm run verify         # typecheck + lint + test + build + audit:oss + licenses + boundaries
npm run tauri dev      # requires Tauri 2 OS libraries on Linux
```

`npm run doctor` is read-only and does not check OS libraries; on Linux install
`libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf` first.

## Common commands

| Command | Description |
|---------|-------------|
| `npm run tauri dev` | Start dev server with hot reload |
| `npm run tauri build` | Production build (no signing) |
| `npm run version:bump 1.2.0` | Bump version across all 3 files |
| `npm run doctor` | Check Node, npm, Rust and installed npm dependencies (does not check OS libraries) |
| `npm run typecheck` | Typecheck without building |
| `npm run verify` | Typecheck, lint, tests, build, OSS audit, license policy and strict boundary check |
| `npm run audit:oss` | Check tracked files for secrets, personal paths and junk |
| `npm run check:boundaries` | Report boundary violations (use `-- --strict` to fail; CI does) |
| `npm run complexity -- --strict` | List cyclomatic and cognitive complexity offenders (CI gate) |
| `npm run lint` | Lint frontend code |
| `npm run format` | Format frontend code with Prettier |
| `npm run format:check` | Check formatting without writing |
| `cargo clippy` | Lint Rust code (run from `src-tauri/`) |
| `cargo test` | Run Rust tests (run from `src-tauri/`) |

## Browser E2E tests

Browser E2E tests are not part of `verify` or CI. Run them manually with the
built app preview serving port 4173:

```bash
npm run build && npm run preview   # terminal 1, serves 4173
npx playwright install chromium     # first time only
npx playwright test                 # 18 specs / 65 tests
```

## Dependency updates

`.github/workflows/deps.yml` handles dependency *version* updates by opening a
weekly issue for manual review; it is not a security-update mechanism. Dependabot
*alerts* and *security updates* are enabled in repo settings (no
`.github/dependabot.yml` is needed) and complement the workflow. The two should
not be confused.

## Project structure

```
lance/
├── src/                    # React + TypeScript frontend
│   ├── components/         # UI, layout, and 180+ archetype trackers
│   ├── screens/            # Route-level page components
│   ├── store/              # Zustand state management
│   ├── types/              # TypeScript type definitions
│   ├── db/                 # Frontend database layer (migrations, queries)
│   ├── utils/              # Utilities (recurring engine, backup, seed data, etc.)
│   ├── lib/                # Libraries (commands, currency, forecast, constants)
│   ├── hooks/              # React hooks (auto-updater)
│   ├── themes/             # Theme system (7 themes)
│   ├── achievements/       # Gamification system
│   ├── export/             # PDF and DOCX export
│   └── import/             # File import and parsing
├── src-tauri/              # Rust backend (Tauri 2)
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── lib.rs          # App bootstrap and command registration
│   │   ├── db.rs           # SQLite schema and migrations
│   │   ├── server.rs       # Axum client portal server
│   │   ├── error.rs        # Error types
│   │   └── commands/       # 16 command modules (CRUD operations)
│   └── Cargo.toml
├── scripts/                # Build and release scripts
├── docs/                   # Documentation
├── .github/workflows/      # CI/CD pipeline
├── package.json
├── CHANGELOG.md
└── README.md
```

## Architecture

See `docs/ARCHITECTURE.md` for a detailed architecture overview.
