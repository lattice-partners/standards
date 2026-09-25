# Weave plugin

Cursor plugin source. `/setup-weave` creates a repository-specific trust
contract for repeatable agent verification. Martin's existing principle and
task skills remain available alongside the new setup workflow.

## Contents

- **Principles** - principle-weave, principle-suggested-stack, principle-testing,
  principle-frontend-ux, principle-code-quality, principle-security,
  principle-performance, principle-demo
- **Lattice Skills** - lattice-design, lattice-stack
- **Utility Skills** - utility-ui-options-toggle
- **Commands** - setup-weave, review-weave, utility-weave-improvements
- **Template** - component verification, boundaries, notes, risk, and definition
  of done

## Local install

```bash
mkdir -p ~/.cursor/plugins/local
ln -sfn "$(pwd)/plugins/weave" ~/.cursor/plugins/local/weave
```

Reload Cursor. Tag `#v2.0.0` on the standards repo for marketplace refresh.

## Edit and verify

```bash
npm test
npm run lint:md
```
