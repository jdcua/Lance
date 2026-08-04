# Changelog

## [1.2.6] — 2026-08-04
### Added
- Contract PDF and DOCX export via the Contracts screen Export dropdown
- Developer/Engineer dashboard now shows only the Sprint Board widget (removed stray animation "Phases" widget)

### Fixed
- 37 QA bugs resolved, including:
  - Browser/Tauri shim errors and crashes (database, Tauri invoke, client page, sidebar, app init)
  - Negative-value validation on client metrics, invoice line rates, payments, expenses, rate calculator, and proposal rates
  - Time screen timer card stuck on "Stopped" and unbounded minutes input
  - Recurring invoice double-generation guard
  - Finance forecast chart overflow on mobile (390px)
  - Share Proposal/Contract modal dead-end in browser mode
  - Follow-up actions (Mark as Sent / Dismiss / Restore / Send All) now persist
  - Contract template and export template persistence across reloads
  - Empty contract body no longer silently does nothing
  - License key maxLength, profile email validation
  - Auto-backup toggle persistence
  - Client communication timestamps and status dots now show correct values
  - Invoice payment overpayment and uniqueness fixes
  - Contract/export template save-toast now actually persists
  - "Reset All Data" works in browser mode
  - Dashboard phases counter decrements correctly on delete
  - Sessions-this-week metric and ISO date comparisons in the browser SQL shim
### Fixed
- Fixed light/dark mode toggle (moon icon in topbar)
- Fixed auto-backup "no such table: auto_backup_state" error
- Updated brand logo to compass-style icon
- Updated splash screen version display
- Various stability improvements

## [1.1.0] — 2026-06-XX
### Added
- Archetype System 2.0 — 42 profession archetypes with archetype-specific dashboards, sidebar ordering, insights panels, and exclusive features
- Client Portal — shareable proposal and contract links with client acceptance and digital signature
- Invoice Payment Recording — partial payments, payment methods, transaction IDs
- Invoice Aging Report — 30/60/90 day buckets with remaining balance
- Follow-ups Screen — dedicated view for pending, sent, and dismissed follow-ups
- Email integration — mailto: links for follow-ups and invoice reminders
- Finance Forecasting — 6-month revenue and expense projections with scenarios
- Time Heatmap — GitHub-style annual heatmap with streak tracking
- Export Templates — custom PDF/DOCX layouts (unlockable)
- Contract Templates — 6 professional templates (unlockable)
- Compact Layout Density — reduced padding mode (unlockable)
- Accent Color Variants — 8 accent colors (unlockable)
- Project Templates — 6 built-in templates + save your own
- Client CSV Import — bulk import with deduplication and merge
- Proposal Expiry — auto-expire sent proposals after configurable delay
- Multi-currency Invoices — per-client and per-invoice currency override
- Sample Data — optional seeding during onboarding
- Global Search — expanded to include time entries, expenses, and assets
- Duplicate Invoice / Proposal — clone any existing record
- Quick Log modal (Cmd+Shift+L) and timer shortcut (Cmd+Shift+T)
- Auto-updater — silent background updates via GitHub Releases

### Fixed
- Outstanding metric now accounts for partial payments
- Expired proposals excluded from win rate calculation
- Keyboard shortcuts Cmd+1-8 remap dynamically with archetype sidebar order

## [1.0.0] — 2026-XX-XX
### Added
- Initial release
- 7 themes: Default, Studio, Terminal, Craft, Motion, Lens, Scale
- Onboarding flow with profession detection and theme selection
- Dashboard with metrics and quick actions
- Client management with CSV import
- Project management with milestones
- Proposal builder with TipTap rich text editor
- Contract management with digital signature
- Time tracking with timer and manual entry
- Invoice generation with line items
- Finance tracking with expense logging
- AI features — optional, offline, runs locally
- OS dark mode detection on first launch
- Real-time theme switching across the entire app
- Expanded project types: Photography, Video, Animation, SEO, Social
