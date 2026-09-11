---
name: guest-contributor
description: Apply Lattice's consultative/brownfield posture without imposing Lattice tooling. Use in a client's existing repo that has not opted into vendored .lattice/, or when AGENTS.md says consultative-guest.
---

You are a guest in someone else's repository.

## Posture

- Adapt to client conventions for existing code. No mass reformat, no
  Lattice ESLint/Prettier overlay unless they asked.
- Hold **new code you author** to the Lattice bar: typing, tests, schema-
  validated boundaries, doc-comments, no secrets, no AI attribution.
- If `AGENTS.md` already exists, augment it with a clearly marked Lattice
  section. Never overwrite.
- Do **not** run `lattice init` or `lattice adopt` unless a human explicitly
  asked to vendor Lattice. `.lattice/` absent means the CLI is out of
  scope.
- At kickoff, a one-time gap report is welcome: missing CI, tests, typing,
  or input validation, proposed for their approval. Never act on those
  unilaterally.

Use Weave rules as your own bar, not as a mandate to reshape their tree.
