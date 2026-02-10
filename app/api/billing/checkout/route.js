export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getOrgId, getOrgRole, getUserId } from '../../../lib/org.js';
import { logActivity } from '../../../lib/audit.js';

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

const PRICE_MAP = {
  pro: () => process.env.STRIPE_PRICE_PRO,
  team: () => process.env.STRIPE_PRICE_TEAM,
};

// POST /api/billing/checkout - Create Stripe Checkout Session (admin only)
export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }

    const orgId = getOrgId(request);
    if (orgId === 'org_default') {
      return NextResponse.json(
        { error: 'Complete onboarding first', needsOnboarding: true },
        { status: 403 }
      );
    }
    if (getOrgRole(request) !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { plan } = body;

    if (!plan || !PRICE_MAP[plan]) {
      return NextResponse.json({ error: 'Invalid plan. Choose "pro" or "team".' }, { status: 400 });
    }

    const priceId = PRICE_MAP[plan]();
    if (!priceId) {
      return NextResponse.json({ error: `Price not configured for ${plan} plan` }, { status: 503 });
    }

    const sql = getSql();
    const stripe = getStripe();

    // Get or create Stripe customer
    const rows = await sql`
      SELECT stripe_customer_id, name FROM organizations WHERE id = ${orgId} LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    let customerId = rows[0].stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: rows[0].name || orgId,
        metadata: { org_id: orgId },
      });
      customerId = customer.id;
      await sql`UPDATE organizations SET stripe_customer_id = ${customerId} WHERE id = ${orgId}`;
    }

    // Build success/cancel URLs
    const origin = request.headers.get('x-forwarded-host')
      ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host')}`
      : new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?success=true`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: { org_id: orgId },
    });

    logActivity({
      orgId, actorId: getUserId(request) || 'unknown', action: 'billing.checkout_started',
      resourceType: 'billing',
      details: { plan }, request,
    }, sql);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Billing checkout POST error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
