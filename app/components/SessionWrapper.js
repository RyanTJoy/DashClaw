'use client';

import { SessionProvider } from 'next-auth/react';
import { AgentFilterProvider } from '../lib/AgentFilterContext';

function isDemoMode() {
  // Client-side env must be NEXT_PUBLIC_*.
  return process.env.NEXT_PUBLIC_DASHCLAW_MODE === 'demo';
}

// Mock session provider for development to bypass login
function DevSessionProvider({ children }) {
  // Hardcoded "session" that mimics NextAuth structure
  const mockSession = {
    data: {
      user: {
        id: 'dev_user',
        name: 'Local Developer',
        email: 'dev@local',
        image: null,
        orgId: 'org_default',
        role: 'admin',
        plan: 'pro'
      },
      expires: '9999-12-31T23:59:59.999Z'
    },
    status: 'authenticated',
    update: () => Promise.resolve()
  };

  // We still use SessionProvider but we pass our mock session
  // This ensures useSession() hooks downstream get this data immediately
  return (
    <SessionProvider session={mockSession.data}>
      {children}
    </SessionProvider>
  );
}

export default function SessionWrapper({ children }) {
  // Demo mode is a public, read-only sandbox. Avoid NextAuth session fetches entirely.
  if (isDemoMode()) {
    return <AgentFilterProvider>{children}</AgentFilterProvider>;
  }

  if (process.env.NODE_ENV === 'development') {
    return (
      <DevSessionProvider>
        <AgentFilterProvider>{children}</AgentFilterProvider>
      </DevSessionProvider>
    );
  }

  return (
    <SessionProvider>
      <AgentFilterProvider>{children}</AgentFilterProvider>
    </SessionProvider>
  );
}
