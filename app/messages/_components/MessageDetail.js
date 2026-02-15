import { MessageSquare, AlertCircle, Eye, Archive, Reply, Hash } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { getAgentColor } from '../../lib/colors';
import { isDemoMode } from '../../lib/isDemoMode';
import { timeAgo, TYPE_VARIANTS } from './helpers';
import MarkdownBody from './MarkdownBody';

export default function MessageDetail({ message, onMarkRead, onArchive, onReply, onViewThread }) {
  const isDemo = isDemoMode();
  const agentColor = getAgentColor(message.from_agent_id);
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center border ${agentColor}`}
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
      <div className="mb-3 bg-[rgba(255,255,255,0.02)] rounded-md p-3">
        <MarkdownBody content={message.body} />
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
      <div className="flex gap-2 flex-wrap">
        {message.status === 'sent' && (
          <>
            <button
              onClick={() => onMarkRead(message.id)}
              disabled={isDemo}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-[rgba(255,255,255,0.06)] text-zinc-300 hover:bg-[rgba(255,255,255,0.1)] transition-colors disabled:opacity-50"
            >
              <Eye size={12} /> Mark Read
            </button>
            <button
              onClick={() => onArchive(message.id)}
              disabled={isDemo}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-[rgba(255,255,255,0.06)] text-zinc-300 hover:bg-[rgba(255,255,255,0.1)] transition-colors disabled:opacity-50"
            >
              <Archive size={12} /> Archive
            </button>
          </>
        )}
        {onReply && (
          <button
            onClick={() => onReply(message)}
            disabled={isDemo}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-brand/10 text-brand hover:bg-brand/20 transition-colors disabled:opacity-50"
          >
            <Reply size={12} /> Reply
          </button>
        )}
        {message.thread_id && onViewThread && (
          <button
            onClick={() => onViewThread(message.thread_id)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-[rgba(255,255,255,0.06)] text-zinc-300 hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          >
            <Hash size={12} /> View Thread
          </button>
        )}
      </div>
    </div>
  );
}
