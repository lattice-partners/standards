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

// Route handlers only. This app renders no UI, so there is nothing to optimise
// for the browser here. Keep it that way: UI belongs in apps/web.
const nextConfig: NextConfig = {
  poweredByHeader: false,
}

export default nextConfig
