'use client';

import RiskSignalsCard from './RiskSignalsCard';
import OpenLoopsCard from './OpenLoopsCard';
import RecentActionsCard from './RecentActionsCard';
import ProjectsCard from './ProjectsCard';
import GoalsChart from './GoalsChart';
import LearningStatsCard from './LearningStatsCard';
import FollowUpsCard from './FollowUpsCard';
import CalendarWidget from './CalendarWidget';
import IntegrationsCard from './IntegrationsCard';
import MemoryHealthCard from './MemoryHealthCard';
import InspirationCard from './InspirationCard';
import ContextCard from './ContextCard';
import TokenBudgetCard from './TokenBudgetCard';
import TokenChart from './TokenChart';
import OnboardingChecklist from './OnboardingChecklist';

// Reverted to static layout due to persistent issues with react-grid-layout rendering 1x1 columns.
// See docs/decisions/2026-02-13-revert-draggable-dashboard.md for details.
export default function DraggableDashboard() {
  return (
    <div className="space-y-6">
      {/* Onboarding: full-width */}
      <OnboardingChecklist />

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Row 1: Status overview */}
        <div className="md:col-span-2">
          <RiskSignalsCard />
        </div>
        <div className="md:col-span-2">
          <OpenLoopsCard />
        </div>

        {/* Row 2: Activity */}
        <div className="md:col-span-2">
          <RecentActionsCard />
        </div>
        <div className="md:col-span-2">
          <ProjectsCard />
        </div>

        {/* Row 3: Goals & Learning */}
        <div>
          <GoalsChart />
        </div>
        <div>
          <LearningStatsCard />
        </div>
        <div>
          <FollowUpsCard />
        </div>
        <div>
          <CalendarWidget />
        </div>

        {/* Row 4: Context & System */}
        <div className="md:col-span-2">
          <ContextCard />
        </div>
        <div>
          <TokenBudgetCard />
        </div>
        <div>
          <MemoryHealthCard />
        </div>

        {/* Row 5: Analytics & Extras */}
        <div className="md:col-span-2">
          <TokenChart />
        </div>
        <div>
          <IntegrationsCard />
        </div>
        <div>
          <InspirationCard />
        </div>
      </div>
    </div>
  );
}
