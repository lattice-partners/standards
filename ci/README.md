# Lattice CI

Reusable CI building blocks for Lattice projects.

## actions/standards-check

A composite action that installs dependencies and runs `lattice check`, the
markdown lint, the project lint, and the tests (each skipped if the script is
absent). Reference it from any project workflow:

```yaml
- uses: lattice-partners/standards/ci/actions/standards-check@v0.4.0
```

Pin to a tag (`@v0.4.0`), not `@main`, in real projects.

## workflows/ci.yml

A ready CI workflow that runs `standards-check` on push and pull request. Copy
it to `.github/workflows/ci.yml`, or let `lattice init` place it for you (it
pins the action to the standard version automatically).
