# Weave plugin

Cursor plugin source. Always-on standards are `principle-*` skills. Task skills
and commands live alongside `templates/weave.md` for per-project config.

## Contents

- **Principle Skills** — principle-weave, principle-suggested-stack, principle-testing,
  principle-frontend-ux, principle-code-quality, principle-security,
  principle-performance, principle-demo
- **Lattice Skills** — lattice-design,lattice-stack
- **Utility Skills** — help do a very specific task, not always used - utility-ui-options-toggle
- **Commands** — all relevant to Weave - setup-weave, review-weave, utility-weave-improvements

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
