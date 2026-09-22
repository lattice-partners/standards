# Weave plugin

Cursor plugin source. Always-on standards are `principle-*` skills. Task skills
and commands live alongside `templates/weave.md` for per-project config.

## Contents

- **Principles** — principle-weave, principle-suggested-stack, principle-testing,
  principle-frontend-ux, principle-code-quality, principle-security,
  principle-performance
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
