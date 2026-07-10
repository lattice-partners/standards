# Lattice stack configs

Shared config for the Lattice stack (TypeScript, Node 24, Next, Vercel,
Supabase). Applied fully on greenfield projects; used selectively when we are
guests in a client repo.

## eslint

`eslint/eslint.config.mjs` - flat ESLint config, strict TypeScript.

Required devDependencies in the consuming project:

```bash
npm i -D eslint typescript typescript-eslint @eslint/js
```

Use it by re-exporting from your project `eslint.config.mjs`:

```js
export { default } from '@lattice/standards/stack/eslint/eslint.config.mjs'
```

## prettier

`prettier/prettier.config.mjs` - formatting defaults.

```js
export { default } from '@lattice/standards/stack/prettier/prettier.config.mjs'
```

`lattice init` writes both re-export files for greenfield projects, so a new
project inherits these without copying them.
