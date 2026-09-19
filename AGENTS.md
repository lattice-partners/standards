# Weave (lattice-standards repo)

This repository **is** the Weave Cursor plugin. There is no CLI and no `core/`.

## Changing the standard

- Edit rules in `plugins/weave/rules/` (hand-authored `.mdc` files).
- Edit skills in `plugins/weave/skills/*/SKILL.md`.
- Edit commands in `plugins/weave/commands/`.
- Per-project config shape: `plugins/weave/templates/weave.md`.

Material changes: bump `VERSION`, align `plugins/weave/.cursor-plugin/plugin.json`,
update `plugins/weave/CHANGELOG.md`, run `npm test` and `npm run lint:md`.

## Verify

```bash
npm test
npm run lint:md
```
