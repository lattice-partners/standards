import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for route handlers, scoped to the Clerk session token of the
 * caller. Every query runs under that user's Row Level Security policies, so a
 * missing `where user_id = ...` clause cannot leak another tenant's rows.
 *
 * Uses the publishable key. The secret key bypasses RLS entirely and has no
 * place in a handler that answers on behalf of a user.
 *
 * Call this per request. A module-level singleton would pin one user's token
 * for the lifetime of the serverless instance and serve their data to everyone.
 *
 * Once `supabase gen types` has produced a Database type, pass it through as
 * `createClient<Database>(...)` so queries are checked at compile time.
 */
export function createRequestSupabaseClient() {
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
