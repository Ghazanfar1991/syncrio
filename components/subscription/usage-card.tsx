"use client"

import { useState, useEffect } from 'react'
import { subscriptionTiers } from '@/lib/stripe'

interface UsageCardProps {
  userId?: string
}

export function UsageCard({ userId }: UsageCardProps) {
  const [usage, setUsage] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUsageData()
  }, [])

  const fetchUsageData = async () => {
    try {
      // Fetch subscription data
      const subResponse = await fetch('/api/subscription/manage')
      const subData = await subResponse.json()
      
      if (subData.success) {
        setSubscription(subData.data.subscription)
      }

      // Fetch usage data
      const usageResponse = await fetch('/api/user/usage')
      const usageData = await usageResponse.json()
      
      if (usageData.success) {
        setUsage(usageData.data)
      }
    } catch (error) {
      console.error('Failed to fetch usage data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return null
  }

  const tierDetails = subscriptionTiers[subscription.tier as keyof typeof subscriptionTiers]
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  
  const postsUsed = usage?.postsUsed || 0
  const postsLimit = tierDetails?.posts || 0
  const accountsConnected = usage?.accountsConnected || 0
  const accountsLimit = tierDetails?.accounts || 0

  const postsPercentage = postsLimit === -1 ? 0 : (postsUsed / postsLimit) * 100
  const accountsPercentage = (accountsConnected / accountsLimit) * 100

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage This Month</h3>
      
      <div className="space-y-6">
        {/* Posts Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Posts Created</span>
            <span className="text-sm text-gray-600">
              {postsUsed} / {postsLimit === -1 ? '∞' : postsLimit}
            </span>
          </div>
          {postsLimit !== -1 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  postsPercentage >= 90 ? 'bg-red-500' :
                  postsPercentage >= 75 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(postsPercentage, 100)}%` }}
              ></div>
            </div>
          )}
          {postsLimit !== -1 && postsPercentage >= 90 && (
            <p className="text-xs text-red-600 mt-1">
              You're approaching your monthly limit. Consider upgrading your plan.
            </p>
          )}
        </div>

        {/* Accounts Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Connected Accounts</span>
            <span className="text-sm text-gray-600">
              {accountsConnected} / {accountsLimit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                accountsPercentage >= 90 ? 'bg-red-500' :
                accountsPercentage >= 75 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(accountsPercentage, 100)}%` }}
            ></div>
          </div>
          {accountsPercentage >= 90 && (
            <p className="text-xs text-red-600 mt-1">
              You're approaching your account limit. Consider upgrading your plan.
            </p>
          )}
        </div>

        {/* Plan Features */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Plan Features</h4>
          <ul className="space-y-1">
            {tierDetails?.features.slice(0, 3).map((feature, index) => (
              <li key={index} className="flex items-center text-xs text-gray-600">
                <svg className="w-3 h-3 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
          
          {(postsPercentage >= 75 || accountsPercentage >= 75) && (
            <div className="mt-4">
              <button
                onClick={() => window.location.href = '/pricing'}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Upgrade Plan →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
