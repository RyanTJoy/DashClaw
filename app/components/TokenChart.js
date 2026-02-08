'use client';

import { useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function TokenChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTokens() {
      try {
        const res = await fetch('/api/tokens');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();

        if (json.history && json.history.length > 0) {
          // Use real 7-day history from API (comes in DESC order, reverse for chart)
          const points = [...json.history].reverse().map(day => {
            const d = new Date(day.date);
            return {
              date: d.toLocaleDateString('en-US', { weekday: 'short' }),
              tokens: day.totalTokens || (day.tokensIn + day.tokensOut),
              cost: day.estimatedCost || 0
            };
          });
          setData(points);
        } else {
          setData([]);
        }
      } catch (error) {
        console.error('Failed to fetch token data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTokens();
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const tokens = payload[0]?.value || 0;
      const cost = payload[0]?.payload?.cost || 0;

      return (
        <div className="glass-card p-3 text-sm">
          <p className="text-white font-semibold">{label}</p>
          <p className="text-cyan-400">Tokens: {tokens.toLocaleString()}</p>
          <p className="text-gray-400">Cost: ${cost.toFixed(4)}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <span className="mr-2">📈</span>Token Usage Trend (7 Days)
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-400">Loading token data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <span className="mr-2">📈</span>Token Usage Trend (7 Days)
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <div>No token usage data yet</div>
            <div className="text-xs mt-1">Data appears as token snapshots are recorded</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center">
        <span className="mr-2">📈</span>
        Token Usage Trend (7 Days)
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="tokens"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#tokenGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center space-x-6 mt-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-cyan-500 rounded mr-2"></div>
          <span className="text-gray-400">Daily Usage</span>
        </div>
      </div>
    </div>
  );
}
