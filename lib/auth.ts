// Supabase auth helpers — replaces NextAuth
import { createClient } from '@/lib/supabase/server'

/**
 * Get the current authenticated user from the server-side Supabase client.
 * Returns null if not authenticated.
 */
export async function getServerSession() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

/**
 * Get the user's profile from the `users` table (subscription tier etc.)
 */
export async function getServerUserProfile(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*, subscription:subscriptions(*)')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}
