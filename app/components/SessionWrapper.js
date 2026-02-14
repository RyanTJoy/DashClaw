'use client';

import { SessionProvider } from 'next-auth/react';
import { AgentFilterProvider } from '../lib/AgentFilterContext';
import { isDemoMode } from '../lib/isDemoMode';

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

function DemoSessionProvider({ children }) {
  const mockSession = {
    data: {
      user: {
        id: 'demo_user',
        name: 'Demo Viewer',
        email: 'demo@dashclaw.io',
        image: null,
        orgId: 'org_demo',
        role: 'admin',
        plan: 'pro',
      },
      expires: '9999-12-31T23:59:59.999Z',
    },
    status: 'authenticated',
    update: () => Promise.resolve(),
  };

  return (
    <SessionProvider
      session={mockSession.data}
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}

export default function SessionWrapper({ children }) {
  // Demo mode is a public, read-only sandbox. Avoid NextAuth session fetches entirely.
  if (isDemoMode()) {
    return (
      <DemoSessionProvider>
        <AgentFilterProvider>{children}</AgentFilterProvider>
      </DemoSessionProvider>
    );
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
