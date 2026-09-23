# Lance Architecture

## Tech stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Tauri 2 (Rust) |
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| State management | Zustand |
| Database | SQLite (via `rusqlite`, bundled) |
| Rich text editor | TipTap (ProseMirror) |
| PDF generation | @react-pdf/renderer |
| DOCX generation | `docx` (npm) |
| DOCX parsing | Mammoth |
| Spreadsheet parsing | `xlsx` (SheetJS) |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| Client portal server | Axum 0.7 (local-only HTTP) |
| Auto-updater | Tauri updater plugin |
| License validation | HMAC-SHA256 in Rust |

## Directory structure

```
lance/
├── src/                         # Frontend (React + TypeScript)
│   ├── App.tsx                  # Root component, background engines, changelog
│   ├── main.tsx                 # React mount point
│   ├── router.tsx               # Route definitions (17 routes, lazy-loaded)
│   ├── index.css                # Global Tailwind styles
│   ├── archetypes/              # 42 profession archetype configs + registry
│   ├── components/
│   │   ├── ui/                  # Shared UI components (21 components)
│   │   ├── layout/              # Sidebar, Topbar, AIBar
│   │   ├── features/            # Archetype-specific feature panels
│   │   └── ShareModal.tsx       # Client portal sharing UI
│   ├── screens/                 # Route-level page components (17 screens)
│   ├── store/                   # Zustand state (index.ts: 25+ slices, toastStore.ts)
│   ├── types/                   # TypeScript domain types
│   ├── db/                      # Frontend database layer
│   ├── utils/                   # Utilities (engines, backup, seed data, formatting)
│   ├── lib/                     # Libraries (auth, currency, forecast, heatmap)
│   ├── hooks/                   # React hooks (auto-updater)
│   ├── themes/                  # Theme system (7 themes + profession mapping)
│   ├── achievements/            # Achievement definitions + checker
│   ├── export/                  # PDF/DOCX export templates
│   ├── import/                  # File import & parsing (CSV, DOCX, images)
│   ├── ai/                      # Local AI features (disabled in v1)
│   └── license/                 # License key validation (frontend side)
├── src-tauri/                   # Backend (Rust + Tauri)
│   ├── src/
│   │   ├── main.rs              # Entry point
│   │   ├── lib.rs               # App bootstrap, plugin init, 73 command handlers
│   │   ├── db.rs                # SQLite connection + full schema migration
│   │   ├── server.rs            # Axum client portal HTTP server
│   │   ├── error.rs             # LanceError enum
│   │   └── commands/            # 15 command modules
│   │       ├── clients.rs       # Client CRUD
│   │       ├── projects.rs      # Project + milestone CRUD
│   │       ├── proposals.rs     # Proposal CRUD + expiry
│   │       ├── contracts.rs     # Contract CRUD
│   │       ├── time.rs          # Time entry CRUD
│   │       ├── invoices.rs      # Invoice + payment + recurring CRUD
│   │       ├── finance.rs       # Expense + user profile CRUD
│   │       ├── communications.rs
│   │       ├── imports.rs       # File import, assets, attachments
│   │       ├── metrics.rs       # Metric definitions, values, templates
│   │       ├── follow_ups.rs    # Follow-up log + pending follow-ups
│   │       ├── sharing.rs       # Share tokens, portal activity
│   │       ├── mailto.rs        # System mailto: link handler
│   │       ├── archetypes.rs    # Archetype-specific data (renders, sessions, shoots, etc.)
│   │       └── license.rs       # License key validation (HMAC-SHA256)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── scripts/                     # Build & release scripts
├── docs/                        # Documentation
├── .github/workflows/           # CI/CD (ci.yml, release.yml, deps.yml)
└── landing/                     # Landing page
```

## Data flow

1. **User interacts** with a React component (e.g., clicks "Save" on `Clients.tsx`)
2. **Component calls** a Zustand store action (e.g., `useStore().addClient(data)`)
3. **Store action** calls a Tauri invoke command: `invoke('create_client', { data })`
4. **Tauri routes** the invoke to the registered Rust handler in `lib.rs`
5. **Rust command** opens a SQLite connection, executes a parameterized query
6. **Rows returned** to the Rust handler, deserialized into typed structs
7. **Result sent back** via Tauri IPC to the frontend
8. **Store updates** its state with the result; React re-renders affected components

```
User Action → React Component → Zustand store → Tauri invoke
    → Rust command → SQLite → Rust response
    → Store setState → React re-render
```

Background engines (recurring invoices, follow-ups, expiry, updater) bypass the user action step and run on timers in `App.tsx`.

## Archetype system

The archetype system is **config-driven**. No archetype-specific logic is hardcoded into app components. Each archetype is a TypeScript file exporting an `ArchetypeConfig` object that defines:

- **Metadata**: emoji, tagline, description, psychographic profile
- **Dashboard**: ordered list of metric cards displayed on the dashboard
- **Sidebar**: ordered list of navigation items (can reorder/hide compared to default)
- **Insight panels**: which insight widgets to show
- **Archetype features**: profession-specific panels (render log, shoot log, build log, etc.)
- **Proposal types**: suggested proposal templates for this profession
- **Theme**: preferred theme and accent color
- **Keyboard shortcuts**: Cmd+1-8 dynamically remap based on sidebar order

The `ArchetypePicker` screen during onboarding selects an archetype. The `getArchetype(id)` function returns the config object. Components query the archetype config for their rendering decisions. For example, `Sidebar.tsx` reads `archetype.sidebar` to determine item order and visibility.

**File count**: 42 profession files + `default.ts` + `custom.ts` + `registry.ts` + `types.ts` = 47 files.

## Database schema

All tables use `CREATE TABLE IF NOT EXISTS`. Migrations are inline in `src-tauri/src/db.rs`.

| Table | Description |
|-------|-------------|
| `clients` | Client records (name, email, phone, company, notes, preferred_currency) |
| `projects` | Projects with client FK, status, dates, budget, color |
| `milestones` | Project milestones with optional auto-invoice on completion |
| `proposals` | Proposals with client/project FK, status, scope, timeline, rate, body |
| `contracts` | Contracts with client/project/proposal FK, status, body, signed_at |
| `time_entries` | Time tracking entries with project/client FK, durations, billable flag |
| `invoices` | Invoices with client FK, line items (JSON), status, totals, currency |
| `invoice_payments` | Partial payments against invoices with method, transaction_id |
| `expenses` | Business expenses with category, amount, date, notes |
| `recurring_invoices` | Recurring invoice templates with cron-like scheduling, next_due |
| `communications` | Client communication log (emails, calls, meetings) |
| `follow_up_log` | Follow-up tracking for sent proposals and overdue invoices |
| `follow_up_settings` | User's follow-up timing preferences |
| `share_tokens` | Client portal tokens with view counts and client responses |
| `portal_activity` | Client portal view/response event log |
| `metric_definitions` | Dashboard metric schemas (domain-specific: renders, sessions, etc.) |
| `metric_values` | Time-series metric data points |
| `metric_templates` | Reusable metric templates |
| `user_profile` | Single-row user profile (name, company, currency, default VAT rate, etc.) |
| `achievements` | Unlocked achievement tracking |
| `export_templates` | User-defined PDF/DOCX export layouts |
| `contract_templates` | Saved contract templates |
| `project_templates` | Saved project structures with milestones |
| `attachments` | File attachments linked to entities |
| `import_log` | Audit log of CSV/client imports |
| `app_events` | Audit trail (e.g., `update_applied` events) |
| `auto_backup_state` | Backup state tracking (last backup time, path) |
| `archetype_render_log` | Video/3D render entries |
| `archetype_sessions` | Session tracking (tutoring, coaching, etc.) |
| `archetype_shoots` | Photography/video shoot logs |
| `archetype_revisions` | Designer revision tracking |
| `archetype_builds` | Developer build logs |
| `archetype_keywords` | SEO keyword tracking |
| `archetype_datasets` | Data analyst dataset tracking |
| `schema_version` | Migration version tracking |

## Background engines

All engines run from `src/App.tsx` using `requestIdleCallback` and `setInterval`:

| Engine | Trigger | Interval | What it does |
|--------|---------|----------|-------------|
| Recurring invoice generator | On mount + data load | One-time | Generates invoices from `recurring_invoices` when `next_due <= now`, with catch-up logic (max 3 cycles) |
| Auto-backup | On mount | One-time | Creates JSON backup to configured path, keeps last 10 |
| Follow-up checker | On mount | Every 30 min | Scans sent proposals and overdue invoices, creates `follow_up_log` entries from templates |
| Proposal expiry engine | On mount | Every 1 hour | Marks sent proposals as `expired` if `expires_at <= now` |
| Auto-updater | On mount | Every 4 hours | Checks GitHub Releases for updates via Tauri updater plugin |
| Achievement checker | After initial load | One-time | Checks unlocked achievements, shows toasts |

**Engine utility files**:
- `src/utils/recurringEngine.ts`: next_due calculation, cycle counting, catch-up cap
- `src/utils/followUpTemplates.ts`: 6 default templates with variable substitution, mailto: generation
- `src/hooks/useAutoUpdater.ts`: Tauri updater plugin integration with 4-hour check interval

## Client portal architecture

The client portal allows freelancers to share proposals and contracts with clients via a local HTTP server.

```
┌──────────────────┐     share link      ┌──────────────┐
│  Lance Desktop   │ ←────────────────── │  Client       │
│  App (running)   │ ──────────────────→ │  Browser      │
│                  │   127.0.0.1:PORT     │              │
│  ShareModal.tsx  │                     │  View/Accept  │
│      ↕           │                     │  Decline/Sign │
│  commands/       │                     │              │
│  sharing.rs      │                     └──────────────┘
│      ↕           │
│  share_tokens    │
│  table           │
└──────────────────┘
```

**How it works**:
1. User clicks "Share" on a proposal or contract → `ShareModal.tsx` calls `create_share_token`
2. Backend generates a 64-char hex crypto-random token, stores it in `share_tokens`
3. The share link is `http://127.0.0.1:{port}/share/{token}`. It works only while Lance is running
4. Client opens the link → Axum server at `src-tauri/src/server.rs` renders the HTML
5. Client can accept/decline proposals or sign contracts
6. Responses update `share_tokens` and the entity status (proposal accepted, contract signed)

**Security** (server.rs):
- Rate limiting: 60 requests/min per token
- Token-failure lockout: 10 failed token lookups per source IP = 5-minute ban
- 30-second request timeout per connection
- Security headers: X-Frame-Options: DENY, CSP, X-Content-Type-Options
- HTML sanitization via `ammonia` crate (strips script, style, iframe, object, embed, form, input, a tags)
- Portal POST endpoints require `X-Lance-Client: portal` header

## Security model

See `docs/SECURITY.md` for the full threat model and mitigations.

Key design decisions:
- License validation runs in compiled Rust (not extractable from JS bundle)
- All database queries use parameterized statements (no SQL injection)
- Asset file operations use canonical path validation (no path traversal)
- CSV imports strip formula injection characters (=, +, -, @)
- Client portal runs on 127.0.0.1 only (no external network exposure)

## Routes

| Path | Screen | Description |
|------|--------|-------------|
| `/` | Dashboard | Main dashboard with metrics and quick actions |
| `/archetype` | ArchetypePicker | Profession/archetype selection |
| `/proposals` | Proposals | Proposal list and management |
| `/proposals/new` | NewProposal | Proposal editor |
| `/contracts` | Contracts | Contract list and management |
| `/projects` | Projects | Project list with milestones |
| `/time` | Time | Time tracking with timer |
| `/invoices` | Invoices | Invoice list, creation, payments |
| `/clients` | Clients | Client CRM |
| `/finance` | Finance | Expense tracking and forecasting |
| `/insights` | Insights | Archetype-specific insights panels |
| `/follow-ups` | FollowUps | Pending/sent/dismissed follow-ups |
| `/settings` | Settings | User preferences, license, backups |
| `/achievements` | Achievements | Achievement gallery |
| `/assets` | Assets | File and attachment management |
| `/search` | Search | Global search across all entities |

All routes are lazy-loaded via `React.lazy` with a loading skeleton fallback.

## V2 roadmap

Foundations laid in v1:
- `auth.ts` stub module: all identity queries route through `auth.getUserId()`
- `user_id INTEGER DEFAULT 1` column added to all tables
- `app_events` audit trail table created
- Sensitive fields annotated with `-- SECURITY: encrypt with user key in v2`
- CSP includes `connect-src` for external APIs

Planned for v2:
- Supabase Auth (JWT, magic link, OAuth)
- PostgreSQL migration (with row-level security)
- End-to-end encryption for sensitive fields before cloud sync
- Multi-device sync via Supabase
- Rate limiting on cloud API endpoints
- GDPR compliance (data export and deletion)
- Full audit log for all data mutations
- Internationalization (i18n)
