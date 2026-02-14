'use client';

import Link from 'next/link';
import { CheckCircle2, Clock3, ShieldCheck, Workflow, Radio } from 'lucide-react';

const STATUS_ITEMS = [
  {
    title: 'Data Access Convergence',
    detail: 'Repository migration, contract tests, route-level SQL CI guard, and p95 regression evidence checks are complete.',
    state: 'complete',
    href: '/actions',
  },
  {
    title: 'API Contract Governance',
    detail: 'OpenAPI drift checks + API maturity inventory gates',
    state: 'complete',
    href: '/docs',
  },
  {
    title: 'Realtime Reliability',
    detail: 'Broker-backed SSE with replay support, replay reliability hotfix, and cutover health checks.',
    state: 'complete',
    href: '/security',
  },
  {
    title: 'Documentation Governance',
    detail: 'Canonical doc hierarchy, metadata coverage, and CI doc validation checks',
    state: 'complete',
    href: '/docs#platform-overview',
  },
  {
    title: 'SDK Core Parity',
    detail: 'Node + Python parity complete for critical domains, including cross-SDK integration suite and CI gates.',
    state: 'complete',
    href: '/docs',
  },
];

function StateBadge({ state }) {
  if (state === 'complete') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
        <CheckCircle2 size={12} />
        Complete
      </span>
    );
  }
  if (state === 'partial') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-400">
        <Clock3 size={12} />
        Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-400">
      <Clock3 size={12} />
      In Progress
    </span>
  );
}

export default function PlatformStatusCard() {
  return (
    <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-surface-secondary p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">Platform Convergence</p>
          <h2 className="mt-1 flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <ShieldCheck size={16} className="text-brand" />
            Reliability Controls + SDK Parity Status
          </h2>
        </div>
        <Link
          href="/docs#platform-overview"
          className="inline-flex items-center gap-1 rounded-md border border-[rgba(255,255,255,0.1)] px-2.5 py-1 text-xs text-zinc-300 hover:text-white"
        >
          <Workflow size={12} />
          Details
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {STATUS_ITEMS.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111] p-3 transition-colors hover:border-[rgba(255,255,255,0.16)]"
          >
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-zinc-100">{item.title}</span>
              <StateBadge state={item.state} />
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">{item.detail}</p>
          </Link>
        ))}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
        <Radio size={12} />
        Execution tracking source: RFC platform convergence status (updated February 14, 2026).
      </p>
    </section>
  );
}
