"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MarketingNav } from '@/components/layout/marketing-nav'
import { MarketingFooter } from '@/components/layout/marketing-footer'
import { subscriptionTiers, formatPrice } from '@/lib/stripe'

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleSubscribe = async (tier: string) => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    setIsLoading(tier)

    try {
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier })
      })

      const data = await response.json()

      if (data.success && data.data.url) {
        window.location.href = data.data.url
      } else {
        throw new Error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Failed to start subscription process. Please try again.')
    } finally {
      setIsLoading(null)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <MarketingNav />
      <div className="mb-8" />

      {/* Pricing Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start with a 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {Object.entries(subscriptionTiers).map(([key, tier]) => (
            <div
              key={key}
              className={`bg-white rounded-lg shadow-lg p-8 relative ${
                key === 'GROWTH' ? 'ring-2 ring-blue-500 scale-105' : ''
              }`}
            >
              {key === 'GROWTH' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {tier.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(tier.price)}
                  </span>
                  <span className="text-gray-600">/month</span>
                </div>
                <p className="text-gray-600">
                  {tier.accounts} accounts • {tier.posts === -1 ? 'Unlimited' : tier.posts} posts
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(key)}
                disabled={isLoading === key}
                className={`w-full ${
                  key === 'GROWTH'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-900 hover:bg-gray-800'
                }`}
              >
                {isLoading === key ? 'Loading...' : 'Start Free Trial'}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-gray-600 mb-4">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <p className="text-sm text-gray-500">
            Need a custom plan? <a href="mailto:support@conversai.social" className="text-blue-600 hover:underline">Contact us</a>
          </p>
        </div>
      </div>
      <MarketingFooter />
    </div>
  )
}
