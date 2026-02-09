'use client';

import TokenBudgetCard from './TokenBudgetCard';
import RiskSignalsCard from './RiskSignalsCard';
import OpenLoopsCard from './OpenLoopsCard';
import RecentActionsCard from './RecentActionsCard';
import ProjectsCard from './ProjectsCard';
import GoalsChart from './GoalsChart';
import LearningStatsCard from './LearningStatsCard';
import FollowUpsCard from './FollowUpsCard';
import CalendarWidget from './CalendarWidget';
import TokenChart from './TokenChart';
import IntegrationsCard from './IntegrationsCard';
import MemoryHealthCard from './MemoryHealthCard';
import InspirationCard from './InspirationCard';
import ContextCard from './ContextCard';

// Fixed, opinionated layout — no customize mode.
// Ordered for operational storytelling: status → signals → details → data.
export default function DraggableDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Row 1: Status overview */}
      <div className="md:col-span-2">
        <TokenBudgetCard />
      </div>
      <div>
        <RiskSignalsCard />
      </div>
      <div>
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

      {/* Row 4: Trends & System */}
      <div className="md:col-span-2">
        <TokenChart />
      </div>
      <div>
        <IntegrationsCard />
      </div>
      <div>
        <MemoryHealthCard />
      </div>

      {/* Row 5: Extra */}
      <div>
        <InspirationCard />
      </div>
      <div className="md:col-span-2">
        <ContextCard />
      </div>
    </div>
  );
}
