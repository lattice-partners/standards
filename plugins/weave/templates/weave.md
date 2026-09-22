# Weave

Per-project Weave config. Copy to the repo root as `weave.md` via `/setup-weave`.
No file means full Lattice defaults.

## Fields

- **repo** — `lattice-owned` or `client existing`
- **opt-out** — list of Lattice defaults this project does not use, each with a
  one-line reason. Allowed: `supabase`, `clerk`, `vercel`, `lattice-design`
- **notes** — optional facts the agent would miss (tokens file, do not touch
  `legacy/`, tracker prefix)

You cannot opt out of testing, security, or basic front-end UX principles
(`principle-testing`, `principle-security`, `principle-frontend-ux`).

## Example

```markdown
# Weave
repo: client existing
opt-out:
  - supabase: they already have Postgres
  - lattice-design: they have their own UI
notes:
  - tokens: src/styles/tokens.css
```
