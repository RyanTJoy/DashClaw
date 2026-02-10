'use client';

import { useState, useCallback } from 'react';
import { Copy, Check, FileText } from 'lucide-react';

export default function CopyDocsButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const res = await fetch('/sdk-reference.md');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: open the file directly if clipboard fails
      window.open('/sdk-reference.md', '_blank');
    }
  }, []);

  return (
    <div className="flex items-center gap-3 mt-4">
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-sm text-zinc-300 hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors"
      >
        {copied ? (
          <>
            <Check size={16} className="text-green-400" />
            <span className="text-green-400">Copied!</span>
          </>
        ) : (
          <>
            <Copy size={16} />
            Copy as Markdown
          </>
        )}
      </button>
      <a
        href="/sdk-reference.md"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <FileText size={14} />
        View raw
      </a>
    </div>
  );
}
