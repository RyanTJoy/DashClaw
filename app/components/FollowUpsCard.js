'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { ListSkeleton } from './ui/Skeleton';

export default function FollowUpsCard() {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/relationships');
      const data = await res.json();
      if (data.contacts && Array.isArray(data.contacts)) {
        const withFollowUps = data.contacts
          .filter(c => c.followUpDate)
          .map(c => {
            const dueDate = new Date(c.followUpDate);
            const today = new Date();
            const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            return {
              id: c.id || 0,
              name: c.name || 'Unknown',
              type: c.context || 'Contact',
              temperature: (c.temperature || 'warm').toUpperCase(),
              dueDate: c.followUpDate,
              daysLeft
            };
          })
          .sort((a, b) => a.daysLeft - b.daysLeft)
          .slice(0, 5);
        setFollowUps(withFollowUps);
      }
    } catch (error) {
      console.error('Failed to fetch follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getTempVariant = (temp) => {
    switch (temp) {
      case 'HOT': return 'error';
      case 'WARM': return 'warning';
      case 'COLD': return 'info';
      default: return 'default';
    }
  };

  const getDaysColor = (days) => {
    if (days <= 1) return 'text-red-400';
    if (days <= 3) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <Card className="h-full">
      <CardHeader title="Follow-ups" icon={CheckCircle2} count={followUps.length} />
      <CardContent>
        {loading ? (
          <ListSkeleton rows={3} />
        ) : followUps.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All caught up!"
            description="No pending follow-ups"
          />
        ) : (
          <div className="space-y-2">
            {followUps.map((followUp) => (
              <div
                key={followUp.id}
                className="bg-surface-tertiary rounded-lg p-3 transition-colors duration-150"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-white truncate mr-2">{followUp.name}</span>
                  <Badge variant={getTempVariant(followUp.temperature)} size="xs">
                    {followUp.temperature}
                  </Badge>
                </div>
                <div className="text-xs text-zinc-400 mb-1.5">{followUp.type}</div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Due: {followUp.dueDate}</span>
                  <span className={`font-medium ${getDaysColor(followUp.daysLeft)}`}>
                    {followUp.daysLeft}d left
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
