# ADR-0007: enforce the standard locally, and constrain the agent mechanically

**Date:** 2026-08-19
**Status:** Accepted
**Owner:** Darragh Mahns

## Context

Until now the standard was enforced only by `ci/actions/standards-check` after a
push. Two things changed that calculus.

First, feedback arrives too late. A developer learns their commit message was
wrong, or their formatting was off, minutes after pushing, on a different
screen. Actions minutes are also metered per private client repo, and we run
many of them.

Second, and more important: the people writing code are increasingly
non-technical teammates directing an AI coding agent. They cannot read a diff
and tell whether it is safe. The two failure modes that matter most with our
stack are both invisible in review:

- A secret placed in a `NEXT_PUBLIC_*` variable. Next.js inlines those into the
  client bundle, so a Supabase secret key there hands every visitor full
  read/write access past RLS.
- An agent "fixing" a permission error by disabling RLS or switching to the
  secret key. This makes the error go away, which is exactly why an agent
  reaches for it, and the operator sees only that it now works.

Neither is caught by asking people to be careful.

## Decision

Move enforcement to the developer's machine, and make the dangerous things
impossible rather than discouraged.

- **Git hooks are the primary gate.** Hook scripts are vendored into
  `.lattice/hooks/` and `core.hooksPath` points at them, so hooks version and
  update through `sync` exactly like the standards docs. A `prepare` script
  installs them on `npm install`.
- **pre-commit runs everything**: branch naming, secret scanning, the
  `NEXT_PUBLIC_` leak check, migration safety, formatting, lint, typecheck, and
  tests. Turborepo's cache and `--filter=...[HEAD]` keep it fast enough to
  survive.
- **commit-msg enforces the written rules** from ADR-0001, ADR-0002 and
  ADR-0003, including the ban on AI-attribution trailers. These were prose an
  agent was asked to follow; now they are checked.
- **Destructive migrations require an explicit marker.** `drop table`,
  `drop column`, `truncate` and `disable row level security` are blocked unless
  the file carries `-- lattice:destructive-approved`.
- **CI narrows** to pushes on `main` and `dev` plus release tags. It is the
  backstop, not the gate.
- **`core/agent-safety.md`** is vendored into every project: never disable RLS or
  reach for the secret key to clear a permission error, never run destructive SQL
  without approval, never put a secret in a public variable, stop and ask rather
  than guess.
- **`.claude/settings.json` ships with every scaffold**, denying the irreversible
  commands outright, setting `disableBypassPermissionsMode`, and clearing the
  commit and pull-request attribution trailers at source.
- **Cursor Agent is a later, separate layer** (ADR-0013). Weave hooks constrain
  Cursor Agent only. They do not replace these Git hooks.
- **`lattice doctor` and `lattice verify`** give a non-technical operator a way
  to answer "is my machine set up?" and "is this safe to ship?" without reading
  code.

## Why

- Hooks catch mistakes while the context is still in the developer's head, and
  cost nothing per run.
- Vendoring the hooks rather than using Husky keeps the zero-dependency posture
  from ADR-0004 and, more usefully, means a hook improvement made here reaches
  every client project through `sync`.
- `permissions.deny` beats `permissions.ask` for irreversible operations. A
  prompt only protects someone who can evaluate what they are approving, and the
  people this is designed for will approve it.
- Prettier autofixes and re-stages because formatting is deterministic. ESLint
  only reports, because an autofix can change behaviour and the operator would
  not notice.

## Consequences

- `VERSION` bumped to 0.5.0.
- Committing is slower. Measured on the generated scaffold, for a change inside
  a workspace package: 10.8s cold, 4.5s warm. A change outside every package
  runs no tasks and returns immediately. Watch this number as real test suites
  grow; if a warm run stops feeling fast, move `test` to pre-push rather than
  letting people learn `--no-verify`.
- `check` now fails when `core.hooksPath` is unset or a vendored hook was edited.
- `hooks install` refuses to run when `core.hooksPath` already points elsewhere,
  so adopting into a repo already on Husky does not silently break it.
- `adopt` never installs hooks. Guest repos opt in explicitly, per
  `core/working-agreement.md`.

### Accepted risks

These were decided deliberately. They are recorded so the next person does not
mistake them for oversights.

1. **Agents and laptops hold full production credentials**, gated by permission
   prompts rather than withheld. Mitigation: the genuinely irreversible commands
   are in `deny`, not `ask`, and Supabase point-in-time recovery is a mandatory
   setup step. Backups are the real undo here.
2. **`main` accepts direct commits** (intended for hotfixes only; normal work
   flows through `dev` per ADR-0008). Mitigation: Vercel production deploys
   require manual promotion, so a commit landing on `main` is not automatically
   live for users.
3. **No error tracking and no spend caps.** Nothing reports a broken production
   or a runaway bill. Added per client when an engagement warrants it.
