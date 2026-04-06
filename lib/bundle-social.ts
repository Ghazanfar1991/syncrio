import { Bundlesocial } from 'bundlesocial'

/**
 * Bundle.social Platform Configuration
 * Full list of 14 supported platforms as of 2024
 */
export const SUPPORTED_PLATFORMS = [
  { id: 'INSTAGRAM', name: 'Instagram', icon: 'instagram', charLimit: 2200, mediaTypes: ['IMAGE', 'VIDEO'] },
  { id: 'FACEBOOK', name: 'Facebook', icon: 'facebook', charLimit: 63206, mediaTypes: ['IMAGE', 'VIDEO'] },
  { id: 'TIKTOK', name: 'TikTok', icon: 'tiktok', charLimit: 2200, mediaTypes: ['VIDEO', 'IMAGE'] },
  { id: 'LINKEDIN', name: 'LinkedIn', icon: 'linkedin', charLimit: 3000, mediaTypes: ['IMAGE', 'VIDEO', 'PDF'] },
  { id: 'YOUTUBE', name: 'YouTube', icon: 'youtube', charLimit: 5000, mediaTypes: ['VIDEO'] },
  { id: 'TWITTER', name: 'Twitter/X', icon: 'twitter', charLimit: 25000, mediaTypes: ['IMAGE', 'VIDEO', 'GIF'] },
  { id: 'THREADS', name: 'Threads', icon: 'threads', charLimit: 500, mediaTypes: ['IMAGE', 'VIDEO'] },
  { id: 'PINTEREST', name: 'Pinterest', icon: 'pinterest', charLimit: 500, mediaTypes: ['IMAGE', 'VIDEO'] },
  { id: 'REDDIT', name: 'Reddit', icon: 'reddit', charLimit: 40000, mediaTypes: ['IMAGE', 'TEXT'] },
  { id: 'MASTODON', name: 'Mastodon', icon: 'mastodon', charLimit: 500, mediaTypes: ['IMAGE', 'VIDEO'] },
  { id: 'BLUESKY', name: 'Bluesky', icon: 'bluesky', charLimit: 300, mediaTypes: ['IMAGE', 'VIDEO'] },
  { id: 'DISCORD', name: 'Discord', icon: 'discord', charLimit: 2000, mediaTypes: ['IMAGE', 'VIDEO'] },
  { id: 'SLACK', name: 'Slack', icon: 'slack', charLimit: 3000, mediaTypes: ['IMAGE', 'VIDEO'] },
  { id: 'GOOGLE_BUSINESS', name: 'Google Business', icon: 'google', charLimit: 1500, mediaTypes: ['IMAGE'] },
] as const

/**
 * Bundle.social client singleton.
 * Replaces all individual platform social clients.
 */
const globalForBundle = globalThis as unknown as {
  bundleSocial: Bundlesocial | undefined
}

export const getBundleSocial = () => {
  const apiKey = process.env.BUNDLE_SOCIAL_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('BUNDLE_SOCIAL_API_KEY is missing.')
    }
    return null as any
  }

  if (!globalForBundle.bundleSocial) {
    globalForBundle.bundleSocial = new Bundlesocial(apiKey)
  }
  return globalForBundle.bundleSocial
}

export const bundleSocial = new Proxy({} as any, {
  get(target, prop) {
    const client = getBundleSocial()
    if (!client) {
      throw new Error('Bundle.social client not initialized. Missing API key.')
    }
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})

export default bundleSocial
