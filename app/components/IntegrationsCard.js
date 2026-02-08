'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function IntegrationsCard() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIntegrations() {
      try {
        const res = await fetch('/api/settings?category=integration');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();

        const items = (data.settings || []).map(s => ({
          name: formatKeyName(s.key),
          icon: getKeyIcon(s.key),
          status: s.hasValue ? 'connected' : 'configured'
        }));

        setIntegrations(items);
      } catch (error) {
        console.error('Failed to fetch integrations:', error);
        setIntegrations([]);
      } finally {
        setLoading(false);
      }
    }
    fetchIntegrations();
  }, []);

  const formatKeyName = (key) => {
    // TELEGRAM_BOT_TOKEN -> Telegram
    const prefixMap = {
      TELEGRAM: 'Telegram', GOOGLE: 'Google', GMAIL: 'Gmail', NOTION: 'Notion',
      GITHUB: 'GitHub', VERCEL: 'Vercel', TWITTER: 'Twitter/X', DISCORD: 'Discord',
      SLACK: 'Slack', STRIPE: 'Stripe', OPENAI: 'OpenAI', ANTHROPIC: 'Anthropic',
      ELEVENLABS: 'ElevenLabs', BRAVE: 'Brave Search', MOLTBOOK: 'Moltbook',
      SENTRY: 'Sentry', CLOUDFLARE: 'Cloudflare', SUPABASE: 'Supabase',
      PINECONE: 'Pinecone', REDIS: 'Redis', SENDGRID: 'SendGrid',
      RESEND: 'Resend', TWILIO: 'Twilio', LINEAR: 'Linear',
      AIRTABLE: 'Airtable', CALENDLY: 'Calendly', GROQ: 'Groq',
      TOGETHER: 'Together', REPLICATE: 'Replicate', HUGGINGFACE: 'HuggingFace',
      PERPLEXITY: 'Perplexity', RAILWAY: 'Railway', MONGODB: 'MongoDB',
      PLANETSCALE: 'PlanetScale', LEMONSQUEEZY: 'LemonSqueezy'
    };
    const prefix = key.split('_')[0];
    return prefixMap[prefix] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getKeyIcon = (key) => {
    const iconMap = {
      TELEGRAM: '💬', GOOGLE: '📅', NOTION: '📝', GITHUB: '🐙', VERCEL: '▲',
      TWITTER: '🐦', DISCORD: '🎮', SLACK: '💼', STRIPE: '💳', OPENAI: '🤖',
      ANTHROPIC: '🧠', ELEVENLABS: '🎙️', BRAVE: '🦁', MOLTBOOK: '🔥',
      SENTRY: '🔍', CLOUDFLARE: '☁️', SUPABASE: '🗄️', SENDGRID: '📧',
      RESEND: '📧', TWILIO: '📱', LINEAR: '📋', AIRTABLE: '📊',
      GROQ: '⚡', TOGETHER: '🤝', REPLICATE: '🔄', HUGGINGFACE: '🤗',
      PERPLEXITY: '🔮', RAILWAY: '🚂', MONGODB: '🍃', REDIS: '🔴',
      PINECONE: '🌲', CALENDLY: '📅', LEMONSQUEEZY: '🍋'
    };
    const prefix = key.split('_')[0];
    return iconMap[prefix] || '🔌';
  };

  // Deduplicate by service name (multiple keys per service)
  const deduped = [];
  const seen = new Set();
  for (const item of integrations) {
    if (!seen.has(item.name)) {
      seen.add(item.name);
      deduped.push(item);
    }
  }

  const connected = deduped.filter(i => i.status === 'connected').length;
  const total = deduped.length;

  if (loading) {
    return (
      <div className="glass-card p-6 h-full">
        <h2 className="text-xl font-bold text-white flex items-center mb-4">
          <span className="mr-2">🔌</span>Integrations
        </h2>
        <div className="text-center text-gray-400 py-8">Loading integrations...</div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="glass-card p-6 h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <span className="mr-2">🔌</span>Integrations
          </h2>
          <Link href="/integrations" className="text-sm text-fire-orange hover:underline">
            Setup →
          </Link>
        </div>
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">🔌</div>
          <div>No integrations configured</div>
          <div className="text-xs mt-1">Add API keys in Settings to connect services</div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <span className="mr-2">🔌</span>
          Integrations
        </h2>
        <Link href="/integrations" className="text-sm text-fire-orange hover:underline">
          View All →
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-3xl font-bold text-green-400">{connected}<span className="text-gray-500 text-lg">/{total}</span></div>
        <div className="text-sm text-gray-400">Connected</div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {deduped.map((integration, idx) => (
          <div
            key={idx}
            className={`p-2 rounded-lg text-center ${
              integration.status === 'connected'
                ? 'bg-green-500/20 border border-green-500/30'
                : 'bg-yellow-500/20 border border-yellow-500/30'
            }`}
            title={`${integration.name} - ${integration.status}`}
          >
            <div className="text-xl">{integration.icon}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>🟢 {connected} connected</span>
        <span>🟡 {total - connected} configured</span>
      </div>
    </div>
  );
}
