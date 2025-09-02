// Twitter OAuth 2.0 configuration and setup
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export interface TwitterConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export const twitterConfig: TwitterConfig = {
  clientId: process.env.TWITTER_CLIENT_ID || '',
  clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
  redirectUri: `${process.env.NEXTAUTH_URL}/api/social/twitter/callback`
}

// Check if Twitter is configured
export function isTwitterConfigured(): boolean {
  return !!(twitterConfig.clientId && twitterConfig.clientSecret)
}

// Twitter OAuth 2.0 URLs (Updated for X)
export const TWITTER_OAUTH_URL = 'https://x.com/i/oauth2/authorize'
export const TWITTER_TOKEN_URL = 'https://api.x.com/2/oauth2/token'

// Generate code verifier and challenge for PKCE
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64url')
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest()
  return Buffer.from(hash).toString('base64url')
}

// Temporary file-based storage for code verifiers
const TEMP_DIR = path.join(process.cwd(), '.tmp')
const VERIFIERS_FILE = path.join(TEMP_DIR, 'oauth-verifiers.json')

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }
}

function storeCodeVerifier(state: string, verifier: string) {
  ensureTempDir()
  let verifiers: Record<string, { verifier: string; expires: number }> = {}

  if (fs.existsSync(VERIFIERS_FILE)) {
    try {
      verifiers = JSON.parse(fs.readFileSync(VERIFIERS_FILE, 'utf8'))
    } catch (error) {
      console.warn('Failed to read verifiers file:', error)
    }
  }

  // Clean up expired verifiers
  const now = Date.now()
  Object.keys(verifiers).forEach(key => {
    if (verifiers[key].expires < now) {
      delete verifiers[key]
    }
  })

  // Store new verifier with 10 minute expiration
  verifiers[state] = {
    verifier,
    expires: now + 10 * 60 * 1000
  }

  fs.writeFileSync(VERIFIERS_FILE, JSON.stringify(verifiers, null, 2))
}

function getCodeVerifier(state: string): string | null {
  if (!fs.existsSync(VERIFIERS_FILE)) {
    return null
  }

  try {
    const verifiers = JSON.parse(fs.readFileSync(VERIFIERS_FILE, 'utf8'))
    const entry = verifiers[state]

    if (!entry) {
      return null
    }

    if (entry.expires < Date.now()) {
      // Clean up expired entry
      delete verifiers[state]
      fs.writeFileSync(VERIFIERS_FILE, JSON.stringify(verifiers, null, 2))
      return null
    }

    // Clean up used verifier
    delete verifiers[state]
    fs.writeFileSync(VERIFIERS_FILE, JSON.stringify(verifiers, null, 2))

    return entry.verifier
  } catch (error) {
    console.warn('Failed to read verifier:', error)
    return null
  }
}

// Generate Twitter OAuth authorization URL with media.write scope
export function getTwitterAuthUrl(userId: string, state?: string): string {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)

  // Store the code verifier temporarily
  const stateValue = state || userId
  storeCodeVerifier(stateValue, codeVerifier)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: twitterConfig.clientId,
    redirect_uri: twitterConfig.redirectUri,
    scope: 'tweet.read tweet.write users.read media.write offline.access',
    state: stateValue,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  })

  return `${TWITTER_OAUTH_URL}?${params.toString()}`
}

// Exchange authorization code for access token
export async function exchangeTwitterCode(code: string, state: string): Promise<{
  access_token: string
  refresh_token?: string
  expires_in?: number
}> {
  console.log('🔄 Exchanging Twitter code for tokens...')
  console.log('🔄 State:', state)
  console.log('🔄 Code length:', code.length)

  // Get the stored code verifier
  const codeVerifier = getCodeVerifier(state)

  if (!codeVerifier) {
    console.error('❌ Code verifier not found for state:', state)
    throw new Error('Code verifier not found for state')
  }

  console.log('✅ Code verifier found, proceeding with token exchange...')

  const response = await fetch(TWITTER_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${twitterConfig.clientId}:${twitterConfig.clientSecret}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: twitterConfig.redirectUri,
      code_verifier: codeVerifier
    })
  })

  console.log('🔄 Token exchange response status:', response.status)

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ Token exchange failed:', error)
    throw new Error(`Twitter token exchange failed: ${error}`)
  }

  const tokens = await response.json()
  console.log('✅ Token exchange successful')
  return tokens
}

// Get Twitter user information
export async function getTwitterUser(accessToken: string): Promise<{
  id: string
  username: string
  name: string
  profile_image_url?: string
}> {
  const response = await fetch('https://api.twitter.com/2/users/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get Twitter user: ${error}`)
  }

  const data = await response.json()
  return data.data
}

// Refresh Twitter access token
export async function refreshTwitterToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token?: string
  expires_in?: number
}> {
  console.log('🔄 Attempting to refresh Twitter token...')

  if (!refreshToken) {
    throw new Error('No refresh token provided')
  }

  const response = await fetch(TWITTER_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${twitterConfig.clientId}:${twitterConfig.clientSecret}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: twitterConfig.clientId // Add client_id for better compatibility
    })
  })

  console.log('🔄 Twitter token refresh response status:', response.status)

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ Twitter token refresh failed:', error)
    throw new Error(`Twitter token refresh failed: ${error}`)
  }

  const tokens = await response.json()
  console.log('✅ Twitter token refreshed successfully')
  return tokens
}

// Upload media using OAuth 2.0 token with X API v2 endpoints
export async function uploadMediaWithOAuth2(
  accessToken: string,
  mediaBuffer: Buffer,
  mediaType: string
): Promise<{
  media_id: string
  media_id_string: string
  media_key?: string
  size: number
  expires_after_secs: number
}> {
  console.log('📤 Uploading media with OAuth 2.0 token using X API v2...')
  console.log('📤 Media buffer size:', mediaBuffer.length, 'bytes')
  console.log('📤 Media type:', mediaType)

  // Create FormData for X API v2 media upload
  const formData = new FormData()
  const blob = new Blob([mediaBuffer], { type: mediaType })
  formData.append('media', blob)

  // Set appropriate media category based on media type
  const mediaCategory = mediaType.startsWith('video/') ? 'tweet_video' : 'tweet_image'
  formData.append('media_category', mediaCategory)

  console.log('📤 Media category:', mediaCategory)

  const response = await fetch('https://api.x.com/2/media/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
      // Don't set Content-Type header - let FormData set it with boundary
    },
    body: formData
  })

  console.log('📤 Media upload response status:', response.status)

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ Media upload failed:', error)
    throw new Error(`Media upload failed: ${error}`)
  }

  const result = await response.json()
  console.log('✅ Media uploaded successfully with X API v2')
  console.log('📋 Full response:', JSON.stringify(result, null, 2))

  // Extract media_id from the response (X API v2 format may be different)
  const mediaId = result.media_id || result.data?.media_id || result.id || result.data?.id
  console.log('📋 Extracted media_id:', mediaId)

  if (!mediaId) {
    console.error('❌ No media_id found in response:', result)
    throw new Error('No media_id found in upload response')
  }

  // Return in v1.1 compatible format for existing code
  return {
    media_id: mediaId,
    media_id_string: mediaId.toString(),
    media_key: result.media_key || result.data?.media_key,
    size: mediaBuffer.length,
    expires_after_secs: result.expires_after_secs || result.data?.expires_after_secs || 86400
  }
}
