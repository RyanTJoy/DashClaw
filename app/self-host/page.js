import Link from 'next/link';
import { ChevronRight, Terminal, ArrowRight, Shield, KeyRound, Server } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import CopyMarkdownButton from '../components/CopyMarkdownButton';

export const metadata = {
  title: 'Self-Host DashClaw',
  description: 'Run your own DashClaw dashboard locally or in your cloud account. You pay, you own the data.',
};

function CodeBlock({ title, children }) {
  return (
    <div className="rounded-xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] overflow-x-auto">
      {title && (
        <div className="px-5 py-2.5 border-b border-[rgba(255,255,255,0.06)] text-xs text-zinc-500 font-mono">{title}</div>
      )}
      <pre className="p-5 font-mono text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">{children}</pre>
    </div>
  );
}

function StepCard({ n, title, desc, icon: Icon, children }) {
  return (
    <div className="rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)] p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center shrink-0">
          <Icon size={18} className="text-brand" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center">{n}</span>
            <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export default function SelfHostPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PublicNavbar />

      <section className="pt-28 pb-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
            <Link href="/" className="hover:text-zinc-300 transition-colors">Home</Link>
            <ChevronRight size={14} />
            <span className="text-zinc-300">Self-Host</span>
          </div>

          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center">
              <Terminal size={20} className="text-brand" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Self-host DashClaw</h1>
              <p className="mt-2 text-zinc-400 max-w-2xl leading-relaxed">
                You own the dashboard, you own the data, and you pay your own hosting bill. Your agents point at your base URL.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/demo" className="inline-flex items-center gap-2 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.08)] px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-[#181818] hover:text-white transition-colors">
              View Live Demo
            </Link>
            <Link href="/docs" className="inline-flex items-center gap-2 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.08)] px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-[#181818] hover:text-white transition-colors">
              SDK Docs
            </Link>
            <a href="https://github.com/ucsandman/DashClaw" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium hover:bg-brand-hover transition-colors">
              Open Source Repo <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 gap-5">
          <StepCard
            n="1"
            title="Start your dashboard (local)"
            desc="The installer generates secrets, writes .env.local, installs dependencies, and prints the API key your agents should use."
            icon={Server}
          >
            <div className="mb-4">
              <CopyMarkdownButton
                href="/api/prompts/server-setup/raw"
                label="Copy Server Setup Prompt"
                rawLabel="View prompt"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CodeBlock title="Windows (PowerShell)">{`./install-windows.bat`}</CodeBlock>
              <CodeBlock title="Mac / Linux (bash)">{`bash ./install-mac.sh`}</CodeBlock>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              When it finishes, open <span className="font-mono text-zinc-300">http://localhost:3000</span>.
            </p>
          </StepCard>

          <StepCard
            n="2"
            title="Point your agents at your base URL"
            desc="Agents do not need your database URL. They only need a base URL + API key. Paste these into your agent machine."
            icon={KeyRound}
          >
            <div className="mb-4">
              <CopyMarkdownButton
                href="/api/prompts/agent-connect/raw"
                label="Copy Agent Connect Prompt"
                rawLabel="View prompt"
              />
            </div>
            <CodeBlock title="Agent environment (example)">{`DASHCLAW_BASE_URL=http://localhost:3000
DASHCLAW_API_KEY=oc_live_...
DASHCLAW_AGENT_ID=cinder`}</CodeBlock>
            <p className="mt-3 text-xs text-zinc-500">
              Your server uses <span className="font-mono text-zinc-300">.env.local</span>. Your agent uses its own environment variables.
            </p>
          </StepCard>

          <StepCard
            n="3"
            title="Optional: enable verified agents (one-click pairing)"
            desc="If you want cryptographic identity binding, your agent generates a keypair and prints a one-click pairing URL. You approve once (or approve-all)."
            icon={Shield}
          >
            <CodeBlock title="Agent environment (verified mode)">{`# Optional: sign actions with a private key
DASHCLAW_PRIVATE_KEY_PATH=./secrets/cinder-private.jwk

# Optional: server-side enforcement (set on the dashboard host)
ENFORCE_AGENT_SIGNATURES=true`}</CodeBlock>
            <p className="mt-3 text-sm text-zinc-400">
              The goal is: no manual public key uploads. Pairing registers the matching public key automatically.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Next: we’ll add “pairIfNeeded()” helpers to the SDK so agents print a link and block until approved.
            </p>
          </StepCard>
        </div>
      </section>
    </div>
  );
}
