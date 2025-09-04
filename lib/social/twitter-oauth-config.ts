// Twitter OAuth 2.0 configuration and setup
import crypto from 'crypto'

export interface TwitterConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

// Compute a proper base URL (VERCEL_URL lacks protocol)
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  process.env.NEXTAUTH_URL ||
  (process.env.VERCEL_URL ? `${process.env.VERCEL_URL}` : undefined) ||
  'http://localhost:3000'

export const twitterConfig: TwitterConfig = {
  clientId: process.env.TWITTER_CLIENT_ID || '',
  clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
  redirectUri: `${BASE_URL}/api/social/twitter/callback`
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
  // 32 bytes -> base64url, 43-128 chars
  return crypto
    .randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest('base64')
  return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

// HMAC-signed state payload carrying short-lived PKCE verifier (no FS/cookies)
const STATE_SECRET =
  process.env.TWITTER_STATE_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'dev-state-secret'

type StatePayload = {
  u: string // user id
  v: string // code verifier
  t: number // timestamp (ms)
  s?: string // optional caller-provided state
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function sign(data: string): string {
  const sig = crypto.createHmac('sha256', STATE_SECRET).update(data).digest('base64')
  return sig.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function createSignedState(payload: StatePayload): string {
  const json = JSON.stringify(payload)
  const msg = b64url(json)
  const sig = sign(msg)
  return `${msg}.${sig}`
}

function parseSignedState(state: string): StatePayload | null {
  try {
    const [msg, sig] = state.split('.')
    if (!msg || !sig) return null
    const expected = sign(msg)
    if (sig !== expected) return null
    const json = Buffer.from(msg.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    const payload = JSON.parse(json) as StatePayload
    // 10 minute TTL
    if (Date.now() - payload.t > 10 * 60 * 1000) return null
    return payload
  } catch {
    return null
  }
}

// Generate Twitter OAuth authorization URL with media.write scope
export function getTwitterAuthUrl(userId: string, state?: string): string {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)

  // Store the code verifier temporarily
  const stateValue = createSignedState({ u: userId, v: codeVerifier, t: Date.now(), s: state })

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

  // Extract the code verifier from the signed state
  const payload = parseSignedState(state)
  const codeVerifier = payload?.v

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
      client_id: twitterConfig.clientId,
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
  // Convert Node Buffer to ArrayBuffer compatible with Blob
  const arrayBuffer = mediaBuffer.buffer.slice(
    mediaBuffer.byteOffset,
    mediaBuffer.byteOffset + mediaBuffer.byteLength
  ) as ArrayBuffer
  const blob = new Blob([arrayBuffer], { type: mediaType })
  // Provide a filename to ensure some APIs accept the part
  const fileName = mediaType.startsWith('image/') ? 'upload.jpg' : mediaType.startsWith('video/') ? 'upload.mp4' : 'upload.bin'
  formData.append('media', blob, fileName)

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