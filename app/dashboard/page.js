'use client';

import dynamic from 'next/dynamic';
import PageLayout from '../components/PageLayout';

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
  return (
    <PageLayout
      title="Dashboard"
      subtitle="AI Agent Operations Overview"
      breadcrumbs={['Dashboard']}
    >
      <DraggableDashboard />
    </PageLayout>
  );
}
