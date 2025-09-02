// Subscription management API
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const subscription = await db.subscription.findUnique({
        where: { userId: user.id }
      })

      if (!subscription) {
        return apiError('No subscription found', 404)
      }

      let stripeSubscription = null
      if (subscription.stripeSubscriptionId) {
        try {
          stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
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
      const { action } = body

      const subscription = await db.subscription.findUnique({
        where: { userId: user.id }
      })

      if (!subscription || !subscription.stripeCustomerId) {
        return apiError('No subscription found', 404)
      }

      try {
        switch (action) {
          case 'create_portal_session': {
            // Create Stripe customer portal session
            const session = await stripe.billingPortal.sessions.create({
              customer: subscription.stripeCustomerId,
              return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
            })

            return apiSuccess({ url: session.url })
          }

          case 'cancel_subscription': {
            if (!subscription.stripeSubscriptionId) {
              return apiError('No active subscription to cancel', 400)
            }

            await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
              cancel_at_period_end: true
            })

            await db.subscription.update({
              where: { userId: user.id },
              data: { cancelAtPeriodEnd: true }
            })

            return apiSuccess({ message: 'Subscription will be canceled at the end of the billing period' })
          }

          case 'reactivate_subscription': {
            if (!subscription.stripeSubscriptionId) {
              return apiError('No subscription to reactivate', 400)
            }

            await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
              cancel_at_period_end: false
            })

            await db.subscription.update({
              where: { userId: user.id },
              data: { cancelAtPeriodEnd: false }
            })

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
