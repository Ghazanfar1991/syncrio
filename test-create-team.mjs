import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf-8')
const apiKeyMatch = envFile.match(/BUNDLE_SOCIAL_API_KEY="?([^"\n]+)"?/)
const apiKey = apiKeyMatch ? apiKeyMatch[1] : null

if (!apiKey) throw new Error("Missing API Key")

async function createTeam() {
  try {
    const response = await fetch('https://api.bundle.social/api/v1/team', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        name: "Syncrio Default Team"
      })
    })

    const data = await response.json()
    console.log("Status:", response.status)
    console.log("Created Team:", JSON.stringify(data, null, 2))
  } catch (err) {
    console.error("Network Error:", err)
  }
}

createTeam()
