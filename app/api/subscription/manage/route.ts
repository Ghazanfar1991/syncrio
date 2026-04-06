// Subscription management API using Supabase
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const { data: subscription, error: subError } = await (db as any)
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (subError) throw subError

      if (!subscription) {
        return apiError('No subscription found', 404)
      }

      let stripeSubscription = null
      if (subscription.stripe_subscription_id) {
        try {
          if (!stripe) {
            throw new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY.')
          }
          stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
        } catch (error) {
          console.error('Failed to retrieve Stripe subscription:', error)
        }
      }

      return apiSuccess({
        subscription: {
          ...subscription,
          stripeSubscription
        }
      })
    })
  )(req)
}

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const body = await req.json()
      type Action = 'create_portal_session' | 'cancel_subscription' | 'reactivate_subscription'
      const { action } = body as { action?: Action }

      const { data: subscription, error: subError } = await (db as any)
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (subError) throw subError

      if (!subscription || !subscription.stripe_customer_id) {
        return apiError('No subscription found', 404)
      }

      try {
        switch (action) {
          case 'create_portal_session': {
            // Create Stripe customer portal session
            if (!stripe) {
              throw new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY.')
            }
            const returnUrl = (process.env.NEXTAUTH_URL || req.headers.get('origin') || '').replace(/\/$/, '') + '/dashboard'
            const session = await stripe.billingPortal.sessions.create({
              customer: subscription.stripe_customer_id,
              return_url: returnUrl,
            })

            return apiSuccess({ url: session.url || returnUrl })
          }

          case 'cancel_subscription': {
            if (!subscription.stripe_subscription_id) {
              return apiError('No active subscription to cancel', 400)
            }

            if (!stripe) {
              throw new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY.')
            }
            await stripe.subscriptions.update(subscription.stripe_subscription_id, {
              cancel_at_period_end: true
            })

            await (db as any)
              .from('subscriptions')
              .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
              .eq('user_id', user.id)

            return apiSuccess({ message: 'Subscription will be canceled at the end of the billing period' })
          }

          case 'reactivate_subscription': {
            if (!subscription.stripe_subscription_id) {
              return apiError('No subscription to reactivate', 400)
            }

            if (!stripe) {
              throw new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY.')
            }
            await stripe.subscriptions.update(subscription.stripe_subscription_id, {
              cancel_at_period_end: false
            })

            await (db as any)
              .from('subscriptions')
              .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
              .eq('user_id', user.id)

            return apiSuccess({ message: 'Subscription reactivated successfully' })
          }

          default:
            return apiError('Invalid action', 400)
        }
      } catch (error) {
        console.error('Subscription management error:', error)
        return apiError('Failed to process subscription action', 500)
      }
    })
  )(req)
}
