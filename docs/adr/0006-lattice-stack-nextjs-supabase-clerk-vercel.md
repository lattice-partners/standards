# ADR-0006: the Lattice stack is a Next.js monorepo on Supabase, Clerk, and Vercel

**Date:** 2026-08-19
**Status:** Accepted
**Owner:** Darragh Mahns

## Context

`stack/README.md` and `AGENTS.md` have named "TypeScript, Node 24, Next, Vercel,
Supabase" as the Lattice stack since 0.3.0, but nothing was built for it.
`lattice init` scaffolded four flat config files (tsconfig, eslint, prettier,
gitignore) and no application at all. Every engagement therefore started by
hand-rolling the same Next.js setup, and each one drifted. Clerk was not
mentioned anywhere despite being the auth provider we use.

ADR-0004 left this explicit: "Still stubbed: brownfield stack adoption beyond the
CLI overlay, and richer templates. Add when an engagement needs them." An
engagement needs them.

## Decision

`lattice init` now scaffolds a working monorepo by default:

- **npm workspaces + Turborepo**, with `apps/web` (frontend) and `apps/api`
  (backend). Most engagements need a backend, and separating them lets each
  deploy independently.
- **`apps/api` is a second Next.js app exposing only App Router route handlers.**
  No second backend framework.
- **`apps/web` uses Tailwind and shadcn/ui.**
- **Supabase for storage, with Row Level Security mandatory**, and **Clerk as a
  Supabase third-party JWT provider** so authorization is enforced in the
  database rather than in application code.
- **Vercel for hosting**, one project per app.

The previous config-only scaffold survives as `lattice init --stack=minimal` for
library and service engagements that are not web applications.

A new vendored `stack/stack-baseline.md` carries the enforceable rules
(directory layout, RLS, env var naming, migration discipline). It is vendored
into `.lattice/` rather than left in `stack/`, because only vendored files reach
the agents working in a client repo.

## Why

- **Route handlers over a second framework.** Hono or Express in `apps/api` would
  mean two runtimes, two deploy targets, and two sets of middleware to keep in
  sync with Clerk. A Next.js app with no pages is the smallest thing that gives
  us a separately deployable backend.
- **RLS with Clerk as a third-party issuer, not service-role authorization.**
  `core/security-baseline.md` requires authorization "at the data layer, not just
  the UI". Enforcing in `apps/api` with a service-role key means one missed check
  exposes everything, and it is exactly the shortcut an agent takes when stuck.
  Supabase deprecated the older Clerk JWT-template integration in April 2025
  because it required sharing the project JWT secret; the native third-party auth
  integration avoids that.
- **Turborepo over plain workspaces.** The pre-commit gate (ADR-0007) runs lint,
  typecheck, and tests on every commit. Without Turborepo's cache and
  affected-package filtering that gate is slow enough that people bypass it.
- **Vendoring the stack baseline.** `standardDocs()` only lists `core/*.md`, so
  anything left in `stack/` sits in `node_modules/` where no agent reads it and
  `sync` never updates it.

## Consequences

- `VERSION` bumped to 0.5.0.
- `lattice init` behaviour changes: greenfield projects get a full application
  tree, not four config files. `--stack=minimal` reproduces the old output.
- `.lattice/` may now contain a stack doc and hook scripts, not just `core/*.md`.
  `sync` and `check` cover them, so stack rules propagate like everything else.
- Consuming projects install their own peer dependencies (Next, React, Clerk,
  Supabase, Tailwind, Vitest). `lattice-standards` itself stays
  zero-runtime-dependency per ADR-0004.
- The template pins external API surfaces that move fast (Clerk Core 3, Supabase
  key naming, Turborepo 2.x config). Refreshing them is now recurring
  maintenance on this repo rather than a per-project problem.
- `adopt` is unchanged and still imposes no stack config on a client repo.
