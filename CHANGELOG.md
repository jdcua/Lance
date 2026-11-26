# Changelog

All notable changes to this project are documented here. This format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Open-source release under the MIT license.
- Release notes and update checks now use the public GitHub repository.
- `SUPPORT.md`, `GOVERNANCE.md`, third-party notices and bundled font licenses.
- CI enforces the OSS audit, complexity and strict boundary gates.

### Changed

- Documentation, standards and agent instructions reconciled with the code.
- Focused feature work goes in `src/components/features/`; the dead
  `src/features/<domain>/` rule was retired.

### Removed

- License keys, trials, paywalls, checkout and all gating infrastructure.
- Marketing site, promotion campaigns and payment-specific legal drafts.

## [0.9.9-5] - 2026-10-23

### Added

- All features available in every build: forecasts, CSV exports, change orders,
  smart reminders, proposal radar and retainer burn-down.
- Browser trial, portable attachment bytes in backups and test mode.

### Changed

- Glass-chrome redesign with near-solid content surfaces and seven themes.
- Recurring invoices, bank CSV import, client portal share links and local backups.
- Onboarding presets instead of profession-specific configurations.

## [0.9.3] - 2026-09-07

### Added

- Unified Zustand store, command registry and generic record tracker.
- PDF/DOCX export, templates and follow-up drafts.

[Unreleased]: https://github.com/jdcua/Lance/compare/v0.9.9-5...HEAD
[0.9.9-5]: https://github.com/jdcua/Lance/compare/v0.9.3...v0.9.9-5
[0.9.3]: https://github.com/jdcua/Lance/releases/tag/v0.9.3
