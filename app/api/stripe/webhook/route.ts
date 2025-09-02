// Stripe webhook handler for subscription events
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCanceled(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const tier = session.metadata?.tier

  if (!userId || !tier) {
    console.error('Missing metadata in checkout session')
    return
  }

  // Update subscription status
  await db.subscription.update({
    where: { userId },
    data: {
      tier: tier as any,
      status: 'TRIALING',
      stripeSubscriptionId: session.subscription as string,
      stripePriceId: session.line_items?.data[0]?.price?.id,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    }
  })
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('Missing userId in subscription metadata')
    return
  }

  await db.subscription.update({
    where: { userId },
    data: {
      status: subscription.status.toUpperCase() as any,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    }
  })
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('Missing userId in subscription metadata')
    return
  }

  await db.subscription.update({
    where: { userId },
    data: {
      status: 'CANCELED',
      cancelAtPeriodEnd: true,
    }
  })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Handle successful payment - could send confirmation email, etc.
  console.log('Payment succeeded for invoice:', invoice.id)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Handle failed payment - could send notification, etc.
  console.log('Payment failed for invoice:', invoice.id)
}
