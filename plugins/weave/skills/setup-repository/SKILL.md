---
name: setup-repository
description: Inspect a repository, establish or respect AGENTS.md, and use the Lattice CLI only when the project already opted into vendored Lattice tooling. Use at kickoff, when onboarding a repo in Cursor, or when asked to set up Lattice.
---

# Setup a repository

Inspect first. Do not assume the project wants the Lattice CLI.

## Preflight

1. Read `AGENTS.md` or `CLAUDE.md` if either exists.
2. Note engagement posture (`greenfield` vs `consultative-guest`).
3. Check for `.lattice/` (vendored standards) and `.lattice/hooks/` (Git hooks).
4. Check for a tracker line (`Tracker: MIN`) and a Lattice stack line.
5. Check `package.json`, `apps/`, and `supabase/` only to understand the repo.

## Decision

- **`.lattice/` is present.** The project already opted in. Use the Lattice
  CLI (`lattice doctor`, `lattice setup`, `lattice sync`, `lattice check`)
  when those commands will help. Do not re-run `lattice init`.
- **No `.lattice/`.** Treat this as a guest repo. Establish or augment
  `AGENTS.md` if missing or incomplete. Do **not** run `lattice init` or
  `lattice adopt` unless a human explicitly asks to vendor Lattice. Do not
  overwrite existing `AGENTS.md`, lint config, or CI.
- **Brownfield / consultative guest.** Adapt to client conventions. Hold new
  code you author to the Lattice bar. Deliver a gap report instead of
  imposing tooling.

## Action

1. If `AGENTS.md` is missing and the human wants project instructions, draft
   one from the portable core composition block. Pin the standards version
   only if they opted in.
2. If `.lattice/` exists and setup is incomplete, run `lattice doctor` and
   then `lattice setup` in this session. Verify each step. Do not send the
   person to another terminal to paste commands.
3. If Git hooks should be on and `.lattice/hooks` exists, `lattice doctor`
   will say whether `core.hooksPath` is set. Do not force hooks onto a repo
   that already uses Husky or another `core.hooksPath`.

## Verification

- `AGENTS.md` exists or you reported why it does not.
- You did not vendor Lattice into a repo that had not opted in.
- If the CLI ran, `lattice doctor` was re-checked after remediations.

## Summary

State posture, whether `.lattice/` is present, what you ran, and what is
still on the human (browser-only provider steps).
