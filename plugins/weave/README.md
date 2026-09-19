# Weave plugin

Cursor plugin source. Rules are hand-authored in `rules/`. Skills and commands
live alongside `templates/weave.md` for per-project config.

## Contents

- **Rules** — weave, suggested-stack, testing, frontend-ux, code-quality,
  security, performance
- **Skills** — lattice-design, ui-options-toggle, lattice-stack
- **Commands** — setup-weave, review-weave

## Local install

```bash
mkdir -p ~/.cursor/plugins/local
ln -sfn "$(pwd)/plugins/weave" ~/.cursor/plugins/local/weave
```

Reload Cursor. Tag `#v1.0.0` on the standards repo for marketplace refresh.

## Edit and verify

```bash
npm test
npm run lint:md
```
