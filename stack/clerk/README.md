# Clerk

Auth for the Lattice stack. Clerk issues the session; Supabase trusts it as a
third-party JWT provider so RLS policies can read its claims.

Requires `@clerk/nextjs` v7 (Core 3, March 2026) and Node.js 20.9 or newer.

## 1. Install

### Recommended: Vercel Marketplace

Clerk is a native Vercel Marketplace integration. Install it per Vercel project.

```bash
vercel link            # in apps/web
vercel integration add clerk
```

This provisions the environment variables on the Vercel project directly:

- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

Billing is unified with Vercel and there is no key to copy by hand, which is the
point: a key that is never pasted is never pasted into the wrong project.

Pull the values down for local work:

```bash
vercel env pull .env.local
```

Run `vercel integration add clerk` for `apps/api` as well, or copy the same two
variables into that project. Both apps validate against the same Clerk instance.

### Fallback: manual setup

If the project is not on Vercel, create the application at
<https://dashboard.clerk.com>, then copy both keys from **API Keys** into the
host's environment configuration and into `.env.local`.

`CLERK_SECRET_KEY` is server-only. It must never carry a `NEXT_PUBLIC_` prefix.

### SDK

```bash
npm install @clerk/nextjs --workspace apps/web
npm install @clerk/nextjs --workspace apps/api
```

Upgrading an existing app from an older major:

```bash
npx @clerk/upgrade
```

## 2. Middleware

`clerkMiddleware()` is the entry point. `authMiddleware()` was removed in Core 3.

Next.js 16 renamed `middleware.ts` to `proxy.ts`. The code is identical; only
the filename changes. Use `proxy.ts` on Next.js 16 and above, `middleware.ts` on
15 and below. Place it at the app root, or in `src/` if the app has one.

### `apps/web`

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/settings(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const proxyConfig = {
  matcher: [
    // Skip Next.js internals and static files.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes.
    '/(api|trpc)(.*)',
  ],
}
```

`auth.protect()` is called directly on `auth` and is awaited. It is no longer a
method on the value returned by `auth()`.

### `apps/api`

Every route handler is authenticated, so protect everything and let individual
handlers opt out if they must.

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Third-party webhooks authenticate by signature, not by session.
const isPublicRoute = createRouteMatcher(['/api/webhooks(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const proxyConfig = {
  matcher: ['/(api|trpc)(.*)'],
}
```

Public here means "no Clerk session", not "unauthenticated". A webhook route
still verifies the provider's signature server-side before doing anything, and
is still rate limited (see `stack/vercel/README.md`).

`apps/web` rewrites `/api/*` to `apps/api`, so a browser request crosses two
middleware stacks. Both must run `clerkMiddleware()` or the second one has no
session to read.

## 3. Provider and pages

```tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

In Core 3 `ClerkProvider` no longer forces dynamic rendering. Pass `dynamic` if
a route needs it. When using Next.js cache components, put `<ClerkProvider>`
inside `<body>` rather than wrapping `<html>`.

Catch-all sign-in and sign-up routes:

```tsx
import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return <SignIn />
}
```

```env
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

## 4. Reading the session server-side

`auth()` is async in Core 3. `const { userId } = auth()` silently yields
`undefined` and is the single most common upgrade bug.

```tsx
import { auth, currentUser } from '@clerk/nextjs/server'

export default async function Page() {
  const { userId } = await auth()
  const user = await currentUser()

  return <p>{user?.firstName}</p>
}
```

```ts
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return Response.json({ userId })
}
```

Check `userId` inside the handler even when middleware already protects the
route. Middleware matchers are easy to get subtly wrong, and the handler is the
last line of defence.

`clerkClient()` is also async: `const client = await clerkClient()`.

Never log the session token, `CLERK_SECRET_KEY`, or the full user object.

## 5. Passing the Clerk session to Supabase

Supabase is configured to trust Clerk as a third-party issuer (see
`stack/supabase/README.md`). The Supabase client takes an `accessToken`
callback, and every request it makes carries the Clerk session token. Postgres
then evaluates RLS policies against that token's claims.

Client side:

```ts
'use client'

import { useSession } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export function useSupabaseClient() {
  const { session } = useSession()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { accessToken: async () => (await session?.getToken()) ?? null },
  )
}
```

Server side, in a route handler or Server Component:

```ts
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function createSupabaseClient() {
  const { getToken } = await auth()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { accessToken: async () => (await getToken()) ?? null },
  )
}
```

Both use the publishable key. The publishable key does not bypass RLS: the
Clerk token is what grants access, and it grants exactly what the policies
allow. This is why `SUPABASE_SECRET_KEY` is not the default path.

### Claims available to policies

Clerk session token claims that policies commonly use:

| Claim | Contents |
| --- | --- |
| `sub` | Clerk user ID, for example `user_2abc...` |
| `role` | Must be `authenticated` for Supabase to assign the right Postgres role |
| `org_id` / `o.id` | Active organization |
| `org_role` / `o.rol` | Role within that organization |
| `fva` | Second-factor verification age |

```sql
create policy "Org admins insert"
on public.documents for insert
to authenticated
with check (
  (
    (select auth.jwt() ->> 'org_role') = 'org:admin'
    or (select auth.jwt() -> 'o' ->> 'rol') = 'admin'
  )
  and organization_id = (
    select coalesce(auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')
  )
);
```

Store the Clerk user ID as `text`. It is not a UUID.

If `role` is missing from the token, Supabase runs the request as `anon` and
every `to authenticated` policy denies. That failure looks like a broken query,
not a broken auth config, so check the token first when policies deny
unexpectedly.

## Core 3 breaking changes

Relevant to code in this stack:

- `auth()` is async: `await auth()`.
- `await auth.protect()`, called on `auth` directly.
- `clerkClient()` is async: `await clerkClient()`.
- `authMiddleware()` removed. Use `clerkMiddleware()`.
- `@clerk/types` deprecated. Import types from SDK subpath exports, for example
  `import type { UserResource } from '@clerk/react/types'`.
- `ClerkProvider` no longer forces dynamic rendering.
- Node.js 20.9 or newer required.

## Reference

- <https://clerk.com/docs/quickstarts/nextjs>
- <https://clerk.com/docs/reference/nextjs/clerk-middleware>
- <https://clerk.com/docs/deployments/vercel>
- <https://supabase.com/docs/guides/auth/third-party/clerk>
