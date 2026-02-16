import Link from 'next/link';
import { ChevronRight, Terminal, ArrowRight, Shield, KeyRound, Server, Cloud, Database, Github, Download, Sparkles } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import CopyMarkdownButton from '../components/CopyMarkdownButton';

export const metadata = {
  title: 'Get Started with DashClaw',
  description: 'Deploy your own DashClaw dashboard for free with Vercel + Neon, or run locally with Docker.',
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
            <span className="text-zinc-300">Get Started</span>
          </div>

          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center">
              <Terminal size={20} className="text-brand" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Get started with DashClaw</h1>
              <p className="mt-2 text-zinc-400 max-w-2xl leading-relaxed">
                Deploy free, access from anywhere — including your phone. You own the data.
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

      {/* Two-path intro */}
      <section className="pb-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#111] border border-brand/30 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Cloud size={18} className="text-brand" />
                <h3 className="text-sm font-semibold text-white">Cloud (recommended)</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Vercel + Neon free tiers. Zero cost, accessible from any device, auto-HTTPS. Takes ~10 minutes.
              </p>
            </div>
            <div className="rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <Server size={18} className="text-zinc-400" />
                <h3 className="text-sm font-semibold text-white">Local</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Docker + localhost. Good for development or if you want everything on your machine.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cloud path */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 gap-5">
          <StepCard
            n="1"
            title="Create a free Neon database"
            desc="Neon gives you a serverless Postgres database on their free tier — no credit card required."
            icon={Database}
          >
            <ol className="list-decimal list-inside text-sm text-zinc-400 space-y-1.5 mb-4">
              <li>Sign up at <a href="https://neon.tech" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover transition-colors">neon.tech</a></li>
              <li>Create a new project (any name, e.g. &quot;dashclaw&quot;)</li>
              <li>Copy the connection string — it looks like <code className="text-zinc-300 font-mono text-xs">postgresql://user:pass@ep-xyz.neon.tech/neondb</code></li>
            </ol>
            <p className="text-xs text-zinc-500">
              You&apos;ll paste this as <code className="font-mono text-zinc-300">DATABASE_URL</code> in the next step.
            </p>
          </StepCard>

          <StepCard
            n="2"
            title="Deploy to Vercel"
            desc="Fork the repo and import it into Vercel. Add the environment variables and deploy."
            icon={Cloud}
          >
            <ol className="list-decimal list-inside text-sm text-zinc-400 space-y-1.5 mb-4">
              <li>Fork <a href="https://github.com/ucsandman/DashClaw" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover transition-colors">ucsandman/DashClaw</a> to your GitHub account</li>
              <li>Go to <a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover transition-colors">vercel.com/new</a> and import your fork</li>
              <li>Add these environment variables before deploying:</li>
            </ol>
            <CodeBlock title="Required environment variables">{`DATABASE_URL=postgresql://user:pass@ep-xyz.neon.tech/neondb
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<random-32-char-secret>
DASHCLAW_API_KEY=<your-secret-api-key>
GITHUB_ID=<from-step-3>
GITHUB_SECRET=<from-step-3>`}</CodeBlock>
            <p className="mt-3 text-xs text-zinc-500">
              Generate secrets with <code className="font-mono text-zinc-300">openssl rand -base64 32</code>. Tables are created automatically on first request.
            </p>
          </StepCard>

          <StepCard
            n="3"
            title="Set up GitHub OAuth"
            desc="Create a GitHub OAuth app so you can sign in to your dashboard."
            icon={Github}
          >
            <ol className="list-decimal list-inside text-sm text-zinc-400 space-y-1.5 mb-4">
              <li>Go to <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover transition-colors">GitHub Developer Settings</a> → OAuth Apps → New OAuth App</li>
              <li>Set <strong className="text-zinc-200">Homepage URL</strong> to <code className="font-mono text-zinc-300 text-xs">https://your-app.vercel.app</code></li>
              <li>Set <strong className="text-zinc-200">Authorization callback URL</strong> to <code className="font-mono text-zinc-300 text-xs">https://your-app.vercel.app/api/auth/callback/github</code></li>
              <li>Copy the Client ID and Client Secret into your Vercel env vars as <code className="font-mono text-zinc-300">GITHUB_ID</code> and <code className="font-mono text-zinc-300">GITHUB_SECRET</code></li>
              <li>Redeploy from the Vercel dashboard</li>
            </ol>
            <p className="text-xs text-zinc-500">
              Replace <code className="font-mono text-zinc-300">your-app.vercel.app</code> with your actual Vercel domain.
            </p>
          </StepCard>

          <StepCard
            n="4"
            title="Connect your agents"
            desc="Agents only need a base URL + API key. Paste these into your agent's environment."
            icon={KeyRound}
          >
            <div className="mb-4">
              <CopyMarkdownButton
                href="/api/prompts/agent-connect/raw"
                label="Copy Agent Connect Prompt"
                rawLabel="View prompt"
              />
            </div>
            <CodeBlock title="Agent environment (example)">{`DASHCLAW_BASE_URL=https://your-app.vercel.app
DASHCLAW_API_KEY=<your-secret-api-key>
DASHCLAW_AGENT_ID=cinder`}</CodeBlock>
            <p className="mt-3 text-xs text-zinc-500">
              Your Vercel app uses Vercel env vars. Your agent uses its own environment variables.
            </p>
          </StepCard>

          {/* Claude Code Skill */}
          <div className="rounded-2xl bg-gradient-to-b from-[rgba(249,115,22,0.06)] to-transparent p-6 sm:p-8 border border-[rgba(249,115,22,0.12)]">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center shrink-0">
                <Sparkles size={20} className="text-brand" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Claude Code Skill</h2>
                <p className="text-sm text-zinc-400 leading-relaxed mt-1">
                  If you use Claude Code, this skill turns it into a DashClaw platform expert.
                  It can instrument your agent, scaffold API routes, generate SDK clients, design guard policies,
                  troubleshoot errors, and bootstrap workspaces — all from your terminal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] p-4">
                <h3 className="text-sm font-semibold text-zinc-200 mb-2">What it does</h3>
                <ul className="text-sm text-zinc-400 space-y-1.5">
                  <li>Instruments any agent with DashClaw SDKs (Node.js or Python)</li>
                  <li>Designs guard policies for cost ceilings, risk thresholds, and action allowlists</li>
                  <li>Troubleshoots 401, 403, 429, and 503 errors with guided diagnostics</li>
                  <li>Includes validation scripts to verify your integration end-to-end</li>
                </ul>
              </div>
              <div className="rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] p-4">
                <h3 className="text-sm font-semibold text-zinc-200 mb-2">What&apos;s inside</h3>
                <ul className="text-sm text-zinc-400 space-y-1.5">
                  <li><code className="text-zinc-300 font-mono text-xs">SKILL.md</code> — skill definition with 5 guided workflows</li>
                  <li><code className="text-zinc-300 font-mono text-xs">scripts/validate-integration.mjs</code> — end-to-end connectivity test</li>
                  <li><code className="text-zinc-300 font-mono text-xs">scripts/diagnose.mjs</code> — 5-phase platform diagnostics</li>
                  <li><code className="text-zinc-300 font-mono text-xs">references/</code> — API surface, architecture, and troubleshooting docs</li>
                </ul>
              </div>
            </div>

            <div className="rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] p-4 mb-5">
              <h3 className="text-sm font-semibold text-zinc-200 mb-3">Setup</h3>
              <ol className="list-decimal list-inside text-sm text-zinc-400 space-y-2">
                <li>Download and extract the zip into your project&apos;s <code className="text-zinc-300 font-mono text-xs">.claude/skills/</code> directory</li>
                <li>
                  Verify the structure:
                  <pre className="mt-1.5 bg-[#0a0a0a] rounded-lg px-3 py-2 text-xs text-zinc-400 font-mono overflow-x-auto">{`.claude/skills/dashclaw-platform-intelligence/
├── SKILL.md
├── scripts/
│   ├── validate-integration.mjs
│   ├── diagnose.mjs
│   └── bootstrap-agent-quick.mjs
└── references/
    ├── platform-knowledge.md
    ├── api-surface.md
    └── troubleshooting.md`}</pre>
                </li>
                <li>Open Claude Code in your project and tell it what you need — the skill activates automatically</li>
              </ol>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/downloads/dashclaw-platform-intelligence.zip"
                download
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors"
              >
                <Download size={16} /> Download Skill
              </a>
              <span className="text-xs text-zinc-500">~22 KB · works with any Claude Code project</span>
            </div>
          </div>

          {/* Divider */}
          <div className="relative py-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(255,255,255,0.06)]"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0a0a0a] px-4 text-sm text-zinc-500">Alternative: Local Setup</span>
            </div>
          </div>

          <div className="rounded-xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Server size={18} className="text-zinc-400" />
              <h3 className="text-base font-semibold text-zinc-200">Run locally with Docker</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
              The installer generates secrets, writes .env.local, installs dependencies, and prints the API key your agents should use.
            </p>
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
          </div>

          {/* Verified agents */}
          <StepCard
            n="5"
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
          </StepCard>
        </div>
      </section>
    </div>
  );
}
