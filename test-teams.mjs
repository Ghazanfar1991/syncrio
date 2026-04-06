import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf-8')
const apiKeyMatch = envFile.match(/BUNDLE_SOCIAL_API_KEY="?([^"\n]+)"?/)
const apiKey = apiKeyMatch ? apiKeyMatch[1] : null

if (!apiKey) throw new Error("Missing API Key")

async function fetchTeams() {
  try {
    const response = await fetch('https://api.bundle.social/api/v1/team', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      }
    })

    const data = await response.json()
    console.log("Status:", response.status)
    console.log("Teams Data:", JSON.stringify(data, null, 2))
  } catch (err) {
    console.error("Network Error:", err)
  }
}

fetchTeams()
