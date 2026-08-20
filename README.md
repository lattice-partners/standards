# lattice-standards

The paved road for Lattice consulting projects: the shared engineering
standards, AI-agent instructions, CI/CD, and scaffolding that every project
inherits. Projects pin a versioned release and pull updates on their own cadence.

New here? Read [how it works](docs/how-it-works.md) for the full model. This
README is the practical guide: how to use it in a project, and how to change the
standard itself.

---

## Use it in a project

### Install

Get the `lattice` command on your PATH:

```bash
npm i -g github:lattice-partners/standards#v0.5.0
```

Or skip the install and prefix any command with
`npx github:lattice-partners/standards#v0.5.0`.

### Set up a project

New (greenfield) project - Lattice owns the stack:

```bash
lattice init my-app
cd my-app
npm install
```

That scaffolds the full Lattice stack: an npm workspaces monorepo with
`apps/web` (Next.js, Tailwind, shadcn/ui) and `apps/api` (Next.js route
handlers), Supabase with RLS, Clerk, and Vercel config. The standards pin is
already in the generated `package.json`, and `npm install` switches the git
hooks on.

For a library or service that is not a web app, use the config-only scaffold:

```bash
lattice init my-lib --stack=minimal
npm i -D github:lattice-partners/standards#v0.5.0   # pin it for the project and CI
```

Existing (client) repo - non-destructive overlay:

```bash
lattice adopt .
npm i -D github:lattice-partners/standards#v0.5.0
```

`adopt` injects a marked block into the existing `AGENTS.md` and leaves the rest
of the repo alone. It does not impose the Lattice stack config on a client repo.

### What your project gets

- `.lattice/` - a vendored, CLI-managed copy of the core standard. Never
  hand-edit it; `check` reports drift and `sync` overwrites it.
- `AGENTS.md` - the entry point, carrying a `<!-- lattice:standards -->` block
  that pins the version and points at `.lattice/`. Add your project's stack,
  architecture, and context around it.
- `CLAUDE.md` - a symlink to `AGENTS.md`, so Claude Code and every
  AGENTS.md-aware tool read the identical instructions.
- `.lattice/hooks/` - git hooks, switched on by `npm install`. They run the full
  gate before every commit and block the things a reviewer cannot catch: secrets,
  a secret in a `NEXT_PUBLIC_` variable, a migration that drops data or disables
  RLS, and a branch that would never link to its ticket.
- `.claude/settings.json` - guardrails for AI agents working in the repo. Denies
  the irreversible commands outright and stops anyone switching permission
  prompts off.

See [how it works](docs/how-it-works.md) for the anatomy of the block and why it
is structured this way.

### Day to day

Run `lattice` in the repo to open the interactive shell: a home screen with the
repo's standards status and a menu you work through. Or use the commands
directly:

```bash
lattice ticket MIN-155   # start a ticket: branch off dev, named after the ticket
lattice verify           # run every check and say whether it is safe to ship
lattice doctor           # check this machine is set up correctly
lattice release          # print the dev -> main pull request body
lattice check            # verify conformance (exit non-zero on drift; use in CI)
lattice sync             # re-vendor .lattice/ to the installed version
```

`verify` and `doctor` are written to be read by anyone, not just engineers. They
answer "is this safe to ship?" and "why does nothing work on my machine?" in
plain language.

With no terminal attached (CI, coding agents), there is no shell or prompt:
commands run from flags and exit codes, and bare `lattice` prints help.

### Staying current

Bump the pin and pull the update in:

```bash
npm i -D github:lattice-partners/standards#vX.Y.Z
npx lattice sync
npx lattice check
```

`sync` re-vendors the standard docs, the stack baseline, and the git hooks, so a
hook improvement made here reaches every project the same way a rule change does.

`lattice init` also drops a CI workflow that runs `lattice check` on pushes to
`main` and `dev` and on release tags. The gate itself is the pre-commit hook; CI
is the backstop.

### How work flows

Ticket branches are named after the ticket and cut from `dev`. Merging into
`dev` moves the ticket to In Review and deploys to staging; the pull request
body stays empty because the ticket already holds the context. Releasing is a
`dev` into `main` pull request whose body `lattice release` generates: closing
keywords so each ticket closes on merge, then one line per shipped change.
`main` takes direct commits for hotfixes only.

The full model, including the tracker-side setup that cannot be enforced from
the repo, is in `core/ticket-workflow.md`.

---

## Work on the standard

This repo is the source of the standard every project inherits, so treat every
change as a standards change. `CLAUDE.md` holds the full working rules for this
repo.

### Layout

| Path | Purpose |
|---|---|
| `core/` | Portable core: the stack-agnostic standard every project inherits |
| `stack/` | Lattice stack: the vendored baseline, configs, and setup guides |
| `hooks/` | Git hook shims, vendored into a project's `.lattice/hooks/` |
| `ci/` | Reusable GitHub Actions: `standards-check` composite action + workflow |
| `templates/` | The `next-monorepo` and `greenfield` scaffolds, plus the ADR template |
| `cli/` | The `lattice` CLI (commands, hooks, workflow, interactive shell) |
| `docs/` | `how-it-works.md` and the `adr/` decision records |
| `VERSION` | Semver; projects pin to a tag |

### Two tiers

- **Portable core** (`core/`) - applied to every engagement, greenfield or
  brownfield: engineering principles, agent practices, commit discipline,
  security baseline.
- **Lattice stack** (`stack/`) - applied fully on greenfield; used selectively
  when we are guests in a client's existing repo.

### Make a change

1. Edit the relevant file in `core/` (or `stack/`, `ci/`, `templates/`).
2. Run `npm run lint:md` and `npm test`.
3. For a material change, add an ADR (copy `templates/ADR.md` into `docs/adr/`)
   and bump `VERSION`.
4. Commit (Conventional Commits, no AI attribution), then tag and push:

```bash
git tag -a vX.Y.Z -m "summary"
git push origin main --tags
```

Projects pick the change up when they bump their pin and run `lattice sync`.

---

## Status

v0.5.0 ships the full Lattice stack: the `next-monorepo` scaffold (Next.js,
Supabase with RLS, Clerk, Vercel), local-first enforcement through vendored git
hooks, agent guardrails, and the Linear-driven branching model. The portable
core, the CLI, and the config-only scaffold (`--stack=minimal`) all carry over.

Next: brownfield stack adoption, and error tracking and spend caps, which are
added per client today.
