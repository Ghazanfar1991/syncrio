// Stripe checkout session creation API
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { stripe, subscriptionTiers, isStripeConfigured } from '@/lib/stripe'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const body = await req.json()
      const { tier } = body

      if (!tier || !subscriptionTiers[tier as keyof typeof subscriptionTiers]) {
        return apiError('Invalid subscription tier', 400)
      }

      const tierDetails = subscriptionTiers[tier as keyof typeof subscriptionTiers]

      // Check if Stripe is configured
      if (!isStripeConfigured() || !stripe) {
        return apiError('Payment processing not configured. Please contact administrator.', 503)
      }

      try {
        // Create or get Stripe customer
        let stripeCustomerId = user.subscription?.stripeCustomerId

        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name,
            metadata: {
              userId: user.id
            }
          })
          stripeCustomerId = customer.id

          // Update user's subscription with customer ID
          await db.subscription.upsert({
            where: { userId: user.id },
            update: { stripeCustomerId },
            create: {
              userId: user.id,
              tier: 'STARTER',
              status: 'INCOMPLETE',
              stripeCustomerId
            }
          })
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          payment_method_types: ['card'],
          billing_address_collection: 'required',
          line_items: [
            {
              price: tierDetails.stripePriceId,
              quantity: 1,
            },
          ],
          mode: 'subscription',
          allow_promotion_codes: true,
          subscription_data: {
            trial_period_days: 14, // 14-day free trial
            metadata: {
              userId: user.id,
              tier: tier
            }
          },
          success_url: `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
          metadata: {
            userId: user.id,
            tier: tier
          }
        })

        return apiSuccess({ 
          sessionId: session.id,
          url: session.url 
        })
      } catch (error) {
        console.error('Stripe checkout error:', error)
        return apiError('Failed to create checkout session', 500)
      }
    })
  )(req)
}
