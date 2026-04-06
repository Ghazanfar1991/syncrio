// Stripe checkout session creation API using Supabase
import { NextRequest, NextResponse } from 'next/server'
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
        // Create or get Stripe customer from Supabase
        const { data: subscription, error: subError } = await (db as any)
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (subError) throw subError

        let stripeCustomerId = subscription?.stripe_customer_id

        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name,
            metadata: {
              userId: user.id
            }
          })
          stripeCustomerId = customer.id

          // Update user's subscription with customer ID in Supabase
          const { error: upsertError } = await (db as any)
            .from('subscriptions')
            .upsert({
              user_id: user.id,
              tier: 'STARTER',
              status: 'INCOMPLETE',
              stripe_customer_id: stripeCustomerId,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })

          if (upsertError) throw upsertError
        }

        // Create checkout session
        const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        
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
          success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/pricing`,
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
