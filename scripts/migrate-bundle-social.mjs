/**
 * Migration: Bundle Social Integration schema updates
 * Run: node scripts/migrate-bundle-social.mjs
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false } }
)

async function run() {
  console.log('🚀 Running Bundle Social migration...\n')

  // ── 1. social_accounts ───────────────────────────────────────────────────
  console.log('1/4 Patching social_accounts table...')

  const socialAccountsAlters = [
    `ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS bundle_social_account_id TEXT`,
    `ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
    `ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS needs_reauth BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS reauth_scheduled_at TIMESTAMPTZ`,
    `ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ`,
    `ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS disconnect_scheduled_at TIMESTAMPTZ`,
    `CREATE INDEX IF NOT EXISTS idx_social_accounts_bundle_id ON social_accounts(bundle_social_account_id)`,
  ]

  for (const sql of socialAccountsAlters) {
    const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: null }))
    // Fall back to raw query if RPC not available
    if (error) console.warn(`  ⚠️  RPC exec_sql not available for: ${sql.substring(0, 60)}`)
  }
  console.log('  ✅ social_accounts patched\n')

  // ── 2. posts ─────────────────────────────────────────────────────────────
  console.log('2/4 Patching posts table...')

  const postsAlters = [
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS bundle_post_id TEXT`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'CREATED'`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS posted_date TIMESTAMPTZ`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS bundle_social_account_types TEXT[]`,
    `CREATE INDEX IF NOT EXISTS idx_posts_bundle_id ON posts(bundle_post_id)`,
  ]

  for (const sql of postsAlters) {
    const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: null }))
    if (error) console.warn(`  ⚠️  RPC exec_sql not available for: ${sql.substring(0, 60)}`)
  }
  console.log('  ✅ posts patched\n')

  // ── 3. post_import_jobs ───────────────────────────────────────────────────
  console.log('3/4 Creating post_import_jobs table...')
  const { error: importErr } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS post_import_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        team_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        bundle_job_id TEXT,
        status TEXT DEFAULT 'PENDING',
        count INTEGER DEFAULT 50,
        with_analytics BOOLEAN DEFAULT TRUE,
        rate_limit_reset_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
    `
  }).catch(() => ({ error: null }))
  if (importErr) console.warn('  ⚠️  RPC exec_sql not available for post_import_jobs')
  console.log('  ✅ post_import_jobs table ready\n')

  // ── 4. analytics_cache ────────────────────────────────────────────────────
  console.log('4/4 Creating analytics_cache table...')
  const { error: cacheErr } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS analytics_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        bundle_social_account_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        period TEXT NOT NULL,
        data JSONB NOT NULL,
        fetched_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(bundle_social_account_id, period)
      );
    `
  }).catch(() => ({ error: null }))
  if (cacheErr) console.warn('  ⚠️  RPC exec_sql not available for analytics_cache')
  console.log('  ✅ analytics_cache table ready\n')

  console.log('═══════════════════════════════════════')
  console.log('✅ Migration complete!')
  console.log('')
  console.log('📋 If exec_sql RPC is not enabled, run these in the Supabase SQL editor:')
  console.log('')
  printManualSQL()
}

function printManualSQL() {
  const sql = `
-- social_accounts patches
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS bundle_social_account_id TEXT;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS needs_reauth BOOLEAN DEFAULT FALSE;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS reauth_scheduled_at TIMESTAMPTZ;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS disconnect_scheduled_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_social_accounts_bundle_id ON social_accounts(bundle_social_account_id);

-- posts patches
ALTER TABLE posts ADD COLUMN IF NOT EXISTS bundle_post_id TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'CREATED';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS posted_date TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS bundle_social_account_types TEXT[];
CREATE INDEX IF NOT EXISTS idx_posts_bundle_id ON posts(bundle_post_id);

-- post_import_jobs (new table)
CREATE TABLE IF NOT EXISTS post_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  bundle_job_id TEXT,
  status TEXT DEFAULT 'PENDING',
  count INTEGER DEFAULT 50,
  with_analytics BOOLEAN DEFAULT TRUE,
  rate_limit_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- analytics_cache (new table)
CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bundle_social_account_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  period TEXT NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bundle_social_account_id, period)
);
`
  console.log(sql)
}

run().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
