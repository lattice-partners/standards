// Inherits the Lattice stack ESLint config for Next.js. Add project overrides below.
// Requires devDeps: @lattice/standards eslint typescript typescript-eslint @eslint/js
//   @next/eslint-plugin-next eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y
import next from '@lattice/standards/stack/eslint/next.config.mjs'

export default [
  // Flat-config ignore patterns resolve against the directory holding this
  // file, not the directory eslint was invoked from. In a monorepo that means
  // build output has to be matched with `**/`, otherwise `npm run lint` inside
  // an app starts linting that app's generated .next types after a build.
  {
    ignores: ['**/.next/**', '**/.turbo/**', '**/dist/**', '**/next-env.d.ts'],
  },
  ...next,
]
