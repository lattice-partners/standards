# Lattice Stack Baseline

Rules for projects on the Lattice stack: a Next.js monorepo on Supabase, Clerk,
and Vercel. Setup instructions live in `stack/<service>/README.md` in the
standards repo; this file is the part that must hold in the code.

## Layout

```text
apps/web/     Next.js App Router. All UI. Tailwind and shadcn/ui.
apps/api/     Next.js. Route handlers only, no pages, no UI.
supabase/     config.toml and forward-only migrations.
```

- Shared TypeScript config lives in `tsconfig.base.json`; each app extends it.
- `apps/web` reaches `apps/api` through the `/api/*` rewrite in
  `apps/web/next.config.ts`, which reads `process.env.API_URL`. Never hardcode
  that destination: a fixed URL points every preview deployment at production.
- Business logic belongs in the app that owns it. Do not import across
  `apps/web` and `apps/api`; extract a workspace package instead.

## Authorization

Authorization is enforced in the database, not in application code.

- **Every table has Row Level Security enabled**, in the same migration that
  creates it, before any policy is added.
- **Policies are written against Clerk claims**, read as text:
  `auth.jwt()->>'sub'` for the user, and organisation scope from
  `coalesce(auth.jwt()->>'org_id', auth.jwt()->'o'->>'id')` because the claim
  has two shapes depending on session token version.
- **Never `auth.uid()`.** It reads `sub` and casts it to uuid. Clerk subjects
  look like `user_2abc...`, so the cast yields null and the policy quietly
  denies everything, which reads as a broken feature rather than a broken
  policy.
- **Identity columns are `text`, never `uuid`**, for the same reason.
- Index the columns a policy filters on. RLS predicates run per row.
- **Server-side clients forward the Clerk session** so policies apply:
  `createClient(url, publishableKey, { accessToken: async () => session?.getToken() ?? null })`.
- **The secret key bypasses RLS.** It is for trusted background jobs only, never
  for a request made on behalf of a user, and never as a way past a denied
  query.
- A route handler still checks the session before doing work. RLS is the floor,
  not the only check.

## Environment variables

| Variable | Scope |
| -------- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL` | public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | public |
| `SUPABASE_SECRET_KEY` | **server only** |
| `CLERK_SECRET_KEY` | **server only** |
| `API_URL` | server only |

- Anything prefixed `NEXT_PUBLIC_` is inlined into the client bundle and is
  readable by every visitor. A secret there is a public secret.
- `.env.example` holds names and placeholders. Real values live in the hosting
  provider's dashboard.
- Add every new variable to `.env.example` in the same change.

## Migrations

- **Forward-only.** Add a new migration; never edit one that has already run.
- Destructive statements (`drop table`, `drop column`, `truncate`,
  `disable row level security`) require the marker
  `-- lattice:destructive-approved` in the file, added only after a human has
  agreed to the data loss.
- Regenerate types after a schema change and commit them with the migration.
- Never run a migration against production to work around a local problem.

## Deploys

- One Vercel project per app, each with its own Root Directory.
- `dev` deploys to staging. `main` deploys to production, behind manual
  promotion.
- Public endpoints are rate-limited. `core/security-baseline.md` requires it and
  the platform provides it.

## Tests

Every app has a test runner wired up and at least one real test. A feature ships
with unit tests; critical paths get integration coverage.
