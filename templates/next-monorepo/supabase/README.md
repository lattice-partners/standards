# Supabase

Schema lives in `migrations/`. Local config lives in `config.toml`. Nothing in
this directory is edited by hand against a live database.

## First-time setup

```bash
npm i -g supabase
supabase login
supabase link --project-ref <project-ref>
```

`<project-ref>` is the string in the project's dashboard URL.

The local stack needs the Clerk instance domain to verify session tokens.
Put it in a `.env` at the repo root (gitignored; the Supabase CLI reads that
file specifically, not `.env.local`):

```bash
SUPABASE_AUTH_THIRD_PARTY_CLERK_DOMAIN=example.clerk.accounts.dev
```

Then start the local stack:

```bash
supabase start
```

## Turn on backups before anything reaches production

Do this as part of setup, not after the first incident. It is the only thing on
this page that cannot be fixed retroactively.

1. Confirm the project is on the Pro plan or above. Free projects get no
   automated backups at all.
2. Enable the Point-in-Time Recovery add-on in **Settings > Add-ons**. PITR
   needs at least the Small compute add-on to run smoothly.
3. Choose a retention window. Seven days is the floor; pick longer if the data
   is financial or regulated.
4. Record the restore procedure in the project RUNBOOK so the person on call
   does not have to work it out under pressure.

Without PITR you get daily snapshots, which means a bad migration at 4pm costs
you every write since midnight. With PITR the recovery point objective is about
two minutes. Enabling PITR replaces daily backups; running both is pointless.

Storage objects are not included in database backups. If the project stores
files, arrange for those separately.

## Migration workflow

Write the SQL yourself. Never change a live schema through the dashboard, and
never edit a migration that has already been pushed.

```bash
supabase migration new add_documents_status
```

Edit the generated file in `migrations/`, then apply it locally:

```bash
supabase migration up
```

To rebuild the local database from scratch:

```bash
supabase db reset
```

That drops all local data. It is blocked for AI agents by
`.claude/settings.json` for exactly that reason.

Push to the linked project once the change is reviewed and merged:

```bash
supabase db push
```

## Row Level Security

Every table gets RLS enabled in the same migration that creates it, before any
policy is added. See `migrations/00000000000000_init.sql` for the pattern.

Policies are written against Clerk claims, read from `auth.jwt()`:

| Claim                                                        | Meaning                                   |
| ------------------------------------------------------------ | ----------------------------------------- |
| `auth.jwt() ->> 'sub'`                                       | Clerk user id, for example `user_2abc...` |
| `auth.jwt() ->> 'org_id'` or `auth.jwt() -> 'o' ->> 'id'`    | Clerk organization id                     |
| `auth.jwt() ->> 'org_role'` or `auth.jwt() -> 'o' ->> 'rol'` | Role in that organization                 |

Do not use `auth.uid()`. It casts the `sub` claim to a uuid, and Clerk subjects
are not uuids, so the policy silently denies everything.

## Generating types

Run this after every schema change and commit the result:

```bash
supabase gen types typescript --linked > packages/types/database.ts
```

For the local stack instead of the linked project:

```bash
supabase gen types typescript --local > packages/types/database.ts
```

Pass the generated `Database` type into `createClient<Database>(...)` so queries
are checked at compile time.

## Keys

The apps use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`) and,
for system-level jobs only, `SUPABASE_SECRET_KEY` (`sb_secret_...`). The legacy
`anon` and `service_role` keys are derived from the project JWT secret and
cannot be rotated without downtime; do not reintroduce them.

The secret key bypasses RLS. It never belongs in a request handler that is
answering on behalf of a user.
