'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, MapPin, Clock, RotateCw } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ListSkeleton } from '../components/ui/Skeleton';

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/calendar');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();

    const timeOptions = { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' };
    const dateOptions = { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' };

    const estNow = now.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
    const estDate = date.toLocaleDateString('en-US', { timeZone: 'America/New_York' });

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const estTomorrow = tomorrow.toLocaleDateString('en-US', { timeZone: 'America/New_York' });

    const time = date.toLocaleTimeString('en-US', timeOptions);

    if (estDate === estNow) return `Today ${time}`;
    if (estDate === estTomorrow) return `Tomorrow ${time}`;
    return date.toLocaleDateString('en-US', dateOptions) + ` ${time}`;
  };

  const formatEndTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const timeOptions = { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' };
    return date.toLocaleTimeString('en-US', timeOptions);
  };

  const getTimeUntil = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const event = new Date(timestamp);
    if (isNaN(event.getTime())) return '';

    const diff = event - now;

    if (diff < 0) return 'Past';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return `${Math.floor(diff / (1000 * 60))}m`;
  };

  const isUrgent = (timestamp) => {
    if (!timestamp) return false;
    const now = new Date();
    const event = new Date(timestamp);
    if (isNaN(event.getTime())) return false;

    const hoursUntil = (event - now) / (1000 * 60 * 60);
    return hoursUntil > 0 && hoursUntil < 24;
  };

  return (
    <PageLayout
      title="Calendar"
      subtitle="Upcoming Events"
      breadcrumbs={['Dashboard', 'Calendar']}
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
      <Card>
        <CardHeader title="Events" icon={Calendar} count={events.length} />
        <CardContent>
          {loading ? (
            <ListSkeleton rows={5} />
          ) : events.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No upcoming events"
              description="Calendar events will appear here when scheduled"
            />
          ) : (
            <div className="space-y-3">
              {events.map((event, i) => (
                <div
                  key={event.id || i}
                  className={`p-4 rounded-lg transition-colors duration-150 ${
                    isUrgent(event.start_time)
                      ? 'bg-brand-subtle border border-brand/30'
                      : 'bg-surface-tertiary'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">
                        {event.summary}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
                        <Clock size={12} className="shrink-0" />
                        <span>{formatTime(event.start_time)}</span>
                        {event.end_time && (
                          <span className="text-zinc-500"> - {formatEndTime(event.end_time)}</span>
                        )}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1 truncate">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      {event.description && (
                        <div className="text-xs text-zinc-500 mt-2 line-clamp-2">
                          {event.description}
                        </div>
                      )}
                    </div>
                    <Badge
                      variant={isUrgent(event.start_time) ? 'brand' : 'default'}
                      size="sm"
                    >
                      {getTimeUntil(event.start_time)}
                    </Badge>
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
