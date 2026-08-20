-- Example schema. Rename or delete it once the real domain model exists, but
-- keep the shape: identity columns hold Clerk ids, RLS is on before any policy,
-- and every policy is written against Clerk claims.
--
-- Why not auth.uid(): that helper reads the `sub` claim and casts it to uuid.
-- Clerk subjects look like `user_2abc...`, so the cast fails or yields null and
-- the policy quietly denies everything. Read the claim directly as text.
--
-- Clerk organization claims come in two shapes depending on session token
-- version, so read both: `org_id` / `org_role` on the older shape, and
-- `o.id` / `o.rol` on the newer compact shape.

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  -- Clerk user id, for example user_2abc... Text, never uuid.
  owner_id text not null,
  -- Clerk organization id, for example org_2xyz...
  organization_id text not null,
  title text not null check (length(title) between 1 and 200),
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS before writing a single policy. Between `create table` and
-- `enable row level security` the table is readable by anyone holding the
-- publishable key, and that key ships to every browser.
alter table public.documents enable row level security;

-- RLS predicates run per row, so the columns they filter on need indexes.
create index documents_organization_id_idx on public.documents (organization_id);
create index documents_owner_id_idx on public.documents (owner_id);

-- Read: anyone in the same Clerk organization.
create policy "documents_select_same_org"
on public.documents
for select
to authenticated
using (
  organization_id = (select coalesce(auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id'))
);

-- Write: only as yourself, only into your own organization. Checking both stops
-- a caller from planting rows under someone else's id or tenant.
create policy "documents_insert_self"
on public.documents
for insert
to authenticated
with check (
  owner_id = (select auth.jwt() ->> 'sub')
  and organization_id = (select coalesce(auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id'))
);

create policy "documents_update_own"
on public.documents
for update
to authenticated
using (owner_id = (select auth.jwt() ->> 'sub'))
with check (
  owner_id = (select auth.jwt() ->> 'sub')
  and organization_id = (select coalesce(auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id'))
);

-- Delete: the owner, or an organization admin cleaning up after someone.
create policy "documents_delete_own_or_org_admin"
on public.documents
for delete
to authenticated
using (
  organization_id = (select coalesce(auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id'))
  and (
    owner_id = (select auth.jwt() ->> 'sub')
    or (select auth.jwt() ->> 'org_role') = 'org:admin'
    or (select auth.jwt() -> 'o' ->> 'rol') = 'admin'
  )
);

-- Restrictive policies AND with everything above, so this one blocks writes
-- from sessions that have not passed second factor verification. Clerk reports
-- '-1' in the second element of `fva` when the factor was never satisfied.
create policy "documents_delete_requires_second_factor"
on public.documents
as restrictive
for delete
to authenticated
using ((select auth.jwt() -> 'fva' ->> 1) is distinct from '-1');

-- Keep updated_at honest: application code forgets, triggers do not.
create function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_set_updated_at
before update on public.documents
for each row
execute function public.set_updated_at();
