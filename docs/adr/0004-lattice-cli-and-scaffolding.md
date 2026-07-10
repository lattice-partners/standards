# ADR-0004: lattice CLI, stack configs, and CI scaffolding

**Date:** 2026-07-10
**Status:** Accepted
**Owner:** Darragh Mahns

## Context

The standard was distributable only by hand: copying `core/` docs into each
project and editing `AGENTS.md`. The README promised a `lattice` CLI and
`stack/`, `ci/`, `templates/` directories, but all were empty stubs. Teams had
no repeatable way to start a project on the standard or to pull updates.

## Decision

Ship the tooling that makes the standard self-serve:

- **`lattice` CLI** (`cli/`) with `init`, `adopt`, `sync`, `check`. It vendors
  `core/` docs into a project's `.lattice/`, writes an `AGENTS.md` carrying a
  marker-delimited `<!-- lattice:standards -->` block, and symlinks `CLAUDE.md`.
  `sync` re-vendors to the installed version; `check` reports drift and exits
  non-zero for CI. Zero runtime dependencies.
- **Rich terminal UI**, hand-rolled (no dependencies): the Lattice hand logo
  traced from the brand wordmark, an interactive wizard (`init`/`adopt` prompt
  for missing values, `lattice` alone shows a menu), spinners, and a summary
  box. Everything degrades to plain, promptless output when stdout is not a TTY,
  so CI is unaffected. `NO_COLOR` and `LATTICE_ASCII` opt out of color/Unicode.
- **Distribution via npm from a git tag.** Projects run
  `npm i -D github:lattice-partners/standards#v<tag>`; the CLI copies the
  `core/` bundled in that installed version. npm handles pinning; no registry
  publish needed.
- **Stack configs** (`stack/`): shared flat ESLint and Prettier config that a
  project inherits by re-exporting from `@lattice/standards/stack/...`.
- **CI** (`ci/`): a `standards-check` composite action and a template workflow.
  `lattice init` lays the workflow down for greenfield projects, pinned to the
  standard version.
- **Greenfield template** (`templates/greenfield/`): tsconfig, eslint/prettier
  re-exports, and gitignore that `init` scaffolds for greenfield projects only.
  Brownfield `adopt` never imposes stack config.

## Why

- Agents and humans follow what is vendored into the repo they work in; a CLI
  that vendors and updates that content is the mechanism the standard needs.
- npm-from-git-tag reuses existing pinning and install tooling rather than
  inventing a sync protocol.
- Stack and CI inherited by re-export keep one canonical config; projects do not
  copy and drift.

## Consequences

- `VERSION` bumped to 0.3.0. The intermediate 0.2.0 (ADRs 0001-0003) was never
  released; those rules ship together with this tooling as 0.3.0.
- Requires a git remote at `lattice-partners/standards` with a `v0.3.0`
  tag before any project can install. The slug is hardcoded in `cli/lib.js`.
- `.lattice/` is CLI-managed; hand-edits are reported as drift by `check`.
- Stack configs assume the consuming project installs the peer devDependencies
  (typescript, typescript-eslint, eslint, prettier).
- Still stubbed: brownfield stack adoption beyond the CLI overlay, and richer
  templates. Add when an engagement needs them.
