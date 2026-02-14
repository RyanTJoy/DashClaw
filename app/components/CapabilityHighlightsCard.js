'use client';

import Link from 'next/link';
import {
  Brain,
  Shield,
  FileCheck2,
  Package,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';

const HIGHLIGHTS = [
  {
    icon: Brain,
    title: 'Adaptive Learning Loop',
    detail: 'Action scoring, recommendation synthesis, telemetry events, metrics, and recommendation enable/disable controls.',
    href: '/learning',
  },
  {
    icon: Shield,
    title: 'Route SQL Guardrails',
    detail: 'Critical-path SQL drift checks and repository contract tests are enforced for safer data-layer changes.',
    href: '/docs',
  },
  {
    icon: FileCheck2,
    title: 'API Contract Governance',
    detail: 'OpenAPI drift detection and API inventory checks prevent silent contract regressions.',
    href: '/docs',
  },
  {
    icon: Package,
    title: 'Cross-SDK Contract Harness',
    detail: 'Node and Python parity is validated through shared critical-contract integration fixtures.',
    href: '/docs',
  },
  {
    icon: RefreshCw,
    title: 'Learning Automation',
    detail: 'Backfill and recommendation rebuild cron endpoints keep adaptive models fresh over time.',
    href: '/learning',
  },
];

export default function CapabilityHighlightsCard() {
  return (
    <Card hover={false}>
      <CardHeader title="Shipped Platform Capabilities" icon={FileCheck2} />
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-surface-tertiary p-3 hover:border-[rgba(255,255,255,0.16)] transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className="text-brand" />
                  <span className="text-xs font-semibold text-zinc-200">{item.title}</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{item.detail}</p>
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-brand">
                  View
                  <ArrowRight size={11} />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
