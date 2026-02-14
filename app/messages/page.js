'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Send, Archive, Eye, Inbox, Hash,
  FileText, AlertCircle, ChevronRight, X, Plus, Users, CheckCheck
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCompact } from '../components/ui/Stat';
import { EmptyState } from '../components/ui/EmptyState';
import { useAgentFilter } from '../lib/AgentFilterContext';
import { getAgentColor } from '../lib/colors';
import { isDemoMode } from '../lib/isDemoMode';

const TABS = [
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'threads', label: 'Threads', icon: Hash },
  { key: 'docs', label: 'Docs', icon: FileText },
];

const TYPE_VARIANTS = {
  action: 'warning',
  info: 'info',
  lesson: 'success',
  question: 'secondary',
  status: 'default',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function MessagesPage() {
  const { agentId: filterAgentId } = useAgentFilter();
  const isDemo = isDemoMode();
  const [tab, setTab] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState({ unread: 0, today: 0, activeThreads: 0, docCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeType, setComposeType] = useState('info');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeUrgent, setComposeUrgent] = useState(false);
  const [composeThreadId, setComposeThreadId] = useState('');
  const [sending, setSending] = useState(false);
  const [agents, setAgents] = useState([]);

  const fetchMessages = useCallback(async (direction) => {
    const params = new URLSearchParams({ direction, limit: '50' });
    if (filterAgentId) params.set('agent_id', filterAgentId);
    const res = await fetch(`/api/messages?${params}`);
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  }, [filterAgentId]);

  const fetchThreads = useCallback(async () => {
    const params = new URLSearchParams({ limit: '20' });
    if (filterAgentId) params.set('agent_id', filterAgentId);
    const res = await fetch(`/api/messages/threads?${params}`);
    if (!res.ok) throw new Error('Failed to fetch threads');
    return res.json();
  }, [filterAgentId]);

  const fetchDocs = useCallback(async () => {
    const params = new URLSearchParams({ limit: '20' });
    const res = await fetch(`/api/messages/docs?${params}`);
    if (!res.ok) throw new Error('Failed to fetch docs');
    return res.json();
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const [inboxData, sentData, threadData, docData] = await Promise.all([
        fetchMessages('inbox'),
        fetchMessages('sent'),
        fetchThreads(),
        fetchDocs(),
      ]);

      setMessages(tab === 'sent' ? sentData.messages : inboxData.messages);
      setThreads(threadData.threads);
      setDocs(docData.docs);

      const today = new Date().toISOString().split('T')[0];
      const todayCount = [...inboxData.messages, ...sentData.messages].filter(
        m => m.created_at?.startsWith(today)
      ).length;

      setStats({
        unread: inboxData.unread_count || 0,
        today: todayCount,
        activeThreads: threadData.threads.filter(t => t.status === 'open').length,
        docCount: docData.total || 0,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, fetchMessages, fetchThreads, fetchDocs]);

  // Fetch agents for compose dropdown
  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(d => setAgents(d.agents || []))
      .catch(() => {});
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    setLoading(true);
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Refetch messages when tab switches between inbox/sent
  useEffect(() => {
    if (tab === 'inbox' || tab === 'sent') {
      fetchMessages(tab).then(d => setMessages(d.messages)).catch(() => {});
    }
  }, [tab, fetchMessages]);

  async function handleSend() {
    if (!composeBody.trim()) return;
    setSending(true);
    try {
      const payload = {
        from_agent_id: filterAgentId || 'dashboard',
        body: composeBody,
        message_type: composeType,
      };
      if (composeTo) payload.to_agent_id = composeTo;
      if (composeSubject) payload.subject = composeSubject;
      if (composeUrgent) payload.urgent = true;
      if (composeThreadId) payload.thread_id = composeThreadId;

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Send failed');
      }
      setShowCompose(false);
      setComposeBody('');
      setComposeSubject('');
      setComposeTo('');
      setComposeUrgent(false);
      setComposeThreadId('');
      fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleMarkRead(msgId) {
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_ids: [msgId], action: 'read', agent_id: filterAgentId || 'dashboard' }),
    });
    fetchAll();
  }

  async function handleArchive(msgId) {
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_ids: [msgId], action: 'archive', agent_id: filterAgentId || 'dashboard' }),
    });
    fetchAll();
  }

  async function handleMarkAllRead() {
    const unread = messages.filter(m => m.status === 'sent');
    if (unread.length === 0) return;
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_ids: unread.map(m => m.id), action: 'read', agent_id: filterAgentId || 'dashboard' }),
    });
    fetchAll();
  }

  async function handleArchiveAll() {
    if (messages.length === 0) return;
    if (!confirm(`Archive ${messages.length} message(s)?`)) return;
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_ids: messages.map(m => m.id), action: 'archive', agent_id: filterAgentId || 'dashboard' }),
    });
    setSelected(null);
    fetchAll();
  }

  function selectItem(item, type) {
    setSelected(item);
    setSelectedType(type);
  }

  return (
    <PageLayout
      title="Messages"
      subtitle="Agent-to-agent communication"
      breadcrumbs={['Dashboard', 'Messages']}
      actions={
        <button
          onClick={() => setShowCompose(true)}
          disabled={isDemo}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-brand text-white hover:bg-brand/90 transition-colors"
        >
          <Plus size={14} /> Compose
        </button>
      }
    >
      {isDemo && (
        <div className="mb-4 p-3 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-zinc-300 text-sm">
          Demo mode: messaging is read-only.
        </div>
      )}
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card hover={false}>
          <CardContent className="pt-4 pb-4">
            <StatCompact label="Unread" value={stats.unread} color="text-brand" />
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-4 pb-4">
            <StatCompact label="Today" value={stats.today} color="text-blue-400" />
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-4 pb-4">
            <StatCompact label="Active Threads" value={stats.activeThreads} color="text-emerald-400" />
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardContent className="pt-4 pb-4">
            <StatCompact label="Shared Docs" value={stats.docCount} color="text-white" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-[rgba(255,255,255,0.06)] pb-px">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelected(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
                active
                  ? 'text-brand border-b-2 border-brand'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon size={14} />
              {t.label}
              {t.key === 'inbox' && stats.unread > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-brand/20 text-brand">
                  {stats.unread}
                </span>
              )}
            </button>
          );
        })}
        {tab === 'inbox' && messages.length > 0 && (
          <div className="ml-auto flex gap-2">
            {stats.unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-[rgba(255,255,255,0.06)] text-zinc-300 hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                <CheckCheck size={12} /> Mark All Read
              </button>
            )}
            <button
              onClick={handleArchiveAll}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-[rgba(255,255,255,0.06)] text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Archive size={12} /> Archive All
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-zinc-500 py-12 text-sm">Loading messages...</div>
      ) : (
        <div className="flex gap-4">
          {/* Main list */}
          <div className={`flex-1 min-w-0 ${selected ? 'hidden md:block md:w-2/3' : ''}`}>
            {tab === 'inbox' || tab === 'sent' ? (
              <MessageList
                messages={messages}
                onSelect={(m) => selectItem(m, 'message')}
                selectedId={selectedType === 'message' ? selected?.id : null}
                isSent={tab === 'sent'}
              />
            ) : tab === 'threads' ? (
              <ThreadList
                threads={threads}
                onSelect={(t) => selectItem(t, 'thread')}
                selectedId={selectedType === 'thread' ? selected?.id : null}
              />
            ) : (
              <DocList
                docs={docs}
                onSelect={(d) => selectItem(d, 'doc')}
                selectedId={selectedType === 'doc' ? selected?.id : null}
              />
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-full md:w-1/3 min-w-[300px]">
              <Card hover={false}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-500 uppercase tracking-wide">
                      {selectedType === 'message' ? 'Message' : selectedType === 'thread' ? 'Thread' : 'Document'}
                    </span>
                    <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-zinc-300">
                      <X size={14} />
                    </button>
                  </div>

                  {selectedType === 'message' && (
                    <MessageDetail
                      message={selected}
                      onMarkRead={handleMarkRead}
                      onArchive={handleArchive}
                      agentId={filterAgentId}
                    />
                  )}
                  {selectedType === 'thread' && <ThreadDetail thread={selected} />}
                  {selectedType === 'doc' && <DocDetail doc={selected} />}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCompose(false)}>
          <div className="bg-surface-secondary border border-[rgba(255,255,255,0.06)] rounded-lg w-full max-w-lg mx-4 p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Compose Message</h3>
              <button onClick={() => setShowCompose(false)} className="text-zinc-500 hover:text-zinc-300">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">To</label>
                <select
                  value={composeTo}
                  onChange={e => setComposeTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-primary border border-[rgba(255,255,255,0.06)] rounded-md text-zinc-200"
                >
                  <option value="">All Agents (Broadcast)</option>
                  {agents.map(a => (
                    <option key={a.agent_id} value={a.agent_id}>{a.agent_id}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 mb-1 block">Type</label>
                  <select
                    value={composeType}
                    onChange={e => setComposeType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface-primary border border-[rgba(255,255,255,0.06)] rounded-md text-zinc-200"
                  >
                    <option value="info">Info</option>
                    <option value="action">Action</option>
                    <option value="question">Question</option>
                    <option value="lesson">Lesson</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={composeUrgent}
                      onChange={e => setComposeUrgent(e.target.checked)}
                      className="rounded border-zinc-600"
                    />
                    Urgent
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  placeholder="Optional subject"
                  maxLength={200}
                  className="w-full px-3 py-2 text-sm bg-surface-primary border border-[rgba(255,255,255,0.06)] rounded-md text-zinc-200 placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Body</label>
                <textarea
                  value={composeBody}
                  onChange={e => setComposeBody(e.target.value)}
                  placeholder="Message body..."
                  maxLength={2000}
                  rows={5}
                  className="w-full px-3 py-2 text-sm bg-surface-primary border border-[rgba(255,255,255,0.06)] rounded-md text-zinc-200 placeholder:text-zinc-600 resize-none"
                />
                <div className="text-right text-xs text-zinc-600 mt-1">{composeBody.length}/2000</div>
              </div>
              {threads.filter(t => t.status === 'open').length > 0 && (
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Thread (optional)</label>
                  <select
                    value={composeThreadId}
                    onChange={e => setComposeThreadId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface-primary border border-[rgba(255,255,255,0.06)] rounded-md text-zinc-200"
                  >
                    <option value="">None</option>
                    {threads.filter(t => t.status === 'open').map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={handleSend}
                disabled={!composeBody.trim() || sending}
                className="w-full py-2 text-sm font-medium rounded-md bg-brand text-white hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

function MessageList({ messages, onSelect, selectedId, isSent }) {
  if (messages.length === 0) {
    return (
      <Card hover={false}>
        <CardContent className="py-6">
          <EmptyState
            icon={isSent ? Send : Inbox}
            title={isSent ? 'No sent messages' : 'Inbox is empty'}
            description={isSent ? 'Messages you send will appear here.' : 'No messages yet. Agents can send messages via the SDK.'}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card hover={false}>
      <CardContent className="pt-0 divide-y divide-[rgba(255,255,255,0.04)]">
        {messages.map(msg => {
          const agentColor = getAgentColor(isSent ? msg.to_agent_id || 'broadcast' : msg.from_agent_id);
          const isUnread = msg.status === 'sent' && !isSent;
          return (
            <div
              key={msg.id}
              onClick={() => onSelect(msg)}
              className={`flex items-start gap-3 py-3 px-1 cursor-pointer transition-colors rounded-sm ${
                msg.id === selectedId ? 'bg-[rgba(255,255,255,0.04)]' : 'hover:bg-[rgba(255,255,255,0.02)]'
              }`}
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${agentColor}20`, color: agentColor }}
              >
                <MessageSquare size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {isUnread && <div className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />}
                  {msg.urgent && <AlertCircle size={12} className="text-red-400 flex-shrink-0" />}
                  <span className={`text-sm truncate ${isUnread ? 'font-semibold text-white' : 'text-zinc-300'}`}>
                    {isSent ? (msg.to_agent_id || 'All Agents') : msg.from_agent_id}
                  </span>
                  <Badge variant={TYPE_VARIANTS[msg.message_type] || 'default'} size="xs">
                    {msg.message_type}
                  </Badge>
                  {!msg.to_agent_id && (
                    <Badge variant="secondary" size="xs">
                      <Users size={10} className="mr-0.5" /> broadcast
                    </Badge>
                  )}
                </div>
                {msg.subject && (
                  <div className="text-sm text-zinc-200 truncate mt-0.5">{msg.subject}</div>
                )}
                <div className="text-xs text-zinc-500 truncate mt-0.5">{msg.body}</div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs text-zinc-600">{timeAgo(msg.created_at)}</span>
                <ChevronRight size={12} className="text-zinc-700" />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ThreadList({ threads, onSelect, selectedId }) {
  if (threads.length === 0) {
    return (
      <Card hover={false}>
        <CardContent className="py-6">
          <EmptyState
            icon={Hash}
            title="No threads"
            description="Message threads will appear here when agents start conversations."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card hover={false}>
      <CardContent className="pt-0 divide-y divide-[rgba(255,255,255,0.04)]">
        {threads.map(thread => (
          <div
            key={thread.id}
            onClick={() => onSelect(thread)}
            className={`flex items-start gap-3 py-3 px-1 cursor-pointer transition-colors rounded-sm ${
              thread.id === selectedId ? 'bg-[rgba(255,255,255,0.04)]' : 'hover:bg-[rgba(255,255,255,0.02)]'
            }`}
          >
            <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 bg-[rgba(255,255,255,0.06)]">
              <Hash size={14} className="text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-200 truncate">{thread.name}</span>
                <Badge variant={thread.status === 'open' ? 'success' : 'default'} size="xs">
                  {thread.status}
                </Badge>
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {thread.message_count || 0} messages · by {thread.created_by}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-xs text-zinc-600">{timeAgo(thread.last_message_at || thread.created_at)}</span>
              <ChevronRight size={12} className="text-zinc-700" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DocList({ docs, onSelect, selectedId }) {
  if (docs.length === 0) {
    return (
      <Card hover={false}>
        <CardContent className="py-6">
          <EmptyState
            icon={FileText}
            title="No shared documents"
            description="Agents can create shared workspace documents via the SDK."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card hover={false}>
      <CardContent className="pt-0 divide-y divide-[rgba(255,255,255,0.04)]">
        {docs.map(doc => (
          <div
            key={doc.id}
            onClick={() => onSelect(doc)}
            className={`flex items-start gap-3 py-3 px-1 cursor-pointer transition-colors rounded-sm ${
              doc.id === selectedId ? 'bg-[rgba(255,255,255,0.04)]' : 'hover:bg-[rgba(255,255,255,0.02)]'
            }`}
          >
            <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 bg-[rgba(255,255,255,0.06)]">
              <FileText size={14} className="text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-zinc-200 truncate block">{doc.name}</span>
              <div className="text-xs text-zinc-500 mt-0.5">
                v{doc.version} · by {doc.last_edited_by || doc.created_by}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-xs text-zinc-600">{timeAgo(doc.updated_at)}</span>
              <ChevronRight size={12} className="text-zinc-700" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MessageDetail({ message, onMarkRead, onArchive, agentId }) {
  const isDemo = isDemoMode();
  const agentColor = getAgentColor(message.from_agent_id);
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${agentColor}20`, color: agentColor }}
        >
          <MessageSquare size={12} />
        </div>
        <span className="text-sm font-medium text-white">{message.from_agent_id}</span>
        {message.urgent && <AlertCircle size={12} className="text-red-400" />}
        <Badge variant={TYPE_VARIANTS[message.message_type] || 'default'} size="xs">
          {message.message_type}
        </Badge>
      </div>
      <div className="text-xs text-zinc-500 mb-1">
        To: {message.to_agent_id || 'All Agents (Broadcast)'}
      </div>
      {message.subject && (
        <div className="text-sm font-medium text-zinc-200 mb-2">{message.subject}</div>
      )}
      <div className="text-sm text-zinc-300 whitespace-pre-wrap mb-3 bg-[rgba(255,255,255,0.02)] rounded-md p-3">
        {message.body}
      </div>
      <div className="text-xs text-zinc-600 mb-3">
        {new Date(message.created_at).toLocaleString()}
        {message.read_at && ` · Read ${timeAgo(message.read_at)}`}
        {message.thread_id && (
          <span className="ml-2">
            · Thread: <span className="font-mono">{message.thread_id.slice(0, 12)}...</span>
          </span>
        )}
      </div>
      {message.status === 'sent' && (
        <div className="flex gap-2">
          <button
            onClick={() => onMarkRead(message.id)}
            disabled={isDemo}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-[rgba(255,255,255,0.06)] text-zinc-300 hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          >
            <Eye size={12} /> Mark Read
          </button>
          <button
            onClick={() => onArchive(message.id)}
            disabled={isDemo}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-[rgba(255,255,255,0.06)] text-zinc-300 hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          >
            <Archive size={12} /> Archive
          </button>
        </div>
      )}
    </div>
  );
}

function ThreadDetail({ thread }) {
  const participants = thread.participants ? JSON.parse(thread.participants) : [];
  return (
    <div>
      <h4 className="text-sm font-semibold text-white mb-1">{thread.name}</h4>
      <div className="flex items-center gap-2 mb-2">
        <Badge variant={thread.status === 'open' ? 'success' : 'default'} size="xs">
          {thread.status}
        </Badge>
        <span className="text-xs text-zinc-500">{thread.message_count || 0} messages</span>
      </div>
      {participants.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {participants.map(p => (
            <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-zinc-400">
              {p}
            </span>
          ))}
        </div>
      )}
      {thread.summary && (
        <div className="text-sm text-zinc-300 bg-[rgba(255,255,255,0.02)] rounded-md p-3 mb-2">
          {thread.summary}
        </div>
      )}
      <div className="text-xs text-zinc-600">
        Created by {thread.created_by} · {new Date(thread.created_at).toLocaleString()}
        {thread.resolved_at && ` · Resolved ${timeAgo(thread.resolved_at)}`}
      </div>
    </div>
  );
}

function DocDetail({ doc }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white mb-1">{doc.name}</h4>
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="info" size="xs">v{doc.version}</Badge>
        <span className="text-xs text-zinc-500">by {doc.last_edited_by || doc.created_by}</span>
      </div>
      <div className="text-sm text-zinc-300 whitespace-pre-wrap bg-[rgba(255,255,255,0.02)] rounded-md p-3 mb-2 max-h-[400px] overflow-y-auto font-mono text-xs">
        {doc.content}
      </div>
      <div className="text-xs text-zinc-600">
        Created {new Date(doc.created_at).toLocaleString()}
        {doc.updated_at !== doc.created_at && ` · Updated ${timeAgo(doc.updated_at)}`}
      </div>
    </div>
  );
}
