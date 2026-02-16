import { useState } from 'react';
import { Download, Copy } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { timeAgo, copyToClipboard } from './helpers';
import MarkdownBody from './MarkdownBody';

export default function DocDetail({ doc }) {
  const [copied, setCopied] = useState(false);

  function handleDownload() {
    const blob = new Blob([doc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    const ok = await copyToClipboard(doc.content);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-white mb-1">{doc.name}</h4>
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="info" size="xs">v{doc.version}</Badge>
        <span className="text-xs text-zinc-500">by {doc.last_edited_by || doc.created_by}</span>
      </div>
      <div className="bg-[rgba(255,255,255,0.02)] rounded-md p-3 mb-2 max-h-[400px] overflow-y-auto">
        <MarkdownBody content={doc.content} />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[rgba(255,255,255,0.04)] text-zinc-400 hover:text-zinc-200 hover:bg-[rgba(255,255,255,0.08)] transition-colors"
        >
          <Download size={10} /> Download .md
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[rgba(255,255,255,0.04)] text-zinc-400 hover:text-zinc-200 hover:bg-[rgba(255,255,255,0.08)] transition-colors"
        >
          <Copy size={10} /> {copied ? 'Copied!' : 'Copy Content'}
        </button>
      </div>
      <div className="text-xs text-zinc-600">
        Created {new Date(doc.created_at).toLocaleString()}
        {doc.updated_at !== doc.created_at && ` · Updated ${timeAgo(doc.updated_at)}`}
      </div>
    </div>
  );
}
