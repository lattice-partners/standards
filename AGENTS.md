# lattice-standards

Instructions for agents working **on this repo** (the standards themselves).

This repo is the portable core + Lattice stack + CI + scaffolding + the Weave
Cursor plugin that client projects inherit. Changes here ripple to every
project, so:

- **Treat every change as a standards change.** Land it via a focused commit
  with a clear *why*. Material changes get an ADR (see `templates/ADR.md`)
  and a `VERSION` bump. Keep `plugins/weave/.cursor-plugin/plugin.json`
  aligned with `VERSION`.
- **Keep the portable core stack-agnostic.** Anything TypeScript/Supabase/
  Vercel-specific belongs in `stack/`, never in `core/`.
- **Do not edit generated Weave rules by hand.** Change `core/` or
  `stack/stack-baseline.md`, then run `npm run build:weave`.
- **Lint before commit:** `npm run lint:md`. Tests include plugin validation
  and Weave hook checks (`npm test`).

## The standard this repo defines

The engineering standard lives in `core/`:

- `core/agents-base.md` - base engineering standard projects compose from
- `core/working-agreement.md` - posture, rituals, commit discipline, DoD
- `core/security-baseline.md` - non-negotiable security rules
- `core/memory-template/` - seed memory files for a new project
- `core/signal-loop.md` - harvest meetings, chat, mail, GitHub, and the tracker before you build

These also govern work in this repo.
