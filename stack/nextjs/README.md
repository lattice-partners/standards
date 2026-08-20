# Next.js

How the Lattice stack lays out a Next.js monorepo. Rationale is in
`docs/adr/0006-lattice-stack-nextjs-supabase-clerk-vercel.md`.

## Repository shape

npm workspaces plus Turborepo. Two apps, deployed independently.

```text
.
├── apps
│   ├── api            # Next.js, App Router route handlers only
│   └── web            # Next.js App Router, Tailwind, shadcn/ui
├── supabase           # config.toml, migrations, seed.sql
├── package.json       # workspaces: ["apps/*", "packages/*"]
├── tsconfig.base.json
└── turbo.json
```

```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

Shared code goes in `packages/*` as a workspace package, not in a relative
import that reaches across `apps/`. Anything imported by both apps needs a
package boundary so Turborepo can cache and filter on it.

## Why `apps/api` is route handlers only

`apps/api` is a Next.js app with no `page.tsx` and no root layout. It exposes
`src/app/api/**/route.ts` and nothing else.

A second framework (Hono, Express) would mean two runtimes, two deploy targets,
and two middleware stacks to keep in sync with Clerk. A Next.js app with no
pages is the smallest thing that gives a separately deployable backend on the
same toolchain.

Route handlers are for external integrations: third-party webhooks, public REST
endpoints, and anything a non-browser client calls. Mutations triggered from the
`apps/web` UI should be Server Actions in `apps/web`, not a round trip through
`apps/api`.

## App Router conventions

Both apps use `src/app`. Route files:

| File | Purpose |
| --- | --- |
| `layout.tsx` | Shared UI for a segment and its children |
| `page.tsx` | UI for a route segment |
| `loading.tsx` | Suspense fallback |
| `error.tsx` | Error boundary (must be a Client Component) |
| `not-found.tsx` | 404 UI |
| `route.ts` | API endpoint |

```text
apps/web/src
├── app
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (marketing)/          # route group, no URL segment
│   └── dashboard
│       ├── layout.tsx
│       ├── loading.tsx
│       └── page.tsx
├── components
│   └── ui/                   # shadcn/ui output
└── lib
    └── utils.ts              # cn()
```

Rules that bite in review:

- Components are Server Components by default. Add `'use client'` only at the
  leaf that needs state, effects, or browser APIs.
- A Client Component cannot be `async`. Fetch in a Server Component and pass
  serialisable props down.
- `params` and `searchParams` are Promises. `await` them.
- `cookies()` and `headers()` are async. `await` them.
- Prefix a folder with `_` to keep it out of routing (`_components`).
- `route.ts` and `page.tsx` cannot share a folder.

Next.js 16 renamed `middleware.ts` to `proxy.ts` (export `proxy`, config
`proxyConfig`). Use `proxy.ts` on 16 and above, `middleware.ts` on 15 and below.
`npx @next/codemod@latest upgrade` renames it.

## TypeScript configuration

One `tsconfig.base.json` at the repo root holds the compiler options every
workspace shares. Each app extends it and adds only what is app-specific.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`apps/api/tsconfig.json` extends the same base but keeps `lib` at `ES2022`.
There is no DOM in a route handler, and letting `apps/api` see DOM types is how
`document` and `window` end up in server code that only fails at runtime.

## Proxying `/api/*` from web to api

`apps/web` and `apps/api` are separate deployments on separate origins. Rather
than calling the API origin from the browser (which means CORS and a second
cookie domain), `apps/web` rewrites `/api/*` to `apps/api`.

```ts
import { fileURLToPath } from 'node:url'
import { loadEnvConfig } from '@next/env'
import type { NextConfig } from 'next'

// One .env.local at the monorepo root feeds both apps. Next only looks for
// .env* inside the app directory, so point it at the root explicitly.
const monorepoRoot = fileURLToPath(new URL('../../', import.meta.url))
loadEnvConfig(monorepoRoot, process.env.NODE_ENV === 'development', console, true)

const apiUrl = process.env.API_URL

if (!apiUrl) {
  throw new Error('API_URL is not set. Set it in Vercel and in .env.local at the repo root.')
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }]
  },
}

export default nextConfig
```

`API_URL` must come from the environment, per environment. A hardcoded value
points every preview deployment at the production API: a branch that has not
been reviewed writes to production data, and a staging test looks like it
passed when it actually hit prod. The same mistake in reverse points production
at a preview URL that is deleted a week later.

Set it per environment:

- Production: the `apps/api` production domain.
- Preview and staging: the `apps/api` deployment for the same environment.
- Local: `http://localhost:3001` in `.env.local`, with `apps/api` on a
  different port than `apps/web`.

Throw at config load when it is missing. A missing rewrite target fails as a
confusing 404 at request time otherwise.

`API_URL` is not `NEXT_PUBLIC_`. The rewrite runs on the server. Anything
prefixed `NEXT_PUBLIC_` is inlined into the client bundle and is public.

## Local development

```bash
npm install
npx turbo dev              # both apps
npx turbo dev --filter=web # one app
```

## Reference

- <https://nextjs.org/docs/app>
- <https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites>
- <https://nextjs.org/docs/app/api-reference/file-conventions>
