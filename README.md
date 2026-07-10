# lattice-standards

The paved road for Lattice consulting projects - the shared engineering
standards, AI-agent instructions, CI/CD, and scaffolding that every client
project inherits.

Independent client repos pin a versioned release of this repo and pull updates
on their own cadence. The full design lives outside this repo at
`Lattice/docs/superpowers/specs/2026-06-09-lattice-machine-design.md` (the
parent `Lattice/` folder is not itself a git repo).

## Layout

| Path | Purpose |
|---|---|
| `core/` | Portable core - stack-agnostic standards (how Lattice works) |
| `stack/` | Lattice stack configs - TS / Node 24 / Supabase / Next / Vercel |
| `ci/` | Reusable GitHub Actions workflows + composite actions |
| `templates/` | Greenfield starter, brownfield adopt-overlay, ADR/PR/issue templates |
| `cli/` | The `lattice` CLI (init / adopt / sync / check) |
| `VERSION` | Semver; projects pin to a tag |

## Two-tier standards

- **Portable core** (`core/`) - applied to every engagement, greenfield or
  brownfield. Engineering principles, AI-agent practices, review discipline,
  security baseline.
- **Lattice stack** (`stack/`) - applied fully on greenfield; used only where
  it fits when we are guests in a client's existing repo.

## CLI

The `lattice` CLI vendors the standard into a project and keeps it current.
Projects pin a tagged version and pull updates on their own cadence.

New (greenfield) project:

```bash
# scaffold: writes AGENTS.md, symlinks CLAUDE.md, vendors core/ into .lattice/,
# seeds memory/
npx github:lattice-partners/standards#v0.4.0 init my-app
cd my-app
npm i -D github:lattice-partners/standards#v0.4.0
```

Existing (client) repo:

```bash
# non-destructive overlay: injects a marked Lattice block into AGENTS.md,
# leaves the rest of the repo alone
npx github:lattice-partners/standards#v0.4.0 adopt .
npm i -D github:lattice-partners/standards#v0.4.0
```

Once installed as a dev dependency:

```bash
npx lattice sync     # re-vendor .lattice/ to the installed version, bump the pin
npx lattice check    # verify the project conforms (exit non-zero on drift; use in CI)
```

Run `lattice` with no command on a terminal to open the interactive shell: a
home screen showing the repo's standards status (initialized, version, drift)
and a context-aware menu you work through, returning home after each action
until you quit. `init` and `adopt` also prompt for anything not passed as a
flag. All of this is TTY-only, so subcommands stay fully scriptable in CI and
for coding agents (no TTY means no prompts). Set `NO_COLOR` to disable color or
`LATTICE_ASCII=1` for plain ASCII glyphs.

`.lattice/` is managed by the CLI. Edit the standard here in lattice-standards,
tag a release, then `sync` each project to it. Do not hand-edit `.lattice/`.

## Status

Phase 0 (portable core), the CLI (init/adopt/sync/check plus an interactive
shell), stack configs (ESLint, Prettier), CI (composite action + workflow), and
the greenfield template are all in place at v0.4.0. Next: brownfield stack
adoption and richer templates - see the design doc roadmap.
