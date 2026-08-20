// Lattice stack ESLint config (flat). Strict TypeScript.
// Consuming projects need these devDependencies:
//   eslint typescript typescript-eslint @eslint/js
import js from '@eslint/js'
import ts from 'typescript-eslint'

export default ts.config(
  { ignores: ['dist/', 'node_modules/', '.lattice/'] },
  js.configs.recommended,
  ...ts.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      eqeqeq: 'error',
    },
  },
  {
    // Config files sit outside every tsconfig include, so the type-aware rules
    // cannot resolve them and error before linting anything. Lint them without
    // type information rather than skipping them.
    files: ['**/*.config.{js,cjs,mjs,ts,mts,cts}', '**/*.setup.{js,cjs,mjs,ts}'],
    ...ts.configs.disableTypeChecked,
  },
)
