'use client';

import { useState, useEffect } from 'react';

export default function CalendarWidget() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/calendar')
      .then(res => res.json())
      .then(data => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    
    // Format in Eastern Time
    const timeOptions = { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' };
    const dateOptions = { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' };
    
    // Compare dates in EST
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

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          📅 Calendar
        </h3>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          📅 Calendar
        </h3>
        <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">
          {events.length} upcoming
        </span>
      </div>
      
      {events.length === 0 ? (
        <div className="text-gray-400 text-sm">No upcoming events</div>
      ) : (
        <div className="space-y-3">
          {events.slice(0, 5).map((event, i) => (
            <div 
              key={event.id || i} 
              className={`p-3 rounded-lg ${isUrgent(event.start_time) ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-gray-700/30'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">
                    {event.summary}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {formatTime(event.start_time)}
                  </div>
                  {event.location && (
                    <div className="text-gray-500 text-xs truncate mt-1">
                      📍 {event.location}
                    </div>
                  )}
                </div>
                <div className={`text-xs px-2 py-1 rounded ${isUrgent(event.start_time) ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-600/50 text-gray-400'}`}>
                  {getTimeUntil(event.start_time)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
