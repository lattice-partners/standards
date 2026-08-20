// Lattice stack ESLint config for Next.js apps (flat).
// Layers Next.js, React, React Hooks, and jsx-a11y rules on top of
// `./eslint.config.mjs`. The base stays in use on its own for non-React code.
//
// Consuming projects need the base devDependencies plus:
//   @next/eslint-plugin-next eslint-plugin-react eslint-plugin-react-hooks
//   eslint-plugin-jsx-a11y
//
// We compose the plugins directly rather than spreading `eslint-config-next`,
// which re-assigns the parser for `.js`/`.jsx`/`.mjs` files and breaks the
// type-aware rules the base config turns on.
import next from '@next/eslint-plugin-next'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import base from './eslint.config.mjs'

export default [
  ...base,
  // Globbed with ** so build output is ignored anywhere in the tree. A bare
  // `.next/` resolves against the directory holding this config, which in a
  // monorepo is the root, so apps/*/.next was linted and every build broke lint
  // with parse errors on generated .d.ts files.
  { ignores: ['**/.next/**', '**/out/**', '**/.turbo/**', '**/dist/**', '**/next-env.d.ts'] },
  {
    name: 'lattice/next',
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@next/next': next,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      // The App Router uses the React 17+ JSX transform and TypeScript props.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
]
