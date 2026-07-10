# ADR-0002: No em dashes or emojis in written output

**Date:** 2026-06-30
**Status:** Accepted
**Owner:** Darragh Mahns

## Context

Lattice work had no stated convention on em dashes or emojis. Both leak into
agent-authored code, docs, and commit messages by default, and em dashes in
particular are a common tell of unedited machine output. House preference is to
avoid both, but the rule lived nowhere agents would read it.

## Decision

No em dashes and no emojis in any Lattice written output: code, comments, docs,
commit messages, PR descriptions, and chat. Use hyphens, commas, colons, or
parentheses in place of em dashes; use plain text in place of emojis. The rule
lives in the **Writing style** section of `agents-base.md`, which is vendored
into every project.

## Why

- Agents follow only what is vendored into the repo they work in; the rule has
  to live in `agents-base.md` to take effect across engagements.
- One home keeps the duplication this repo exists to prevent at bay.
- A single mechanical rule (no em dashes, no emojis) is trivial to apply and to
  enforce later in CI.

## Consequences

- Rides in the unreleased `VERSION` 0.3.0 (additive standard change).
- Existing em dashes were stripped from this repo's core and docs so the
  standard complies with itself.
- Existing client repos pick up the rule when they re-vendor to base@0.3.0.
- Future option: enforce in CI (a lint rule rejecting em dashes and emojis in
  tracked text) once the Phase 2 CI pipeline exists.
