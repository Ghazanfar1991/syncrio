"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { subscriptionTiers, formatPrice } from '@/lib/stripe'

interface SubscriptionCardProps {
  userId?: string
}

export function SubscriptionCard({ userId }: SubscriptionCardProps) {
  const [subscription, setSubscription] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/manage')
      const data = await response.json()
      
      if (data.success) {
        setSubscription(data.data.subscription)
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setActionLoading('portal')

    try {
      const response = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_portal_session' })
      })

      const data = await response.json()

      if (data.success && data.data.url) {
        window.location.href = data.data.url
      } else {
        throw new Error(data.error?.message || 'Failed to create portal session')
      }
    } catch (error) {
      console.error('Failed to create portal session:', error)
      alert('Billing management is not available. Please contact support.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of your billing period.')) {
      return
    }

    setActionLoading('cancel')
    
    try {
      const response = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_subscription' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        await fetchSubscription() // Refresh subscription data
        alert('Subscription canceled successfully')
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
      alert('Failed to cancel subscription')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivateSubscription = async () => {
    setActionLoading('reactivate')
    
    try {
      const response = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivate_subscription' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        await fetchSubscription() // Refresh subscription data
        alert('Subscription reactivated successfully')
      }
    } catch (error) {
      console.error('Failed to reactivate subscription:', error)
      alert('Failed to reactivate subscription')
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h3>
        <p className="text-gray-600 mb-4">No subscription found.</p>
        <Button onClick={() => window.location.href = '/pricing'}>
          Choose a Plan
        </Button>
      </div>
    )
  }

  const tierDetails = subscriptionTiers[subscription.tier as keyof typeof subscriptionTiers]
  const isTrialing = subscription.status === 'TRIALING'
  const isCanceled = subscription.cancelAtPeriodEnd

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h3>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900">
            {tierDetails?.name || subscription.tier}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            isTrialing ? 'bg-blue-100 text-blue-800' :
            subscription.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {isTrialing ? 'Free Trial' : subscription.status}
          </span>
        </div>
        
        {tierDetails && (
          <p className="text-gray-600">
            {formatPrice(tierDetails.price)}/month • {tierDetails.accounts} accounts • {' '}
            {tierDetails.posts === -1 ? 'Unlimited' : tierDetails.posts} posts
          </p>
        )}
        
        {subscription.currentPeriodEnd && (
          <p className="text-sm text-gray-500 mt-2">
            {isCanceled ? 'Cancels on' : isTrialing ? 'Trial ends on' : 'Renews on'}{' '}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Button
          onClick={handleManageSubscription}
          disabled={actionLoading === 'portal'}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {actionLoading === 'portal' ? 'Loading...' : 'Manage Billing'}
        </Button>
        
        {subscription.stripeSubscriptionId && (
          <>
            {isCanceled ? (
              <Button
                variant="outline"
                onClick={handleReactivateSubscription}
                disabled={actionLoading === 'reactivate'}
                className="w-full border-gray-300 hover:bg-gray-50"
              >
                {actionLoading === 'reactivate' ? 'Loading...' : 'Reactivate Subscription'}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleCancelSubscription}
                disabled={actionLoading === 'cancel'}
                className="w-full text-red-600 border-red-300 hover:bg-red-50"
              >
                {actionLoading === 'cancel' ? 'Loading...' : 'Cancel Subscription'}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
