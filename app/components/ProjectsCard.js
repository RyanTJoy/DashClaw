'use client';

import { useState, useEffect } from 'react';

export default function ProjectsCard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch('/api/actions?limit=200');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();

        // Group actions by system into "project" summaries
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

        // Convert to project-like objects, sort by most actions
        const items = Object.entries(systemMap)
          .map(([name, stats]) => {
            const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
            let status = 'active';
            if (stats.running > 0) status = 'building';
            else if (stats.failed > stats.completed) status = 'paused';
            else if (progress === 100) status = 'maintaining';

            let priority = 'low';
            if (stats.running > 0 || stats.failed > 0) priority = 'high';
            else if (stats.total > 3) priority = 'medium';

            return { name, status, progress, total: stats.total, lastUpdate: stats.lastUpdate, priority };
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
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'building': return 'bg-yellow-500';
      case 'maintaining': return 'bg-blue-500';
      case 'paused': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '--';
    try {
      return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return '--'; }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 h-full">
        <h2 className="text-xl font-bold text-white flex items-center mb-4">
          <span className="mr-2">🚀</span>Active Projects
        </h2>
        <div className="text-center text-gray-400 py-8">Loading projects...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="glass-card p-6 h-full">
        <h2 className="text-xl font-bold text-white flex items-center mb-4">
          <span className="mr-2">🚀</span>Active Projects
        </h2>
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">📁</div>
          <div>No project activity yet</div>
          <div className="text-xs mt-1">Projects are derived from action systems_touched</div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <span className="mr-2">🚀</span>
          Active Projects
        </h2>
        <span className="bg-fire-orange text-white px-2 py-1 rounded-full text-sm font-semibold">
          {projects.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
        {projects.map((project, index) => (
          <div key={index} className={`glass-card p-4 border-l-4 ${getPriorityColor(project.priority)} hover:bg-opacity-20 transition-all`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <span className="text-xl mr-2">📁</span>
                <div>
                  <div className="font-semibold text-white text-sm">{project.name}</div>
                  <div className="text-xs text-gray-400">{project.total} actions</div>
                </div>
              </div>
              <span className={`w-3 h-3 rounded-full ${getStatusColor(project.status)}`}></span>
            </div>

            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Completion</span>
                <span className="text-white">{project.progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 fire-gradient rounded-full transition-all duration-500"
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className={`px-2 py-1 rounded text-white ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
              <span className="text-gray-400">{formatDate(project.lastUpdate)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="font-semibold text-green-400">{projects.filter(p => p.status === 'active').length}</div>
            <div className="text-gray-400">Active</div>
          </div>
          <div>
            <div className="font-semibold text-yellow-400">{projects.filter(p => p.status === 'building').length}</div>
            <div className="text-gray-400">Building</div>
          </div>
          <div>
            <div className="font-semibold text-blue-400">{projects.filter(p => p.status === 'maintaining').length}</div>
            <div className="text-gray-400">Maintaining</div>
          </div>
        </div>
      </div>
    </div>
  );
}
