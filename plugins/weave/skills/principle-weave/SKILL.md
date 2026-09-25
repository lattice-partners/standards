---
name: principle-weave
description: Read weave.md and the AGENTS.md Weave block; follow principle-process.
alwaysApply: true
---

# Weave

Weave is Lattice's engineering standard in Cursor. Principle skills, task skills,
and commands live in the Weave plugin. There is no CLI and no vendored `.lattice/`
copy.

## On every project

1. Read root `weave.md` if it exists. No file means full Lattice defaults and no
   recorded opt-outs.
2. Read the marked Weave block in root `AGENTS.md` (`<!-- weave:start -->` …
   `<!-- weave:end -->`) for components, verification, prerequisites,
   boundaries, and project notes.
3. Follow `principle-process` for task protocol, risk, and definition of done.
4. Apply all other always-on principles. Apply `principle-demo` when the user
   asks for a mock-up or when Weave notes say the repo is a demo prototype.
5. Respect opt-outs in `weave.md` for Supabase, Clerk, Vercel, and Lattice
   Design. Missing `opt-out` key (older files) means none opted out. `opt-out:
   none` means the same.
6. Use task skills when the work matches: Lattice stack setup, Lattice Design,
   UI variants.
7. Never report work complete when required verification cannot run.

Regular feature agents must not edit `weave.md` or the marked Weave block. If
either is stale, propose a specific correction. Apply corrections only through
`/setup-weave` after human approval.

If `weave.md` is missing, say so. Apply Lattice principles and defaults, but do
not invent repository-specific commands, permissions, or verification methods.

## weave.md

Short Weave config only: repo type, opt-outs (always explicit when set up via
`/setup-weave`), and Weave-only notes. Not architecture docs. Run `/setup-weave`
to create or update it and the AGENTS.md block.

## AGENTS.md Weave block

Between `<!-- weave:start -->` and `<!-- weave:end -->` in root `AGENTS.md`:

- **Components** — path, type, runtime, install/build, start, test environment,
  verification methods (with expected results and evidence), verification gaps.
- **Shared prerequisites** — package manager, runtimes, services, env var names,
  fixtures.
- **Boundaries** — actions that need human approval.
- **Notes** — boot, architecture, copy, framework rules, and other facts to run
  the code (not Weave opt-outs; those stay in `weave.md`).

Only `/setup-weave` may replace this block. Preserve all other `AGENTS.md` content.

## Repo types

**Lattice-owned** — apply our full stack unless opted out in `weave.md`.

**Client existing** — adapt to their conventions for existing code. No mass
reformat. Hold new code you write to the Lattice bar. Augment existing
`AGENTS.md` with the marked Weave block; never overwrite unrelated content.

## Enforcement

Weave does not run at `git commit` time. Use `/review-weave` before shipping for
a manual audit. Agents may commit and push when work is ready. Never
`--force`, `--no-verify`, or `--skip-checks`. Never commit secrets or `.env`
files.

## When unsure

Ask on business logic, UX choices, third-party selection, real user data, money,
or security. A wrong assumption that ships is harder to undo than a question.
