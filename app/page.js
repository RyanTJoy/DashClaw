import Link from 'next/link';
import {
  Flame, Zap, ShieldAlert, Shield, CircleDot, Eye, ArrowRight, Github,
  ExternalLink, BookOpen, FolderKanban, MessageSquare, ArrowLeftRight,
  Brain, ScanSearch, HeartPulse, Newspaper, Package, UsersRound,
  Webhook, Clock, Compass, Building2, Terminal, BarChart3,
} from 'lucide-react';
import PublicNavbar from './components/PublicNavbar';
import ImageCarousel from './components/ImageCarousel';

/* ─── data ─── */

const coreFeatures = [
  {
    icon: Zap,
    title: 'Real-Time Flight Recorder',
    description: 'Watch your agents think and act live. Server-Sent Events (SSE) stream actions, signals, and costs directly to your mission control dashboard.',
  },
  {
    icon: Shield,
    title: 'Behavioral AI Guardrails',
    description: 'Advanced anomaly detection using vector embeddings (pgvector). Detect outlier agent behavior that hard-coded rules might miss.',
  },
  {
    icon: BarChart3,
    title: 'Token & Cost Analytics',
    description: 'Real-time financial tracking. See "Cost per Goal" and "Burn Rate" for every model (GPT-4o, Claude 3.5, etc.) instantly.',
  },
  {
    icon: ShieldAlert,
    title: 'Behavior Governance',
    description: 'Enforce safety with logic rules (rate limits) or semantic natural language policies ("Never access production secrets").',
  },
];

const platformFeatures = [
  { icon: Package, title: 'Node.js & Python SDKs', description: 'Zero-dependency clients for both ecosystems. Native adapters for CrewAI, AutoGen, and LangChain.' },
  { icon: ShieldAlert, title: 'HITL Governance', description: 'Real-time Approval Queue. Agents pause and wait for human sign-off on sensitive operations.' },
  { icon: Shield, title: 'Identity Binding', description: 'Optional RSA signature verification binds actions to an approved agent identity.' },
  { icon: Brain, title: 'Memory Health', description: 'Proactive maintenance engine identifies stale facts and sends corrective messages to agents.' },
  { icon: ScanSearch, title: 'DLP & Redaction', description: 'Automatic secret redaction (OpenAI, AWS, GitHub) in messages and handoffs before data is stored.' },
  { icon: ArrowLeftRight, title: 'Session Handoffs', description: 'Structured handoff documents for continuity between agent sessions.' },
  { icon: CircleDot, title: 'Open Loop Tracking', description: 'Track unresolved dependencies, pending approvals, and blockers across agents.' },
  { icon: Eye, title: 'Assumption Monitoring', description: 'Log what agents assume, validate or invalidate, and catch drift early.' },
];

const operationalFeatures = [
  { icon: UsersRound, title: 'Team Management', description: 'Invite links, role-based access (admin/member), and workspace isolation.' },
  { icon: Webhook, title: 'Webhooks & Alerts', description: 'HMAC-signed webhook delivery plus email alerts via Resend for signal notifications.' },
  { icon: Clock, title: 'Activity Audit Log', description: 'Every admin action logged — key creation, invites, role changes, and usage activity.' },
  { icon: Compass, title: 'Guided Onboarding', description: '4-step checklist: create workspace, generate key, install SDK, send first action.' },
  { icon: Building2, title: 'Multi-Tenant', description: 'Full org isolation with API key scoping, per-agent settings, and org management.' },
  { icon: Terminal, title: 'Agent Tools', description: '20+ Python CLI tools for local ops with optional --push sync to the dashboard.' },
];

const signals = [
  { name: 'Autonomy Spike', description: 'Agent taking too many actions without human checkpoints' },
  { name: 'High Impact, Low Oversight', description: 'Critical actions without sufficient review' },
  { name: 'Repeated Failures', description: 'Same action type failing multiple times' },
  { name: 'Stale Loop', description: 'Open loops unresolved past their expected timeline' },
  { name: 'Assumption Drift', description: 'Assumptions becoming stale or contradicted by outcomes' },
  { name: 'Stale Assumption', description: 'Assumptions not validated within expected timeframe' },
  { name: 'Stale Running Action', description: 'Actions stuck in running state for over 4 hours' },
];

const agentToolCategories = [
  { title: 'Learning & Decisions', desc: 'Log decisions, lessons, and outcomes. Track what worked and why.', example: 'learner.py log "Used JWT" --push' },
  { title: 'Context & Handoffs', desc: 'Key points, threads, and session continuity documents.', example: 'context.py capture "Dark theme" --push' },
  { title: 'Memory & Health', desc: 'Scan memory files, track entities, detect stale facts.', example: 'scanner.py scan ~/.agent/memory --push' },
  { title: 'Goals & Relationships', desc: 'Goal milestones, contacts, interactions, and follow-ups.', example: 'goals.py add "Ship auth" --push' },
  { title: 'Security & Audit', desc: 'Outbound content filtering, session isolation, audit logging.', example: 'outbound_filter.py scan message.txt --push' },
  { title: 'Automation & Snippets', desc: 'Reusable code snippets with search, tags, and use tracking.', example: 'snippets.py add "retry logic" --push' },
];

const platformCoverage = [
  {
    icon: FolderKanban,
    title: 'Control Plane + Dashboard',
    description: 'Onboarding, team roles, approval queue, risk signals, live action views, and platform health cards.',
  },
  {
    icon: MessageSquare,
    title: 'API + Data Layer',
    description: 'Typed repository boundaries, route contract governance, maturity labels, and OpenAPI drift checks.',
  },
  {
    icon: Zap,
    title: 'Realtime Runtime',
    description: 'Broker-backed SSE fanout, reconnect with Last-Event-ID replay, and cutover health controls.',
  },
  {
    icon: Package,
    title: 'SDK + Tooling',
    description: 'Node and Python SDKs, CLI toolkit, parity test suites, and docs/CI governance.',
  },
];

const shippedHighlights = [
  {
    icon: Brain,
    title: 'Adaptive Learning Loop',
    description: 'Completed actions are scored into episodes, recommendations are synthesized per agent/action type, telemetry is captured, and effectiveness metrics are computed.',
    href: '/learning',
  },
  {
    icon: Shield,
    title: 'Route SQL Guardrails',
    description: 'Critical data-layer paths are protected by SQL drift checks and repository contract tests in CI.',
    href: '/docs',
  },
  {
    icon: MessageSquare,
    title: 'API Contract Governance',
    description: 'OpenAPI drift checks and API inventory maturity gates prevent silent contract regressions.',
    href: '/docs',
  },
  {
    icon: Package,
    title: 'Cross-SDK Contract Harness',
    description: 'Node and Python SDK critical paths are validated against shared contract fixtures.',
    href: '/docs',
  },
  {
    icon: Clock,
    title: 'Learning Loop Automation',
    description: 'Backfill and recommendation rebuild cron routes keep adaptive recommendation data fresh.',
    href: '/learning',
  },
];

const isMarketing = process.env.NEXT_PUBLIC_IS_MARKETING === 'true';

/* ─── page ─── */

export default function LandingPage() {
  const dashboardHref = isMarketing ? '/demo' : '/dashboard';
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── 1. Navbar ── */}
      <PublicNavbar />

      {/* ── 2. Hero ── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[rgba(249,115,22,0.3)] bg-[rgba(249,115,22,0.08)] text-brand text-xs font-medium mb-6">
            <ShieldAlert size={14} />
            Agent Observability Platform
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            See what your AI agents are{' '}
            <span className="text-brand">actually doing</span>.
          </h1>
          <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Open-source, self-hosted observability, risk signals, and behavior governance for autonomous AI agents.
            Guard what they do before they do it.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[#111] px-3 py-1 text-zinc-300">60+ SDK methods</span>
            <span className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[#111] px-3 py-1 text-zinc-300">Node + Python SDKs</span>
            <span className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[#111] px-3 py-1 text-zinc-300">SSE real-time stream</span>
            <span className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[#111] px-3 py-1 text-zinc-300">Behavior guardrails</span>
            <span className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[#111] px-3 py-1 text-zinc-300">Adaptive recommendation metrics</span>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={dashboardHref} className="px-6 py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors inline-flex items-center gap-2">
              Dashboard <ArrowRight size={16} />
            </Link>
            <Link href="/self-host" className="px-6 py-2.5 rounded-lg bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] text-zinc-300 text-sm font-medium hover:bg-[#222] hover:text-white transition-colors inline-flex items-center gap-2">
              <Terminal size={16} /> Get Started
            </Link>
            <Link href="/docs" className="px-6 py-2.5 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)] text-zinc-300 text-sm font-medium hover:bg-[#181818] hover:text-white transition-colors inline-flex items-center gap-2">
              <BookOpen size={16} /> Docs
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2.5 Dashboard Preview ── */}
      <section className="pb-20 px-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-6xl mx-auto pt-16">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
            <div className="lg:col-span-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">A dashboard you will actually use</h2>
              <p className="mt-3 text-zinc-400 leading-relaxed">
                One screen for actions, risk, approvals, messages, and fleet context. Click the screenshot to view fullscreen.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[#111] px-3 py-1 text-zinc-300">Realtime</span>
                <span className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[#111] px-3 py-1 text-zinc-300">HITL approvals</span>
                <span className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[#111] px-3 py-1 text-zinc-300">Guard policies</span>
                <span className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[#111] px-3 py-1 text-zinc-300">Swarm map</span>
              </div>
            </div>
            <div className="lg:col-span-3">
              <ImageCarousel
                items={[
                  { src: '/images/screenshots/dash1.png', title: 'Dashboard', description: 'Fleet-wide overview: live actions, risk, and governance.' },
                  { src: '/images/screenshots/swarm-intelligence.png', title: 'Swarm Intelligence', description: 'Multi-agent communication map + agent context.' },
                  { src: '/images/screenshots/approval.png', title: 'Approval Queue', description: 'Human-in-the-loop approvals for high-risk operations.' },
                  { src: '/images/screenshots/policies.png', title: 'Policies', description: 'Behavior governance: allow, warn, block, or require approval.' },
                  { src: '/images/screenshots/messages.png', title: 'Messages', description: 'Agent-to-agent messaging plus shared docs.' },
                  { src: '/images/screenshots/workflows.png', title: 'Workflows', description: 'Automations, schedules, and execution history.' },
                  { src: '/images/screenshots/learning.png', title: 'Learning', description: 'Lessons, recommendations, and effectiveness metrics.' },
                ]}
                autoRotateMs={4500}
                aspectClassName="aspect-[16/10]"
                sizes="(max-width: 1024px) 100vw, 60vw"
                priority
                imageClassName="object-cover"
                className="shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_30px_90px_rgba(0,0,0,0.55)]"
              />
              <div className="mt-3 text-right">
                <Link href="/gallery" className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
                  View full gallery →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. How It Works ── */}
      <section className="py-20 px-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Up and running in 5 minutes</h2>
            <p className="mt-3 text-zinc-400">Three steps from install to full agent observability.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Install the SDK', code: 'npm install dashclaw\n# or\npip install dashclaw', desc: 'Zero dependencies. Works with Node.js and Python agents.' },
              { step: '2', title: 'Initialize your agent', code: "const claw = new DashClaw({\n  apiKey: '...',\n  agentId: 'my-agent',\n})", desc: 'One constructor. Your API key scopes all data.' },
              { step: '3', title: 'See it live', code: "with claw.track(action='deploy'):\n  # ... actions stream to\n  # dashboard in real-time", desc: 'Actions, signals, and costs appear instantly via SSE.' },
            ].map((item) => (
              <div key={item.step} className="p-5 rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)]">
                <span className="w-7 h-7 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center mb-3">{item.step}</span>
                <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                <pre className="bg-[#0a0a0a] rounded-lg px-3 py-2.5 text-xs text-zinc-300 font-mono overflow-x-auto mb-3 whitespace-pre-wrap">{item.code}</pre>
                <p className="text-sm text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Features Grid ── */}
      <section id="features" className="py-20 px-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Everything you need to trust your agents</h2>
            <p className="mt-3 text-zinc-400 max-w-xl mx-auto">Built for teams running autonomous AI agents in production.</p>
          </div>

          {/* Core features — 2 col, larger */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {coreFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="p-6 rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center mb-4">
                    <Icon size={20} className="text-brand" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>

          {/* Platform features — 4 col, smaller */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {platformFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="p-4 rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center mb-3">
                    <Icon size={16} className="text-brand" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. SDK Showcase ── */}
      <section className="py-20 px-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Complete platform scope</h2>
            <p className="mt-3 text-zinc-400 max-w-2xl mx-auto">
              DashClaw is more than a dashboard. It is a full platform spanning control plane UX, APIs, data contracts,
              realtime transport, SDKs, and CI governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {platformCoverage.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111] p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(249,115,22,0.1)]">
                      <Icon size={18} className="text-brand" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-100">{item.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-400">{item.description}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111] p-5">
            <h3 className="text-base font-semibold text-zinc-100 mb-3">Production hardening shipped</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {shippedHighlights.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.title} href={item.href} className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0d0d0d] p-3 hover:border-[rgba(255,255,255,0.14)] transition-colors">
                    <div className="mb-1.5 flex items-center gap-2">
                      <Icon size={14} className="text-brand" />
                      <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                    </div>
                    <p className="text-xs leading-relaxed text-zinc-400">{item.description}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-brand">
                      Explore <ArrowRight size={11} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      <section id="sdk" className="py-20 px-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.2)] text-brand text-xs font-medium mb-4">
                <Package size={12} />
                60+ methods across 13 categories
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">One SDK. Full observability.</h2>
              <p className="mt-3 text-zinc-400 leading-relaxed">
                Install from npm or pip. Zero dependencies. Native adapters for <span className="text-zinc-200 font-semibold">CrewAI</span>, <span className="text-zinc-200 font-semibold">AutoGen</span>, and <span className="text-zinc-200 font-semibold">LangChain</span>.
                Actions, handoffs, context, snippets, messaging, security scanning, and more.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="px-3 py-1 rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] text-xs text-zinc-300">npm package</span>
                <span className="px-3 py-1 rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] text-xs text-zinc-300">Node.js</span>
                <span className="px-3 py-1 rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] text-xs text-zinc-300">ESM + CJS</span>
                <span className="px-3 py-1 rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] text-xs text-zinc-300">Zero Dependencies</span>
              </div>
              <Link href="/docs" className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-hover transition-colors">
                View full SDK docs <ArrowRight size={14} />
              </Link>
            </div>
            <div className="rounded-xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] p-5 font-mono text-sm overflow-x-auto">
              <div className="text-zinc-500 mb-3">{'// instrument your agent'}</div>
              <div>
                <span className="text-purple-400">import</span>
                <span className="text-zinc-300">{' { DashClaw } '}</span>
                <span className="text-purple-400">from</span>
                <span className="text-green-400"> &apos;dashclaw&apos;</span>
              </div>
              <div className="mt-3">
                <span className="text-purple-400">const</span>
                <span className="text-zinc-300"> claw = </span>
                <span className="text-purple-400">new</span>
                <span className="text-yellow-300"> DashClaw</span>
                <span className="text-zinc-300">({'{'}</span>
              </div>
              <div className="text-zinc-300 pl-4">
                apiKey: <span className="text-zinc-300">process.env.</span><span className="text-cyan-300">DASHCLAW_API_KEY</span>,
              </div>
              <div className="text-zinc-300 pl-4">
                agentId: <span className="text-green-400">&apos;my-agent&apos;</span>,
              </div>
              <div className="text-zinc-300">{'})'}</div>

              <div className="mt-4 text-zinc-500">{'// check guard before acting'}</div>
              <div>
                <span className="text-purple-400">const</span>
                <span className="text-zinc-300">{' { decision } = '}</span>
                <span className="text-purple-400">await</span>
                <span className="text-zinc-300"> claw.</span>
                <span className="text-yellow-300">guard</span>
                <span className="text-zinc-300">({'{'}</span>
              </div>
              <div className="text-zinc-300 pl-4">
                action_type: <span className="text-green-400">&apos;deploy&apos;</span>,
              </div>
              <div className="text-zinc-300 pl-4">
                risk_score: <span className="text-cyan-300">85</span>,
              </div>
              <div className="text-zinc-300">{'})'}</div>

              <div className="mt-4 text-zinc-500">{'// record an action'}</div>
              <div>
                <span className="text-purple-400">await</span>
                <span className="text-zinc-300"> claw.</span>
                <span className="text-yellow-300">createAction</span>
                <span className="text-zinc-300">({'{'}</span>
              </div>
              <div className="text-zinc-300 pl-4">
                action_type: <span className="text-green-400">&apos;deploy&apos;</span>,
              </div>
              <div className="text-zinc-300 pl-4">
                declared_goal: <span className="text-green-400">&apos;Ship auth service&apos;</span>,
              </div>
              <div className="text-zinc-300">{'})'}</div>

              <div className="mt-4 text-zinc-500">{'// create a session handoff'}</div>
              <div>
                <span className="text-purple-400">await</span>
                <span className="text-zinc-300"> claw.</span>
                <span className="text-yellow-300">createHandoff</span>
                <span className="text-zinc-300">({'{'}</span>
              </div>
              <div className="text-zinc-300 pl-4">
                summary: <span className="text-green-400">&apos;Completed auth system&apos;</span>,
              </div>
              <div className="text-zinc-300 pl-4">
                key_decisions: [<span className="text-green-400">&apos;JWT over sessions&apos;</span>],
              </div>
              <div className="text-zinc-300">{'})'}</div>

              <div className="mt-4 text-zinc-500">{'// bulk sync agent state'}</div>
              <div>
                <span className="text-purple-400">await</span>
                <span className="text-zinc-300"> claw.</span>
                <span className="text-yellow-300">syncState</span>
                <span className="text-zinc-300">({'{'} goals, learning, snippets {'}'})</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Signals Showcase ── */}
      <section id="signals" className="py-20 px-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">7 built-in risk signals</h2>
            <p className="mt-3 text-zinc-400 max-w-xl mx-auto">Automatic detection of problematic agent behavior. No configuration required.</p>
          </div>
          <div className="space-y-3">
            {signals.map((signal, i) => (
              <div key={signal.name} className="flex items-start gap-4 p-4 rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)]">
                <div className="w-7 h-7 rounded-lg bg-[rgba(239,68,68,0.1)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldAlert size={14} className="text-red-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{signal.name}</h3>
                    <span className="text-[10px] text-zinc-500 font-mono">SIGNAL-{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-0.5">{signal.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Platform Operations ── */}
      <section className="py-20 px-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Production-ready operations</h2>
            <p className="mt-3 text-zinc-400 max-w-xl mx-auto">Team management, audit trails, webhooks, and more — built in from day one.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {operationalFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="p-5 rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center mb-3">
                    <Icon size={18} className="text-brand" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 8. Agent Tools ── */}
      <section id="agent-tools" className="py-20 px-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.2)] text-brand text-xs font-medium mb-4">
              <Terminal size={12} />
              20+ Python CLI tools
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Local Agent Toolkit</h2>
            <p className="mt-3 text-zinc-400 max-w-xl mx-auto">
              Python CLI tools that run alongside your agent. Local-first with SQLite storage.
              Add <code className="text-zinc-300 font-mono">--push</code> to sync anything to your dashboard.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {agentToolCategories.map((cat) => (
              <div key={cat.title} className="p-5 rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-colors">
                <h3 className="text-base font-semibold text-white mb-1.5">{cat.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-3">{cat.desc}</p>
                <pre className="bg-[#0a0a0a] rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono overflow-x-auto">{cat.example}</pre>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/docs#agent-tools" className="inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-hover transition-colors">
              View full toolkit docs <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 9. Bottom CTA ── */}
      <section className="py-20 px-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Start monitoring in 5 minutes
          </h2>
          <p className="mt-3 text-zinc-400">
            Install the SDK, send your first action, and see signals on the dashboard. Open-source and self-hosted.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={dashboardHref} className="px-6 py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors inline-flex items-center gap-2">
              Dashboard <ArrowRight size={16} />
            </Link>
            <Link href="/self-host" className="px-6 py-2.5 rounded-lg bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] text-zinc-300 text-sm font-medium hover:bg-[#222] hover:text-white transition-colors inline-flex items-center gap-2">
              <Terminal size={16} /> Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* ── 10. Footer ── */}
      <footer className="border-t border-[rgba(255,255,255,0.06)] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-brand" />
            <span className="text-sm text-zinc-400">DashClaw</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <a href="https://github.com/ucsandman/DashClaw" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
              <Github size={14} />
              GitHub
            </a>
            <Link href="/docs" className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
              <BookOpen size={14} />
              Docs
            </Link>
            <Link href="/gallery" className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
              <Eye size={14} />
              Gallery
            </Link>
            <Link href="/toolkit" className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
              <Terminal size={14} />
              Toolkit
            </Link>
            <Link href={dashboardHref} className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
              <ExternalLink size={14} />
              Dashboard
            </Link>
            <Link href="/self-host" className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
              <ArrowRight size={14} />
              Get Started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
