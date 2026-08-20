# Lattice stack configs

Shared config and setup guides for the Lattice stack (TypeScript, Node 24,
Next.js, Vercel, Supabase, Clerk). Applied fully on greenfield projects; used
selectively when we are guests in a client repo.

The stack itself is decided in
`docs/adr/0006-lattice-stack-nextjs-supabase-clerk-vercel.md`. `stack-baseline.md`
holds the enforceable rules and is vendored into a consuming project's
`.lattice/`, so agents working in that repo read it and `lattice sync` keeps it
current. The guides below cover how to set each piece up and why, and stay here.

## Contents

| Path | What it is |
| --- | --- |
| `stack-baseline.md` | The enforceable rules. Vendored into `.lattice/` |
| `eslint/` | Flat ESLint configs: a strict TypeScript base, plus a Next.js layer |
| `prettier/` | Formatting defaults |
| `nextjs/` | Monorepo layout, App Router conventions, the web-to-api rewrite |
| `supabase/` | Project setup, Clerk third-party auth, migrations, Storage, backups |
| `clerk/` | Marketplace install, middleware, route protection, Supabase claims |
| `vercel/` | One project per app, environments, manual promotion, rate limiting |

`eslint/` and `prettier/` ship config files that consuming projects re-export.
`nextjs/`, `supabase/`, `clerk/`, and `vercel/` are setup guides with no
shipped config.

## eslint

`eslint/eslint.config.mjs` - flat ESLint config, strict TypeScript. Use this on
its own for libraries, services, and any non-React workspace.

Required devDependencies in the consuming project:

```bash
npm i -D eslint typescript typescript-eslint @eslint/js
```

Use it by re-exporting from your project `eslint.config.mjs`:

```js
export { default } from '@lattice/standards/stack/eslint/eslint.config.mjs'
```

`eslint/next.config.mjs` - the same base plus Next.js, React, React Hooks, and
jsx-a11y rules. Use this in `apps/web` and `apps/api`.

Required devDependencies, in addition to the base four:

```bash
npm i -D @next/eslint-plugin-next eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y
```

```js
export { default } from '@lattice/standards/stack/eslint/next.config.mjs'
```

It composes the base rather than replacing it, so the strict TypeScript rules
still apply. It deliberately does not spread `eslint-config-next`, which
re-assigns the parser for `.js`, `.jsx`, and `.mjs` files and breaks the
type-aware rules the base turns on.

`eslint-plugin-react` and `eslint-plugin-jsx-a11y` currently declare ESLint 9 as
their maximum supported peer, so a project using `next.config.mjs` should pin
`eslint@^9` and `@eslint/js@^9`.

## prettier

`prettier/prettier.config.mjs` - formatting defaults.

Required devDependencies in the consuming project:

```bash
npm i -D prettier
```

```js
export { default } from '@lattice/standards/stack/prettier/prettier.config.mjs'
```

`lattice init` writes both re-export files for greenfield projects, so a new
project inherits these without copying them.

## Setup guides

- [`nextjs/README.md`](./nextjs/README.md) - workspace layout, `apps/web` and
  `apps/api`, `tsconfig.base.json`, proxying `/api/*` via `API_URL`.
- [`supabase/README.md`](./supabase/README.md) - project setup, Point-in-Time
  Recovery, CLI linking, Clerk third-party auth, migrations, type generation,
  Storage policies, key naming.
- [`clerk/README.md`](./clerk/README.md) - Vercel Marketplace install,
  `clerkMiddleware()`, route protection, reading the session server-side,
  passing the session token to Supabase.
- [`vercel/README.md`](./vercel/README.md) - one project per app, branch to
  environment mapping, manual promotion to production, environment variables,
  rate limiting with Vercel Firewall.
