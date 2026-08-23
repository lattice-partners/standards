# ADR-0011: dev-branch remediation heals an unborn HEAD

**Date:** 2026-08-23
**Status:** Accepted
**Owner:** Darragh Mahns

## Context

A user ran `lattice init`, then `lattice setup`, and hit a flat crash twice in
a row:

```text
git branch dev: fatal: not a valid object name: 'main'
```

Only `lattice doctor` handled the same underlying problem gracefully, with a
Retry/Skip/Exit menu — but Retry just repeated the same doomed command.

ADR-0009 already accepted that `init`'s `bootstrapRepo` may warn and skip the
initial commit, `dev` branch, and hook install when git identity is unset at
scaffold time, rather than aborting the scaffold. That intentionally leaves
`main` with zero commits (an unborn HEAD). Nothing downstream was ever taught
to repair that specific state:

- `createBranch` (`cli/git.js`) runs plain `git branch <name>` with no
  starting point, which fails exactly this way whenever HEAD is unborn.
- `doctor`'s remediation (`cli/fix.js`, `applyFix`'s `git-dev` case) called
  the same `createBranch`, so its Retry option reproduced the identical
  failure instead of fixing anything.
- `setup.js`'s `stepDevBranch` called `git(['branch', 'dev'])` directly,
  bypassing `applyFix`'s try/catch entirely, so the thrown error propagated
  past every catch in `setup()` to the top-level handler and crashed the
  process.

## Decision

`applyFix`'s `git-dev` case makes the missing initial commit first when
`HEAD` doesn't resolve, then creates `dev`. `setup.js`'s `stepDevBranch` no
longer touches git directly; it audits the `git-dev` check and delegates to
`offerFixes`, the same machinery `doctor` and `stepPrerequisites` already
use. `bootstrapRepo` now reports a failed commit and a failed branch
creation as distinct problems instead of one message that may misattribute
which step actually broke.

Separately, `init`'s closing "next steps" box only tells the user to run
`npm run dev` when the scaffolded stack actually ships a `dev` script
(`next-monorepo`); the config-only `minimal` stack, and guest/adopt
projects, no longer see a promise that can't be kept.

## Why

"Create the dev branch" was never actually a branch-creation problem — it
was a missing-commit problem wearing a branch-creation error message. Fixing
it once in `applyFix`, the layer both `doctor` and `setup` already share,
closes the gap for every caller instead of patching `setup.js` and `doctor`
separately and risking them drifting apart again. Routing `setup.js`'s
`stepDevBranch` through the existing `auditDoctor` + `offerFixes` pattern
(already used by `stepPrerequisites`) was chosen over adding a second,
setup-specific recovery UI.

## Consequences

- A project whose initial commit failed during `init` can now fully recover
  through `lattice doctor` or `lattice setup`, without manual git surgery.
- `lattice setup` degrades to the same interactive Retry/Skip/Exit UI
  `doctor` already had for this check, instead of a flat crash.
- The `minimal` stack's onboarding box no longer advises a command that can
  never succeed for that stack.
- `VERSION` advances to 0.7.1.
