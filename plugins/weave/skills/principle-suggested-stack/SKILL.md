---
name: principle-suggested-stack
description: Lattice default providers for database, auth, hosting, and design unless weave.md opted out.
alwaysApply: true
---

# Suggested stack

When a project has not opted out in `weave.md`, prefer these defaults:

| Need | Default |
| --- | --- |
| Database | Supabase (Postgres, RLS, migrations) |
| Auth | Clerk (JWT trusted by Supabase for RLS) |
| Hosting | Vercel (one project per app, staging on `dev`) |
| UI | Lattice Design (see `lattice-design` skill) |

If `weave.md` opts out of a tool or already has one chosen (i.e. using PlanetScale instead of Supabase), do not try to push for our tool. UX and security principles still apply.

For setup steps, use the `lattice-stack` skill. For UI composition, use the
`lattice-design` skill.
