'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, AlertTriangle, Zap, Eye, RotateCw,
  ChevronRight, CircleAlert
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ListSkeleton } from '../components/ui/Skeleton';
import SecurityDetailPanel from '../components/SecurityDetailPanel';
import { useAgentFilter } from '../lib/AgentFilterContext';
import { getAgentColor } from '../lib/colors';

export default function SecurityDashboard() {
  const { agentId } = useAgentFilter();
  const [signals, setSignals] = useState([]);
  const [highRiskActions, setHighRiskActions] = useState([]);
  const [invalidatedAssumptions, setInvalidatedAssumptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  // Detail panel state
  const [panelItem, setPanelItem] = useState(null);
  const [panelType, setPanelType] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = agentId ? `?agent_id=${agentId}` : '';

      const [signalsRes, actionsRes, assumptionsRes] = await Promise.all([
        fetch(`/api/actions/signals${params}`),
        fetch(`/api/actions?limit=100${agentId ? `&agent_id=${agentId}` : ''}`),
        fetch(`/api/actions/assumptions?drift=true${agentId ? `&agent_id=${agentId}` : ''}`),
      ]);

      const signalsData = await signalsRes.json();
      const actionsData = await actionsRes.json();
      const assumptionsData = await assumptionsRes.json();

      setSignals(signalsData.signals || []);

      // Filter for high-risk actions: risk_score >= 70 OR (no auth scope AND irreversible)
      const actions = actionsData.actions || [];
      const risky = actions.filter(a => {
        const risk = parseInt(a.risk_score, 10) || 0;
        const unscoped = !a.authorization_scope;
        const irreversible = a.reversible === 0;
        return risk >= 70 || (unscoped && irreversible);
      });
      setHighRiskActions(risky);

      // Filter for invalidated assumptions in last 7 days
      const assumptions = assumptionsData.assumptions || [];
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const invalidated = assumptions.filter(a => {
        if (a.invalidated !== 1) return false;
        if (!a.invalidated_at) return false;
        return (now - new Date(a.invalidated_at).getTime()) < sevenDays;
      });
      setInvalidatedAssumptions(invalidated);

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const openPanel = (item, type) => {
    setPanelItem(item);
    setPanelType(type);
  };

  const closePanel = () => {
    setPanelItem(null);
    setPanelType(null);
  };

  // Stats
  const totalSignals = signals.length;
  const now24h = Date.now() - 24 * 60 * 60 * 1000;
  const highRisk24h = highRiskActions.filter(a => {
    const ts = new Date(a.timestamp_start).getTime();
    return ts > now24h;
  }).length;
  const unscopedCount = highRiskActions.filter(a => !a.authorization_scope).length;
  const invalidatedCount = invalidatedAssumptions.length;

  const getSeverityIcon = (severity) => {
    return severity === 'red' ? CircleAlert : AlertTriangle;
  };

  return (
    <PageLayout
      title="Security"
      subtitle={`Risk Signals & Agent Oversight${lastUpdated ? ` -- Updated ${lastUpdated}` : ''}`}
      breadcrumbs={['Dashboard', 'Security']}
      actions={
        <button
          onClick={fetchData}
          className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white bg-surface-tertiary border border-[rgba(255,255,255,0.06)] rounded-lg hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150 flex items-center gap-1.5"
        >
          <RotateCw size={14} />
          Refresh
        </button>
      }
    >
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className={`text-2xl font-semibold tabular-nums ${totalSignals > 0 ? 'text-red-400' : 'text-white'}`}>
              {totalSignals}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Active Signals</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className={`text-2xl font-semibold tabular-nums ${highRisk24h > 0 ? 'text-yellow-400' : 'text-white'}`}>
              {highRisk24h}
            </div>
            <div className="text-xs text-zinc-500 mt-1">High-Risk (24h)</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className={`text-2xl font-semibold tabular-nums ${unscopedCount > 0 ? 'text-yellow-400' : 'text-white'}`}>
              {unscopedCount}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Unscoped Actions</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className={`text-2xl font-semibold tabular-nums ${invalidatedCount > 0 ? 'text-red-400' : 'text-white'}`}>
              {invalidatedCount}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Invalidated (7d)</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Signal Feed - left */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader title="Risk Signals" icon={ShieldAlert} count={signals.length} />
            <CardContent>
              {loading ? (
                <ListSkeleton rows={5} />
              ) : signals.length === 0 ? (
                <EmptyState
                  icon={ShieldAlert}
                  title="No active signals"
                  description="All clear. No risk signals detected."
                />
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {signals.map((signal, idx) => {
                    const SeverityIcon = getSeverityIcon(signal.severity);
                    return (
                      <button
                        key={idx}
                        onClick={() => openPanel(signal, 'signal')}
                        className="w-full bg-surface-tertiary rounded-lg p-3.5 text-left hover:bg-white/[0.04] transition-colors duration-150 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <SeverityIcon
                              size={16}
                              className={`mt-0.5 shrink-0 ${signal.severity === 'red' ? 'text-red-400' : 'text-yellow-400'}`}
                            />
                            <div className="min-w-0">
                              <div className="text-sm text-white truncate">{signal.label}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={signal.severity === 'red' ? 'error' : 'warning'} size="xs">
                                  {signal.severity}
                                </Badge>
                                {signal.agent_id && (
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getAgentColor(signal.agent_id)}`}>
                                    {signal.agent_id}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 mt-0.5 shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* High-Risk Actions - right */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="High-Risk Actions" icon={Zap} count={highRiskActions.length} />
            <CardContent>
              {loading ? (
                <ListSkeleton rows={5} />
              ) : highRiskActions.length === 0 ? (
                <EmptyState
                  icon={Eye}
                  title="No high-risk actions"
                  description="No actions flagged as high-risk."
                />
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {highRiskActions.map((action) => {
                    const riskScore = parseInt(action.risk_score, 10) || 0;
                    return (
                      <button
                        key={action.action_id}
                        onClick={() => openPanel(action, 'action')}
                        className="w-full bg-surface-tertiary rounded-lg p-3.5 text-left hover:bg-white/[0.04] transition-colors duration-150 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm text-white truncate">
                              {action.declared_goal?.substring(0, 60) || 'No goal'}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={riskScore >= 90 ? 'error' : riskScore >= 70 ? 'warning' : 'default'} size="xs">
                                Risk: {riskScore}
                              </Badge>
                              <Badge variant={action.status === 'running' ? 'warning' : action.status === 'failed' ? 'error' : 'default'} size="xs">
                                {action.status}
                              </Badge>
                              {action.agent_id && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getAgentColor(action.agent_id)}`}>
                                  {action.agent_id}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 mt-0.5 shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Panel */}
      <SecurityDetailPanel item={panelItem} type={panelType} onClose={closePanel} />
    </PageLayout>
  );
}
