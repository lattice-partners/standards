# Lattice Working Agreement

How Lattice works on a project. Applies to humans and AI agents alike.

## Engagement posture (set per project at kickoff in AGENTS.md)

**Greenfield** — Lattice owns the stack. Apply the full standard: the base
engineering standard, the Lattice stack configs, and CI.

**Consultative guest (brownfield)** — we are working in a client's existing
repo. Rules:

- **Adapt to client conventions for existing code.** No mass reformatting, no
  imposing our style on their code. Their repo conventions win.
- **Deliver a one-time gap report** at kickoff: surface weaknesses (no CI, no
  tests, weak typing, missing input validation) and propose improvements *for
  the client's approval*. Never act on them unilaterally.
- **Hold new code we author to the full Lattice bar** — strict typing, tests,
  schema-validated boundaries, doc-comments — wherever the stack allows. The
  codebase becomes mixed; our contributions meet our standard.
- **Non-destructive overlay.** If the client already has `AGENTS.md`,
  `CLAUDE.md`, lint config, or CI, augment with a clearly-marked Lattice section
  — never overwrite.

## Workflow

- **Plan before code** for: new features, architectural or multi-file changes,
  anything touching security / auth / payments / contracts. Get explicit
  approval before writing code.
- **Just do it** for: single-line fixes, typos, adding a test for existing code,
  comment/wording updates.

## Commit discipline

- **Atomic commits** — one logical change each. Messages explain **why**, not
  just what.
- **Never commit secrets**, `.env` files, private keys, large binaries, or
  `node_modules`.
- **No AI attribution.** Never add `Co-Authored-By:` trailers or any AI
  attribution footer. Plain commit messages only. (Applies even when asked to
  run the commit.)
- **Agents never commit unless explicitly asked.** Suggest commit messages;
  the human runs git.

## Data & git safety

- **Never destroy or overwrite existing data without explicit approval.** Covers
  `DROP`, `TRUNCATE`, unbounded `DELETE`, destructive migrations, and backfills
  that overwrite non-null values. Prefer additive changes (new nullable columns,
  new tables, soft deletes). If a destructive change is genuinely required,
  surface it with row counts and wait for approval.
- Treat every migration file as a production change at write time if migrations
  auto-deploy.

## Definition of Done

Code works · tests pass · no lint errors · edge cases handled · error states have
clear user-facing messages · no dead code introduced · memory/docs updated if
relevant · security review done if security-adjacent · human prompted to commit.
