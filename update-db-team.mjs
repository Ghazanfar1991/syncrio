import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf-8')
const teamIdMatch = envFile.match(/BUNDLE_SOCIAL_TEAM_ID="?([^"\n]+)"?/)
const supabaseUrlMatch = envFile.match(/SUPABASE_URL="?([^"\n]+)"?/) || envFile.match(/NEXT_PUBLIC_SUPABASE_URL="?([^"\n]+)"?/)
const supabaseKeyMatch = envFile.match(/SUPABASE_SERVICE_ROLE="?([^"\n]+)"?/)

const teamId = teamIdMatch ? teamIdMatch[1] : null
const supabaseUrl = supabaseUrlMatch ? supabaseUrlMatch[1] : null
const supabaseKey = supabaseKeyMatch ? supabaseKeyMatch[1] : null

if (!supabaseUrl || !supabaseKey || !teamId) {
  console.error("Missing env vars")
  process.exit(1)
}

async function updateDb() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/teams?id=not.is.null`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ bundle_social_team_id: teamId })
    })

    if (!res.ok) {
      console.error("Failed to update POST:", await res.text())
    } else {
      console.log("Successfully patched Supabase DB with new Team ID!")
      const data = await res.json()
      console.log("Updated rows:", data.length)
    }
  } catch (err) {
    console.error("Error:", err)
  }
}

updateDb()
