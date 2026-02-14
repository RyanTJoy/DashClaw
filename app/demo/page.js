import Link from 'next/link';
import { ArrowRight, ShieldAlert, Terminal, CheckCircle2, XCircle, Activity } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import { getDemoSnapshot } from '../lib/demo/demoData';

export const metadata = {
  title: 'DashClaw Live Demo',
  description: 'A read-only sandbox showing what DashClaw looks like with 50+ agents online.',
};

function StatusPill({ status }) {
  const map = {
    active: { label: 'Active', cls: 'bg-[rgba(34,197,94,0.12)] text-green-300 border-[rgba(34,197,94,0.25)]' },
    idle: { label: 'Idle', cls: 'bg-[rgba(59,130,246,0.12)] text-blue-300 border-[rgba(59,130,246,0.25)]' },
    degraded: { label: 'Degraded', cls: 'bg-[rgba(234,179,8,0.12)] text-yellow-300 border-[rgba(234,179,8,0.25)]' },
    offline: { label: 'Offline', cls: 'bg-[rgba(239,68,68,0.12)] text-red-300 border-[rgba(239,68,68,0.25)]' },
  };
  const s = map[status] || { label: status, cls: 'bg-[#111] text-zinc-300 border-[rgba(255,255,255,0.08)]' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function VerifiedIcon({ verified }) {
  if (verified) return <CheckCircle2 size={16} className="text-green-400" aria-label="Verified" />;
  return <XCircle size={16} className="text-zinc-600" aria-label="Unverified" />;
}

function Card({ title, value, hint, icon: Icon }) {
  return (
    <div className="rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
        </div>
        {Icon && (
          <div className="h-10 w-10 rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center">
            <Icon size={18} className="text-brand" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function DemoPage() {
  const { totals, agents, actions } = getDemoSnapshot();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PublicNavbar />

      <section className="pt-28 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-xl border border-[rgba(249,115,22,0.25)] bg-[rgba(249,115,22,0.06)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-9 w-9 rounded-lg bg-[rgba(249,115,22,0.12)] flex items-center justify-center">
                <ShieldAlert size={18} className="text-brand" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">Live Demo (read-only)</p>
                <p className="text-xs text-zinc-400">
                  This is fake data. The demo does not accept agent connections or store secrets.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/self-host"
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium hover:bg-brand-hover transition-colors"
              >
                Self-Host in Minutes <ArrowRight size={16} />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.08)] px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-[#181818] hover:text-white transition-colors"
              >
                Docs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card title="Agents Online" value={`${totals.agents_online}/${totals.agents_total}`} hint="Includes idle + degraded" icon={Activity} />
            <Card title="Verified Agents" value={totals.verified_agents} hint="Optional signatures enabled" icon={CheckCircle2} />
            <Card title="Pending Pairings" value={totals.pending_pairings} hint="Approve-all scales to 50+ agents" icon={Terminal} />
            <Card title="Pending Approvals" value={totals.pending_approvals} hint="HITL queue for risky actions" icon={ShieldAlert} />
            <Card title="Cost Today" value={`$${totals.cost_today_usd}`} hint="Token + cost tracking" icon={Activity} />
          </div>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-100">Agents</p>
              <p className="text-xs text-zinc-500">Showing 50</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)] text-xs text-zinc-500">
                    <th className="text-left py-3 px-5 font-medium">Agent</th>
                    <th className="text-left py-3 px-5 font-medium">Status</th>
                    <th className="text-left py-3 px-5 font-medium">Verified</th>
                    <th className="text-right py-3 px-5 font-medium">Open Loops</th>
                    <th className="text-right py-3 px-5 font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <tr key={a.agent_id} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[#0d0d0d] transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex flex-col">
                          <span className="text-zinc-100 font-medium">{a.agent_name}</span>
                          <span className="text-xs text-zinc-500 font-mono">{a.agent_id}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5"><StatusPill status={a.status} /></td>
                      <td className="py-3 px-5"><VerifiedIcon verified={a.verified} /></td>
                      <td className="py-3 px-5 text-right tabular-nums text-zinc-300">{a.open_loops}</td>
                      <td className="py-3 px-5 text-right tabular-nums">
                        <span className={a.risk_score >= 80 ? 'text-red-300' : a.risk_score >= 50 ? 'text-yellow-300' : 'text-zinc-300'}>
                          {a.risk_score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-100">Recent Actions</p>
              <p className="text-xs text-zinc-500">Last ~hour</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)] text-xs text-zinc-500">
                    <th className="text-left py-3 px-5 font-medium">Agent</th>
                    <th className="text-left py-3 px-5 font-medium">Type</th>
                    <th className="text-left py-3 px-5 font-medium">Status</th>
                    <th className="text-right py-3 px-5 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((a) => (
                    <tr key={a.action_id} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[#0d0d0d] transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex flex-col">
                          <span className="text-zinc-100">{a.agent_name}</span>
                          <span className="text-xs text-zinc-500 font-mono">{a.agent_id}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5 font-mono text-xs text-brand">{a.action_type}</td>
                      <td className="py-3 px-5">
                        <span className={
                          a.status === 'completed' ? 'text-green-300' :
                          a.status === 'running' ? 'text-blue-300' :
                          'text-red-300'
                        }>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right tabular-nums text-zinc-300">${a.cost_usd.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

