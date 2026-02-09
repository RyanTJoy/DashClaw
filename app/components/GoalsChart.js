'use client';

import { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader, CardContent } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { CardSkeleton } from './ui/Skeleton';

function getBarColor(progress) {
  if (progress >= 100) return '#22c55e';
  if (progress > 0) return '#f97316';
  return '#52525b';
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const { name, progress } = payload[0].payload;
    return (
      <div className="bg-surface-elevated border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-sm shadow-lg">
        <p className="text-white font-medium">{name}</p>
        <p className="text-zinc-400 mt-0.5">Progress: <span className="text-white tabular-nums">{progress}%</span></p>
      </div>
    );
  }
  return null;
}

export default function GoalsChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGoals() {
      try {
        const res = await fetch('/api/goals');
        const result = await res.json();

        if (result.goals && result.goals.length > 0) {
          const chartData = result.goals.map(goal => ({
            name: goal.title?.substring(0, 20) || 'Goal',
            progress: goal.progress || 0,
            target: 100
          }));
          setData(chartData);
        } else {
          setData([]);
        }
      } catch (error) {
        console.error('Failed to fetch goals:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchGoals();
  }, []);

  if (loading) {
    return <CardSkeleton />;
  }

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader title="Goal Progress" icon={Target} />
        <CardContent>
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Create goals via the SDK's createGoal() or POST /api/goals"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader title="Goal Progress" icon={Target} count={data.length} />

      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, 100]}
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#71717a"
                fontSize={11}
                width={100}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="progress" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.progress)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
