import Link from 'next/link';
import {
  Flame, Zap, ShieldAlert, CircleDot, Eye, Users, Code2,
  ArrowRight, Github, ExternalLink, BookOpen,
} from 'lucide-react';
import WaitlistForm from './components/WaitlistForm';

const features = [
  {
    icon: Zap,
    title: 'Action Recording',
    description: 'Every agent action logged with type, goal, status, outcome, and systems touched. Full audit trail.',
  },
  {
    icon: ShieldAlert,
    title: 'Risk Signals',
    description: 'Seven signal types detect autonomy spikes, repeated failures, stale loops, and assumption drift automatically.',
  },
  {
    icon: CircleDot,
    title: 'Open Loop Tracking',
    description: 'Track unresolved dependencies, pending approvals, and waiting-on-external items across all agents.',
  },
  {
    icon: Eye,
    title: 'Assumption Monitoring',
    description: 'Log what your agents assume, validate or invalidate, and catch drift before it causes failures.',
  },
  {
    icon: Users,
    title: 'Multi-Agent Support',
    description: 'Filter by agent, compare behavior, and see cross-agent patterns. Built for teams running multiple agents.',
  },
  {
    icon: Code2,
    title: 'Zero-Dep SDK',
    description: 'Single-file ESM SDK. No dependencies. Drop it into any Node.js agent in under 5 minutes.',
  },
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-[rgba(255,255,255,0.06)] bg-[#0a0a0a]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Flame size={20} className="text-brand" />
            <span className="text-lg font-semibold">OpenClaw</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#sdk" className="hover:text-white transition-colors">Integration</a>
            <a href="#signals" className="hover:text-white transition-colors">Signals</a>
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block">
              Sign In
            </Link>
            <a href="#waitlist" className="px-4 py-1.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
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
            Real-time observability, risk signals, and operational control for autonomous AI agents.
            Know when they drift, fail silently, or act without oversight.
          </p>
          <div id="waitlist" className="mt-8 flex justify-center">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Everything you need to trust your agents</h2>
            <p className="mt-3 text-zinc-400 max-w-xl mx-auto">Built for teams running autonomous AI agents in production.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => {
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

      {/* SDK Showcase */}
      <section id="sdk" className="py-20 px-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Integrate in 5 minutes</h2>
              <p className="mt-3 text-zinc-400 leading-relaxed">
                Zero-dependency ESM SDK. Import it, configure your agent ID, and start recording actions.
                Works with any Node.js agent framework.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="px-3 py-1 rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] text-xs text-zinc-300">Node.js</span>
                <span className="px-3 py-1 rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] text-xs text-zinc-300">ESM</span>
                <span className="px-3 py-1 rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] text-xs text-zinc-300">Zero Dependencies</span>
                <span className="px-3 py-1 rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] text-xs text-zinc-300">REST API</span>
              </div>
              <Link href="/docs" className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-hover transition-colors">
                View full SDK docs <ArrowRight size={14} />
              </Link>
            </div>
            <div className="rounded-xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] p-5 font-mono text-sm overflow-x-auto">
              <div className="text-zinc-500 mb-3">{'// instrument your agent'}</div>
              <div>
                <span className="text-purple-400">import</span>
                <span className="text-zinc-300"> {'{ OpenClawAgent }'} </span>
                <span className="text-purple-400">from</span>
                <span className="text-green-400"> &apos;./openclaw-agent.js&apos;</span>
              </div>
              <div className="mt-3">
                <span className="text-purple-400">const</span>
                <span className="text-zinc-300"> claw = </span>
                <span className="text-purple-400">new</span>
                <span className="text-yellow-300"> OpenClawAgent</span>
                <span className="text-zinc-300">({'{'}</span>
              </div>
              <div className="text-zinc-300 pl-4">
                baseUrl: <span className="text-green-400">&apos;https://your-dashboard.vercel.app&apos;</span>,
              </div>
              <div className="text-zinc-300 pl-4">
                apiKey: <span className="text-zinc-300">process.env.</span><span className="text-cyan-300">OPENCLAW_API_KEY</span>,
              </div>
              <div className="text-zinc-300 pl-4">
                agentId: <span className="text-green-400">&apos;my-agent&apos;</span>,
              </div>
              <div className="text-zinc-300">{'})'}</div>
              <div className="mt-3 text-zinc-500">{'// record an action'}</div>
              <div>
                <span className="text-purple-400">const</span>
                <span className="text-zinc-300"> action = </span>
                <span className="text-purple-400">await</span>
                <span className="text-zinc-300"> claw.</span>
                <span className="text-yellow-300">createAction</span>
                <span className="text-zinc-300">({'{'}</span>
              </div>
              <div className="text-zinc-300 pl-4">
                type: <span className="text-green-400">&apos;build&apos;</span>,
              </div>
              <div className="text-zinc-300 pl-4">
                goal: <span className="text-green-400">&apos;Deploy authentication service&apos;</span>,
              </div>
              <div className="text-zinc-300">{'})'}</div>
              <div className="mt-3 text-zinc-500">{'// update when done'}</div>
              <div>
                <span className="text-purple-400">await</span>
                <span className="text-zinc-300"> claw.</span>
                <span className="text-yellow-300">updateOutcome</span>
                <span className="text-zinc-300">(action.action_id, {'{'}</span>
              </div>
              <div className="text-zinc-300 pl-4">
                status: <span className="text-green-400">&apos;completed&apos;</span>,
              </div>
              <div className="text-zinc-300 pl-4">
                output: <span className="text-green-400">&apos;Auth service deployed to prod&apos;</span>,
              </div>
              <div className="text-zinc-300">{'})'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Signals Showcase */}
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

      {/* Bottom CTA */}
      <section className="py-20 px-6 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to see inside the black box?
          </h2>
          <p className="mt-3 text-zinc-400">Join the waitlist. Early access is limited.</p>
          <div className="mt-8 flex justify-center">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.06)] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-brand" />
            <span className="text-sm text-zinc-400">OpenClaw Pro</span>
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
