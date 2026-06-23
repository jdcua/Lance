# Lance — Freelancer OS

Win work. Run projects. Get paid. Run your business.

Lance is a desktop application built by [Decentra](https://decentra.co) that puts all your freelance business operations in one place. Clients, projects, proposals, contracts, time tracking, invoices, expenses, and insights — all running locally on your machine.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Rust (Tauri v2) + SQLite
- **Icons**: Lucide React
- **State**: Zustand

## Development

### Prerequisites

- Node.js 18+
- Rust (stable, 2021 edition)
- Tauri CLI v2 (`cargo install tauri-cli`)

### Setup

```bash
npm install
```

### Run (dev)

```bash
npm run tauri dev
```

This starts Vite on port 1420 and launches the Tauri window.

### Build

```bash
npm run tauri build        # current platform
npm run build:win          # Windows (cross-compile)
npm run build:mac          # macOS (cross-compile)
npm run build:linux        # Linux
```

### TypeScript Check

```bash
npx tsc --noEmit
```

### Rust Check

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

## Project Structure

```
src/                  # React frontend
  components/         # UI components
    ui/               # Shared UI (Button, Card, Modal, etc.)
    layout/           # Layout (Sidebar, Topbar)
  screens/            # Route screens (Dashboard, Proposals, etc.)
  store/              # Zustand state management
  types/              # TypeScript type definitions
  utils/              # Utility functions
  themes/             # Theme definitions
  archetypes/         # 44 freelancer profession profiles
  achievements/       # Gamification system
  export/             # PDF & DOCX export
  import/             # File import & parsing
  ai/                 # Local AI (v3 — disabled for now)
  db/                 # Frontend database migration
src-tauri/            # Rust backend (Tauri)
  src/
    commands/         # 11 command modules (73 Tauri commands)
    db.rs             # SQLite schema & migrations
    lib.rs            # App bootstrap & command registration
    main.rs           # Entry point
```

### Import Path Alias

`@/` maps to `src/`. Example:

```ts
import Button from '@/components/ui/Button';
import { useStore } from '@/store';
import type { Client } from '@/types';
```

Relative imports also work everywhere.

## Database

SQLite via `rusqlite` (bundled). The database file is stored in the platform's app-data directory as `lance.db`. Schema is defined in both:

- `src-tauri/src/db.rs` (Rust — primary, runs on app start)
- `src/db/index.ts` (TypeScript — secondary, runs on frontend load)

Both migrations use `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE` with silent error handling, so they are idempotent and safe to run multiple times.

## Key Features

- 44 freelancer archetypes (profession profiles)
- 7 themes (Default, Studio, Terminal, Craft, Motion, Lens, Scale)
- 8 accent colors
- Command palette (Ctrl+K)
- Keyboard shortcuts (Ctrl+1–8, Ctrl+N, Ctrl+,)
- Drag-and-drop file import (spreadsheets, documents, images)
- PDF & DOCX export with templates
- Recurring invoices with auto-generation
- Follow-up reminders for proposals & invoices
- Client metrics & headline tracking
- Gamified achievements system
- Layout density (comfortable / compact)
- Light / dark mode

## License

Proprietary software. Copyright 2026 Decentra. See [LICENSE.md](LICENSE.md).

Free for personal and commercial use. A paid license ($59) removes the launch screen and unlocks all themes immediately.

## Privacy

No telemetry. No analytics. No crash reporting. All data stays local in your SQLite database. The only outbound request is the auto-updater version check. See [PRIVACY.md](PRIVACY.md).
