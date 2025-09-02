'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, CheckCircle, RefreshCw, Zap } from 'lucide-react'

interface RateLimitStatus {
  provider: string
  model: string
  status: 'available' | 'rate_limited' | 'error'
  lastError?: string
  retryAfter?: number
  requestCount?: number
  resetTime?: Date
}

export function RateLimitStatus() {
  const [status, setStatus] = useState<RateLimitStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const checkRateLimits = async () => {
    try {
      setLoading(true)
      
      // Test a simple request to check rate limit status
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test rate limit status',
          platform: 'TWITTER'
        })
      })

      const result = await response.json()
      
      if (response.status === 429) {
        setStatus([{
          provider: 'OpenRouter',
          model: 'Qwen 3.5 4B',
          status: 'rate_limited',
          lastError: result.error || 'Rate limit exceeded',
          retryAfter: 60 // Estimate 1 minute
        }])
      } else if (response.ok) {
        setStatus([{
          provider: 'OpenRouter',
          model: 'Qwen 3.5 4B',
          status: 'available'
        }])
      } else {
        setStatus([{
          provider: 'OpenRouter',
          model: 'Qwen 3.5 4B',
          status: 'error',
          lastError: result.error || 'Unknown error'
        }])
      }
      
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to check rate limits:', error)
      setStatus([{
        provider: 'OpenRouter',
        model: 'Qwen 3.5 4B',
        status: 'error',
        lastError: 'Failed to check status'
      }])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkRateLimits()
    
    // Check every 30 seconds
    const interval = setInterval(checkRateLimits, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rate_limited':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <RefreshCw className="h-4 w-4 text-gray-500 animate-spin" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="default" className="bg-green-100 text-green-800">Available</Badge>
      case 'rate_limited':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Rate Limited</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">Checking...</Badge>
    }
  }

  const formatRetryTime = (retryAfter?: number) => {
    if (!retryAfter) return null
    
    const minutes = Math.ceil(retryAfter / 60)
    return `Retry in ~${minutes} minute${minutes > 1 ? 's' : ''}`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI Service Status
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={checkRateLimits}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(item.status)}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{item.provider}</h4>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {item.model}
                  </span>
                </div>
                {item.lastError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {item.lastError}
                  </p>
                )}
                {item.retryAfter && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                    {formatRetryTime(item.retryAfter)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {getStatusBadge(item.status)}
            </div>
          </div>
        ))}
        
        {status.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No AI services configured
          </div>
        )}
        
        {loading && status.length === 0 && (
          <div className="text-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
            <span className="text-gray-600">Checking AI service status...</span>
          </div>
        )}
        
        {/* Rate Limit Tips */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            💡 Rate Limit Tips
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Free models have stricter rate limits</li>
            <li>• Wait 1-2 minutes between requests if rate limited</li>
            <li>• The system automatically tries fallback models</li>
            <li>• Consider upgrading to paid models for higher limits</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
