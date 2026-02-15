import { useState, useEffect, useRef, useCallback } from 'react';
import { Hash, Send, MessageSquare, AlertCircle } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { getAgentColor } from '../../lib/colors';
import { isDemoMode } from '../../lib/isDemoMode';
import { timeAgo, TYPE_VARIANTS } from './helpers';
import MarkdownBody from './MarkdownBody';

export default function ThreadConversation({ thread, filterAgentId, onNewMessage }) {
  const isDemo = isDemoMode();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  const participants = (() => {
    try {
      const p = JSON.parse(thread.participants || '[]');
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  })();

  const fetchThreadMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        thread_id: thread.id,
        direction: 'all',
        limit: '100',
      });
      if (filterAgentId) params.set('agent_id', filterAgentId);
      const res = await fetch(`/api/messages?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      // Show chronological (oldest first)
      const sorted = (data.messages || []).slice().sort(
        (a, b) => (a.created_at || '').localeCompare(b.created_at || '')
      );
      setMessages(sorted);
    } catch {
      // Silently fail, will retry on poll
    } finally {
      setLoading(false);
    }
  }, [thread.id, filterAgentId]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchThreadMessages();
  }, [fetchThreadMessages]);

  // Polling fallback
  useEffect(() => {
    const interval = setInterval(fetchThreadMessages, 15000);
    return () => clearInterval(interval);
  }, [fetchThreadMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Handle incoming SSE messages
  const addMessage = useCallback((msg) => {
    if (msg.thread_id !== thread.id) return;
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, [thread.id]);

  // Expose addMessage for parent to call on SSE events
  useEffect(() => {
    if (onNewMessage) {
      onNewMessage.current = addMessage;
    }
  }, [addMessage, onNewMessage]);

  async function handleSendReply() {
    if (!replyBody.trim() || isDemo) return;
    setSending(true);
    try {
      const payload = {
        from_agent_id: filterAgentId || 'dashboard',
        body: replyBody,
        message_type: 'info',
        thread_id: thread.id,
      };

      // Optimistic update
      const optimistic = {
        id: `temp_${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
        status: 'sent',
        _optimistic: true,
      };
      setMessages(prev => [...prev, optimistic]);
      setReplyBody('');

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        return;
      }

      // Re-fetch to get the real message and dedup
      fetchThreadMessages();
    } catch {
      // Remove optimistic
      setMessages(prev => prev.filter(m => !m._optimistic));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] pb-3 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Hash size={14} className="text-zinc-400" />
          <span className="text-sm font-semibold text-white">{thread.name}</span>
          <Badge variant={thread.status === 'open' ? 'success' : 'default'} size="xs">
            {thread.status}
          </Badge>
          <span className="text-xs text-zinc-500">{thread.message_count || messages.length} messages</span>
        </div>
        {participants.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {participants.map(p => (
              <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-zinc-400">
                {p}
              </span>
            ))}
          </div>
        )}
        {thread.summary && (
          <div className="text-xs text-zinc-500 mt-1">{thread.summary}</div>
        )}
      </div>

      {/* Messages timeline */}
      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-3 min-h-0 max-h-[500px] pr-1">
        {loading ? (
          <div className="text-center text-zinc-500 py-8 text-sm">Loading conversation...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-zinc-500 py-8 text-sm">No messages in this thread yet.</div>
        ) : (
          messages.map(msg => {
            const agentColor = getAgentColor(msg.from_agent_id);
            const isDashboard = msg.from_agent_id === 'dashboard' || msg.from_agent_id === (filterAgentId || 'dashboard');
            return (
              <div key={msg.id} className={`flex gap-2 ${isDashboard ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 border ${agentColor}`}
                >
                  <MessageSquare size={12} />
                </div>
                <div className={`flex-1 min-w-0 max-w-[85%] ${isDashboard ? 'text-right' : ''}`}>
                  <div className={`flex items-center gap-1.5 mb-0.5 ${isDashboard ? 'justify-end' : ''}`}>
                    <span className="text-xs font-medium text-zinc-300">{msg.from_agent_id}</span>
                    <Badge variant={TYPE_VARIANTS[msg.message_type] || 'default'} size="xs">
                      {msg.message_type}
                    </Badge>
                    {msg.urgent && <AlertCircle size={10} className="text-red-400" />}
                    <span className="text-xs text-zinc-600">{timeAgo(msg.created_at)}</span>
                  </div>
                  <div className={`rounded-lg p-2.5 ${
                    isDashboard
                      ? 'bg-brand/10 border border-brand/20'
                      : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]'
                  } ${msg._optimistic ? 'opacity-60' : ''}`}>
                    <MarkdownBody content={msg.body} />
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      <div className="border-t border-[rgba(255,255,255,0.06)] pt-3 mt-3">
        {isDemo ? (
          <div className="text-xs text-zinc-500 text-center py-2">Reply is disabled in demo mode</div>
        ) : (
          <div className="flex gap-2">
            <textarea
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              placeholder="Reply to thread..."
              maxLength={2000}
              rows={2}
              className="flex-1 px-3 py-2 text-sm bg-surface-primary border border-[rgba(255,255,255,0.06)] rounded-md text-zinc-200 placeholder:text-zinc-600 resize-none"
            />
            <button
              onClick={handleSendReply}
              disabled={!replyBody.trim() || sending}
              className="px-3 py-2 rounded-md bg-brand text-white hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
            >
              <Send size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
