---
name: principle-suggested-stack
description: Lattice default providers for database, auth, hosting, and design unless weave.md opted out.
alwaysApply: true
---

# Suggested stack

Prefer these defaults.

| Need | Default |
| --- | --- |
| Database | Supabase (Postgres, RLS, migrations) |
| Auth | Clerk (JWT trusted by Supabase for RLS) |
| Hosting | Vercel |
| UI | Lattice Design on Tailwind CSS v4 (see `lattice-design` skill) |
| Persisten Server | Railway |

If `weave.md` opts out of a tool or already has one chosen (i.e. using PlanetScale instead of Supabase), do not try to push for our tool. UX and security principles still apply.

For setup steps, use the `lattice-stack` skill. For UI composition, use the
`lattice-design` skill.
