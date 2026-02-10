export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

let _sql;
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const { neon } = require('@neondatabase/serverless');
  _sql = neon(url);
  return _sql;
}

function getStripe() {
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

/** Maps Stripe price IDs (from env) to plan names. */
function resolvePlanFromPriceId(priceId) {
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_TEAM) return 'team';
  return null;
}

export async function POST(request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[STRIPE] STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  // Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error('[STRIPE] Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const sql = getSql();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orgId = session.metadata?.org_id;
        if (!orgId) break;

        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = resolvePlanFromPriceId(priceId) || 'pro';

        await sql`
          UPDATE organizations SET
            plan = ${plan},
            stripe_customer_id = ${session.customer},
            stripe_subscription_id = ${session.subscription},
            subscription_status = ${subscription.status},
            current_period_end = ${new Date(subscription.current_period_end * 1000).toISOString()}
          WHERE id = ${orgId}
        `;
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = resolvePlanFromPriceId(priceId);

        const updateFields = {
          subscription_status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        };

        if (plan) {
          await sql`
            UPDATE organizations SET
              plan = ${plan},
              subscription_status = ${updateFields.subscription_status},
              current_period_end = ${updateFields.current_period_end}
            WHERE stripe_subscription_id = ${subscription.id}
          `;
        } else {
          await sql`
            UPDATE organizations SET
              subscription_status = ${updateFields.subscription_status},
              current_period_end = ${updateFields.current_period_end}
            WHERE stripe_subscription_id = ${subscription.id}
          `;
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await sql`
          UPDATE organizations SET
            plan = 'free',
            subscription_status = 'canceled',
            stripe_subscription_id = NULL,
            current_period_end = NULL
          WHERE stripe_subscription_id = ${subscription.id}
        `;
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await sql`
            UPDATE organizations SET subscription_status = 'past_due'
            WHERE stripe_subscription_id = ${invoice.subscription}
          `;
        }
        break;
      }
    }
  } catch (err) {
    console.error(`[STRIPE] Error handling ${event.type}:`, err.message);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
