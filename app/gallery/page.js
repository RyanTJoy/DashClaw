'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
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
  const [selectedIndex, setSelectedIndex] = useState(null);

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev === null ? null : (prev + 1) % screenshots.length));
  }, []);

  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) => (prev === null ? null : (prev - 1 + screenshots.length) % screenshots.length));
  }, []);

  const handleClose = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedIndex === null) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, handleNext, handlePrev, handleClose]);

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
            <p className="text-zinc-400 mt-1">A visual tour of the DashClaw observability platform.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {screenshots.map((s, index) => (
            <div 
              key={s.file} 
              className="group flex flex-col gap-3 cursor-zoom-in"
              onClick={() => setSelectedIndex(index)}
            >
              <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.06)] bg-[#111]">
                <Image
                  src={`/images/screenshots/${s.file}`}
                  alt={s.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transform group-hover:scale-[1.02] transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20">
                    <Maximize2 size={20} />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                <p className="text-sm text-zinc-400 mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Lightbox Modal */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-10">
          <button 
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors z-[110]"
          >
            <X size={24} />
          </button>

          <button 
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors z-[110]"
          >
            <ChevronLeft size={32} />
          </button>

          <button 
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors z-[110]"
          >
            <ChevronRight size={32} />
          </button>

          <div className="relative w-full max-w-5xl aspect-[16/10] flex items-center justify-center">
            <Image
              src={`/images/screenshots/${screenshots[selectedIndex].file}`}
              alt={screenshots[selectedIndex].title}
              fill
              sizes="100vw"
              className="object-contain rounded-lg shadow-2xl"
            />
          </div>

          <div className="mt-8 text-center max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-2xl font-bold">{screenshots[selectedIndex].title}</h2>
            <p className="text-zinc-400 mt-2">{screenshots[selectedIndex].desc}</p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-500">
              {selectedIndex + 1} of {screenshots.length} • Use arrow keys to navigate
            </div>
          </div>
        </div>
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
            <Link href="/dashboard" className="hover:text-zinc-300">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
