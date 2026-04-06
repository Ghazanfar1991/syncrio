import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function loadEnv() {
  const content = readFileSync('.env', 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    let val = trimmed.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1,-1)
    process.env[trimmed.slice(0, eqIdx).trim()] = val
  }
}

loadEnv()
const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE)

async function testQuery() {
  const payload = {
    user_id: '1234',
    platform: 'TWITTER',
    account_id: 'test-account',
    account_name: 'test',
    bundle_social_account_id: 'test-id-1',
    is_connected: true,
    is_active: true
  }
  await supabase.from('social_accounts').insert(payload)

  const activeBundleIds = ['some-other-id']
  const { data, error } = await supabase
    .from('social_accounts')
    .select('id, bundle_social_account_id, is_connected')
    .eq('user_id', '1234')
    .not('bundle_social_account_id', 'in', `(${activeBundleIds.map(id => `'${id}'`).join(',')})`)
    
  console.log("NOT IN result (should match test-id-1):", data, error)
  
  // Clean up
  await supabase.from('social_accounts').delete().eq('user_id', '1234')
}

testQuery()
