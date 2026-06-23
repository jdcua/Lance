# Local Development

## Prerequisites

- Node.js 20+
- Rust stable (via [rustup](https://rustup.rs))
- On Linux: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

## Setup

```bash
git clone https://github.com/jdcua/lance
cd lance
npm install
npm run tauri dev
```

## Common commands

| Command | Description |
|---------|-------------|
| `npm run tauri dev` | Start dev server with hot reload |
| `npm run tauri build` | Production build (no signing) |
| `npm run version:bump 1.2.0` | Bump version across all 3 files |
| `npx tsc --noEmit` | Typecheck without building |
| `npm run lint` | Lint frontend code |
| `npm run format` | Format frontend code with Prettier |
| `npm run format:check` | Check formatting without writing |
| `cargo clippy` | Lint Rust code (run from `src-tauri/`) |
| `cargo test` | Run Rust tests (run from `src-tauri/`) |

## Project structure

```
lance/
├── src/                    # React + TypeScript frontend
│   ├── archetypes/         # 42 profession archetype configs
│   ├── components/         # React components (ui/, layout/, features/, insights/)
│   ├── screens/            # Route-level page components
│   ├── store/              # Zustand state management
│   ├── types/              # TypeScript type definitions
│   ├── db/                 # Frontend database layer (migrations, queries)
│   ├── utils/              # Utilities (recurring engine, backup, seed data, etc.)
│   ├── lib/                # Libraries (auth, currency, forecast, heatmap, constants)
│   ├── hooks/              # React hooks (auto-updater)
│   ├── themes/             # Theme system (7 themes)
│   ├── achievements/       # Gamification system
│   ├── export/             # PDF and DOCX export
│   ├── import/             # File import and parsing
│   ├── ai/                 # Local AI features
│   └── license/            # License key validation
├── src-tauri/              # Rust backend (Tauri 2)
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── lib.rs          # App bootstrap, plugin registration, 73 commands
│   │   ├── db.rs           # SQLite schema and migrations
│   │   ├── server.rs       # Axum client portal server
│   │   ├── error.rs        # Error types
│   │   └── commands/       # 15 command modules (CRUD operations)
│   └── Cargo.toml
├── scripts/                # Build and release scripts
├── docs/                   # Documentation
├── .github/workflows/      # CI/CD pipeline
├── package.json
├── CHANGELOG.md
└── README.md
```

## Releasing

See `docs/RELEASE.md` for the full release process.

## Architecture

See `docs/ARCHITECTURE.md` for a detailed architecture overview.
