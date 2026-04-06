export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🏗️ Next.js Instrumentation: Background processing migrated to Supabase Native Edge Functions.')
  }
}
