# Weave (lattice-standards repo)

This repository **is** the Weave Cursor plugin. There is no CLI and no `core/`.

## Changing the standard

- Edit the required workflow in `plugins/weave/rules/engineering-process.mdc`.
- Edit conditional principles in `plugins/weave/skills/principle-*/SKILL.md`.
- Edit task skills in `plugins/weave/skills/*/SKILL.md` (non-`principle-*`).
- Edit commands in `plugins/weave/commands/`.
- Per-project config shape: `plugins/weave/templates/weave.md`.

Material changes: bump `VERSION`, align `plugins/weave/.cursor-plugin/plugin.json`,
update `plugins/weave/CHANGELOG.md`, run `npm test` and `npm run lint:md`.

## Verify

```bash
npm test
npm run lint:md
```

## Local demo

`apps/web` is a session-only marketing dashboard used to exercise Lattice Design and front-end UX. It is not the plugin. Run it with `npm run dev` inside `apps/web`. No database or auth.
