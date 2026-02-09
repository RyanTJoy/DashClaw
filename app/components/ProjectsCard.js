'use client';

import { useState, useEffect } from 'react';
import { FolderKanban } from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { StatCompact } from './ui/Stat';
import { ProgressBar } from './ui/ProgressBar';
import { EmptyState } from './ui/EmptyState';
import { CardSkeleton } from './ui/Skeleton';
import { useAgentFilter } from '../lib/AgentFilterContext';

function getStatusVariant(status) {
  switch (status) {
    case 'active': return 'success';
    case 'building': return 'warning';
    case 'maintaining': return 'info';
    case 'paused': return 'default';
    default: return 'default';
  }
}

function getProgressColor(status) {
  switch (status) {
    case 'active': return 'brand';
    case 'building': return 'warning';
    case 'maintaining': return 'info';
    case 'paused': return 'brand';
    default: return 'brand';
  }
}

export default function ProjectsCard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { agentId } = useAgentFilter();

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch(`/api/actions?limit=200${agentId ? `&agent_id=${agentId}` : ''}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();

        const systemMap = {};
        for (const action of (data.actions || [])) {
          let systems = [];
          try {
            systems = typeof action.systems_touched === 'string'
              ? JSON.parse(action.systems_touched || '[]')
              : (action.systems_touched || []);
          } catch { systems = []; }

          if (systems.length === 0) systems = ['General'];

          for (const sys of systems) {
            if (!systemMap[sys]) {
              systemMap[sys] = { total: 0, completed: 0, failed: 0, running: 0, lastUpdate: null };
            }
            systemMap[sys].total++;
            if (action.status === 'completed') systemMap[sys].completed++;
            else if (action.status === 'failed') systemMap[sys].failed++;
            else if (action.status === 'running') systemMap[sys].running++;

            const ts = action.timestamp_start || action.created_at;
            if (ts && (!systemMap[sys].lastUpdate || ts > systemMap[sys].lastUpdate)) {
              systemMap[sys].lastUpdate = ts;
            }
          }
        }

        const items = Object.entries(systemMap)
          .map(([name, stats]) => {
            const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
            let status = 'active';
            if (stats.running > 0) status = 'building';
            else if (stats.failed > stats.completed) status = 'paused';
            else if (progress === 100) status = 'maintaining';

            return { name, status, progress, total: stats.total, lastUpdate: stats.lastUpdate };
          })
          .sort((a, b) => b.total - a.total)
          .slice(0, 9);

        setProjects(items);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [agentId]);

  const formatDate = (ts) => {
    if (!ts) return '--';
    try {
      return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return '--'; }
  };

  if (loading) {
    return <CardSkeleton />;
  }

  if (projects.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader title="Active Projects" icon={FolderKanban} />
        <CardContent>
          <EmptyState
            icon={FolderKanban}
            title="No project activity yet"
            description="Projects auto-populate from action systems_touched. Use the SDK's createAction() to start tracking."
          />
        </CardContent>
      </Card>
    );
  }

  const activeCount = projects.filter(p => p.status === 'active').length;
  const buildingCount = projects.filter(p => p.status === 'building').length;
  const maintainingCount = projects.filter(p => p.status === 'maintaining').length;

  return (
    <Card className="h-full">
      <CardHeader title="Active Projects" icon={FolderKanban} count={projects.length} />

      <CardContent>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {projects.map((project, index) => (
            <div
              key={index}
              className="flex items-center gap-3 px-2 py-2 rounded-lg transition-colors duration-150 hover:bg-white/[0.03]"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-zinc-300 truncate">{project.name}</div>
              </div>

              <span className="text-xs text-zinc-500 tabular-nums flex-shrink-0 w-10 text-right">
                {project.total}
              </span>

              <div className="w-20 flex-shrink-0">
                <ProgressBar value={project.progress} color={getProgressColor(project.status)} />
              </div>

              <Badge variant={getStatusVariant(project.status)} size="xs" className="flex-shrink-0 w-[72px] justify-center">
                {project.status}
              </Badge>

              <span className="font-mono text-[10px] text-zinc-600 flex-shrink-0 w-14 text-right">
                {formatDate(project.lastUpdate)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]">
          <div className="grid grid-cols-3 gap-2">
            <StatCompact label="Active" value={activeCount} color="text-green-400" />
            <StatCompact label="Building" value={buildingCount} color="text-yellow-400" />
            <StatCompact label="Maintaining" value={maintainingCount} color="text-blue-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
