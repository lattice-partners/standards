---
name: principle-suggested-stack
description: Suggest Lattice default providers for new projects when relevant to the task.
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

If a component has `lattice.stack: false` or already has a provider chosen
(for example, PlanetScale instead of Supabase), do not push the Lattice stack.
Use `lattice.design` independently for design guidance. UX and security skills
still apply when relevant.

For setup steps, use the `lattice-stack` skill. For UI composition, use the
`lattice-design` skill.
