import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Server Supabase client for Server Components and Server Actions in the web
 * app, scoped to the signed-in Clerk user so Row Level Security applies.
 *
 * It deliberately uses the publishable key, not the secret key. A request
 * handler answering on behalf of a user must never hold a credential that
 * bypasses RLS.
 *
 * Create one per request. Do not hoist this into a module-level singleton:
 * the token it closes over belongs to a single request.
 *
 * Once `supabase gen types` has produced a Database type, pass it through as
 * `createClient<Database>(...)` so queries are checked at compile time.
 */
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.',
    )
  }

  return createClient(supabaseUrl, publishableKey, {
    accessToken: async () => (await auth()).getToken(),
  })
}
