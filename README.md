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
npm i -g github:lattice-partners/standards#v0.4.0
```

Or skip the install and prefix any command with
`npx github:lattice-partners/standards#v0.4.0`.

### Set up a project

New (greenfield) project - Lattice owns the stack:

```bash
lattice init my-app
cd my-app
npm i -D github:lattice-partners/standards#v0.4.0   # pin it for the project and CI
```

Existing (client) repo - non-destructive overlay:

```bash
lattice adopt .
npm i -D github:lattice-partners/standards#v0.4.0
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

See [how it works](docs/how-it-works.md) for the anatomy of the block and why it
is structured this way.

### Day to day

Run `lattice` in the repo to open the interactive shell: a home screen with the
repo's standards status and a menu you work through. Or use the commands
directly:

```bash
lattice check    # verify conformance (exit non-zero on drift; use in CI)
lattice sync     # re-vendor .lattice/ to the installed version
```

With no terminal attached (CI, coding agents), there is no shell or prompt:
commands run from flags and exit codes, and bare `lattice` prints help.

### Staying current

Bump the pin and pull the update in:

```bash
npm i -D github:lattice-partners/standards#vX.Y.Z
npx lattice sync
npx lattice check
```

`lattice init` also drops a CI workflow that runs `lattice check` on every push
and pull request, so drift is caught automatically.

---

## Work on the standard

This repo is the source of the standard every project inherits, so treat every
change as a standards change. `CLAUDE.md` holds the full working rules for this
repo.

### Layout

| Path | Purpose |
|---|---|
| `core/` | Portable core: the stack-agnostic standard every project inherits |
| `stack/` | Lattice TypeScript stack configs (ESLint, Prettier) |
| `ci/` | Reusable GitHub Actions: `standards-check` composite action + workflow |
| `templates/` | Greenfield starter files, adopt-overlay notes, and the ADR template |
| `cli/` | The `lattice` CLI (init / adopt / sync / check + interactive shell) |
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

Phase 0 (portable core), the CLI (init/adopt/sync/check plus an interactive
shell), stack configs (ESLint, Prettier), CI (composite action + workflow), and
the greenfield template are all in place at v0.4.0. Next: brownfield stack
adoption and richer templates.
