'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import ImageLightbox from '../components/ImageLightbox';
import Image from 'next/image';
import { useMemo, useState } from 'react';

const screenshots = [
  { title: 'Mission Control', file: 'Mission Control.png', desc: 'Strategic overview: fleet health, risk signals, cost velocity, and activity timeline.' },
  { title: 'Dashboard', file: 'Dashboard.png', desc: 'Fleet-wide overview: live actions, risk, governance, and agent context.' },
  { title: 'Swarm Intelligence', file: 'Swarm Intelligence.png', desc: 'Visualize multi-agent communication and operational risk.' },
  { title: 'Workspace', file: 'workspace.png', desc: 'Daily digest, context threads, snippets, preferences, and memory.' },
  { title: 'Actions', file: 'actions.png', desc: 'Timeline of actions with drill-down, trace, and identity verification.' },
  { title: 'Approval Queue', file: 'approval.png', desc: 'Human-in-the-loop approvals for high-risk operations.' },
  { title: 'Policies', file: 'policies.png', desc: 'Behavior governance: allow, warn, block, or require approval.' },
  { title: 'Messages', file: 'messages.png', desc: 'Agent-to-agent messaging plus shared docs.' },

  { title: 'Task Routing', file: 'Task Routing.png', desc: 'Skill-based agent matching, load balancing, and queue management.' },
  { title: 'Compliance', file: 'Compliance.png', desc: 'Framework mapping, gap analysis, and audit-ready reports.' },
  { title: 'Token Budget', file: 'Token Budget.png', desc: 'Cost-per-decision tracking and burn rate by goal.' },
  { title: 'Security', file: 'security.png', desc: 'Security posture, scanning, and integrity signals.' },

  { title: 'Activity', file: 'activity.png', desc: 'Audit trail of changes across the workspace.' },
  { title: 'Webhooks', file: 'webhooks.png', desc: 'External alerting hooks with delivery logs.' },
  { title: 'Workflows', file: 'workflows.png', desc: 'Automations, schedules, and execution history.' },
  { title: 'Learning', file: 'learning.png', desc: 'Lessons, recommendations, and effectiveness metrics.' },

  { title: 'Integrations', file: 'integrations.png', desc: 'Connected services and provider configuration.' },
  { title: 'Relationships', file: 'relationships.png', desc: 'Contacts, follow-ups, and relationship activity.' },
  { title: 'Goals', file: 'goals.png', desc: 'Goal tracking and milestone progress.' },
  { title: 'Content', file: 'content.png', desc: 'Content tracker for multi-agent publishing workflows.' },
  { title: 'Calendar', file: 'calendar.png', desc: 'Events and schedule visibility.' },
  { title: 'API Keys', file: 'api-keys.png', desc: 'Create and manage scoped API keys.' },
  { title: 'Bug Hunter', file: 'Bug Hunter.png', desc: 'Automated platform quality scanner.' },
];

export default function GalleryPage() {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const items = useMemo(() => {
    return screenshots.map((s) => ({
      src: `/images/screenshots/${encodeURIComponent(s.file)}`,
      alt: s.title,
      title: s.title,
      description: s.desc,
    }));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PublicNavbar />

      <main className="pt-28 pb-20 px-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Gallery</h1>
            <p className="text-zinc-400 mt-1">Click any image to view fullscreen. Use ← → keys or the arrows to browse. Click anywhere to close.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {screenshots.map((s, idx) => {
            const encoded = encodeURIComponent(s.file);
            return (
              <button
                key={s.file}
                className="group flex flex-col gap-3 text-left cursor-zoom-in"
                onClick={() => setSelectedIndex(idx)}
              >
                <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[#111]">
                  <Image
                    src={`/images/screenshots/${encoded}`}
                    alt={s.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transform group-hover:scale-[1.01] transition-transform duration-500"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{s.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {selectedIndex !== null && (
        <ImageLightbox
          items={items}
          index={selectedIndex}
          onChangeIndex={setSelectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      )}

      <footer className="border-t border-[rgba(255,255,255,0.06)] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">DC</span>
            </div>
            <span className="text-sm text-zinc-400">DashClaw</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="https://github.com/ucsandman/DashClaw" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300">GitHub</a>
            <Link href="/docs" className="hover:text-zinc-300">Docs</Link>
            <Link href="/toolkit" className="hover:text-zinc-300">Toolkit</Link>
            <Link href="/gallery" className="hover:text-zinc-300">Gallery</Link>
            <Link href="/self-host" className="hover:text-zinc-300">Get Started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
