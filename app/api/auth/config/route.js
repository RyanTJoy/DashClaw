import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const providers = [];
  const isProd = process.env.NODE_ENV === 'production';

  if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
    providers.push({ id: 'github', name: 'GitHub' });
  } else if (!isProd) {
    providers.push({ id: 'github', name: 'GitHub (Mock)' });
  }
  
  if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET) {
    providers.push({ id: 'google', name: 'Google' });
  } else if (!isProd) {
    providers.push({ id: 'google', name: 'Google (Mock)' });
  }

  if (process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET && process.env.OIDC_ISSUER_URL) {
    providers.push({
      id: 'oidc',
      name: process.env.OIDC_DISPLAY_NAME || 'OIDC',
    });
  }

  return NextResponse.json({ providers });
}
