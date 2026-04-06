import * as dotenv from 'dotenv'

dotenv.config()

async function test() {
  const teamId = process.env.BUNDLE_SOCIAL_TEAM_ID
  const apiKey = process.env.BUNDLE_SOCIAL_API_KEY
  if (!teamId || !apiKey) throw new Error("Missing team ID or API Key")

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
