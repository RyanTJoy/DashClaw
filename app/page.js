import Link from 'next/link';
import {
  Flame, Zap, ShieldAlert, Shield, CircleDot, Eye, ArrowRight, Github,
  ExternalLink, BookOpen, FolderKanban, MessageSquare, ArrowLeftRight,
  Brain, ScanSearch, HeartPulse, Newspaper, Package, UsersRound,
  Webhook, Clock, Compass, Building2, CreditCard, Check, BarChart3,
} from 'lucide-react';
import WaitlistForm from './components/WaitlistForm';

/* ─── data ─── */

const coreFeatures = [
  {
    icon: Zap,
    title: 'Action Recording & Audit Trail',
    description: 'Every agent action logged with type, goal, risk score, status, outcome, and systems touched. Full post-mortem with root-cause tracing.',
  },
  {
    icon: ShieldAlert,
    title: '7 Risk Signals',
    description: 'Automatic detection of autonomy spikes, repeated failures, stale loops, assumption drift, and more. No configuration required.',
  },
  {
    icon: FolderKanban,
    title: 'Agent Workspace',
    description: 'Session handoffs, context threads, key points, automation snippets, user preferences, and daily digests in one tabbed interface.',
  },
  {
    icon: Shield,
    title: 'Behavior Guard',
    description: 'Agents check in before risky actions. Set risk thresholds, require approvals, and block dangerous operations — without changing agent code.',
  },
];

const platformFeatures = [
  { icon: ArrowLeftRight, title: 'Session Handoffs', description: 'Structured handoff documents for continuity between agent sessions.' },
  { icon: Brain, title: 'Context Manager', description: 'Capture key points and organize context into threads for long-running topics.' },
  { icon: CircleDot, title: 'Open Loop Tracking', description: 'Track unresolved dependencies, pending approvals, and blockers across agents.' },
  { icon: Eye, title: 'Assumption Monitoring', description: 'Log what agents assume, validate or invalidate, and catch drift early.' },
  { icon: ScanSearch, title: 'Security Scanning', description: '18 regex patterns detect API keys, tokens, and PII before data leaves your system.' },
  { icon: HeartPulse, title: 'Memory Health', description: 'Track memory file counts, duplicates, stale facts, entities, and topics over time.' },
  { icon: Newspaper, title: 'Daily Digest', description: 'Aggregated daily summary from actions, decisions, lessons, content, and goals.' },
  { icon: Package, title: '57-Method SDK', description: 'Zero-dependency npm package. ESM + CJS. Drop into any Node.js agent in minutes.' },
];

const operationalFeatures = [
  { icon: UsersRound, title: 'Team Management', description: 'Invite links, role-based access (admin/member), and workspace isolation.' },
  { icon: Webhook, title: 'Webhooks & Alerts', description: 'HMAC-signed webhook delivery plus email alerts via Resend for signal notifications.' },
  { icon: Clock, title: 'Activity Audit Log', description: 'Every admin action logged — key creation, invites, role changes, billing events.' },
  { icon: Compass, title: 'Guided Onboarding', description: '4-step checklist: create workspace, generate key, install SDK, send first action.' },
  { icon: Building2, title: 'Multi-Tenant', description: 'Full org isolation with API key scoping, per-agent settings, and org management.' },
  { icon: CreditCard, title: 'Billing & Plans', description: 'Free, Pro, and Team tiers with usage metering and Stripe Checkout integration.' },
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

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with one agent.',
    features: ['100 actions/month', '1 agent', '2 team members', '2 API keys', 'All dashboard pages', '7 risk signals'],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For teams running agents in production.',
    features: ['5,000 actions/month', '10 agents', '5 team members', '10 API keys', 'Webhooks & alerts', 'Activity audit log'],
    cta: 'Start Pro Trial',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$79',
    period: '/month',
    description: 'For organizations with agent fleets.',
    features: ['50,000 actions/month', 'Unlimited agents', '25 team members', '50 API keys', 'Priority support', 'Everything in Pro'],
    cta: 'Start Team Trial',
    highlighted: false,
  },
];

/* ─── page ─── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── 1. Navbar ── */}
      <nav className="fixed top-0 w-full z-50 border-b border-[rgba(255,255,255,0.06)] bg-[#0a0a0a]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Flame size={20} className="text-brand" />
            <span className="text-lg font-semibold">DashClaw</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#signals" className="hover:text-white transition-colors">Signals</a>
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link href="/login" className="px-4 py-1.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

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
            Real-time observability, risk signals, and behavior governance for autonomous AI agents.
            Guard what they do before they do it.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login" className="px-6 py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors inline-flex items-center gap-2">
              Get Started Free <ArrowRight size={16} />
            </Link>
            <Link href="/docs" className="px-6 py-2.5 rounded-lg bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] text-zinc-300 text-sm font-medium hover:bg-[#222] hover:text-white transition-colors inline-flex items-center gap-2">
              <BookOpen size={16} /> Read the Docs
            </Link>
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
              { step: '1', title: 'Install the SDK', code: 'npm install dashclaw', desc: 'Zero dependencies. Works with any Node.js agent.' },
              { step: '2', title: 'Initialize your agent', code: "const claw = new DashClaw({\n  apiKey: '...',\n  agentId: 'my-agent',\n})", desc: 'One constructor. Your API key scopes all data.' },
              { step: '3', title: 'See it on the dashboard', code: "await claw.createAction({\n  action_type: 'deploy',\n  declared_goal: 'Ship auth',\n})", desc: 'Actions, signals, and loops appear instantly.' },
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
      <section id="sdk" className="py-20 px-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.2)] text-brand text-xs font-medium mb-4">
                <Package size={12} />
                57 methods across 13 categories
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">One SDK. Full observability.</h2>
              <p className="mt-3 text-zinc-400 leading-relaxed">
                Install from npm. Zero dependencies. Works with any Node.js agent framework.
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
                apiKey: <span className="text-zinc-300">process.env.</span><span className="text-cyan-300">OPENCLAW_API_KEY</span>,
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
            <p className="mt-3 text-zinc-400 max-w-xl mx-auto">Team management, audit trails, webhooks, billing, and more — built in from day one.</p>
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

      {/* ── 8. Pricing ── */}
      <section id="pricing" className="py-20 px-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-3 text-zinc-400">Start free. Upgrade when your agent fleet grows.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`p-6 rounded-xl border ${
                  plan.highlighted
                    ? 'bg-[#111] border-brand/40 ring-1 ring-brand/20'
                    : 'bg-[#111] border-[rgba(255,255,255,0.06)]'
                }`}
              >
                {plan.highlighted && (
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-brand bg-brand/10 uppercase tracking-wider mb-3">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-zinc-500">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{plan.description}</p>
                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                      <Check size={14} className="text-brand flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`mt-6 block text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-brand text-white hover:bg-brand-hover'
                      : 'bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] text-zinc-300 hover:bg-[#222] hover:text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
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
            Install the SDK, send your first action, and see signals on the dashboard. Free forever for small teams.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login" className="px-6 py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors inline-flex items-center gap-2">
              Get Started Free <ArrowRight size={16} />
            </Link>
            <Link href="/docs" className="px-6 py-2.5 rounded-lg bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] text-zinc-300 text-sm font-medium hover:bg-[#222] hover:text-white transition-colors inline-flex items-center gap-2">
              <BookOpen size={16} /> Read the Docs
            </Link>
          </div>
          <div id="waitlist" className="mt-10 pt-8 border-t border-[rgba(255,255,255,0.06)]">
            <p className="text-sm text-zinc-500 mb-3">Want early access to upcoming features?</p>
            <WaitlistForm />
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
            <a href="https://github.com/ucsandman/OpenClaw-Pro" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
              <Github size={14} />
              GitHub
            </a>
            <Link href="/docs" className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
              <BookOpen size={14} />
              Docs
            </Link>
            <a href="#pricing" className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
              <BarChart3 size={14} />
              Pricing
            </a>
            <Link href="/dashboard" className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
              <ExternalLink size={14} />
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
