// Next.js 16 renamed the `middleware` file convention to `proxy`. On Next.js 15
// and below this file must be named middleware.ts instead; the body is identical.
// It has to sit beside `app`, so with a src directory that means src/proxy.ts.
// At the package root it is silently ignored and every route goes unguarded.
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Health checks are hit by uptime monitors and by Vercel, which hold no user
// credentials. Everything else under /api requires a signed-in user.
const isPublicRoute = createRouteMatcher(['/api/health'])
const isProtectedRoute = createRouteMatcher(['/api(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return
  // auth.protect() is called on the helper itself in Clerk Core 3, not on the
  // object returned by awaiting auth(). It answers 404 to unauthenticated
  // non-document requests rather than redirecting.
  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: ['/api/(.*)', '/__clerk/(.*)'],
}
