'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Contact, MessageSquare, Zap, Flame, Calendar, Search, ArrowUpRight, ArrowDownLeft, RotateCw } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAgentFilter } from '../lib/AgentFilterContext';

export default function RelationshipsDashboard() {
  const { agentId } = useAgentFilter();
  const [contacts, setContacts] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [stats, setStats] = useState({ total: 0, hot: 0, warm: 0, cold: 0, followUpsDue: 0 });
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const params = agentId ? `?agent_id=${agentId}` : '';
      const res = await fetch(`/api/relationships${params}`);
      const data = await res.json();
      if (data.contacts) setContacts(data.contacts);
      if (data.interactions) setInteractions(data.interactions);
      if (data.stats) setStats(data.stats);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to fetch relationships:', error);
    }
  }, [agentId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getTempVariant = (temp) => {
    switch (temp) {
      case 'HOT': return 'error';
      case 'WARM': return 'warning';
      case 'COLD': return 'info';
      default: return 'default';
    }
  };

  const getTempBorderColor = (temp) => {
    switch (temp) {
      case 'HOT': return 'border-l-red-500';
      case 'WARM': return 'border-l-yellow-500';
      case 'COLD': return 'border-l-blue-500';
      default: return 'border-l-zinc-500';
    }
  };

  const getDirectionIcon = (dir) => dir === 'outbound' ? ArrowUpRight : ArrowDownLeft;

  const getDaysUntil = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date('2026-02-04');
    const target = new Date(dateStr);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getDaysColor = (days) => {
    if (days === null) return '';
    if (days <= 0) return 'text-red-400';
    if (days <= 2) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <PageLayout
      title="Relationship Tracker"
      subtitle={`CRM & Follow-up Management${lastUpdated ? ` -- Updated ${lastUpdated}` : ''}`}
      breadcrumbs={['Dashboard', 'Relationships']}
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">{stats.total}</div>
            <div className="text-xs text-zinc-500 mt-1">Total Contacts</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">{stats.hot}</div>
            <div className="text-xs text-zinc-500 mt-1">Hot Leads</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">{stats.warm}</div>
            <div className="text-xs text-zinc-500 mt-1">Warm</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">{stats.cold}</div>
            <div className="text-xs text-zinc-500 mt-1">Cold</div>
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-white">{stats.followUpsDue}</div>
            <div className="text-xs text-zinc-500 mt-1">Follow-ups Due</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contacts List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Contacts" icon={Contact} count={contacts.length} />
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {contacts.map((contact) => {
                  const daysUntil = getDaysUntil(contact.followUpDate);
                  return (
                    <div key={contact.id} className={`bg-surface-tertiary rounded-lg p-4 border-l-4 ${getTempBorderColor(contact.temperature)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center text-sm font-medium text-zinc-300">
                            {contact.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">@{contact.name}</div>
                            <div className="text-xs text-zinc-500">{contact.platform}</div>
                          </div>
                        </div>
                        <Badge variant={getTempVariant(contact.temperature)} size="xs">
                          {contact.temperature}
                        </Badge>
                      </div>

                      <div className="text-sm text-zinc-300 mb-3">{contact.context}</div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="text-zinc-500">
                          Last contact: {contact.lastContact} -- {contact.interactions} interactions
                        </div>
                        {contact.followUpDate && (
                          <div className={`font-medium ${getDaysColor(daysUntil)}`}>
                            Follow-up: {daysUntil <= 0 ? 'OVERDUE' : `${daysUntil} days`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Interactions */}
        <Card>
          <CardHeader title="Recent Activity" icon={MessageSquare} count={interactions.length} />
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {interactions.map((interaction) => {
                const DirectionIcon = getDirectionIcon(interaction.direction);
                return (
                  <div key={interaction.id} className="bg-surface-tertiary rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DirectionIcon size={14} className="text-zinc-400" />
                        <span className="text-sm font-medium text-white">@{interaction.contactName}</span>
                      </div>
                      <span className="text-xs text-zinc-500">{interaction.date}</span>
                    </div>
                    <div className="text-sm text-zinc-300">{interaction.summary}</div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-zinc-500">{interaction.type}</span>
                      <span className="text-zinc-500">{interaction.platform}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader title="Quick Actions" icon={Zap} />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText('cd tools/relationship-tracker && python tracker.py list --hot');
                alert('Command copied! Paste in terminal.');
              }}
              className="bg-surface-tertiary rounded-lg p-4 text-left hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150"
            >
              <div className="text-sm font-medium text-red-400 flex items-center gap-1.5">
                <Flame size={14} />
                View Hot Leads
              </div>
              <div className="text-xs text-zinc-500 mt-1">Filter by temperature</div>
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText('cd tools/relationship-tracker && python tracker.py due');
                alert('Command copied! Paste in terminal.');
              }}
              className="bg-surface-tertiary rounded-lg p-4 text-left hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150"
            >
              <div className="text-sm font-medium text-yellow-400 flex items-center gap-1.5">
                <Calendar size={14} />
                Due Follow-ups
              </div>
              <div className="text-xs text-zinc-500 mt-1">Check what needs attention</div>
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText('cd tools/relationship-tracker && python tracker.py search ""');
                alert('Command copied! Add your search term and paste in terminal.');
              }}
              className="bg-surface-tertiary rounded-lg p-4 text-left hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150"
            >
              <div className="text-sm font-medium text-blue-400 flex items-center gap-1.5">
                <Search size={14} />
                Search Contacts
              </div>
              <div className="text-xs text-zinc-500 mt-1">Find specific people</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
