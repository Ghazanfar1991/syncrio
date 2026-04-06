import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf-8')
const teamIdMatch = envFile.match(/BUNDLE_SOCIAL_TEAM_ID="?([^"\n]+)"?/)
const apiKeyMatch = envFile.match(/BUNDLE_SOCIAL_API_KEY="?([^"\n]+)"?/)

const teamId = teamIdMatch ? teamIdMatch[1] : null
const apiKey = apiKeyMatch ? apiKeyMatch[1] : null

if (!teamId || !apiKey) throw new Error("Missing team ID or API Key")

async function test() {
  try {
    const response = await fetch('https://api.bundle.social/api/v1/social-account/create-portal-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        teamId,
        redirectUrl: "http://localhost:3001/integrations?sync=true",
        socialAccountTypes: ['TIKTOK', 'YOUTUBE', 'INSTAGRAM', 'FACEBOOK', 'TWITTER', 'THREADS', 'LINKEDIN', 'PINTEREST', 'REDDIT', 'MASTODON', 'DISCORD', 'SLACK', 'GOOGLE_BUSINESS', 'BLUESKY']
      })
    })

    const data = await response.json()
    console.log("Status:", response.status)
    console.log("Response:", JSON.stringify(data, null, 2))
  } catch (err) {
    console.error("Network Error:", err)
  }
}

test()
