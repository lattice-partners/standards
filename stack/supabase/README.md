# Supabase

Setup for the Lattice stack. Supabase is the database, Storage, and Realtime
layer. Auth is Clerk (see `stack/clerk/README.md`); Supabase Auth is not used to
sign users in.

Row Level Security is mandatory on every table. Authorization is enforced in the
database, not in `apps/api`, per `core/security-baseline.md`.

## 1. Create the project

Create the project in the Supabase dashboard. Record the project ref (the
`<project-id>` in `https://supabase.com/dashboard/project/<project-id>`) and
store the database password in the team password manager, not in the repo.

One Supabase project per deploy environment. Production and staging never share
a database.

## 2. Enable Point-in-Time Recovery

Do this before the first migration lands, not after the first incident.

Dashboard: **Settings > Add-ons > Point-in-Time Recovery**. Requires the Pro
plan or higher, plus at least a Small compute add-on.

Without it the only restore points are daily backups: Pro keeps the last 7 days
of *daily* snapshots, Team 14, Enterprise 30. Restoring to yesterday's snapshot
loses up to a day of writes. PITR archives write-ahead log files (every two
minutes by default, more often under load), so recovery granularity is seconds.

This is the only real undo in the stack. Migrations are one-way, `apps/api`
writes are one-way, and a bad `delete` under a permissive RLS policy is one-way.
Treat PITR as a required setup step and record the retention period in
`memory/project-details.md`.

Two caveats worth knowing before you rely on it:

- Restores take the project offline for the duration. Size the downtime before
  you need it.
- Database backups do not cover Storage objects. The database only holds object
  metadata. Restoring the database does not bring back deleted files.

Never run `supabase db reset --linked` against production. It drops the remote
schema and replays local migrations.

## 3. Link the CLI

```bash
supabase init                          # creates supabase/config.toml
supabase login
supabase link --project-ref <project-id>
supabase start                         # local stack, needs Docker
```

Commit `supabase/config.toml`, `supabase/migrations/`, and `supabase/seed.sql`.
Do not commit `supabase/.temp/` or `supabase/.branches/`.

`config.toml` holds no secrets by default. If a value is sensitive, reference an
environment variable with `env()` instead of inlining it.

## 4. Wire up Clerk as a third-party auth provider

Supabase trusts JWTs issued by Clerk, so RLS policies can read Clerk session
claims. The old Clerk JWT-template integration was deprecated on 1 April 2025
because it required sharing the project JWT secret with a third party and
rotating that secret caused downtime. Do not use it.

**Hosted project.** Configure the Clerk instance for Supabase at
<https://dashboard.clerk.com/setup/supabase>, then add a Third-Party Auth
integration under **Authentication > Third-Party Auth** in the Supabase
dashboard.

**Local and CI.** Add the same integration to `supabase/config.toml`:

```toml
[auth.third_party.clerk]
enabled = true
domain = "example.clerk.accounts.dev"
```

The domain is the Clerk Frontend API domain for that instance. It differs
between the Clerk development and production instances, so keep the local value
pointed at the development instance.

Supabase reads the `role` claim to pick the Postgres role for a request. Clerk's
Connect with Supabase flow adds `role: "authenticated"` to session tokens. If it
was configured by hand, verify the claim is present before writing policies:
without it every request runs as `anon` and every `to authenticated` policy
silently denies.

Client setup is in `stack/clerk/README.md`.

## 5. Migrations

Schema changes are migration files in `supabase/migrations/`. Nothing is applied
by hand in the dashboard SQL editor: it drifts from the repo and the next
`db push` cannot see it.

```bash
supabase migration new add_documents_table   # write SQL by hand
supabase db diff -f add_documents_table      # or generate from local changes
supabase db reset                            # replay all migrations + seed
```

`db diff` output is a draft. Read it before committing. It emits redundant
`GRANT` and revoke/re-grant lines, may include unexpected `DROP EXTENSION`
statements, and does not capture data changes at all.

Deploy:

```bash
supabase db push --dry-run   # review
supabase db push             # apply pending migrations
supabase migration list      # compare local against remote history
```

Every new table needs RLS in the same migration that creates it:

```sql
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  title text not null,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "Owners read their documents"
on public.documents for select
to authenticated
using ((select auth.jwt() ->> 'sub') = owner_id);
```

`owner_id` is `text`, not `uuid`. It holds the Clerk user ID from the `sub`
claim, which is a string like `user_2abc...`.

Never use `--include-seed` against production.

## 6. Type generation

```bash
supabase gen types --lang typescript --local > packages/db/src/database.types.ts
```

Use `--linked` to generate from the remote project instead. Regenerate whenever
the schema changes and commit the result, so type errors show up in CI rather
than at runtime.

## 7. Storage buckets

Buckets are private by default and every operation goes through RLS policies on
`storage.objects`. Public buckets bypass access control on read: anyone with the
URL gets the file.

- Private bucket for anything user-specific or confidential. Read it through a
  signed URL or an authenticated download.
- Public bucket only for assets that are genuinely public (avatars, blog
  images). Uploads, deletes, moves, and copies are still policy-controlled.

Scope every policy by bucket, and scope user content by a per-user path prefix:

```sql
create policy "Users upload into their own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);

create policy "Users read their own objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);
```

Upload restrictions (max file size, allowed MIME types) are set on the bucket,
not in application code. Set them: a client that skips validation cannot
override a bucket limit.

Storage policies live in migrations like any other policy.

## 8. Environment variables

Use the new API key format. The legacy `anon` and `service_role` keys are
derived from the project JWT secret, cannot be rotated without downtime, and are
being retired at the end of 2026.

| Variable | Key | Where it may appear |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Client and server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Client and server |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` | Server only |

Create both keys under **Settings > API Keys**, tab **Publishable and secret API
keys**.

`SUPABASE_SECRET_KEY` is server-only and must never carry a `NEXT_PUBLIC_`
prefix. Next.js inlines every `NEXT_PUBLIC_*` variable into the client bundle,
so prefixing it publishes it to every visitor. The secret key **bypasses Row
Level Security entirely** and has full read and write access to every table and
bucket. Leaking it is equivalent to leaking the database.

Consequences that follow from that:

- Use it only in `apps/api` route handlers, and only where a request genuinely
  cannot be expressed as a user-scoped query.
- Reaching for it because an RLS policy is inconvenient defeats the entire
  authorization model. Fix the policy.
- Issue a separate named secret key per backend component so a single leak
  forces one rotation, not all of them.
- Secret keys are not JWTs. Anything that previously sent `service_role` on an
  `Authorization: Bearer` header (`pg_net`, Database Webhooks) must send the
  secret key on the `apikey` header instead, and read it from Vault rather than
  hardcoding it in SQL.

Nothing above goes in the repo. `.env.local` is gitignored; Vercel holds the
deployed values.

## Reference

- <https://supabase.com/docs/guides/auth/third-party/clerk>
- <https://supabase.com/docs/guides/platform/backups>
- <https://supabase.com/docs/guides/getting-started/api-keys>
- <https://supabase.com/docs/guides/storage/security/access-control>
- <https://supabase.com/docs/guides/local-development/cli-workflows>
