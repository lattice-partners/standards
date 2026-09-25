# Weave

Weave helps agents earn trust through repeatable, evidence-based verification.
Install the Cursor plugin and run `/setup-weave` on an existing repository to
create its confirmed `weave.md` trust contract.

No npm install into client repos. No CLI. No vendored `.lattice/` folder.

## Install locally

Cursor only live-loads plugins under `~/.cursor/plugins/local`. A symlink to
a repo elsewhere is skipped. Keep the git checkout *inside* that folder, then
symlink `weave` to `plugins/weave` (target stays in-folder):

```bash
mkdir -p ~/.cursor/plugins/local
# repo lives at ~/.cursor/plugins/local/lattice-standards
ln -sfn lattice-standards/plugins/weave ~/.cursor/plugins/local/weave
```

`~/Lattice/lattice-standards` can be a symlink to that checkout. Edit skills
and commands in git, then fully quit Cursor (`Cmd+Q`) and reopen so the
plugin reloads. Do not install the marketplace copy of Weave at the same
time; it wins over local.

## Team marketplace

When local Weave is good enough to share:

1. Merge to `main` and tag if you version the plugin.
2. Import `lattice-partners/standards` as a team marketplace in Cursor.
3. Source path: `plugins/weave`.
4. Start **Default Off**, promote to **Required** after a pilot.
5. Enable Auto Refresh after connecting the Cursor GitHub App.

Until then, iterate locally only. A marketplace install of the same name
`weave` overrides `~/.cursor/plugins/local/weave`.

## What is in the plugin

| Piece | Purpose |
| --- | --- |
| **Principles** | Always used: trust contract, suggested stack, testing, UX, quality, security, performance, and demo guidance |
| **Lattice** | Existing stack setup and Lattice Design skills |
| **Utility** | Focused tasks such as the UI options toggle |
| **Commands** | `/setup-weave` creates the trust contract; review and improvement commands remain available |
| **`weave.md`** | Components, verified methods, evidence, boundaries, notes, risk, and definition of done |

## Per-project setup

On a client or Lattice repo:

1. Install Weave in Cursor.
2. Run `/setup-weave` on an existing repository.
3. Confirm the component inventory, verified commands, boundaries, and notes.
4. Review the proposed `weave.md` and root `AGENTS.md` block before writing.

New-project setup is intentionally out of scope for this release. Existing
skills remain available while the trust-contract workflow is piloted.

## Change the plugin

1. Edit files under `plugins/weave/`.
2. Run `npm test` and `npm run lint:md`.
3. Bump `VERSION` and `plugins/weave/.cursor-plugin/plugin.json` for releases.

See [AGENTS.md](AGENTS.md) for agent instructions on this repo.

## Why we test

The plugin is just files and JSON manifests, with no app to run. `npm test` checks
that those files are complete and consistent so Weave actually loads in Cursor:
versions match, manifests are valid, every rule/skill/command is present, and
frontmatter is correct. CI runs the same check on every PR.

You only need to run it when you change plugin structure (new rule, version
bump, manifest edit). Tweaking rule text alone does not require a local test run.
