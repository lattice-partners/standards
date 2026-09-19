# Weave

Lattice engineering standards as a Cursor plugin. Install Weave, run
`/setup-weave` on a project, edit rules and skills here when policy changes.

No npm install into client repos. No CLI. No vendored `.lattice/` folder.

## Install locally

From this checkout:

```bash
mkdir -p ~/.cursor/plugins/local
ln -sfn "$(pwd)/plugins/weave" ~/.cursor/plugins/local/weave
```

Reload Cursor (`Developer: Reload Window`). Confirm rules, skills, and commands
appear under Weave.

## Team marketplace

1. Import `lattice-partners/standards` as a team marketplace in Cursor.
2. Source path: `plugins/weave`.
3. Start **Default Off**, promote to **Required** after a pilot.
4. Enable Auto Refresh after connecting the Cursor GitHub App.

Tag releases (`v1.0.0`) so the marketplace can pick up changes.

## What is in the plugin

| Piece | Purpose |
| --- | --- |
| **Rules** | Always-on: Weave explainer, suggested stack, testing, UX, quality, security, performance |
| **Skills** | Lattice stack setup, Lattice Design, UI options toggle |
| **Commands** | `/setup-weave` (write `weave.md`), `/review-weave` (manual audit) |
| **`weave.md`** | Per-project opt-outs (created in each repo, not in this repo) |

## Per-project setup

On a client or Lattice repo:

1. Install Weave in Cursor.
2. Run `/setup-weave` to write `weave.md` (repo type, opt-outs, a few facts).
3. Run `/review-weave` before shipping to check alignment.

No `weave.md` means full Lattice defaults. Testing, security, and UX rules
cannot be opted out. Supabase, Clerk, Vercel, and Lattice Design can be.

## Change the plugin

1. Edit files under `plugins/weave/`.
2. Run `npm test` and `npm run lint:md`.
3. Bump `VERSION` and `plugins/weave/.cursor-plugin/plugin.json` for releases.

See [AGENTS.md](AGENTS.md) for agent instructions on this repo.

## Why we test

The plugin is just files and JSON manifests — no app to run. `npm test` checks
that those files are complete and consistent so Weave actually loads in Cursor:
versions match, manifests are valid, every rule/skill/command is present, and
frontmatter is correct. CI runs the same check on every PR.

You only need to run it when you change plugin structure (new rule, version
bump, manifest edit). Tweaking rule text alone does not require a local test run.
