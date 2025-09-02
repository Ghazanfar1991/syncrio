'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

interface TwitterOAuth1SetupProps {
  accountId: string
  accountName: string
  isConfigured: boolean
  onConfigured: () => void
}

export function TwitterOAuth1Setup({ 
  accountId, 
  accountName, 
  isConfigured, 
  onConfigured 
}: TwitterOAuth1SetupProps) {
  const [accessTokenSecret, setAccessTokenSecret] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!accessTokenSecret.trim()) {
      toast({
        title: "Error",
        description: "Please enter your OAuth 1.0a access token secret",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/social/twitter/oauth1-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          accessTokenSecret: accessTokenSecret.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        setIsSuccess(true)
        toast({
          title: "Success",
          description: "OAuth 1.0a credentials updated successfully! You can now post tweets with media.",
        })
        onConfigured()
      } else {
        throw new Error(data.error?.message || 'Failed to update credentials')
      }
    } catch (error) {
      console.error('OAuth 1.0a setup error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update OAuth 1.0a credentials',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isConfigured) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Media Upload Ready
          </CardTitle>
          <CardDescription className="text-green-700">
            Your Twitter account is configured for media uploads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-700">
            You can now post tweets with images and videos using your connected Twitter account.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Info className="h-5 w-5" />
          Media Upload Setup Required
        </CardTitle>
        <CardDescription className="text-orange-700">
          Complete OAuth 1.0a setup to enable media uploads
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 border-orange-200 bg-orange-100">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            To post tweets with media, you need to provide your OAuth 1.0a access token secret. 
            This is different from your OAuth 2.0 access token.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="accessTokenSecret" className="text-sm font-medium text-orange-800">
              OAuth 1.0a Access Token Secret
            </Label>
            <Input
              id="accessTokenSecret"
              type="password"
              value={accessTokenSecret}
              onChange={(e) => setAccessTokenSecret(e.target.value)}
              placeholder="Enter your OAuth 1.0a access token secret"
              className="mt-1 border-orange-300 focus:border-orange-500 focus:ring-orange-500"
            />
            <p className="mt-1 text-xs text-orange-600">
              You can find this in your Twitter Developer Portal under OAuth 1.0a settings.
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading || !accessTokenSecret.trim()}
            className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
          >
            {isLoading ? 'Updating...' : 'Update Credentials'}
          </Button>
        </form>

        <div className="mt-4 text-xs text-orange-600">
          <p><strong>Note:</strong> This setup is required for posting tweets with images and videos.</p>
          <p>Your OAuth 2.0 connection will continue to work for text-only tweets.</p>
        </div>
      </CardContent>
    </Card>
  )
}

