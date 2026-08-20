'use client'

import { useMemo } from 'react'
import { useSession } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/**
 * Browser Supabase client scoped to the signed-in Clerk user.
 *
 * `accessToken` hands Supabase the Clerk session token on every request, so
 * Row Level Security sees the Clerk claims. This is the third-party auth
 * integration; the old JWT-template approach that shared the project JWT
 * secret with Clerk was deprecated in April 2025 and must not be used.
 *
 * The publishable key is public by design. Access is decided by RLS, not by
 * hiding this key, so never reach for the secret key to work around a policy.
 *
 * Once `supabase gen types` has produced a Database type, pass it through as
 * `createClient<Database>(...)` so queries are checked at compile time.
 */
export function useSupabaseClient() {
  const { session } = useSession()

  return useMemo(() => {
    if (!supabaseUrl || !publishableKey) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.',
      )
    }
    return createClient(supabaseUrl, publishableKey, {
      accessToken: async () => (await session?.getToken()) ?? null,
    })
  }, [session])
}
