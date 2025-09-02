'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { TwitterOAuth1Setup } from './twitter-oauth1-setup'
import { 
  Twitter, 
  Linkedin, 
  Instagram, 
  Youtube, 
  Facebook, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Settings
} from 'lucide-react'

interface SocialAccount {
  id: string
  platform: string
  accountName: string
  displayName?: string
  username?: string
  isConnected: boolean
  isActive: boolean
  createdAt: string
  accessTokenSecret?: string // Added for Twitter OAuth 1.0a
}

const socialPlatforms = [
  {
    id: 'TWITTER',
    name: 'Twitter',
    icon: Twitter,
    description: 'Connect your Twitter account to post tweets and track engagement',
  },
  {
    id: 'LINKEDIN',
    name: 'LinkedIn',
    icon: Linkedin,
    description: 'Share professional content and connect with your network',
  },
  {
    id: 'INSTAGRAM',
    name: 'Instagram',
    icon: Instagram,
    description: 'Post photos and stories to your Instagram account',
  },
  {
    id: 'YOUTUBE',
    name: 'YouTube',
    icon: Youtube,
    description: 'Upload videos and manage your YouTube channel',
  },
  {
    id: 'FACEBOOK',
    name: 'Facebook',
    icon: Facebook,
    description: 'Share content and connect with your Facebook audience',
  },
]

export function SocialAccountsManager() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/social/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleConnect = async (platform: string) => {
    setConnectingPlatform(platform)

    try {
      if (platform === 'TWITTER') {
        // Get Twitter OAuth URL
        const response = await fetch('/api/social/twitter/connect', {
          method: 'POST'
        })

        const data = await response.json()

        if (data.success && data.data.authUrl) {
          // Redirect to Twitter OAuth
          window.location.href = data.data.authUrl
        } else {
          throw new Error(data.error?.message || 'Failed to get Twitter OAuth URL')
        }
      } else if (platform === 'LINKEDIN') {
        // Get LinkedIn OAuth URL
        const response = await fetch('/api/social/linkedin/connect', {
          method: 'POST'
        })

        const data = await response.json()

        if (data.success && data.data.authUrl) {
          // Redirect to LinkedIn OAuth
          window.location.href = data.data.authUrl
        } else {
          throw new Error('Failed to get LinkedIn OAuth URL')
        }
      } else if (platform === 'INSTAGRAM') {
        // Get Instagram OAuth URL
        const response = await fetch('/api/social/instagram/connect', {
          method: 'POST'
        })

        const data = await response.json()

        if (data.success && data.data.authUrl) {
          // Redirect to Instagram OAuth
          window.location.href = data.data.authUrl
        } else {
          throw new Error('Failed to get Instagram OAuth URL')
        }
      } else if (platform === 'YOUTUBE') {
        // Get YouTube OAuth URL
        const response = await fetch('/api/social/youtube/connect', {
          method: 'POST'
        })

        const data = await response.json()

        if (data.success && data.data.authUrl) {
          // Redirect to YouTube OAuth
          window.location.href = data.data.authUrl
        } else {
          throw new Error('Failed to get YouTube OAuth URL')
        }
      } else if (platform === 'FACEBOOK') {
        // Get Facebook OAuth URL
        const response = await fetch('/api/social/facebook/connect', {
          method: 'POST'
        })

        const data = await response.json()

        if (data.success && data.data.authUrl) {
          // Redirect to Facebook OAuth
          window.location.href = data.data.authUrl
        } else {
          throw new Error('Failed to get Facebook OAuth URL')
        }
      }
    } catch (error) {
      console.error(`Failed to connect ${platform}:`, error)
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : `Failed to connect ${platform}`,
        variant: "destructive"
      })
    } finally {
      setConnectingPlatform(null)
    }
  }

  const handleOAuth1Configured = (accountId: string) => {
    setAccounts(prev => prev.map(acc => 
      acc.id === accountId 
        ? { ...acc, accessTokenSecret: 'configured' } // Mark as configured
        : acc
    ))
  }

  const getPlatformIcon = (platform: string) => {
    const platformInfo = socialPlatforms.find(p => p.id === platform);
    if (platformInfo) {
      const IconComponent = platformInfo.icon;
      return <IconComponent className="h-6 w-6 text-gray-600" />;
    }
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Social Accounts</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your social media accounts to start posting
        </p>
      </div>

      {/* Platform Connection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {socialPlatforms.map((platform) => (
          <Card key={platform.name} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <platform.icon className="h-8 w-8" />
                  <div>
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                    <CardDescription>{platform.description}</CardDescription>
                  </div>
                </div>
                {platform.name === 'Twitter' && (
                  <Settings className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {platform.name === 'Twitter' ? (
                <div className="space-y-4">
                  <Button
                    onClick={() => handleConnect(platform.id)}
                    disabled={connectingPlatform === platform.id}
                    className="w-full"
                  >
                    {connectingPlatform === platform.id ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect Account'
                    )}
                  </Button>
                  
                  {/* OAuth 1.0a Setup for Twitter */}
                  {accounts.some(acc => acc.platform === 'TWITTER' && acc.isConnected) && (
                    <TwitterOAuth1Setup
                      accountId={accounts.find(acc => acc.platform === 'TWITTER')?.id || ''}
                      accountName={accounts.find(acc => acc.platform === 'TWITTER')?.accountName || ''}
                      isConfigured={accounts.some(acc => 
                        acc.platform === 'TWITTER' && 
                        acc.accessTokenSecret && 
                        acc.accessTokenSecret !== 'configured'
                      )}
                      onConfigured={() => handleOAuth1Configured(accounts.find(acc => acc.platform === 'TWITTER')?.id || '')}
                    />
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => handleConnect(platform.id)}
                  disabled={connectingPlatform === platform.id}
                  className="w-full"
                >
                  {connectingPlatform === platform.id ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Account'
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connected Accounts */}
      {accounts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Connected Accounts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <Card key={account.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getPlatformIcon(account.platform)}
                      <div>
                        <CardTitle className="text-sm font-medium">{account.accountName}</CardTitle>
                        <CardDescription className="text-xs">{account.platform}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {account.isActive ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      {account.platform === 'TWITTER' && account.accessTokenSecret && (
                        <Badge variant="secondary" className="text-xs">
                          Media Ready
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
