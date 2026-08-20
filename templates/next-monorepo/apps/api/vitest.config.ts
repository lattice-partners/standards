import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// No env loading here on purpose. Vitest runs with NODE_ENV=test, and Next's
// own loader skips .env.local in that mode so tests cannot depend on one
// machine's local overrides. A test that needs a value should be handed it
// explicitly, or set it here under `test.env`.
export default defineConfig({
  // Mirrors the `@/*` path alias in tsconfig.json. Vitest does not read
  // tsconfig paths on its own.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
