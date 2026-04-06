import { createClient } from '@supabase/supabase-js'

// Admin client using service role key — server-side ONLY, never expose to client
const globalForAdmin = globalThis as unknown as {
  supabaseAdmin: ReturnType<typeof createClient> | undefined
}

// During build time on Vercel, env vars might be missing. 
// We provide placeholders to avoid "supabaseKey is required" errors.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE || 'placeholder-key'

export const supabaseAdmin =
  globalForAdmin.supabaseAdmin ??
  createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForAdmin.supabaseAdmin = supabaseAdmin
}
