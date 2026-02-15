import { useState } from 'react';
import { MessageCircleQuestion, AlertTriangle, Inbox, ChevronDown, ChevronRight, MessageSquare, AlertCircle, Users, Reply } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { getAgentColor } from '../../lib/colors';
import { timeAgo, TYPE_VARIANTS } from './helpers';

function MessageRow({ msg, onSelect, selectedId, onReply }) {
  const agentColor = getAgentColor(msg.from_agent_id);
  const isUnread = msg.status === 'sent';
  return (
    <div
      onClick={() => onSelect(msg)}
      className={`group flex items-start gap-3 py-2.5 px-1 cursor-pointer transition-colors rounded-sm ${
        msg.id === selectedId ? 'bg-[rgba(255,255,255,0.04)]' : 'hover:bg-[rgba(255,255,255,0.02)]'
      }`}
    >
      <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 border ${agentColor}`}>
        <MessageSquare size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isUnread && <div className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />}
          {msg.urgent && <AlertCircle size={10} className="text-red-400 flex-shrink-0" />}
          <span className={`text-sm truncate ${isUnread ? 'font-semibold text-white' : 'text-zinc-300'}`}>
            {msg.from_agent_id}
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
        {msg.subject && <div className="text-sm text-zinc-200 truncate mt-0.5">{msg.subject}</div>}
        <div className="text-xs text-zinc-500 truncate mt-0.5">{msg.body}</div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-xs text-zinc-600">{timeAgo(msg.created_at)}</span>
        {onReply && (
          <button
            onClick={(e) => { e.stopPropagation(); onReply(msg); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-brand"
            title="Reply"
          >
            <Reply size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, count, color, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-md transition-colors ${color}`}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Icon size={12} />
        <span>{title}</span>
        <span className="ml-auto font-mono">{count}</span>
      </button>
      {open && <div className="divide-y divide-[rgba(255,255,255,0.04)]">{children}</div>}
    </div>
  );
}

export default function SmartInbox({ messages, onSelect, selectedId, onReply }) {
  if (messages.length === 0) {
    return (
      <Card hover={false}>
        <CardContent className="py-6">
          <EmptyState
            icon={Inbox}
            title="Inbox is empty"
            description="No messages yet. Agents can send messages via the SDK."
          />
        </CardContent>
      </Card>
    );
  }

  const needsInput = messages.filter(m => m.message_type === 'question' || m.message_type === 'action');
  const needsInputIds = new Set(needsInput.map(m => m.id));
  const urgent = messages.filter(m => m.urgent && !needsInputIds.has(m.id));
  const urgentIds = new Set(urgent.map(m => m.id));
  const rest = messages.filter(m => !needsInputIds.has(m.id) && !urgentIds.has(m.id));

  const hasTriaged = needsInput.length > 0 || urgent.length > 0;

  return (
    <Card hover={false}>
      <CardContent className="pt-2">
        <Section
          title="Needs Your Input"
          icon={MessageCircleQuestion}
          count={needsInput.length}
          color="text-amber-400 hover:bg-amber-500/10"
          defaultOpen
        >
          {needsInput.map(msg => (
            <MessageRow key={msg.id} msg={msg} onSelect={onSelect} selectedId={selectedId} onReply={onReply} />
          ))}
        </Section>

        <Section
          title="Urgent"
          icon={AlertTriangle}
          count={urgent.length}
          color="text-red-400 hover:bg-red-500/10"
          defaultOpen
        >
          {urgent.map(msg => (
            <MessageRow key={msg.id} msg={msg} onSelect={onSelect} selectedId={selectedId} onReply={onReply} />
          ))}
        </Section>

        <Section
          title="Everything Else"
          icon={Inbox}
          count={rest.length}
          color="text-zinc-400 hover:bg-[rgba(255,255,255,0.06)]"
          defaultOpen={!hasTriaged}
        >
          {rest.map(msg => (
            <MessageRow key={msg.id} msg={msg} onSelect={onSelect} selectedId={selectedId} onReply={onReply} />
          ))}
        </Section>
      </CardContent>
    </Card>
  );
}
