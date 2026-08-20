// Next.js 16 renamed the `middleware` file convention to `proxy`. On Next.js 15
// and below this file must be named middleware.ts instead; the body is identical.
// It has to sit beside `app`, so with a src directory that means src/proxy.ts.
// At the package root it is silently ignored and every route goes unguarded.
import { clerkMiddleware } from '@clerk/nextjs/server'

// No route matcher here on purpose. The web app is mostly public marketing and
// auth pages; anything that reads user data does so through the api app, which
// enforces its own protection. Add createRouteMatcher + auth.protect() here when
// you add a first authenticated page.
export default clerkMiddleware()

export const config = {
  matcher: [
    // Everything except Next.js internals and static assets.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes and Clerk's own endpoints.
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
}
