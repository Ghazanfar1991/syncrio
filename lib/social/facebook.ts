import { URLSearchParams } from 'url'

type EnvConfig = {
  appId: string
  appSecret: string
  redirectUri: string
  graphVersion?: string
}

export type FacebookAuthUrlOptions = {
  state?: string
  redirectUri?: string
  scopes?: string[]
}

export type FacebookTokenSet = {
  accessToken: string
  tokenType?: string
  expiresIn?: number
  longLivedAccessToken?: string
  longLivedExpiresIn?: number
}

export type FacebookProfile = {
  id: string
  name?: string
}

export type FacebookPage = {
  id: string
  name: string
  access_token?: string
}

export type FacebookPostInput = {
  pageId: string
  message?: string
  linkUrl?: string
  imageUrl?: string
  scheduledPublishTime?: number // unix timestamp (seconds)
  pageAccessToken?: string
  userAccessToken?: string
}

const DEFAULT_SCOPES = [
  'public_profile',
  'email',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'pages_manage_metadata',
]

function readEnv(): EnvConfig {
  const appId =
    process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_CLIENT_ID || ''
  const appSecret =
    process.env.FACEBOOK_APP_SECRET || process.env.FACEBOOK_CLIENT_SECRET || ''
  const redirectUri =
    process.env.FACEBOOK_REDIRECT_URI ||
    joinUrl(
      process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '',
      '/api/social/facebook/callback'
    )

  const graphVersion = process.env.FACEBOOK_GRAPH_VERSION || 'v20.0'

  if (!appId) throw new Error('Missing FACEBOOK_APP_ID/CLIENT_ID')
  if (!appSecret) throw new Error('Missing FACEBOOK_APP_SECRET/CLIENT_SECRET')
  if (!redirectUri) throw new Error('Missing FACEBOOK_REDIRECT_URI or APP_URL')

  return { appId, appSecret, redirectUri, graphVersion }
}

function joinUrl(base: string, path: string): string {
  if (!base) return ''
  try {
    const url = new URL(base)
    url.pathname = path
    return url.toString()
  } catch {
    return `${base.replace(/\/$/, '')}${path}`
  }
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const text = await res.text()
  let data: any
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    // keep as raw text
    data = text
  }
  if (!res.ok) {
    const detail = typeof data === 'string' ? data : JSON.stringify(data)
    throw new Error(`Facebook API error ${res.status}: ${detail}`)
  }
  return data as T
}

export function getFacebookAuthUrl(options: FacebookAuthUrlOptions = {}): string {
  const { appId, redirectUri, graphVersion } = readEnv()
  const state = options.state || ''
  const scopes = (options.scopes && options.scopes.length
    ? options.scopes
    : DEFAULT_SCOPES
  ).join(',')

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: options.redirectUri || redirectUri,
    scope: scopes,
  })
  if (state) params.set('state', state)

  return `https://www.facebook.com/${graphVersion}/dialog/oauth?${params.toString()}`
}

export async function exchangeCodeForToken(
  code: string,
  overrideRedirectUri?: string
): Promise<FacebookTokenSet> {
  const { appId, appSecret, redirectUri, graphVersion } = readEnv()
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: overrideRedirectUri || redirectUri,
    code,
  })

  type TokenRes = {
    access_token: string
    token_type?: string
    expires_in?: number
  }

  const token = await fetchJson<TokenRes>(
    `https://graph.facebook.com/${graphVersion}/oauth/access_token?${params}`
  )

  const longLived = await getLongLivedUserToken(token.access_token)

  return {
    accessToken: token.access_token,
    tokenType: token.token_type,
    expiresIn: token.expires_in,
    longLivedAccessToken: longLived.access_token,
    longLivedExpiresIn: longLived.expires_in,
  }
}

export async function getLongLivedUserToken(shortLivedToken: string) {
  const { appId, appSecret, graphVersion } = readEnv()
  type LLRes = { access_token: string; token_type?: string; expires_in?: number }
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  })
  return fetchJson<LLRes>(
    `https://graph.facebook.com/${graphVersion}/oauth/access_token?${params}`
  )
}

export async function getUserProfile(accessToken: string): Promise<FacebookProfile> {
  const { graphVersion } = readEnv()
  return fetchJson<FacebookProfile>(
    `https://graph.facebook.com/${graphVersion}/me?fields=id,name&access_token=${encodeURIComponent(
      accessToken
    )}`
  )
}

export async function getUserPages(
  userAccessToken: string
): Promise<FacebookPage[]> {
  const { graphVersion } = readEnv()
  type PagesRes = { data: FacebookPage[] }
  const res = await fetchJson<PagesRes>(
    `https://graph.facebook.com/${graphVersion}/me/accounts?access_token=${encodeURIComponent(
      userAccessToken
    )}`
  )
  return res.data || []
}

export async function getPageAccessToken(
  pageId: string,
  userAccessToken: string
): Promise<string | undefined> {
  const { graphVersion } = readEnv()
  type PageRes = { access_token?: string }
  const page = await fetchJson<PageRes>(
    `https://graph.facebook.com/${graphVersion}/${pageId}?fields=access_token&access_token=${encodeURIComponent(
      userAccessToken
    )}`
  )
  return page.access_token
}

export async function postToFacebookPage(
  input: FacebookPostInput
): Promise<{ id: string }> {
  const { graphVersion } = readEnv()

  const { pageId, message, linkUrl, imageUrl, scheduledPublishTime } = input
  let pageAccessToken = input.pageAccessToken

  if (!pageAccessToken) {
    if (!input.userAccessToken)
      throw new Error('pageAccessToken or userAccessToken is required')
    const token = await getPageAccessToken(pageId, input.userAccessToken)
    if (!token) throw new Error('Unable to obtain page access token')
    pageAccessToken = token
  }

  const isScheduled = typeof scheduledPublishTime === 'number'

  if (imageUrl) {
    // Photo post
    const body = new URLSearchParams()
    body.set('access_token', pageAccessToken)
    body.set('url', imageUrl)
    if (message) body.set('caption', message)
    if (isScheduled) {
      body.set('published', 'false')
      body.set('scheduled_publish_time', String(scheduledPublishTime))
    }
    type PhotoRes = { id: string; post_id?: string }
    const res = await fetchJson<PhotoRes>(
      `https://graph.facebook.com/${graphVersion}/${pageId}/photos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      }
    )
    return { id: res.post_id || res.id }
  }

  // Link or text post
  const body = new URLSearchParams()
  body.set('access_token', pageAccessToken)
  if (message) body.set('message', message)
  if (linkUrl) body.set('link', linkUrl)
  if (isScheduled) {
    body.set('published', 'false')
    body.set('scheduled_publish_time', String(scheduledPublishTime))
  }

  type FeedRes = { id: string }
  const res = await fetchJson<FeedRes>(
    `https://graph.facebook.com/${graphVersion}/${pageId}/feed`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }
  )
  return { id: res.id }
}

export const Facebook = {
  getAuthUrl: getFacebookAuthUrl,
  exchangeCodeForToken,
  getLongLivedUserToken,
  getUserProfile,
  getUserPages,
  getPageAccessToken,
  postToFacebookPage,
}

