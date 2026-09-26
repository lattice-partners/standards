# Weave plugin

Cursor plugin source. One required rule guides acceptance criteria, risk,
verification, and evidence for human review. `/setup-weave` configures each
repository. Martin's principle and task skills remain available when relevant.

## Contents

- **Rule** - engineering-process
- **Principles** - principle-weave, principle-suggested-stack, principle-testing,
  principle-frontend-ux, principle-code-quality, principle-security,
  principle-performance, principle-demo
- **Lattice Skills** - lattice-design, lattice-stack
- **Utility Skills** - utility-ui-options-toggle
- **Commands** - setup-weave, review-weave, utility-weave-improvements
- **Template** - component paths, language, framework, hosting, Lattice flags,
  and approved exceptions

`/review-weave` is paused until its checklist is updated for this schema.

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
