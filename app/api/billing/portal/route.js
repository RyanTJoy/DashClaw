export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getOrgId, getOrgRole } from '../../../lib/org.js';

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

// POST /api/billing/portal - Create Stripe Customer Portal Session (admin only)
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

    const sql = getSql();
    const rows = await sql`
      SELECT stripe_customer_id FROM organizations WHERE id = ${orgId} LIMIT 1
    `;

    if (rows.length === 0 || !rows[0].stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found. Subscribe to a plan first.' }, { status: 400 });
    }

    const stripe = getStripe();
    const origin = request.headers.get('x-forwarded-host')
      ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host')}`
      : new URL(request.url).origin;

    const session = await stripe.billingPortal.sessions.create({
      customer: rows[0].stripe_customer_id,
      return_url: `${origin}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal POST error:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
