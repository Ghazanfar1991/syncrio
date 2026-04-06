import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf-8')
const apiKeyMatch = envFile.match(/BUNDLE_SOCIAL_API_KEY="?([^"\n]+)"?/)
const apiKey = apiKeyMatch ? apiKeyMatch[1] : null

if (!apiKey) throw new Error("Missing API Key")

async function fetchTeamsAndUpdate() {
  try {
    const response = await fetch('https://api.bundle.social/api/v1/team', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      }
    })

    const data = await response.json()
    if (data.items && data.items.length > 0) {
      const teamId = data.items[data.items.length - 1].id
      console.log("Found Team ID:", teamId)
      
      const updatedEnv = envFile.replace(/BUNDLE_SOCIAL_TEAM_ID=.*$/m, `BUNDLE_SOCIAL_TEAM_ID="${teamId}"`)
      fs.writeFileSync('.env', updatedEnv)
      console.log("Updated .env with the new Team ID!")
      
    } else {
      console.log("No teams found. Run create team script first.")
    }
  } catch (err) {
    console.error("Network Error:", err)
  }
}

fetchTeamsAndUpdate()
