// Unified token management for all social platforms
import { db } from '@/lib/db'
import { refreshTwitterToken } from './twitter-oauth-config'
import { refreshLinkedInToken } from './linkedin'
import { refreshInstagramToken } from './instagram'

export interface TokenValidationResult {
  isValid: boolean
  accessToken: string | null
  error?: string
  needsReconnection: boolean
}

export class TokenManager {
  /**
   * Validate and refresh token for a specific platform and account
   */
  static async validateAndRefresh(
    userId: string, 
    platform: string, 
    accountId: string
  ): Promise<TokenValidationResult> {
    try {
      // Get the social account
      const account = await db.socialAccount.findUnique({
        where: {
          userId_platform_accountId: {
            userId,
            platform: platform as any,
            accountId
          }
        }
      })

      if (!account || !account.isActive) {
        return {
          isValid: false,
          accessToken: null,
          error: 'Account not found or inactive',
          needsReconnection: true
        }
      }

      // Check if token is expired
      if (account.expiresAt && account.expiresAt < new Date()) {
        if (account.refreshToken) {
          try {
            // Attempt to refresh the token
            const newTokens = await this.refreshTokenForPlatform(
              platform, 
              account.refreshToken
            )
            
            // Update in database
            await db.socialAccount.update({
              where: { id: account.id },
              data: {
                accessToken: newTokens.access_token,
                refreshToken: newTokens.refresh_token || account.refreshToken,
                expiresAt: newTokens.expires_in 
                  ? new Date(Date.now() + newTokens.expires_in * 1000)
                  : null,
                updatedAt: new Date()
              }
            })

            return {
              isValid: true,
              accessToken: newTokens.access_token,
              needsReconnection: false
            }
          } catch (refreshError) {
            console.error(`Failed to refresh ${platform} token:`, refreshError)
            
            // Mark account as inactive
            await db.socialAccount.update({
              where: { id: account.id },
              data: { isActive: false }
            })

            return {
              isValid: false,
              accessToken: null,
              error: `Token refresh failed: ${refreshError instanceof Error ? refreshError.message : 'Unknown error'}`,
              needsReconnection: true
            }
          }
        } else {
          // No refresh token available
          await db.socialAccount.update({
            where: { id: account.id },
            data: { isActive: false }
          })

          return {
            isValid: false,
            accessToken: null,
            error: 'Token expired and no refresh token available',
            needsReconnection: true
          }
        }
      }

      // Token is still valid
      return {
        isValid: true,
        accessToken: account.accessToken,
        needsReconnection: false
      }

    } catch (error) {
      console.error(`Token validation error for ${platform}:`, error)
      return {
        isValid: false,
        accessToken: null,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        needsReconnection: true
      }
    }
  }

  /**
   * Refresh token for a specific platform
   */
  private static async refreshTokenForPlatform(
    platform: string, 
    refreshToken: string
  ): Promise<{
    access_token: string
    refresh_token?: string
    expires_in?: number
  }> {
    switch (platform) {
      case 'TWITTER':
        return await refreshTwitterToken(refreshToken)
      
      case 'LINKEDIN':
        return await refreshLinkedInToken(refreshToken)
      
      case 'INSTAGRAM':
        return await refreshInstagramToken(refreshToken)
      
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  /**
   * Check if all accounts for a user have valid tokens
   */
  static async validateAllUserTokens(userId: string): Promise<{
    validAccounts: string[]
    invalidAccounts: string[]
    needsReconnection: string[]
  }> {
    const accounts = await db.socialAccount.findMany({
      where: { userId, isActive: true }
    })

    const results = await Promise.all(
      accounts.map(async (account) => {
        const validation = await this.validateAndRefresh(
          userId, 
          account.platform, 
          account.accountId
        )
        
        return {
          accountId: account.accountId,
          platform: account.platform,
          ...validation
        }
      })
    )

    return {
      validAccounts: results
        .filter(r => r.isValid)
        .map(r => r.accountId),
      invalidAccounts: results
        .filter(r => !r.isValid)
        .map(r => r.accountId),
      needsReconnection: results
        .filter(r => r.needsReconnection)
        .map(r => r.accountId)
    }
  }

  /**
   * Get valid access token for immediate use
   */
  static async getValidToken(
    userId: string, 
    platform: string, 
    accountId: string
  ): Promise<string | null> {
    const validation = await this.validateAndRefresh(userId, platform, accountId)
    return validation.isValid ? validation.accessToken : null
  }
}
