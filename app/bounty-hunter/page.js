'use client';

import { useState, useEffect } from 'react';
import { DollarSign, FlaskConical, BarChart3, RotateCw, Lightbulb } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function BountyHunterDashboard() {
  const [bounties, setBounties] = useState([]);
  const [cveResearch, setCveResearch] = useState([]);
  const [stats, setStats] = useState({ totalAvailable: 0, totalEarned: 0, activeSubmissions: 0, successRate: 0 });
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/bounties');
      const data = await res.json();
      if (data.bounties) setBounties(data.bounties);
      if (data.cveResearch) setCveResearch(data.cveResearch);
      if (data.stats) setStats(data.stats);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to fetch bounties:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getDifficultyVariant = (diff) => {
    switch (diff) {
      case 'EASY': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HARD': return 'error';
      default: return 'default';
    }
  };

  const getSeverityVariant = (sev) => {
    switch (sev) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'open': return 'success';
      case 'claimed': return 'warning';
      case 'submitted': return 'info';
      case 'completed': return 'brand';
      default: return 'default';
    }
  };

  return (
    <PageLayout
      title="Bounty Hunter"
      subtitle={`CVE Research & Income Tracking${lastUpdated ? ` -- Updated ${lastUpdated}` : ''}`}
      breadcrumbs={['Dashboard', 'Bounty Hunter']}
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
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">${stats.totalAvailable.toLocaleString()}</div>
            <div className="text-xs text-zinc-500 mt-1">Available Bounties</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">${stats.totalEarned}</div>
            <div className="text-xs text-zinc-500 mt-1">Total Earned</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">{stats.activeSubmissions}</div>
            <div className="text-xs text-zinc-500 mt-1">Active Submissions</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">{stats.successRate}%</div>
            <div className="text-xs text-zinc-500 mt-1">Success Rate</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Bounties */}
        <Card>
          <CardHeader title="Open Bounties" icon={DollarSign} count={bounties.length} />
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {bounties.map((bounty) => (
                <div key={bounty.id} className="bg-surface-tertiary rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{bounty.title}</div>
                      <div className="text-xs text-zinc-500">{bounty.platform} -- {bounty.daysOpen} days open</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-400">${bounty.reward}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={getDifficultyVariant(bounty.difficulty)} size="xs">
                        {bounty.difficulty}
                      </Badge>
                      <Badge variant={getStatusVariant(bounty.status)} size="xs">
                        {bounty.status}
                      </Badge>
                    </div>
                    <div className={`text-xs font-semibold ${getScoreColor(bounty.opportunityScore)}`}>
                      Score: {bounty.opportunityScore}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CVE Research */}
        <Card>
          <CardHeader title="CVE Research" icon={FlaskConical} count={cveResearch.length} />
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {cveResearch.map((cve, index) => (
                <div key={index} className="bg-surface-tertiary rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-medium text-white font-mono">{cve.cveId}</div>
                      <div className="text-xs text-zinc-500">{cve.vendor}</div>
                    </div>
                    <Badge variant={getSeverityVariant(cve.severity)} size="xs">
                      {cve.severity}
                    </Badge>
                  </div>
                  <div className="text-sm text-zinc-300 mb-3">{cve.description}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-zinc-500">
                      Template: <span className="text-zinc-300">{cve.templateStatus.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-zinc-500 mr-2">Feasibility:</span>
                      <div className="w-24 bg-white/5 rounded-full h-1.5 mr-2">
                        <div
                          className={`h-1.5 rounded-full ${cve.feasibilityScore >= 70 ? 'bg-green-500' : cve.feasibilityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${cve.feasibilityScore}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold ${getScoreColor(cve.feasibilityScore)}`}>
                        {cve.feasibilityScore}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Intelligence */}
      <Card className="mt-6">
        <CardHeader title="Market Intelligence" icon={BarChart3} />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-tertiary rounded-lg p-4">
              <div className="text-xs text-zinc-500 mb-1">CVE Templates Rate</div>
              <div className="text-2xl font-semibold tabular-nums text-white">$100 each</div>
              <div className="text-xs text-zinc-500">Consistent market rate</div>
            </div>
            <div className="bg-surface-tertiary rounded-lg p-4">
              <div className="text-xs text-zinc-500 mb-1">Open CVE Issues</div>
              <div className="text-2xl font-semibold tabular-nums text-white">48</div>
              <div className="text-xs text-zinc-500">In Algora #7549</div>
            </div>
            <div className="bg-surface-tertiary rounded-lg p-4">
              <div className="text-xs text-zinc-500 mb-1">Top Earner</div>
              <div className="text-2xl font-semibold tabular-nums text-white">$11,800</div>
              <div className="text-xs text-zinc-500">Proven income potential</div>
            </div>
          </div>
          <div className="mt-4 bg-surface-tertiary rounded-lg p-4">
            <div className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-1.5">
              <Lightbulb size={14} />
              Strategy Tip
            </div>
            <div className="text-sm text-zinc-300">
              Focus on CVEs with 70+ feasibility scores. gurgguda&apos;s 6 sub-agents earned $575 systematically targeting EASY/MEDIUM templates.
            </div>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
