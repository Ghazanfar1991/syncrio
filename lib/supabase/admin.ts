import { createClient } from '@supabase/supabase-js'

// Admin client using service role key — server-side ONLY, never expose to client
const globalForAdmin = globalThis as unknown as {
  supabaseAdmin: ReturnType<typeof createClient> | undefined
}

export const supabaseAdmin =
  globalForAdmin.supabaseAdmin ??
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

if (process.env.NODE_ENV !== 'production') {
  globalForAdmin.supabaseAdmin = supabaseAdmin
}
