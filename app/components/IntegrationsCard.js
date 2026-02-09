'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plug } from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Stat } from './ui/Stat';
import { EmptyState } from './ui/EmptyState';
import { CardSkeleton } from './ui/Skeleton';

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
          key: s.key,
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
    return <CardSkeleton />;
  }

  const viewAllLink = (
    <Link href="/integrations" className="text-xs text-brand hover:text-brand-hover transition-colors duration-150">
      View All
    </Link>
  );

  return (
    <Card className="h-full">
      <CardHeader title="Integrations" icon={Plug} action={total > 0 ? viewAllLink : undefined}>
        {total === 0 && (
          <Link href="/integrations" className="text-xs text-brand hover:text-brand-hover transition-colors duration-150">
            Setup
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState
            icon={Plug}
            title="No integrations configured"
            description="Add API keys in Settings to connect services"
          />
        ) : (
          <div className="space-y-4">
            {/* Connected count */}
            <Stat label="Connected" value={`${connected}/${total}`} />

            {/* Integration grid */}
            <div className="grid grid-cols-4 gap-2">
              {deduped.map((integration, idx) => (
                <div
                  key={idx}
                  className={`bg-surface-tertiary p-2 rounded-lg flex flex-col items-center gap-1 border transition-colors duration-150 ${
                    integration.status === 'connected'
                      ? 'border-green-500/20'
                      : 'border-zinc-500/20'
                  }`}
                  title={`${integration.name} - ${integration.status}`}
                >
                  <Plug size={16} className="text-zinc-400" />
                  <span className="text-[10px] text-zinc-400 truncate w-full text-center">{integration.name}</span>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      integration.status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Bottom status line */}
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                {connected} connected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                {total - connected} configured
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
