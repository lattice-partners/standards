# Weave

Per-project Weave config. Create or update with `/setup-weave`. Regular feature
agents may propose corrections but must not edit this file directly.

Missing file means full Lattice defaults with no recorded opt-outs.

## Fields

- **repo** — `lattice-owned` or `client existing`
- **opt-out** — always set. Use `none` when Supabase, Clerk, Vercel, and Lattice
  Design all stay on. Otherwise a list of opted-out defaults, each with a
  one-line reason. Allowed keys: `supabase`, `clerk`, `vercel`, `lattice-design`
- **notes** — optional short list of facts about how Weave applies here. Not boot
  commands, architecture, product copy, or framework version warnings. Those
  belong in the "Run and test" section of root `AGENTS.md`.

You cannot opt out of testing, security, front-end UX, code quality, performance,
or this process skill.

## Example (all Lattice defaults)

```yaml
repo: lattice-owned
opt-out: none
notes:
  - Demo prototype: principle-demo applies
  - Lattice Design tokens: app/globals.css
```

## Example (with opt-outs)

```yaml
repo: client existing
opt-out:
  - supabase: they already have Neon
  - lattice-design: they have their own UI
notes:
  - Clerk orgs enabled; follow their existing middleware patterns
```
