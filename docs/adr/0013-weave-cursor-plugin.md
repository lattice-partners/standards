# ADR-0013: Weave Cursor plugin as a second distribution channel

**Date:** 2026-09-11
**Status:** Accepted
**Owner:** Darragh Mahns

## Context

Lattice standards reached agents through files vendored into `.lattice/` and
through Git hooks that run on commit. That path still matters: it works for
every editor, CI, and person who commits from a terminal.

Cursor is now the team's primary agent harness. Cursor loads skills, rules,
commands, agents, and hooks from plugins, not from `.lattice/`. Leaving the
standard only in vendored markdown meant Cursor Agent saw it only if a project
had already run `lattice init` or `adopt`, and even then the Git hooks never
ran until a commit. Dangerous shell commands and secret-file reads inside
Cursor were unguarded until then.

Rules and skills cannot replace Git `pre-commit` and `commit-msg`. Cursor
hooks cover Cursor Agent only. Commits from a terminal, CI, the web editor,
or another agent never see them.

## Decision

Keep a hybrid repository with two distribution channels and one source of
truth.

- **Canonical prose** stays in `core/*.md` and `stack/stack-baseline.md`.
- **Weave** is a self-contained Cursor plugin at `plugins/weave/`, exposed by
  the private marketplace at `.cursor-plugin/marketplace.json`.
- Plugin rules are generated from named sections of the canonical markdown.
  Editing a generated `.mdc` by hand is a defect; `scripts/build-weave.mjs`
  is the write path.
- **Cursor hooks** deny force-push, hook bypass, `supabase db reset`,
  production Vercel deploys, and reads of real `.env` / production credential
  files. They inject session context. They fail closed for those security
  pre-hooks.
- **Git hooks remain the commit gate.** Secret scanning, RLS and migration
  checks, formatting, lint, typecheck, tests, branch naming, and commit-message
  validation stay in the existing Git hooks. Weave does not reimplement them.
- The CLI, scaffolds, and CI stay. The setup skill uses the CLI only when the
  project already opted into vendored Lattice (`.lattice/` is present). It
  does not force `lattice init` on a brownfield repo.

## Why

- Cursor needs first-class skills and in-agent guardrails. The CLI cannot
  provide those.
- Generating rules from `core/` prevents the plugin from drifting from the
  standard every other tool still reads.
- Git hooks are the only gate that sees the staged tree and the actual commit
  message, regardless of which tool authored them. Replacing them with Cursor
  hooks would leave every other path unenforced.
- Keeping both channels in this repo lets one `VERSION` and one set of ADRs
  describe the standard, the plugin, and the CLI together during the
  migration.

## Consequences

- `VERSION` bumped to 0.8.0.
- Installing Weave for the team is a Cursor marketplace import of this GitHub
  repository, not an npm publish. Start Default Off, promote to Required after
  a pilot. Auto Refresh needs the Cursor GitHub App. Reindex at most once per
  ten minutes. There is no documented immutable per-user version pin.
- Changing `core/` or `stack/stack-baseline.md` requires regenerating Weave
  rules and running `npm test`, which now includes plugin validation and hook
  tests.
- Brownfield Cursor users can load Weave without vendoring `.lattice/`. Git
  hook enforcement still requires `lattice hooks install` or a full init.
