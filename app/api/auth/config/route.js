import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const providers = [];
  const isProd = process.env.NODE_ENV === 'production';

  const GITHUB_ID = process.env.GITHUB_ID || process.env.GITHUB_CLIENT_ID;
  const GITHUB_SECRET = process.env.GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET;
  const GOOGLE_ID = process.env.GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_SECRET = process.env.GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;

  console.log('[AUTH CONFIG] NODE_ENV:', process.env.NODE_ENV);
  console.log('[AUTH CONFIG] GITHUB_ID set:', !!GITHUB_ID);
  console.log('[AUTH CONFIG] GOOGLE_ID set:', !!GOOGLE_ID);
  console.log('[AUTH CONFIG] OIDC configured:', !!(process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET && process.env.OIDC_ISSUER_URL));

  if (GITHUB_ID && GITHUB_SECRET) {
    providers.push({ id: 'github', name: 'GitHub' });
  } else if (!isProd) {
    providers.push({ id: 'github', name: 'GitHub (Mock)' });
  }
  
  if (GOOGLE_ID && GOOGLE_SECRET) {
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

  return NextResponse.json({ providers, isProd });
}
