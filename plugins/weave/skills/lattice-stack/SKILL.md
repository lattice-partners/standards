---
name: lattice-stack
description: How to set up the typical Lattice stack (Supabase, Clerk, Vercel). Use when standing up or extending stack pieces the project has not opted out of.
---

# Lattice stack

Skip this skill when `weave.md` opted out of the relevant tool, and when
`principle-demo` applies (mock-up pages, no live database).

## Setup

Ideally, create a new organization for Supabase, Clerk, AND Vercel. This makes transfer to the client much easier and the cost is marginal. If it's an internal Lattice project or not serious yet, we can just use the Lattice orgs.

## Layout

**Single Next.js app:** the repo root is the app. `supabase/` sits beside it.

**Monorepo:**

```text
apps/web/      Next.js App Router: UI and route handlers.
apps/server/   Separate long-running API. Its own staging and production deploys.
supabase/      config.toml and forward-only migrations.
```

- Do not import across `apps/web` and `apps/server`; share code through a workspace package.
- `apps/web` calls `apps/server` with `API_URL` (server-only). Local may use the staging API or `localhost` while the server runs on the laptop. The Vercel `dev` deploy uses the staging API. Production uses the production API. Never hardcode the URL.
- `apps/server` is a project we run ourselves. Prefer Vercel when the process can run there. Use Railway when it needs a long-running process Vercel cannot host. Either host gets its own staging and production deploys. It follows this skill: same Clerk and Supabase pairing, same key rules, same migrations discipline as `apps/web`.

## Supabase

- One Supabase project.
- Staging is a persistent branch connected to GitHub `dev`. Production is the production branch on `main`.
- The Vercel `dev` deploy uses the staging branch URL and keys. Production uses the production branch. Local may use the staging branch, or `supabase start` on the laptop.
- Link: `npx supabase login`, `npx supabase link --project-ref <ref>`.
- Clerk is the auth provider; configure Third-Party Auth in Supabase (not the deprecated JWT template flow).
- **Every table:** RLS in the same migration. Policies `to authenticated`.
- User-owned rows: match `auth.jwt()->>'sub'`. Org-owned rows: match `auth.jwt()->'o'->>'id'`. One owner column for personal or org context: `coalesce(auth.jwt()->'o'->>'id', auth.jwt()->>'sub')`.
- Never `auth.uid()`. Columns that store a Clerk user id (`sub`) or org id are `text`. Other ids may be `uuid`.
- Secret key bypasses RLS: trusted server/background only; never on user requests (do not send a user JWT with a secret-key client).
- Forward-only migrations. Destructive SQL needs `-- lattice:destructive-approved` after human approval.
- Migrations live in git. The staging branch applies migrations from `dev`; the production branch applies them from `main`. Day-to-day `supabase db push` targets the staging branch, and only when the pushed SQL is the same migration committed in git.
- Regenerate and commit types after schema changes.
- Migrations rule: no PII or emails in code-based migrations.

## Clerk

- `CLERK_SECRET_KEY` is server-only. Never `NEXT_PUBLIC_`.
- Use latest version of `@clerk/nextjs`. `clerkMiddleware()` in middleware.
- Forward session to Supabase server client: `createClient(url, publishableKey, { accessToken: async () => session?.getToken() ?? null })`.

## Clerk + Supabase auth (required when both are in stack)

Clerk handles sign-in; Supabase stores data. Supabase must trust **Clerk session tokens** (not Supabase Auth users) so RLS can read `auth.jwt()`.

Local and staging share the Clerk **Development** instance. Production uses the Clerk **Production** instance. Activate the Supabase integration once per instance, and register that instance's domain on the matching Supabase branch.

1. **Development (local + staging):** Dashboard → Development → Supabase integration → **Activate** (Connect with Supabase). That adds `role: authenticated` to session tokens. Save the **Clerk domain** (e.g. `xxx.clerk.accounts.dev`). On the **staging** branch: Authentication → Sign In / Providers → **Add provider → Clerk** → paste that domain → save. Keys are `pk_test_` / `sk_test_`.
2. **Production:** Switch to the Production instance → **Activate** → save that domain. On the **production** branch, add Clerk with that domain. Keys are `pk_live_` / `sk_live_`.
3. **Local Supabase (optional):** only if you run `supabase start`. In `supabase/config.toml`, enable third-party Clerk with the Development domain (`[auth.third_party.clerk]`, `enabled = true`, `domain = "..."`).
4. **App (server):** Pass the Clerk session token into the Supabase client — see the Clerk section (`getToken()` with **no** template name).

**Do not use the deprecated integration:** no Clerk JWT template named `supabase`, no `getToken({ template: 'supabase' })`, no syncing a custom JWT secret into Supabase for Clerk. That path is legacy; use Third-Party Auth above.

When in doubt, refer to the latest official docs: [Supabase + Clerk](https://supabase.com/docs/guides/auth/third-party/clerk), [Clerk + Supabase](https://clerk.com/docs/guides/development/integrations/databases/supabase).

Write RLS against Clerk claims per the Supabase section above; never `auth.uid()`.

## Vercel

- `dev` deploys to the staging environment. `main` reaches production only by manual promotion.
- When `apps/server` is on Vercel, it is its own project with the same `dev` / `main` mapping. On Railway, give it matching staging and production environments.

## Environment setup & variables

Local may use the staging value or a local substitute. Staging uses staging values only. Production uses production values only. Clerk has no local instance: local and staging both use the Development instance.

| Variable | Local | Staging (`dev`) | Production (`main`) | Scope |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | staging branch, or local Supabase CLI | staging branch | production branch | public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | staging branch, or local Supabase CLI | staging branch | production branch | public |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Development instance | Development instance | Production instance | public |
| `SUPABASE_SECRET_KEY` | staging branch, or local Supabase CLI | staging branch | production branch | server only |
| `CLERK_SECRET_KEY` | Development instance | Development instance | Production instance | server only |
| `API_URL` | staging deploy of `apps/server`, or localhost | staging deploy of `apps/server` | production deploy of `apps/server` | server only |

Omit `API_URL` when there is no `apps/server`. Add new vars to `.env.example` in the same change. Real values in the host dashboard, not the repo.
