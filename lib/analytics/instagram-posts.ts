// Instagram posts fetcher for real data
import { db } from '@/lib/db'

interface InstagramPost {
  id: string
  media_type: string
  media_url: string
  permalink: string
  caption?: string
  timestamp: string
  like_count?: number
  comments_count?: number
}

// Fetch real Instagram posts from user's account
export async function fetchInstagramPosts(userId: string, accountId: string): Promise<InstagramPost[]> {
  try {
    // Get the user's Instagram account
    const account = await db.socialAccount.findFirst({
      where: {
        userId,
        accountId,
        platform: 'INSTAGRAM',
        isActive: true
      }
    })

    if (!account || !account.accessToken) {
      console.log('No valid Instagram account found')
      return []
    }

    console.log('Fetching Instagram posts for account:', account.accountName)

    // Fetch user's media from Instagram API
    const response = await fetch(
      `https://graph.instagram.com/me/media?fields=id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count&limit=25&access_token=${account.accessToken}`
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Instagram API error:', response.status, errorText)
      return []
    }

    const data = await response.json()
    
    if (!data.data) {
      console.log('No Instagram posts found')
      return []
    }

    console.log(`Found ${data.data.length} Instagram posts`)
    return data.data
  } catch (error) {
    console.error('Error fetching Instagram posts:', error)
    return []
  }
}

// Get Instagram account info
export async function getInstagramAccountInfo(userId: string, accountId: string) {
  try {
    const account = await db.socialAccount.findFirst({
      where: {
        userId,
        accountId,
        platform: 'INSTAGRAM',
        isActive: true
      }
    })

    if (!account || !account.accessToken) {
      return null
    }

    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${account.accessToken}`
    )

    if (!response.ok) {
      console.error('Instagram account info fetch failed:', await response.text())
      return null
    }

    const accountInfo = await response.json()
    
    return {
      id: accountInfo.id,
      username: accountInfo.username,
      accountType: accountInfo.account_type,
      mediaCount: accountInfo.media_count,
      isBusinessAccount: accountInfo.account_type === 'BUSINESS'
    }
  } catch (error) {
    console.error('Error fetching Instagram account info:', error)
    return null
  }
}

// Check if user has Instagram Business account (required for insights)
export async function checkInstagramBusinessAccess(userId: string, accountId: string): Promise<boolean> {
  try {
    const accountInfo = await getInstagramAccountInfo(userId, accountId)
    return accountInfo?.isBusinessAccount || false
  } catch (error) {
    console.error('Error checking Instagram business access:', error)
    return false
  }
}
