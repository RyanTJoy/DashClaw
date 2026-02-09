'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket, Zap, Cloud, CheckCircle2, Lightbulb, PartyPopper } from 'lucide-react';

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'mode', title: 'Choose Mode' },
  { id: 'database', title: 'Database' },
  { id: 'deploy', title: 'Deploy' },
  { id: 'complete', title: 'Complete' }
];

export default function SetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState('welcome');
  const [setupMode, setSetupMode] = useState(null);
  const [databaseUrl, setDatabaseUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(null);

  const goToStep = (step) => setCurrentStep(step);
  const nextStep = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration: 'neon',
          credentials: { DATABASE_URL: databaseUrl }
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    }
    setTesting(false);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const neonSchema = `-- Run this in your Neon SQL Editor
-- Creates all tables needed for OpenClaw Dashboard

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  category TEXT DEFAULT 'general',
  encrypted BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS token_snapshots (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'org_default',
  agent_id TEXT,
  timestamp TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  context_used INTEGER,
  context_max INTEGER,
  context_pct REAL,
  hourly_pct_left REAL,
  weekly_pct_left REAL,
  compactions INTEGER,
  model TEXT,
  session_key TEXT
);

CREATE TABLE IF NOT EXISTS daily_totals (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'org_default',
  agent_id TEXT,
  date TEXT NOT NULL,
  total_tokens_in INTEGER DEFAULT 0,
  total_tokens_out INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  peak_context_pct REAL DEFAULT 0,
  snapshots_count INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_totals_org_agent_date_unique
ON daily_totals (org_id, COALESCE(agent_id, ''), date);

CREATE TABLE IF NOT EXISTS decisions (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  description TEXT,
  context TEXT,
  tags TEXT,
  outcome TEXT,
  outcome_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  lesson TEXT,
  confidence INTEGER,
  tags TEXT
);

CREATE TABLE IF NOT EXISTS ideas (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  title TEXT,
  description TEXT,
  tags TEXT,
  score INTEGER,
  status TEXT DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  name TEXT,
  platform TEXT,
  handle TEXT,
  status TEXT DEFAULT 'new',
  notes TEXT,
  next_followup DATE
);

CREATE TABLE IF NOT EXISTS interactions (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES contacts(id),
  created_at TIMESTAMP DEFAULT NOW(),
  type TEXT,
  direction TEXT,
  summary TEXT
);

CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  title TEXT,
  category TEXT,
  target_date DATE,
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  event_id TEXT UNIQUE,
  title TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  location TEXT,
  description TEXT,
  synced_at TIMESTAMP DEFAULT NOW()
);`;

  const stepIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="min-h-screen bg-surface-primary p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((step, i) => (
              <div
                key={step.id}
                className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  stepIndex >= i
                    ? 'bg-brand text-white'
                    : 'bg-surface-tertiary text-zinc-500'
                }`}>
                  {i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 transition-colors ${
                    stepIndex > i ? 'bg-brand' : 'bg-surface-tertiary'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-surface-secondary border border-[rgba(255,255,255,0.06)] p-8 rounded-2xl">

          {/* Welcome */}
          {currentStep === 'welcome' && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Rocket size={48} className="text-brand" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white mb-4">Welcome to OpenClaw Pro</h1>
              <p className="text-sm text-zinc-300 mb-8">
                Your AI agent operations control plane. Let&apos;s get you set up in under 5 minutes.
              </p>
              <button
                onClick={nextStep}
                className="bg-brand hover:bg-brand-hover text-white px-8 py-3 rounded-xl font-semibold text-sm transition-colors duration-150"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Choose Mode */}
          {currentStep === 'mode' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">How do you want to use the dashboard?</h2>
              <p className="text-sm text-zinc-400 mb-8">Choose based on your needs. You can upgrade anytime.</p>

              <div className="grid gap-4">
                <button
                  onClick={() => { setSetupMode('quick'); goToStep('complete'); }}
                  className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] hover:border-brand/40 text-left transition-colors duration-150 group"
                >
                  <div className="flex items-start gap-4">
                    <Zap size={28} className="text-brand mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-white group-hover:text-brand transition-colors">Quick Start (Try It Now)</h3>
                      <p className="text-xs text-zinc-400 mt-1">Data stored in your browser. Perfect for trying it out.</p>
                      <div className="flex gap-2 mt-3">
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] rounded font-medium">No signup</span>
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] rounded font-medium">Instant</span>
                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] rounded font-medium">Browser only</span>
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => { setSetupMode('full'); nextStep(); }}
                  className="p-5 rounded-xl border border-[rgba(255,255,255,0.06)] hover:border-brand/40 text-left transition-colors duration-150 group"
                >
                  <div className="flex items-start gap-4">
                    <Cloud size={28} className="text-blue-400 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-white group-hover:text-brand transition-colors">Full Setup (Recommended)</h3>
                      <p className="text-xs text-zinc-400 mt-1">Cloud database + hosting. Access from anywhere, sync with your agent.</p>
                      <div className="flex gap-2 mt-3">
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] rounded font-medium">Cloud sync</span>
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] rounded font-medium">Multi-device</span>
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] rounded font-medium">5 min setup</span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Database Setup */}
          {currentStep === 'database' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Set Up Your Database</h2>
              <p className="text-sm text-zinc-400 mb-6">We&apos;ll use Neon - a free serverless PostgreSQL database.</p>

              <div className="space-y-6">
                <div className="p-4 bg-surface-tertiary rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-7 h-7 bg-brand rounded-full flex items-center justify-center text-xs font-bold text-white">1</span>
                    <h3 className="text-sm font-semibold text-white">Create a Neon Account (Free)</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mb-3">Click below to open Neon. Sign up with GitHub or Google.</p>
                  <a
                    href="https://console.neon.tech/signup"
                    target="_blank"
                    className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                  >
                    Open Neon Console
                  </a>
                </div>

                <div className="p-4 bg-surface-tertiary rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-7 h-7 bg-brand rounded-full flex items-center justify-center text-xs font-bold text-white">2</span>
                    <h3 className="text-sm font-semibold text-white">Create a New Project</h3>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Name it anything (e.g., &quot;openclaw-dashboard&quot;). Choose the region closest to you.
                  </p>
                </div>

                <div className="p-4 bg-surface-tertiary rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-7 h-7 bg-brand rounded-full flex items-center justify-center text-xs font-bold text-white">3</span>
                    <h3 className="text-sm font-semibold text-white">Copy Your Connection String</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mb-3">
                    In your Neon dashboard, find the connection string (starts with <code className="bg-surface-elevated px-1 rounded text-zinc-300">postgresql://</code>). Paste it below:
                  </p>
                  <input
                    type="password"
                    value={databaseUrl}
                    onChange={(e) => setDatabaseUrl(e.target.value)}
                    placeholder="postgresql://user:password@host/database"
                    className="w-full bg-surface-elevated border border-[rgba(255,255,255,0.06)] rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand mb-3 transition-colors"
                  />
                  <button
                    onClick={testConnection}
                    disabled={!databaseUrl || testing}
                    className="bg-brand hover:bg-brand-hover disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                  >
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                  {testResult && (
                    <div className={`mt-3 p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {testResult.success ? <CheckCircle2 size={14} className="inline mr-1" /> : null}
                      {testResult.message}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-surface-tertiary rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-7 h-7 bg-brand rounded-full flex items-center justify-center text-xs font-bold text-white">4</span>
                    <h3 className="text-sm font-semibold text-white">Create Tables</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mb-3">
                    Go to the <strong className="text-zinc-200">SQL Editor</strong> in Neon and run this script:
                  </p>
                  <div className="relative">
                    <pre className="bg-surface-elevated p-4 rounded-lg text-xs text-zinc-400 font-mono overflow-x-auto max-h-48 overflow-y-auto">
                      {neonSchema}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(neonSchema, 'schema')}
                      className="absolute top-2 right-2 bg-surface-tertiary hover:bg-surface-elevated border border-[rgba(255,255,255,0.06)] px-3 py-1 rounded text-xs text-zinc-400 transition-colors"
                    >
                      {copied === 'schema' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => goToStep('mode')}
                    className="flex-1 bg-surface-tertiary hover:bg-surface-elevated border border-[rgba(255,255,255,0.06)] text-white py-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={!testResult?.success}
                    className="flex-1 bg-brand hover:bg-brand-hover disabled:bg-zinc-800 disabled:text-zinc-600 text-white py-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Deploy */}
          {currentStep === 'deploy' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Deploy Your Dashboard</h2>
              <p className="text-sm text-zinc-400 mb-6">One click to deploy on Vercel (free tier available).</p>

              <div className="space-y-6">
                <div className="p-4 bg-surface-tertiary rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-7 h-7 bg-brand rounded-full flex items-center justify-center text-xs font-bold text-white">1</span>
                    <h3 className="text-sm font-semibold text-white">Deploy to Vercel</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mb-4">
                    Click below to deploy. When asked for environment variables, paste your DATABASE_URL.
                  </p>
                  <a
                    href="https://vercel.com/new/clone?repository-url=https://github.com/ucsandman/OpenClaw-Dashboard&env=DATABASE_URL&envDescription=Your%20Neon%20PostgreSQL%20connection%20string"
                    target="_blank"
                    className="inline-flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-5 py-2.5 rounded-lg text-xs font-medium transition-colors"
                  >
                    <svg height="16" viewBox="0 0 76 65" fill="currentColor"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/></svg>
                    Deploy with Vercel
                  </a>
                </div>

                <div className="p-4 bg-surface-tertiary rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-7 h-7 bg-brand rounded-full flex items-center justify-center text-xs font-bold text-white">2</span>
                    <h3 className="text-sm font-semibold text-white">Set Environment Variable</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mb-3">
                    When Vercel asks, paste your DATABASE_URL:
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      value={databaseUrl}
                      readOnly
                      className="w-full bg-surface-elevated border border-[rgba(255,255,255,0.06)] rounded-lg px-4 py-2.5 text-sm text-white pr-20"
                    />
                    <button
                      onClick={() => copyToClipboard(databaseUrl, 'url')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-surface-tertiary hover:bg-surface-elevated px-3 py-1 rounded text-xs text-zinc-400 transition-colors"
                    >
                      {copied === 'url' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-brand-subtle border border-brand/20 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Lightbulb size={14} className="text-brand mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-zinc-300">
                      <strong className="text-white">Tip:</strong> Vercel will give you a URL like <code className="bg-surface-elevated px-1 rounded text-zinc-300">your-app.vercel.app</code>.
                      Bookmark it - that&apos;s your dashboard.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => goToStep('database')}
                    className="flex-1 bg-surface-tertiary hover:bg-surface-elevated border border-[rgba(255,255,255,0.06)] text-white py-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={nextStep}
                    className="flex-1 bg-brand hover:bg-brand-hover text-white py-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    I&apos;ve Deployed
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Complete */}
          {currentStep === 'complete' && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle2 size={48} className="text-green-400" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white mb-4">You&apos;re All Set</h1>

              {setupMode === 'quick' ? (
                <div>
                  <p className="text-sm text-zinc-300 mb-6">
                    Quick Start mode is active. Your data will be stored in this browser.
                  </p>
                  <p className="text-xs text-zinc-500 mb-8">
                    Want to sync across devices? You can set up cloud storage anytime from the Integrations page.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-zinc-300 mb-6">
                    Your dashboard is deployed and connected to your database.
                  </p>
                  <div className="bg-surface-tertiary p-4 rounded-xl text-left mb-8">
                    <h3 className="text-sm font-semibold text-white mb-3">Next Steps:</h3>
                    <ul className="text-xs text-zinc-300 space-y-2">
                      <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-green-400" /> Visit your Vercel URL to see your dashboard</li>
                      <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-green-400" /> Go to Integrations to connect your services</li>
                      <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-green-400" /> Configure your agent SDK to sync data</li>
                    </ul>
                  </div>
                </div>
              )}

              <button
                onClick={() => router.push('/')}
                className="bg-brand hover:bg-brand-hover text-white px-8 py-3 rounded-xl font-semibold text-sm transition-colors duration-150"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Need help? <a href="https://docs.clawd.bot" target="_blank" className="text-brand hover:text-brand-hover transition-colors">Read the docs</a> or <a href="https://discord.com/invite/clawd" target="_blank" className="text-brand hover:text-brand-hover transition-colors">join Discord</a>
        </p>
      </div>
    </div>
  );
}
