import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function ComposeModal({ show, onClose, agents, threads, filterAgentId, isDemo, onSend, prefill }) {
  const [to, setTo] = useState('');
  const [type, setType] = useState('info');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [threadId, setThreadId] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (show && prefill) {
      setTo(prefill.to || '');
      setSubject(prefill.subject || '');
      setType(prefill.type || 'info');
      setThreadId(prefill.thread_id || '');
    }
  }, [show, prefill]);

  if (!show) return null;

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    try {
      const payload = {
        from_agent_id: filterAgentId || 'dashboard',
        body,
        message_type: type,
      };
      if (to) payload.to_agent_id = to;
      if (subject) payload.subject = subject;
      if (urgent) payload.urgent = true;
      if (threadId) payload.thread_id = threadId;

      await onSend(payload);
      setBody('');
      setSubject('');
      setTo('');
      setUrgent(false);
      setThreadId('');
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSending(false);
    }
  }

  const openThreads = threads.filter(t => t.status === 'open');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-surface-secondary border border-[rgba(255,255,255,0.06)] rounded-lg w-full max-w-lg mx-4 p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Compose Message</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">To</label>
            <select
              value={to}
              onChange={e => setTo(e.target.value)}
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
                value={type}
                onChange={e => setType(e.target.value)}
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
                  checked={urgent}
                  onChange={e => setUrgent(e.target.checked)}
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
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Optional subject"
              maxLength={200}
              className="w-full px-3 py-2 text-sm bg-surface-primary border border-[rgba(255,255,255,0.06)] rounded-md text-zinc-200 placeholder:text-zinc-600"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Body</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Message body..."
              maxLength={2000}
              rows={5}
              className="w-full px-3 py-2 text-sm bg-surface-primary border border-[rgba(255,255,255,0.06)] rounded-md text-zinc-200 placeholder:text-zinc-600 resize-none"
            />
            <div className="text-right text-xs text-zinc-600 mt-1">{body.length}/2000</div>
          </div>
          {openThreads.length > 0 && (
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Thread (optional)</label>
              <select
                value={threadId}
                onChange={e => setThreadId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-primary border border-[rgba(255,255,255,0.06)] rounded-md text-zinc-200"
              >
                <option value="">None</option>
                {openThreads.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={handleSend}
            disabled={!body.trim() || sending || isDemo}
            className="w-full py-2 text-sm font-medium rounded-md bg-brand text-white hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
}
