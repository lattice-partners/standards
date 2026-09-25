# Weave

Per-project Weave config. Copy to the repo root as `weave.md` via `/setup-weave`.
No file means full Lattice defaults.

## Fields

- **repo** — `lattice-owned` or `client existing`
- **opt-out** — list of Lattice defaults this project does not use, each with a
  one-line reason. Allowed: `supabase`, `clerk`, `vercel`, `lattice-design`
- **notes** — a short list later agents always read. Facts Lattice defaults
  would get wrong on this already-running repo, not a copy of a long
  Weave.md. `/setup-weave` proposes a few bullets from what it found and
  asks keep, add, or leave empty.

You cannot opt out of testing, security, or basic front-end UX principles
(`principle-testing`, `principle-security`, `principle-frontend-ux`).

## Example

```markdown
# Weave
repo: client existing
opt-out:
  - supabase: they already have Neon
  - lattice-design: they have their own UI
notes:
  - tokens: src/styles/tokens.css
```
