# ADR-0009: init produces a working repo

**Date:** 2026-08-20
**Status:** Accepted
**Owner:** Darragh Mahns

## Context

v0.5.0 shipped the Lattice stack, but the path from `lattice init` to a running
project was broken in several ways:

- `npm install` failed on a freshly scaffolded directory because
  `lattice hooks install` returned a non-zero exit code when the target was not
  yet a git repo, or when `core.hooksPath` already pointed elsewhere (for
  example a client repo on Husky).
- `init` did not create a git repository, initial commit, or `dev` branch, so
  `lattice ticket` and the pre-commit branch rules could not work out of the box.
- Inherited git environment variables (`GIT_DIR`, `GIT_INDEX_FILE`, and others)
  could silently override the explicit `cwd` passed to git subprocesses. When a
  hook runs, git sets `GIT_INDEX_FILE=.git/index` as a relative path; if that
  leaks into nested git calls it can corrupt the index in worktree layouts such
  as Conductor.
- Node 20 reached end-of-life in April 2026 while the template still declared
  `engines.node >= 20.9`, and npm 11 was pinned while npm 12 is current.

## Decision

**`hooks install` never fails an install.** When the target is not a repo, or
when `core.hooksPath` already points elsewhere, return 0 with a warning. `check`
and `doctor` still fail when hooks are expected but missing or inactive.

**`init` bootstraps git for greenfield projects.** After scaffolding:

1. `git init -b main` when the directory is not yet a repo.
2. Copy `.env.example` to `.env.local` when the example exists.
3. Initial commit with `--no-verify` and message
   `chore: scaffold from lattice-standards@<version>`.
4. `git branch dev` (stay on `main`).
5. `installHooks` last, so the scaffold commit is not gated.

If git identity is unset, warn and skip steps 3 through 5 rather than aborting
the scaffold. `adopt` is unchanged.

**Scrub inherited git environment** in every `git()` call: delete `GIT_DIR`,
`GIT_WORK_TREE`, `GIT_INDEX_FILE`, `GIT_OBJECT_DIRECTORY`, `GIT_COMMON_DIR`,
`GIT_PREFIX`, and `GIT_CEILING_DIRECTORIES` from child processes.

**One toolchain floor:** `engines.node >= 24`, `.nvmrc` and CI on Node 24 (active
LTS), `devEngines.packageManager` npm `^12` with `onFail: error`, and `doctor`
checks npm major before `npm install`.

## Consequences

- A greenfield `lattice init` yields a repo ready for `npm install`, `lattice
  ticket`, and `lattice doctor` without manual git steps.
- Client repos already on Husky keep their hooks path; `npm install` succeeds.
- Projects must run on Node 24+; CI and `.nvmrc` target the active Node 24 LTS.
- The standards repo itself re-enables hooks with env scrubbing in place; if
  index corruption reproduces in Conductor worktrees, the local gate may be
  narrowed to `lint:md` only rather than shipping an unsafe hook.
