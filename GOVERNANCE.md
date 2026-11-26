# Governance

Lance is currently led by a single maintainer using a **BDFL** (benevolent
dictator for life) model: the maintainer makes final decisions on scope,
architecture and releases. This is documented here so contributors know how
decisions are made and how that can change as the project grows.

## Roles

- **Contributor** — anyone who opens an issue, documentation change, test or
  pull request. No formal process is required.
- **Reviewer** — a contributor with a track record of sound, behavior-preserving
  changes who is invited to review pull requests in a domain.
- **Maintainer/committer** — a contributor trusted with merge access, nominated
  by the BDFL after sustained contribution.

## Decision making

- Small, reversible changes: make the change in a pull request using the
  template; the maintainer or a reviewer approves it.
- Changes that affect the data model, IPC contract, store shape or public API:
  open an issue first. These are the stable seams described in
  `docs/ARCHITECTURE.md`; changes there need explicit agreement.
- Disagreements are settled by the BDFL after discussion. Technical decisions
  that outlive a pull request should be recorded as an ADR in
  [`docs/adr/`](docs/adr/) and linked from the relevant code or PR.

## Joining as a maintainer

There is no fixed quota. Demonstrate good judgment by:

1. landing several small, behavior-preserving changes;
2. reviewing others' work constructively;
3. following `AGENTS.md` and `STANDARDS.md`, including characterization tests
   before legacy refactors;
4. helping triage issues or improving documentation.

After that, open an issue to discuss it, or simply ask.

## Project continuity

The long-term goal is a GitHub Organization with a backup administrator and
protected `main` branch, so the project survives the maintainer being away.
Until then, the repository owner is the admin. Consider a fiscal sponsor or
foundation only if donations or corporate contributions materialize; no legal
entity is required for the project to remain MIT licensed and open.

## Code of Conduct

All participants are covered by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
Enforcement follows the tiers documented there.
