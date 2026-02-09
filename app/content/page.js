'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Lightbulb, FileText, Target, RotateCw, Heart, MessageCircle, Repeat2, CheckCircle2, XCircle } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function ContentDashboard() {
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ totalImpressions: 0, totalEngagement: 0, engagementRate: 0, businessValue: 0 });
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/content');
      const data = await res.json();
      if (data.posts) setPosts(data.posts);
      if (data.stats) setStats(data.stats);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to fetch content data:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getEngagementColor = (rate) => {
    if (rate >= 2) return 'text-green-400';
    if (rate >= 1) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPlatformVariant = (platform) => {
    switch (platform) {
      case 'LinkedIn': return 'info';
      case 'Moltbook': return 'brand';
      case 'Twitter': return 'default';
      default: return 'default';
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <PageLayout
      title="Content Performance"
      subtitle={`Analytics & ROI Tracking${lastUpdated ? ` -- Updated ${lastUpdated}` : ''}`}
      breadcrumbs={['Dashboard', 'Content']}
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
            <div className="text-2xl font-semibold tabular-nums text-white">{formatNumber(stats.totalImpressions)}</div>
            <div className="text-xs text-zinc-500 mt-1">Total Impressions</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">{stats.totalEngagement}</div>
            <div className="text-xs text-zinc-500 mt-1">Total Engagement</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">{stats.engagementRate}%</div>
            <div className="text-xs text-zinc-500 mt-1">Avg Engagement Rate</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">${formatNumber(stats.businessValue)}</div>
            <div className="text-xs text-zinc-500 mt-1">Business Value</div>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <Card className="mb-6">
        <CardHeader title="Key Insights" icon={Lightbulb} />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-tertiary rounded-lg p-4 border-l-4 border-l-green-500">
              <div className="text-sm font-medium text-green-400 mb-1">Best Performing</div>
              <div className="text-sm text-white">Services posts</div>
              <div className="text-xs text-zinc-500">2.4% engagement rate</div>
            </div>
            <div className="bg-surface-tertiary rounded-lg p-4 border-l-4 border-l-yellow-500">
              <div className="text-sm font-medium text-yellow-400 mb-1">Key Finding</div>
              <div className="text-sm text-white">Viral != Engagement</div>
              <div className="text-xs text-zinc-500">High reach, low rate</div>
            </div>
            <div className="bg-surface-tertiary rounded-lg p-4 border-l-4 border-l-purple-500">
              <div className="text-sm font-medium text-purple-400 mb-1">Top ROI</div>
              <div className="text-sm text-white">Partnership stories</div>
              <div className="text-xs text-zinc-500">$15K from one post</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card>
        <CardHeader title="Content Performance" icon={FileText} count={posts.length} />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-[rgba(255,255,255,0.06)]">
                  <th className="pb-3 font-medium">Post</th>
                  <th className="pb-3 font-medium">Platform</th>
                  <th className="pb-3 font-medium">Impressions</th>
                  <th className="pb-3 font-medium">Engagement</th>
                  <th className="pb-3 font-medium">Rate</th>
                  <th className="pb-3 font-medium">Business Outcome</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-surface-tertiary transition-colors duration-150">
                    <td className="py-3">
                      <div className="text-sm font-medium text-white">{post.title}</div>
                      <div className="text-xs text-zinc-500">{post.date}</div>
                    </td>
                    <td className="py-3">
                      <Badge variant={getPlatformVariant(post.platform)} size="xs">
                        {post.platform}
                      </Badge>
                    </td>
                    <td className="py-3 text-sm text-white tabular-nums">{formatNumber(post.impressions)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-red-400 flex items-center gap-1">
                          <Heart size={12} /> {post.likes}
                        </span>
                        <span className="text-blue-400 flex items-center gap-1">
                          <MessageCircle size={12} /> {post.comments}
                        </span>
                        <span className="text-green-400 flex items-center gap-1">
                          <Repeat2 size={12} /> {post.shares}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`text-sm font-semibold tabular-nums ${getEngagementColor(post.engagementRate)}`}>
                        {post.engagementRate}%
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="text-sm text-zinc-300">{post.businessOutcome}</div>
                      {post.outcomeValue > 0 && (
                        <div className="text-xs font-semibold text-green-400 tabular-nums">${formatNumber(post.outcomeValue)}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Content Strategy */}
      <Card className="mt-6">
        <CardHeader title="Content Strategy" icon={Target} />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-tertiary rounded-lg p-4">
              <div className="text-sm font-medium text-green-400 mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                What Works
              </div>
              <ul className="text-sm text-zinc-300 space-y-1">
                <li className="flex items-start gap-2"><span className="text-zinc-500 mt-0.5">--</span> Service-focused posts (highest conversion)</li>
                <li className="flex items-start gap-2"><span className="text-zinc-500 mt-0.5">--</span> Strong technical opinions</li>
                <li className="flex items-start gap-2"><span className="text-zinc-500 mt-0.5">--</span> Business storytelling with outcomes</li>
                <li className="flex items-start gap-2"><span className="text-zinc-500 mt-0.5">--</span> Specific ROI numbers and examples</li>
              </ul>
            </div>
            <div className="bg-surface-tertiary rounded-lg p-4">
              <div className="text-sm font-medium text-red-400 mb-2 flex items-center gap-1.5">
                <XCircle size={14} />
                Avoid
              </div>
              <ul className="text-sm text-zinc-300 space-y-1">
                <li className="flex items-start gap-2"><span className="text-zinc-500 mt-0.5">--</span> Chasing viral reach over engagement</li>
                <li className="flex items-start gap-2"><span className="text-zinc-500 mt-0.5">--</span> Generic AI hype content</li>
                <li className="flex items-start gap-2"><span className="text-zinc-500 mt-0.5">--</span> Posts without clear value prop</li>
                <li className="flex items-start gap-2"><span className="text-zinc-500 mt-0.5">--</span> Too much self-promotion</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
