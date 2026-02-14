'use client';

import { useState, useCallback } from 'react';
import { Copy, Check, FileText } from 'lucide-react';

export default function CopyMarkdownButton({
  href,
  label = 'Copy as Markdown',
  rawLabel = 'View raw',
  className = '',
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const res = await fetch(href);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: open raw in a new tab if clipboard fails
      window.open(href, '_blank');
    }
  }, [href]);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
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
            {label}
          </>
        )}
      </button>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <FileText size={14} />
        {rawLabel}
      </a>
    </div>
  );
}

