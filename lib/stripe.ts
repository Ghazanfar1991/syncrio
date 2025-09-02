// Stripe configuration for payment processing
import Stripe from 'stripe'

// Check if Stripe is configured
export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY)
}

// Initialize Stripe only if configured
let stripe: Stripe | null = null

if (isStripeConfigured()) {
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
    })
  } catch (error) {
    console.warn('Stripe initialization failed:', error)
    stripe = null
  }
} else {
  console.log('Stripe not configured - payment features will be disabled')
}

export { stripe }

export const subscriptionTiers = {
  STARTER: {
    name: "Starter",
    price: 29,
    accounts: 3,
    posts: 50,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
    features: [
      '3 social accounts',
      '50 posts per month',
      'AI content generation',
      'Basic analytics',
      'Email support'
    ]
  },
  GROWTH: {
    name: "Growth",
    price: 79,
    accounts: 10,
    posts: 200,
    stripePriceId: process.env.STRIPE_GROWTH_PRICE_ID || 'price_growth',
    features: [
      '10 social accounts',
      '200 posts per month',
      'AI content generation',
      'Advanced analytics',
      'Priority support',
      'Custom hashtags'
    ]
  },
  BUSINESS: {
    name: "Business",
    price: 199,
    accounts: 25,
    posts: -1, // unlimited
    stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID || 'price_business',
    features: [
      '25 social accounts',
      'Unlimited posts',
      'AI content generation',
      'Advanced analytics',
      'Priority support',
      'Custom hashtags',
      'Team collaboration'
    ]
  },
  AGENCY: {
    name: "Agency",
    price: 399,
    accounts: 100,
    posts: -1, // unlimited
    stripePriceId: process.env.STRIPE_AGENCY_PRICE_ID || 'price_agency',
    features: [
      '100 social accounts',
      'Unlimited posts',
      'AI content generation',
      'Advanced analytics',
      'Priority support',
      'Custom hashtags',
      'Team collaboration',
      'White-label options',
      'API access'
    ]
  }
}

// Helper function to get tier details
export function getTierDetails(tier: keyof typeof subscriptionTiers) {
  return subscriptionTiers[tier]
}

// Helper function to format price for display
export function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(price)
}
