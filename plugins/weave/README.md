# Weave

Lattice engineering standards as a Cursor plugin. Canonical prose still lives
in `core/` and `stack/stack-baseline.md` in this repository. The files in
`rules/` are generated; do not edit them by hand.

Weave does not replace the Lattice CLI or Git hooks. Cursor hooks constrain
Cursor Agent. Git hooks remain the gate for staged files and commit messages.

## What it contains

- **Rules** generated from the portable core and the Lattice stack baseline
- **Skills** for setup, planning, implementation, debugging, verification,
  review, shipping, and release
- **Slash commands** that are thin entry points into those skills
- **Cursor hooks** that deny force-push, hook bypass, destructive database
  reset, production Vercel deploys, and reads of real `.env` files

## Local install

From the `lattice-standards` checkout:

```bash
mkdir -p ~/.cursor/plugins/local
ln -sfn "$(pwd)/plugins/weave" ~/.cursor/plugins/local/weave
```

Reload Cursor (`Developer: Reload Window`). Confirm rules, skills, commands,
and hooks appear under Weave.

## Team marketplace

1. In the Cursor team dashboard, import the `lattice-partners/standards`
   GitHub repository as a marketplace.
2. Weave's source path is `plugins/weave`.
3. Keep installation **Default Off** for a pilot group.
4. Connect the Cursor GitHub App, then enable Auto Refresh so later tags
   reach the team without a manual re-import.
5. Reindex at most once every ten minutes if a refresh looks stale.
6. Promote Weave to **Required** after the pilot holds.

There is no documented immutable per-user plugin version pin. The CLI still
pins via the git tag (`#v0.8.0`). Cursor loads whatever the marketplace
currently serves.

## Regenerating rules

From the repository root:

```bash
npm run build:weave
npm test
```

`npm test` fails if generated rules drift from `core/` or
`stack/stack-baseline.md`.
