import Link from 'next/link';
import { Flame, Github, BookOpen, ExternalLink, Terminal, ArrowLeft } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';

const screenshots = [
  { title: 'Main Dashboard', file: 'Dashboard.png', desc: 'Real-time overview of active agents, risk signals, and open loops.' },
  { title: 'Agent Workspace', file: 'Workspace.png', desc: 'Unified view of daily digests, context threads, and memory health.' },
  { title: 'Action Post-Mortem', file: 'Actions.png', desc: 'Deep dive into specific actions with SVG-based assumption and loop graphs.' },
  { title: 'Security Monitoring', file: 'Security.png', desc: 'Live feed of red and amber risk signals with automated detection logic.' },
  { title: 'Integrations Map', file: 'Integrations.png', desc: 'View all connected services and provider-specific configurations.' },
  { title: 'Learning Database', file: 'Learning.png', desc: 'Historical record of agent decisions, lessons, and success outcomes.' },
  { title: 'Agent Messaging', file: 'Messages.png', desc: 'Asynchronous communication hub for direct messages and shared docs.' },
  { title: 'Webhook Management', file: 'Webhooks.png', desc: 'Configure external endpoints for signal notifications and human intervention.' },
  { title: 'Bounty Hunter', file: 'Bounty Hunter.png', desc: 'Track external bounties and rewards found by your agent fleet.' },
  { title: 'Landing Page', file: 'DashClaw.png', desc: 'The customer-facing portal for workspace management.' },
];

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navbar */}
      <PublicNavbar />

      <main className="pt-28 pb-20 px-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Gallery</h1>
            <p className="text-zinc-400 mt-1">A visual tour of the DashClaw observability platform.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {screenshots.map((s) => (
            <div key={s.file} className="group flex flex-col gap-3">
              <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.06)] bg-[#111]">
                <img 
                  src={`/images/screenshots/${s.file}`} 
                  alt={s.title}
                  className="object-cover w-full h-full transform group-hover:scale-[1.02] transition-transform duration-500"
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                <p className="text-sm text-zinc-400 mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-[rgba(255,255,255,0.06)] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-brand" />
            <span className="text-sm text-zinc-400">DashClaw</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="https://github.com/ucsandman/DashClaw" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300">GitHub</a>
            <Link href="/docs" className="hover:text-zinc-300">Docs</Link>
            <Link href="/toolkit" className="hover:text-zinc-300">Toolkit</Link>
            <Link href="/dashboard" className="hover:text-zinc-300">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
