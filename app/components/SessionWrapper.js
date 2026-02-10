'use client';

import { SessionProvider } from 'next-auth/react';
import { AgentFilterProvider } from '../lib/AgentFilterContext';

export default function SessionWrapper({ children }) {
  return (
    <SessionProvider>
      <AgentFilterProvider>{children}</AgentFilterProvider>
    </SessionProvider>
  );
}
