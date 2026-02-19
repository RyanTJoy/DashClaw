'use client';

import { useState } from 'react';
import { KeyRound, Copy, Check, RefreshCw } from 'lucide-react';

function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function toHex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function generateSecrets() {
  const authBytes = new Uint8Array(32);
  const apiBytes = new Uint8Array(24);
  const encBytes = new Uint8Array(32);
  const cronBytes = new Uint8Array(32);
  crypto.getRandomValues(authBytes);
  crypto.getRandomValues(apiBytes);
  crypto.getRandomValues(encBytes);
  crypto.getRandomValues(cronBytes);

  return {
    NEXTAUTH_SECRET: toBase64Url(authBytes),
    DASHCLAW_API_KEY: 'oc_live_' + toHex(apiBytes),
    ENCRYPTION_KEY: toBase64Url(encBytes).slice(0, 32),
    CRON_SECRET: toHex(cronBytes),
  };
}

const SECRET_LABELS = {
  NEXTAUTH_SECRET: 'Encrypts login sessions',
  DASHCLAW_API_KEY: 'Authenticates your agents (oc_live_ prefix required)',
  ENCRYPTION_KEY: 'Encrypts sensitive settings in the database',
  CRON_SECRET: 'Authenticates scheduled job requests',
};

function SecretRow({ name, value, label }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <code className="text-xs font-mono text-zinc-200 font-semibold">{name}</code>
          <span className="text-[11px] text-zinc-500">{label}</span>
        </div>
        <code className="text-xs font-mono text-zinc-400 break-all">{value}</code>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 p-1.5 rounded bg-[#181818] hover:bg-[#222] transition-colors"
        title={`Copy ${name}`}
      >
        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-zinc-400" />}
      </button>
    </div>
  );
}

export default function SecretGenerator() {
  const [secrets, setSecrets] = useState(null);
  const [allCopied, setAllCopied] = useState(false);

  function handleGenerate() {
    setSecrets(generateSecrets());
    setAllCopied(false);
  }

  function buildEnvBlock() {
    if (!secrets) return '';
    return [
      `DATABASE_URL=postgresql://user:pass@ep-xyz.neon.tech/neondb`,
      `NEXTAUTH_URL=https://your-app.vercel.app`,
      `NEXTAUTH_SECRET=${secrets.NEXTAUTH_SECRET}`,
      `DASHCLAW_API_KEY=${secrets.DASHCLAW_API_KEY}`,
      `ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}`,
      `CRON_SECRET=${secrets.CRON_SECRET}`,
      `REALTIME_BACKEND=redis`,
      `REDIS_URL=redis://default:pass@ep-xyz.upstash.io:6379`,
      `REALTIME_ENFORCE_REDIS=true`,
      `GITHUB_ID=<from-step-3>`,
      `GITHUB_SECRET=<from-step-3>`,
    ].join('\n');
  }

  function handleCopyAll() {
    navigator.clipboard.writeText(buildEnvBlock());
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  }

  if (!secrets) {
    return (
      <button
        onClick={handleGenerate}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors"
      >
        <KeyRound size={18} />
        Generate My Secrets
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Generated secrets */}
      <div className="rounded-xl bg-[#0d0d0d] border border-brand/20 overflow-hidden">
        <div className="px-5 py-2.5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
          <span className="text-xs text-zinc-500 font-mono">Generated secrets</span>
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Regenerate all secrets"
          >
            <RefreshCw size={12} /> Regenerate
          </button>
        </div>
        <div className="px-5 py-2">
          {Object.entries(secrets).map(([key, value]) => (
            <SecretRow key={key} name={key} value={value} label={SECRET_LABELS[key]} />
          ))}
        </div>
      </div>

      {/* Copy-pasteable env block */}
      <div className="relative group rounded-xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        <div className="px-5 py-2.5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
          <span className="text-xs text-zinc-500 font-mono">Ready-to-paste environment variables</span>
          <button
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1.5 text-xs text-brand hover:text-brand-hover transition-colors font-medium"
          >
            {allCopied ? <><Check size={12} className="text-green-400" /> Copied!</> : <><Copy size={12} /> Copy All</>}
          </button>
        </div>
        <pre className="p-5 font-mono text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">{buildEnvBlock()}</pre>
      </div>

      <p className="text-xs text-zinc-500">
        Replace <code className="font-mono text-zinc-300">DATABASE_URL</code>, <code className="font-mono text-zinc-300">NEXTAUTH_URL</code>, <code className="font-mono text-zinc-300">REDIS_URL</code>, <code className="font-mono text-zinc-300">GITHUB_ID</code>, and <code className="font-mono text-zinc-300">GITHUB_SECRET</code> with your actual values. The four generated secrets are ready to use.
      </p>
    </div>
  );
}
