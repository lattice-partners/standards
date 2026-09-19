---
name: lattice-stack
description: How to set up the typical Lattice stack (Supabase, Clerk, Vercel). Use when standing up or extending stack pieces the project has not opted out of.
---

# Lattice stack

Skip this skill when `weave.md` opted out of the relevant tool.

## Layout (when we own the repo)

```text
apps/web/     Next.js App Router. All UI.
apps/api/     Next.js route handlers only, no UI.
supabase/     config.toml and forward-only migrations.
```

- `apps/web` proxies `/api/*` to `apps/api` via `API_URL` in
  `next.config.ts`. Never hardcode the API URL.
- Do not import across `apps/web` and `apps/api`; use a workspace package.

## Supabase

- One project per environment. Enable Point-in-Time Recovery before first
  migration.
- Link: `npx supabase login`, `npx supabase link --project-ref <ref>`.
- Clerk is the auth provider; configure Third-Party Auth in Supabase (not the
  deprecated JWT template flow).
- **Every table:** RLS enabled in the same migration that creates it.
- Policies use Clerk claims as text: `auth.jwt()->>'sub'`, org from
  `coalesce(auth.jwt()->>'org_id', auth.jwt()->'o'->>'id')`.
- Never `auth.uid()`. Identity columns are `text`, not `uuid`.
- Secret key bypasses RLS: background jobs only, never user requests.
- Forward-only migrations. Destructive SQL needs
  `-- lattice:destructive-approved` after human approval.
- Regenerate and commit types after schema changes.

## Clerk

- Prefer Vercel Marketplace integration per app (`vercel integration add clerk`).
- `CLERK_SECRET_KEY` is server-only. Never `NEXT_PUBLIC_`.
- Use `@clerk/nextjs` v7+. `clerkMiddleware()` in middleware.
- Forward session to Supabase server client:
  `createClient(url, publishableKey, { accessToken: async () => session?.getToken() ?? null })`.

## Vercel

- One Vercel project per app with correct Root Directory.
- Enable "Include source files outside of the Root Directory".
- `main` -> production (manual promotion). `dev` -> staging environment.
- Rate-limit public endpoints at the edge when available.

## Environment variables

| Variable | Scope |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | public |
| `SUPABASE_SECRET_KEY` | server only |
| `CLERK_SECRET_KEY` | server only |
| `API_URL` | server only |

Add new vars to `.env.example` in the same change. Real values in the host
dashboard, not the repo.
