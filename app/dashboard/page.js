'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { RotateCcw } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { clearLayouts } from '../lib/dashboardLayoutState';

const DraggableDashboard = dynamic(() => import('../components/DraggableDashboard'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`bg-surface-secondary border border-[rgba(255,255,255,0.06)] rounded-xl h-48 animate-pulse ${i < 2 ? 'md:col-span-2' : ''}`} />
      ))}
    </div>
  ),
});

export default function Dashboard() {
  const [resetKey, setResetKey] = useState(0);

  const handleResetLayout = () => {
    clearLayouts();
    setResetKey((k) => k + 1);
  };

  return (
    <PageLayout
      title="Dashboard"
      subtitle="AI Agent Operations, Adaptive Learning, and Reliability Controls"
      breadcrumbs={['Dashboard']}
      actions={
        <button
          onClick={handleResetLayout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-surface-tertiary border border-border rounded-lg transition-colors"
          title="Reset dashboard layout to defaults"
        >
          <RotateCcw size={14} />
          Reset Layout
        </button>
      }
    >
      <DraggableDashboard key={resetKey} />
    </PageLayout>
  );
}
