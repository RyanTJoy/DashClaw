'use client';

import { SessionProvider } from 'next-auth/react';
import { AgentFilterProvider } from '../lib/AgentFilterContext';

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
