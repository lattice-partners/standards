# Weave plugin

Cursor plugin source. `/setup-weave` writes `weave.md` (repo type, opt-outs,
Weave notes) and the "Run and test" section of root `AGENTS.md` (components,
verification, project notes).

## Contents

- **Principles** - principle-weave, principle-process, principle-suggested-stack,
  principle-testing, principle-frontend-ux, principle-code-quality,
  principle-security, principle-performance, principle-demo
- **Lattice Skills** - lattice-design, lattice-stack
- **Utility Skills** - utility-ui-options-toggle
- **Commands** - setup-weave, review-weave, utility-weave-improvements
- **Template** - `templates/weave.md` ("Run and test" scaffold lives in the `setup-weave` command)

## Local install

```bash
mkdir -p ~/.cursor/plugins/local
ln -sfn "$(pwd)/plugins/weave" ~/.cursor/plugins/local/weave
```

Reload Cursor. Tag `#v2.1.0` on the standards repo for marketplace refresh.

## Edit and verify

```bash
npm test
npm run lint:md
```
