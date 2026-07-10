# ADR-0001: Adopt Conventional Commits

**Date:** 2026-06-25
**Status:** Accepted
**Owner:** Darragh Mahns

## Context

Commit messages across Lattice projects had no shared format. The standard's
commit discipline lived only in `working-agreement.md`, which agents working in
client repos never read - they only read the vendored base block
(`agents-base.md`), which carried no commit rules at all. Conventions reached
agents only by being hand-copied into each project (as happened in radar).

## Decision

Adopt [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
as the commit-message standard for all Lattice projects. The operative commit
standard (format, atomic commits, no AI attribution, agents-never-commit) now
lives in a single home - the **Commits** section of `agents-base.md`, which is
vendored into every project. `working-agreement.md` points to it rather than
restating it.

## Why

- Agents follow only what is vendored into the repo they work in; the rule has
  to live in `agents-base.md` to take effect.
- One home for commit discipline kills the duplication this repo exists to
  prevent - `working-agreement.md` referencing the base instead of restating it.
- Conventional Commits is widely tooled (changelog generation, semver
  automation) and machine-parseable, which matters as agents author commits.

## Consequences

- `VERSION` bumped 0.1.0 -> 0.3.0 (additive standard change).
- Existing client repos (mindie, radar) re-vendored to base@0.3.0 by hand -
  the manual form of the future `lattice sync`.
- Projects that pin 0.1.0 are unaffected until they sync.
- Future option: enforce the format in CI (commitlint) once the Phase 2 CI
  pipeline exists.
