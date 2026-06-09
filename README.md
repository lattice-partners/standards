# lattice-standards

The paved road for Lattice consulting projects — the shared engineering
standards, AI-agent instructions, CI/CD, and scaffolding that every client
project inherits.

Independent client repos pin a versioned release of this repo and pull updates
on their own cadence. See the design at
[`docs/superpowers/specs/2026-06-09-lattice-machine-design.md`](../docs/superpowers/specs/2026-06-09-lattice-machine-design.md)
(in the parent `Lattice/` folder).

## Layout

| Path | Purpose |
|---|---|
| `core/` | Portable core — stack-agnostic standards (how Lattice works) |
| `stack/` | Lattice stack configs — TS / Node 24 / Supabase / Next / Vercel |
| `ci/` | Reusable GitHub Actions workflows + composite actions |
| `templates/` | Greenfield starter, brownfield adopt-overlay, ADR/PR/issue templates |
| `cli/` | The `lattice` CLI (init / adopt / sync / check) |
| `VERSION` | Semver; projects pin to a tag |

## Two-tier standards

- **Portable core** (`core/`) — applied to every engagement, greenfield or
  brownfield. Engineering principles, AI-agent practices, review discipline,
  security baseline.
- **Lattice stack** (`stack/`) — applied fully on greenfield; used only where
  it fits when we are guests in a client's existing repo.

## Status

Bootstrapping. Phase 0 (portable core) is the first body of work — see the
design doc roadmap.
