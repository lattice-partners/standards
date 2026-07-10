# lattice-standards

Instructions for agents working **on this repo** (the standards themselves).

This repo is the portable core + Lattice stack + CI + scaffolding that client
projects inherit. Changes here ripple to every project, so:

- **Treat every change as a standards change.** Land it via a focused commit
  with a clear *why*. Material changes get an ADR (see `templates/ADR.md`)
  and a `VERSION` bump.
- **Keep the portable core stack-agnostic.** Anything TypeScript/Supabase/
  Vercel-specific belongs in `stack/`, never in `core/`.
- **Lint before commit:** `npm run lint:md`.

## The standard this repo defines

The engineering standard lives in `core/`:

- `core/agents-base.md` - base engineering standard projects compose from
- `core/working-agreement.md` - posture, rituals, commit discipline, DoD
- `core/security-baseline.md` - non-negotiable security rules
- `core/memory-template/` - seed memory files for a new project

These also govern work in this repo.
