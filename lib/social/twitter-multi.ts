import { db } from '../db'
import { uploadTwitterMediaOAuth1a } from './twitter'
// Note: for OAuth2 uploads, we will re-use project's existing helper from './twitter'
// via runtime import to avoid circular deps when not needed.
import { createHmac } from 'crypto'

type UploadInput = {
  text: string
  images: Array<{ buffer: Buffer; mimeType: string }>
  userId: string
  accountId: string
}

type UploadInputOAuth2 = {
  text: string
  images: Array<{ buffer: Buffer; mimeType: string }>
  accessToken: string // OAuth2 user-context token
}

// Percent-encode per RFC 3986 (OAuth 1.0a requires strict encoding)
function pctEncode(input: string): string {
  return encodeURIComponent(input)
    .replace(/[!*'()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
}

function buildNormalizedParams(params: Record<string, string>): string {
  // Sort by key, then by value
  const entries = Object.entries(params)
    .map(([k, v]) => [pctEncode(k), pctEncode(v)] as const)
    .sort(([ak, av], [bk, bv]) => (ak === bk ? (av < bv ? -1 : av > bv ? 1 : 0) : ak < bk ? -1 : 1))
  return entries.map(([k, v]) => `${k}=${v}`).join('&')
}

function buildAuthHeader(params: Record<string, string>): string {
  const header = Object.entries(params)
    .map(([k, v]) => `${pctEncode(k)}="${pctEncode(v)}"`)
    .join(', ')
  return `OAuth ${header}`
}

function signOAuth1Request(
  method: 'POST' | 'GET',
  url: string,
  requestParams: Record<string, string>,
  oauth: {
    consumerKey: string
    consumerSecret: string
    token: string
    tokenSecret: string
  }
): { authorization: string } {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: oauth.consumerKey,
    oauth_nonce: Math.random().toString(36).slice(2),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: oauth.token,
    oauth_version: '1.0',
  }

  const signatureParams = { ...requestParams, ...oauthParams }
  const baseString = [
    method,
    pctEncode(url),
    pctEncode(buildNormalizedParams(signatureParams)),
  ].join('&')

  const signingKey = `${pctEncode(oauth.consumerSecret)}&${pctEncode(oauth.tokenSecret)}`
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64')

  const authHeaderParams = { ...oauthParams, oauth_signature: signature }
  return { authorization: buildAuthHeader(authHeaderParams) }
}

// Post a tweet with pre-uploaded media IDs using OAuth 1.1
export async function postTweetWithMediaIdsV11(args: {
  text: string
  mediaIds: string[]
  userId: string
  accountId: string
}): Promise<{ id: string; raw: any }> {
  const { text, mediaIds, userId, accountId } = args
  if (!mediaIds.length) throw new Error('mediaIds is empty')
  const media = mediaIds.slice(0, 4) // Twitter allows up to 4 images

  const account = await db.socialAccount.findUnique({
    where: { id: accountId, userId },
    select: {
      consumerKey: true,
      consumerSecret: true,
      oauth1AccessToken: true,
      accessTokenSecret: true,
    },
  })

  if (!account?.consumerKey || !account?.consumerSecret || !account?.oauth1AccessToken || !account?.accessTokenSecret) {
    throw new Error('Missing OAuth 1.0a credentials required to post tweet with media')
  }

  const url = 'https://api.twitter.com/1.1/statuses/update.json'
  const params: Record<string, string> = {
    status: text,
    media_ids: media.join(','),
  }

  const { authorization } = signOAuth1Request('POST', url, params, {
    consumerKey: account.consumerKey,
    consumerSecret: account.consumerSecret,
    token: account.oauth1AccessToken,
    tokenSecret: account.accessTokenSecret,
  })

  const body = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => body.append(k, v))

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: authorization,
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Tweet post failed ${res.status}: ${res.statusText} ${txt}`)
  }
  const data = await res.json()
  return { id: data.id_str || data.id?.toString?.() || '', raw: data }
}

// End-to-end: process and upload images, then post tweet with all media attached
export async function postTweetWithMultipleImages(input: UploadInput): Promise<{ id: string; mediaIds: string[] }> {
  const { text, images, userId, accountId } = input
  if (!images?.length) throw new Error('No images provided')
  if (images.length > 4) throw new Error('Twitter supports up to 4 images per tweet')

  // Upload all images (can be parallel)
  const mediaIds = await Promise.all(
    images.map(({ buffer, mimeType }) => uploadTwitterMediaOAuth1a(buffer, mimeType, userId, accountId))
  )

  const tweet = await postTweetWithMediaIdsV11({ text, mediaIds, userId, accountId })
  return { id: tweet.id, mediaIds }
}

// ---------- OAuth2 (v2 tweet creation) helpers ----------

export async function postTweetWithMediaIdsV2(args: {
  text: string
  mediaIds: string[]
  accessToken: string
}): Promise<{ id: string; raw: any }> {
  const { text, mediaIds, accessToken } = args
  if (!mediaIds?.length) throw new Error('mediaIds is empty')
  const ids = mediaIds.slice(0, 4)

  const url = 'https://api.twitter.com/2/tweets'
  const body = {
    text,
    media: { media_ids: ids }, // v2 requires array under media.media_ids
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Tweet post (v2) failed ${res.status}: ${res.statusText} ${txt}`)
  }
  const data = await res.json()
  return { id: data.data?.id || '', raw: data }
}

export async function postTweetWithMultipleImagesOAuth2(input: UploadInputOAuth2): Promise<{ id: string; mediaIds: string[] }> {
  const { text, images, accessToken } = input
  if (!images?.length) throw new Error('No images provided')
  if (images.length > 4) throw new Error('Twitter supports up to 4 images per tweet')

  // Dynamically import to avoid circular import issues if the project structure shares modules
  const { uploadMultipleTwitterMediaOAuth2 } = await import('./twitter')

  const mediaIds = await uploadMultipleTwitterMediaOAuth2(images, accessToken)
  const tweet = await postTweetWithMediaIdsV2({ text, mediaIds, accessToken })
  return { id: tweet.id, mediaIds }
}
