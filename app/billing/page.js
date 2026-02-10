'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import {
  CreditCard, AlertTriangle, ArrowRight, Check, Zap,
  Users, KeyRound, Bot, ExternalLink, Loader2,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';

const PLAN_DISPLAY = {
  free: { label: 'Free', color: 'default' },
  pro: { label: 'Pro', color: 'brand' },
  team: { label: 'Team', color: 'info' },
  enterprise: { label: 'Enterprise', color: 'success' },
};

const PLAN_CARDS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/mo',
    features: ['100 actions/month', '1 agent', '2 team members', '2 API keys'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    period: '/mo',
    features: ['5,000 actions/month', '10 agents', '5 team members', '10 API keys'],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$79',
    period: '/mo',
    features: ['50,000 actions/month', 'Unlimited agents', '25 team members', '50 API keys'],
  },
];

function UsageMeter({ label, icon: Icon, usage, limit, className = '' }) {
  const isUnlimited = limit === null || limit === Infinity;
  const percent = isUnlimited ? 0 : (limit > 0 ? Math.round((usage / limit) * 100) : 0);
  const color = percent >= 100 ? 'error' : percent >= 80 ? 'warning' : 'brand';
  const displayLimit = isUnlimited ? 'Unlimited' : limit.toLocaleString();

  return (
    <Card hover={false} className={className}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={14} className="text-zinc-400" />
          <span className="text-xs text-zinc-400">{label}</span>
        </div>
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-lg font-semibold tabular-nums text-white">{usage.toLocaleString()}</span>
          <span className="text-xs text-zinc-500">/ {displayLimit}</span>
        </div>
        {!isUnlimited && <ProgressBar value={percent} color={color} />}
      </CardContent>
    </Card>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <PageLayout title="Billing" subtitle="Manage your subscription and usage" breadcrumbs={['Dashboard', 'Billing']}>
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-zinc-500">Loading billing info...</div>
        </div>
      </PageLayout>
    }>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const isAdmin = session?.user?.role === 'admin';

  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [error, setError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Stripe redirect banners
  const success = searchParams.get('success') === 'true';
  const canceled = searchParams.get('canceled') === 'true';
  const [showBanner, setShowBanner] = useState(success || canceled);

  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch('/api/billing');
      const data = await res.json();

      if (res.status === 403 && data.needsOnboarding) {
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Failed to load billing');
        setLoading(false);
        return;
      }

      setBilling(data);
    } catch {
      setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handleCheckout = async (plan) => {
    setCheckoutLoading(plan);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to start checkout');
        return;
      }

      window.location.href = data.url;
    } catch {
      setError('Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to open billing portal');
        return;
      }

      window.location.href = data.url;
    } catch {
      setError('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  };

  // Onboarding guard
  if (needsOnboarding) {
    return (
      <PageLayout
        title="Billing"
        subtitle="Manage your subscription and usage"
        breadcrumbs={['Dashboard', 'Billing']}
      >
        <Card hover={false}>
          <CardContent className="pt-6">
            <EmptyState
              icon={AlertTriangle}
              title="Workspace Required"
              description="Complete onboarding to create a workspace before managing billing."
              action={
                <a
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand/90 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Go to Dashboard <ArrowRight size={14} />
                </a>
              }
            />
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  // Loading state
  if (loading) {
    return (
      <PageLayout
        title="Billing"
        subtitle="Manage your subscription and usage"
        breadcrumbs={['Dashboard', 'Billing']}
      >
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-zinc-500">Loading billing info...</div>
        </div>
      </PageLayout>
    );
  }

  const plan = billing?.plan || 'free';
  const planDisplay = PLAN_DISPLAY[plan] || PLAN_DISPLAY.free;
  const usage = billing?.usage || {};
  const limits = billing?.limits || {};
  const sub = billing?.subscription || {};

  return (
    <PageLayout
      title="Billing"
      subtitle="Manage your subscription and usage"
      breadcrumbs={['Dashboard', 'Billing']}
    >
      {/* Success/canceled banner */}
      {showBanner && (
        <div className={`mb-4 p-3 rounded-lg text-sm flex items-center justify-between ${
          success
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
        }`}>
          <span>
            {success ? 'Subscription updated successfully! Your plan may take a moment to reflect.' : 'Checkout was canceled. No changes were made.'}
          </span>
          <button onClick={() => setShowBanner(false)} className="ml-4 hover:opacity-70">&times;</button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-4">&times;</button>
        </div>
      )}

      {/* Usage meters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <UsageMeter
          label="Actions this month"
          icon={Zap}
          usage={usage.actions_per_month || 0}
          limit={limits.actions_per_month}
        />
        <UsageMeter
          label="Active agents"
          icon={Bot}
          usage={usage.agents || 0}
          limit={limits.agents}
        />
        <UsageMeter
          label="Team members"
          icon={Users}
          usage={usage.members || 0}
          limit={limits.members}
        />
        <UsageMeter
          label="API keys"
          icon={KeyRound}
          usage={usage.api_keys || 0}
          limit={limits.api_keys}
        />
      </div>

      {/* Current plan card */}
      <Card hover={false} className="mb-6">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-subtle flex items-center justify-center">
                <CreditCard size={18} className="text-brand" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">Current Plan</span>
                  <Badge variant={planDisplay.color}>{planDisplay.label}</Badge>
                  {sub.status && sub.status !== 'active' && (
                    <Badge variant={sub.status === 'past_due' ? 'warning' : 'error'}>
                      {sub.status.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {sub.current_period_end && (
                    <span className="text-xs text-zinc-500">
                      Next billing: {formatDate(sub.current_period_end)}
                    </span>
                  )}
                  {sub.trial_ends_at && (
                    <span className="text-xs text-yellow-500">
                      Trial ends: {formatDate(sub.trial_ends_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isAdmin && sub.has_stripe && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-surface-tertiary border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-zinc-300 hover:text-white hover:border-[rgba(255,255,255,0.12)] transition-colors disabled:opacity-50"
              >
                {portalLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ExternalLink size={14} />
                )}
                Manage Subscription
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLAN_CARDS.map((tier) => {
          const isCurrent = plan === tier.id;
          const isUpgrade = !isCurrent && (
            (plan === 'free') ||
            (plan === 'pro' && tier.id === 'team')
          );
          const canCheckout = isAdmin && isUpgrade && billing?.stripe_configured && tier.id !== 'free';

          return (
            <Card
              key={tier.id}
              hover={false}
              className={isCurrent ? 'border-brand/30 ring-1 ring-brand/20' : ''}
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-white">{tier.name}</span>
                  {isCurrent && <Badge variant="brand">Current</Badge>}
                </div>
                <div className="flex items-baseline gap-0.5 mb-4">
                  <span className="text-2xl font-bold text-white">{tier.price}</span>
                  <span className="text-xs text-zinc-500">{tier.period}</span>
                </div>
                <ul className="space-y-2 mb-5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs text-zinc-400">
                      <Check size={12} className={isCurrent ? 'text-brand' : 'text-zinc-600'} />
                      {feature}
                    </li>
                  ))}
                </ul>
                {canCheckout && (
                  <button
                    onClick={() => handleCheckout(tier.id)}
                    disabled={!!checkoutLoading}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {checkoutLoading === tier.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    {checkoutLoading === tier.id ? 'Redirecting...' : `Upgrade to ${tier.name}`}
                  </button>
                )}
                {isCurrent && (
                  <div className="w-full text-center py-2 text-xs text-zinc-500">Your current plan</div>
                )}
                {!isCurrent && !canCheckout && tier.id !== 'free' && !isAdmin && (
                  <div className="w-full text-center py-2 text-xs text-zinc-500">Ask an admin to upgrade</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enterprise callout */}
      <Card hover={false} className="mt-4">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-zinc-200">Need more?</span>
              <span className="text-xs text-zinc-500 ml-2">Enterprise plans with unlimited everything and dedicated support.</span>
            </div>
            <a
              href="mailto:support@openclaw.dev"
              className="text-xs text-brand hover:text-brand/80 transition-colors"
            >
              Contact Sales
            </a>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
