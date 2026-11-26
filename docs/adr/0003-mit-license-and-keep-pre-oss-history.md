# ADR-0003: MIT license; preserve pre-OSS tags and history

Status: Accepted
Date: 2026-11-25
Deciders: project owner

## Context

The project is MIT licensed. Research decided against a CLA, dual licensing and
a DCO requirement today, and explicitly skipped a history rewrite or tag
deletion. Sixteen old tags (`v0.9.0`–`v0.9.9-5`, `v1.1.0`–`v1.2.6`) still point
at the pre-OSS commercial lineage containing the deleted `landing/`, `promo/`
and `license-worker/` trees. A full scan found no live credentials, so the owner
decided to keep everything. A rewrite would break SHAs, tags, forks and CI pins
without purging cached blobs, and removal of history is a non-goal.

## Decision

MIT stays; tags and history stay untouched. Gitleaks in CI, with a pinned
version and a narrow false-positive allowlist, is the control, and private
vulnerability reporting is enabled.

## Consequences

The paid past remains publicly discoverable. The only trigger to revisit this
decision is discovery of a real secret, in which case rotate the credential
first.
