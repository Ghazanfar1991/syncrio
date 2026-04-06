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

export const bundleSocial: Bundlesocial =
  globalForBundle.bundleSocial ??
  new Bundlesocial(process.env.BUNDLE_SOCIAL_API_KEY!)

if (process.env.NODE_ENV !== 'production') {
  globalForBundle.bundleSocial = bundleSocial
}

export default bundleSocial
