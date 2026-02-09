'use client';

import { useState, useEffect } from 'react';
import { GitBranch, ClipboardList, ScrollText, Clock, CheckCircle2, XCircle, Loader2, HelpCircle, Play, Inbox, RotateCw } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Stat } from '../components/ui/Stat';
import { StatCompact } from '../components/ui/Stat';
import { EmptyState } from '../components/ui/EmptyState';

export default function WorkflowsDashboard() {
  const [workflows, setWorkflows] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [stats, setStats] = useState({ totalWorkflows: 0, enabled: 0, totalRuns: 0, recentExecutions: 0 });
  const [lastUpdated, setLastUpdated] = useState('');
  const [runningWorkflow, setRunningWorkflow] = useState(null);

  const fetchData = async () => {
    try {
      const [workflowsRes, schedulesRes] = await Promise.all([
        fetch('/api/workflows'),
        fetch('/api/schedules')
      ]);

      const workflowsData = await workflowsRes.json();
      const schedulesData = await schedulesRes.json();

      if (workflowsData.workflows && Array.isArray(workflowsData.workflows)) {
        setWorkflows(workflowsData.workflows);
      }
      if (workflowsData.executions && Array.isArray(workflowsData.executions)) {
        setExecutions(workflowsData.executions);
      }
      if (workflowsData.stats) {
        setStats({
          totalWorkflows: workflowsData.stats.totalWorkflows || 0,
          enabled: workflowsData.stats.enabled || 0,
          totalRuns: workflowsData.stats.totalRuns || 0,
          recentExecutions: workflowsData.stats.recentExecutions || 0
        });
      }
      if (schedulesData.schedules && Array.isArray(schedulesData.schedules)) {
        setSchedules(schedulesData.schedules);
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const runWorkflow = async (name) => {
    setRunningWorkflow(name);
    const command = `python tools/workflow-orchestrator/orchestrator.py run ${name}`;
    navigator.clipboard.writeText(command);
    alert(`Command copied to clipboard!\n\n${command}\n\nPaste in terminal to run.`);
    setRunningWorkflow(null);
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed': case 'success': return 'success';
      case 'failed': case 'error': return 'error';
      case 'running': return 'warning';
      default: return 'default';
    }
  };

  const StatusIcon = ({ status, size = 14 }) => {
    switch (status) {
      case 'completed': case 'success':
        return <CheckCircle2 size={size} className="text-green-400" />;
      case 'failed': case 'error':
        return <XCircle size={size} className="text-red-400" />;
      case 'running':
        return <Loader2 size={size} className="text-yellow-400 animate-spin" />;
      default:
        return <HelpCircle size={size} className="text-zinc-400" />;
    }
  };

  const parseSteps = (steps) => {
    if (!steps) return [];
    if (Array.isArray(steps)) return steps;
    if (typeof steps === 'string') {
      try {
        return JSON.parse(steps);
      } catch {
        return [];
      }
    }
    return [];
  };

  const refreshButton = (
    <button
      onClick={fetchData}
      className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white bg-surface-tertiary border border-[rgba(255,255,255,0.06)] rounded-lg hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150 flex items-center gap-1.5"
    >
      <RotateCw size={14} />
      Refresh
    </button>
  );

  return (
    <PageLayout
      title="Workflow Orchestrator"
      subtitle={`Automated Tool Chains${lastUpdated ? ` -- Updated ${lastUpdated}` : ''}`}
      breadcrumbs={['Dashboard', 'Workflows']}
      actions={refreshButton}
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card hover={false}>
          <CardContent className="pt-4 pb-4">
            <StatCompact label="Total Workflows" value={stats.totalWorkflows} color="text-brand" />
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-4 pb-4">
            <StatCompact label="Enabled" value={stats.enabled} color="text-green-400" />
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-4 pb-4">
            <StatCompact label="Total Runs" value={stats.totalRuns} color="text-yellow-400" />
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-4 pb-4">
            <StatCompact label="Recent Executions" value={executions.length} color="text-purple-400" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflows */}
        <Card hover={false}>
          <CardHeader title="Available Workflows" icon={ClipboardList} />
          <CardContent>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {workflows.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="No workflows defined yet"
                />
              ) : (
                workflows.map((workflow) => {
                  const steps = parseSteps(workflow.steps);
                  return (
                    <div key={workflow.id} className="bg-surface-tertiary rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${workflow.enabled === 1 ? 'bg-green-500' : 'bg-zinc-500'}`}></span>
                            <div className="text-sm font-medium text-white">{workflow.name}</div>
                          </div>
                          {workflow.description && (
                            <div className="text-sm text-zinc-300 mt-1 ml-4">{workflow.description}</div>
                          )}
                        </div>
                        <button
                          onClick={() => runWorkflow(workflow.name)}
                          disabled={runningWorkflow === workflow.name}
                          className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white bg-surface-tertiary border border-[rgba(255,255,255,0.06)] rounded-lg hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {runningWorkflow === workflow.name ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Play size={14} />
                          )}
                          Run
                        </button>
                      </div>

                      {steps.length > 0 && (
                        <div className="ml-4 mt-3">
                          <div className="text-xs text-zinc-500 mb-1">Steps ({steps.length}):</div>
                          <div className="flex flex-wrap gap-1">
                            {steps.slice(0, 5).map((step, idx) => (
                              <span key={idx} className="px-2 py-1 bg-white/5 rounded text-xs text-zinc-300">
                                {typeof step === 'string' ? step : (step.name || `Step ${idx + 1}`)}
                              </span>
                            ))}
                            {steps.length > 5 && (
                              <span className="px-2 py-1 bg-white/5 rounded text-xs text-zinc-300">
                                +{steps.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3 text-xs text-zinc-500 ml-4">
                        <span>Runs: {workflow.run_count || 0}</span>
                        <span>Last: {workflow.last_run ? new Date(workflow.last_run).toLocaleDateString() : 'Never'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Execution History */}
        <Card hover={false}>
          <CardHeader title="Execution History" icon={ScrollText} />
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {executions.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="No executions yet"
                />
              ) : (
                executions.map((exec) => (
                  <div key={exec.id} className="bg-surface-tertiary rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <StatusIcon status={exec.status} />
                        <span className="text-sm font-medium text-white">{exec.workflow_name || `Workflow #${exec.workflow_id}`}</span>
                      </div>
                      <Badge variant={getStatusVariant(exec.status)} size="xs">
                        {exec.status || 'unknown'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>Steps: {exec.steps_completed || 0}/{exec.total_steps || '?'}</span>
                      <span>{exec.started_at ? new Date(exec.started_at).toLocaleString() : 'Unknown'}</span>
                    </div>
                    {exec.error && (
                      <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded">
                        {exec.error}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Jobs */}
      <Card hover={false} className="mt-6">
        <CardHeader title="Scheduled Jobs" icon={Clock} count={schedules.length} />
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center text-sm text-zinc-500 py-4">
              No scheduled jobs yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="bg-surface-tertiary rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${schedule.enabled === 1 ? 'bg-green-500' : 'bg-zinc-500'}`}></span>
                      <span className="text-sm font-medium text-white">{schedule.workflow_name}</span>
                    </div>
                  </div>
                  <div className="text-sm text-brand mb-2">{schedule.schedule}</div>
                  {schedule.description && (
                    <div className="text-xs text-zinc-500 mb-2">{schedule.description}</div>
                  )}
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Next: {schedule.next_run ? new Date(schedule.next_run).toLocaleString() : 'N/A'}</span>
                    <span>Runs: {schedule.run_count || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
