# lattice-standards

The paved road for Lattice consulting projects: the shared engineering
standards, AI-agent instructions, CI/CD, and scaffolding that every project
inherits. Projects pin a versioned release and pull updates on their own cadence.

New here? Read [how it works](docs/how-it-works.md) for the full model. This
README is the practical guide: how to use it in a project, and how to change the
standard itself.

---

## Use it in a project

### Prerequisites

Before you start, install:

- **Node 24 or newer** (CI and `.nvmrc` target Node 26, the current LTS)
- **npm 12** (`npm i -g npm@12`)
- **git**, with `user.name` and `user.email` configured

### Install the CLI

Get the `lattice` command on your PATH:

```bash
npm i -g github:lattice-partners/standards#v0.6.1
```

Or skip the install and prefix any command with
`npx github:lattice-partners/standards#v0.6.1`.

### Set up a new project (greenfield)

Follow these steps in order. Each step assumes the previous ones are done.

#### 1. Scaffold the project

```bash
lattice init my-app
cd my-app
```

That vendors the standard into `.lattice/`, writes `AGENTS.md`, scaffolds the
Lattice stack (`next-monorepo` by default), copies `.env.example` to
`.env.local`, runs `git init`, creates an initial commit on `main`, creates a
`dev` branch, and installs the git hooks.

#### 2. Run the setup wizard

```bash
lattice setup
```

This walks you through the rest interactively: git identity, creating the GitHub
repo and pasting the remote URL, `npm install`, the external-service checklist,
and filling in `.env.local` one value at a time. Run it again any time you need
to pick up where you left off.

Or say yes when `lattice init` asks to run the wizard immediately after
scaffolding.

#### 3. Check your machine (optional)

```bash
lattice doctor
```

Run this before or after `npm install`. It catches a wrong Node or npm version, a missing
`dev` branch, a missing `origin` remote, and empty values in `.env.local`.
`lattice setup` fixes most of these as it goes.

#### 4. Manual path (if you prefer)

If you are not on an interactive terminal, follow these steps yourself:

##### Create the GitHub repo and remote

Create an empty repository on GitHub, then:

```bash
git remote add origin git@github.com:your-org/my-app.git
git push -u origin main dev
```

Commit and push `package-lock.json` before relying on CI. The workflow runs
`npm ci`, which requires the lockfile.

##### Install dependencies

```bash
npm install
```

The `prepare` script runs `lattice hooks install`. It succeeds even if hooks were
already installed, and it does not clobber an existing `core.hooksPath` (for
example a client repo already on Husky).

##### Wire up external services

Do these in order. Each links to the setup guide in the installed package under
`node_modules/@lattice/standards/stack/` (or read them from the
[lattice-standards repo](https://github.com/lattice-partners/standards/tree/main/stack)):

1. **Supabase** - create the project, enable Point-in-Time Recovery before the
   first migration ([guide](stack/supabase/README.md))
2. **Clerk** - create the application ([guide](stack/clerk/README.md))
3. **Clerk + Supabase** - wire Clerk as a third-party auth provider in Supabase
   ([guide](stack/supabase/README.md#4-wire-up-clerk-as-a-third-party-auth-provider))
4. **Vercel** - two projects (`apps/web` and `apps/api` root directories),
   link, env vars per environment, staging with manual promotion to production
   ([guide](stack/vercel/README.md))
5. **Firewall** - rate-limit rules on the api project
   ([guide](stack/vercel/README.md#5-rate-limiting-via-vercel-firewall))

`vercel link` is only required for the Vercel Marketplace install path (Clerk).
You can configure Clerk and Supabase before linking Vercel.

Fill `.env.local` at the **repo root** with the values from those services.
`vercel env pull .env.local` must be run from the repo root, not from
`apps/web`. The Supabase CLI reads a separate root `.env` file (not
`.env.local`); see `supabase/README.md` in the scaffold.

Run `lattice doctor` again until every required setting has a value.

##### Run the app

```bash
npm run dev
```

- `apps/web` - <http://localhost:3000>
- `apps/api` - <http://localhost:3001>

Set `API_URL=http://localhost:3001` in `.env.local` so `apps/web` rewrites
`/api/*` to the api app.

##### Verify

```bash
npx turbo run typecheck lint test build
lattice verify
```

`build` fails with a clear error if `API_URL` is missing from `.env.local`.

For day-to-day operations after setup, see `RUNBOOK.md` in the project (also
linked from the generated `AGENTS.md`).

### Config-only scaffold (minimal)

For a library or service that is not a web app:

```bash
lattice init my-lib --stack=minimal
cd my-lib
npm i -D github:lattice-partners/standards#v0.6.1
```

The minimal template ships no root `package.json`, so there is no `prepare`
script and hooks are not reinstalled automatically on a fresh clone. Run
`lattice hooks install` after `git clone` if you add hooks manually.

### Existing (client) repo

Non-destructive overlay:

```bash
lattice adopt .
npm i -D github:lattice-partners/standards#v0.6.1
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

Run `lattice` in the repo to open a full-screen shell: status for this project
and a menu that redraws in place (check, sync, doctor, verify, ticket, release,
docs). Or use the commands directly:

```bash
lattice ticket MIN-155   # start a ticket: branch off dev, named after the ticket
lattice setup            # walk through project setup (GitHub, env, npm install)
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

v0.6.1 is a full-screen interactive CLI: the shell, init, and setup wizard redraw
in place instead of scrolling a transcript.

v0.6.0 makes `lattice init` produce a working repo: git bootstrap, `.env.local`,
hooks that never break `npm install`, a real `doctor` pre-flight, one correct
setup sequence in this README, and shared Supabase types in `packages/db`.

v0.5.0 shipped the full Lattice stack: the `next-monorepo` scaffold (Next.js,
Supabase with RLS, Clerk, Vercel), local-first enforcement through vendored git
hooks, agent guardrails, and the Linear-driven branching model.

Next: brownfield stack adoption, and error tracking and spend caps, which are
added per client today.
