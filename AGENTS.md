# Weave (lattice-standards repo)

This repository **is** the Weave Cursor plugin. There is no CLI and no `core/`.

## Changing the standard

- Edit always-on standards in `plugins/weave/skills/principle-*/SKILL.md`.
- Edit task skills in `plugins/weave/skills/*/SKILL.md` (non-`principle-*`).
- Edit commands in `plugins/weave/commands/`.
- Per-project Weave config: `plugins/weave/templates/weave.md`.
- AGENTS.md Weave block: scaffold in `plugins/weave/commands/setup-weave.md`; shape in `principle-weave`.

Material changes: bump `VERSION`, align `plugins/weave/.cursor-plugin/plugin.json`,
update `plugins/weave/CHANGELOG.md`, run `npm test` and `npm run lint:md`.

## Verify

```bash
npm test
npm run lint:md
```

## Local demo

`apps/web` is a session-only marketing dashboard used to exercise Lattice Design and front-end UX. It is not the plugin. Run it with `npm run dev` inside `apps/web`. No database or auth.
