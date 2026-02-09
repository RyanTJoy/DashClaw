'use client';

import { useState, useEffect } from 'react';
import { Gauge, BarChart3, DollarSign, AlertTriangle, Inbox, RotateCw } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Stat } from '../components/ui/Stat';
import { EmptyState } from '../components/ui/EmptyState';

export default function TokensDashboard() {
  const [tokenData, setTokenData] = useState({
    dailyUsed: 0,
    dailyLimit: 18000,
    weeklyUsed: 0,
    weeklyLimit: 126000,
    monthlyUsed: 0,
    monthlyLimit: 540000
  });
  const [lastUpdated, setLastUpdated] = useState('');
  const [operations, setOperations] = useState([]);

  const costGuide = [
    { operation: 'LinkedIn snapshot', tokens: 50000, cost: '$0.75', risk: 'HIGH' },
    { operation: 'Generic webpage', tokens: 20000, cost: '$0.30', risk: 'MEDIUM' },
    { operation: 'Form filling', tokens: 5000, cost: '$0.08', risk: 'LOW' },
    { operation: 'Simple click', tokens: 100, cost: '$0.001', risk: 'LOW' },
    { operation: 'API call', tokens: 500, cost: '$0.008', risk: 'LOW' },
    { operation: 'Memory read', tokens: 2000, cost: '$0.03', risk: 'LOW' },
    { operation: 'File write', tokens: 1000, cost: '$0.015', risk: 'LOW' }
  ];

  const fetchTokenData = async () => {
    try {
      const res = await fetch('/api/tokens');
      const data = await res.json();

      const todayIn = data?.stats?.today?.tokens_in || 0;
      const todayOut = data?.stats?.today?.tokens_out || 0;
      const dailyUsed = todayIn + todayOut;

      const totalIn = data?.stats?.total?.tokens_in || 0;
      const totalOut = data?.stats?.total?.tokens_out || 0;
      const totalUsed = totalIn + totalOut;

      setTokenData({
        dailyUsed: dailyUsed,
        dailyLimit: 18000,
        weeklyUsed: totalUsed,
        weeklyLimit: 126000,
        monthlyUsed: totalUsed,
        monthlyLimit: 540000
      });

      if (data?.usage && Array.isArray(data.usage)) {
        const ops = data.usage.slice(0, 10).map((u, idx) => ({
          id: u.id || idx,
          name: u.operation || 'Unknown operation',
          timestamp: u.timestamp || '',
          tokensIn: u.tokens_in || 0,
          tokensOut: u.tokens_out || 0,
          total: (u.tokens_in || 0) + (u.tokens_out || 0),
          model: u.model || 'unknown'
        }));
        setOperations(ops);
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to fetch token data:', error);
    }
  };

  useEffect(() => {
    fetchTokenData();
    const interval = setInterval(fetchTokenData, 30000);
    return () => clearInterval(interval);
  }, []);

  const safePct = (used, limit) => {
    if (!limit || limit === 0) return 0;
    return ((used || 0) / limit) * 100;
  };

  const getDailyPct = () => safePct(tokenData.dailyUsed, tokenData.dailyLimit);
  const getWeeklyPct = () => safePct(tokenData.weeklyUsed, tokenData.weeklyLimit);
  const getMonthlyPct = () => safePct(tokenData.monthlyUsed, tokenData.monthlyLimit);

  const getProgressColor = (pct) => {
    if (pct > 100) return 'error';
    if (pct > 75) return 'warning';
    return 'success';
  };

  const getStatusText = (pct) => {
    if (pct > 100) return 'CRITICAL';
    if (pct > 75) return 'WARNING';
    return 'OK';
  };

  const getStatusVariant = (pct) => {
    if (pct > 100) return 'error';
    if (pct > 75) return 'warning';
    return 'success';
  };

  const getRiskVariant = (risk) => {
    switch (risk) {
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const formatNumber = (num) => (num ?? 0).toLocaleString();

  const dailyPct = getDailyPct();

  const statusBadge = (
    <Badge variant={getStatusVariant(dailyPct)}>
      {getStatusText(dailyPct)} - {dailyPct.toFixed(0)}%
    </Badge>
  );

  const refreshButton = (
    <button
      onClick={fetchTokenData}
      className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white bg-surface-tertiary border border-[rgba(255,255,255,0.06)] rounded-lg hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150 flex items-center gap-1.5"
    >
      <RotateCw size={14} />
      Refresh
    </button>
  );

  return (
    <PageLayout
      title="Token Efficiency"
      subtitle={`Real-time Cost Monitoring${lastUpdated ? ` -- Updated ${lastUpdated}` : ''}`}
      breadcrumbs={['Dashboard', 'Tokens']}
      actions={<>{refreshButton}{statusBadge}</>}
    >
      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Daily Budget', pct: getDailyPct(), used: tokenData.dailyUsed, limit: tokenData.dailyLimit },
          { label: 'Weekly Budget', pct: getWeeklyPct(), used: tokenData.weeklyUsed, limit: tokenData.weeklyLimit },
          { label: 'Monthly Budget', pct: getMonthlyPct(), used: tokenData.monthlyUsed, limit: tokenData.monthlyLimit }
        ].map((budget) => (
          <Card key={budget.label} hover={false}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-zinc-200">{budget.label}</span>
                <Badge variant={getStatusVariant(budget.pct)} size="xs">
                  {getStatusText(budget.pct)}
                </Badge>
              </div>
              <div className="text-2xl font-semibold tabular-nums text-white mb-3">
                {budget.pct.toFixed(1)}%
              </div>
              <ProgressBar value={budget.pct} color={getProgressColor(budget.pct)} className="mb-3" />
              <div className="flex justify-between text-xs text-zinc-500">
                <span>{formatNumber(budget.used)} used</span>
                <span>{formatNumber(budget.limit)} limit</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Operations */}
        <Card hover={false}>
          <CardHeader title="Recent Operations" icon={BarChart3} />
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {operations.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="No operations logged yet"
                  description="Token usage will appear here once tracked"
                />
              ) : (
                operations.map((op) => (
                  <div key={op.id} className="bg-surface-tertiary rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-white">{op.name}</div>
                        <div className="text-xs text-zinc-500">{op.timestamp}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold tabular-nums text-red-400">{formatNumber(op.total)}</div>
                        <div className="text-xs text-zinc-500">tokens</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex space-x-4">
                        <span className="text-green-400 text-xs tabular-nums">In: {formatNumber(op.tokensIn)}</span>
                        <span className="text-blue-400 text-xs tabular-nums">Out: {formatNumber(op.tokensOut)}</span>
                      </div>
                      <span className="text-xs text-zinc-500">{op.model}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cost Reference Guide */}
        <Card hover={false}>
          <CardHeader title="Cost Reference Guide" icon={DollarSign} />
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-zinc-500 border-b border-[rgba(255,255,255,0.06)]">
                    <th className="pb-3">Operation</th>
                    <th className="pb-3">Tokens</th>
                    <th className="pb-3">Est. Cost</th>
                    <th className="pb-3">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {costGuide.map((item, index) => (
                    <tr key={index} className="border-b border-[rgba(255,255,255,0.03)]">
                      <td className="py-3 text-sm text-white">{item.operation}</td>
                      <td className="py-3 text-sm text-zinc-300 tabular-nums">{formatNumber(item.tokens)}</td>
                      <td className="py-3 text-sm text-zinc-300">{item.cost}</td>
                      <td className="py-3">
                        <Badge variant={getRiskVariant(item.risk)} size="xs">
                          {item.risk}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Guidelines */}
      <Card hover={false} className="mt-6">
        <CardHeader title="Budget Guidelines" icon={AlertTriangle} />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-tertiary p-4 rounded-lg border-l-4 border-l-red-500">
              <div className="text-sm text-red-400 font-semibold mb-2">When Budget Low (&lt;25%)</div>
              <ul className="text-sm text-zinc-300 space-y-1">
                <li>1. Switch to Sonnet for automation</li>
                <li>2. Avoid browser snapshots</li>
                <li>3. Summarize context to files</li>
                <li>4. Use direct API calls</li>
              </ul>
            </div>
            <div className="bg-surface-tertiary p-4 rounded-lg border-l-4 border-l-yellow-500">
              <div className="text-sm text-yellow-400 font-semibold mb-2">Model Selection</div>
              <ul className="text-sm text-zinc-300 space-y-1">
                <li>Complex reasoning: Opus</li>
                <li>Automation/execution: Sonnet</li>
                <li>Simple/status: Haiku</li>
                <li>Context &gt;150k: Summarize first</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
