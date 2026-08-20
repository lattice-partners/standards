import { fileURLToPath } from 'node:url'
import { loadEnvConfig } from '@next/env'
import type { NextConfig } from 'next'

// One .env.local at the monorepo root feeds both apps. Next only looks for
// .env* inside the app directory, so point it at the root explicitly. Two files
// kept in sync by hand is a trap for whoever is driving this project.
//
// forceReload is required: Next loads and caches the app-level env before it
// evaluates this config, and without it the second call is a no-op.
//
// Values already in process.env win, so Vercel's injected vars are untouched.
const monorepoRoot = fileURLToPath(new URL('../../', import.meta.url))
loadEnvConfig(monorepoRoot, process.env.NODE_ENV === 'development', console, true)

// The api app is a separate deployment with a different origin per environment.
// Reading it from env is what keeps a preview deployment talking to its own
// preview api instead of silently writing to production.
const apiUrl = process.env.API_URL

const nextConfig: NextConfig = {
  rewrites: () => {
    if (!apiUrl) {
      throw new Error(
        'API_URL is not set. Copy .env.example to .env.local at the repo root and set it, or add it to the Vercel project for this environment.',
      )
    }
    return Promise.resolve([{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }])
  },
}

export default nextConfig
