'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Plus, Trash2, ToggleLeft, ToggleRight,
  ChevronDown, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import PageLayout from '../components/PageLayout';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCompact } from '../components/ui/Stat';
import { EmptyState } from '../components/ui/EmptyState';

const POLICY_TYPES = [
  { value: 'risk_threshold', label: 'Risk Threshold', desc: 'Block or warn when risk score exceeds a threshold' },
  { value: 'require_approval', label: 'Require Approval', desc: 'Require approval for specific action types' },
  { value: 'block_action_type', label: 'Block Action Type', desc: 'Block specific action types entirely' },
  { value: 'rate_limit', label: 'Rate Limit', desc: 'Warn or block when an agent exceeds action frequency' },
  { value: 'webhook_check', label: 'Webhook Check', desc: 'Call an external endpoint for custom decision logic' },
];

const ACTION_OPTIONS = [
  'build', 'deploy', 'post', 'apply', 'security', 'message', 'api',
  'calendar', 'research', 'review', 'fix', 'refactor', 'test', 'config',
  'monitor', 'alert', 'cleanup', 'sync', 'migrate', 'other',
];

const DECISION_ACTIONS = [
  { value: 'block', label: 'Block' },
  { value: 'warn', label: 'Warn' },
  { value: 'require_approval', label: 'Require Approval' },
];

const DECISION_COLORS = {
  allow: 'success',
  warn: 'warning',
  block: 'danger',
  require_approval: 'info',
};

function formatRules(policy) {
  let rules;
  try { rules = JSON.parse(policy.rules); } catch { return 'Invalid rules'; }

  switch (policy.policy_type) {
    case 'risk_threshold':
      return `Risk >= ${rules.threshold} → ${rules.action || 'block'}`;
    case 'require_approval':
      return `Types: ${(rules.action_types || []).join(', ')} → require approval`;
    case 'block_action_type':
      return `Types: ${(rules.action_types || []).join(', ')} → block`;
    case 'rate_limit':
      return `Max ${rules.max_actions} actions / ${rules.window_minutes}min → ${rules.action || 'warn'}`;
    case 'webhook_check': {
      const host = (() => { try { return new URL(rules.url).hostname; } catch { return rules.url; } })();
      return `Webhook → ${host} (timeout: ${rules.timeout_ms || 5000}ms, on_timeout: ${rules.on_timeout || 'allow'})`;
    }
    default:
      return JSON.stringify(rules);
  }
}

export default function PoliciesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const [policies, setPolicies] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('risk_threshold');
  const [formAction, setFormAction] = useState('block');
  const [formThreshold, setFormThreshold] = useState(80);
  const [formActionTypes, setFormActionTypes] = useState([]);
  const [formMaxActions, setFormMaxActions] = useState(50);
  const [formWindowMinutes, setFormWindowMinutes] = useState(60);
  const [formWebhookUrl, setFormWebhookUrl] = useState('');
  const [formWebhookTimeout, setFormWebhookTimeout] = useState(5000);
  const [formWebhookOnTimeout, setFormWebhookOnTimeout] = useState('allow');
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [policiesRes, decisionsRes] = await Promise.all([
        fetch('/api/policies'),
        fetch('/api/guard?limit=20'),
      ]);
      const policiesJson = await policiesRes.json();
      const decisionsJson = await decisionsRes.json();

      if (policiesRes.ok) setPolicies(policiesJson.policies || []);
      if (decisionsRes.ok) {
        setDecisions(decisionsJson.decisions || []);
        setStats(decisionsJson.stats || {});
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);

    let rules;
    switch (formType) {
      case 'risk_threshold':
        rules = JSON.stringify({ threshold: formThreshold, action: formAction });
        break;
      case 'require_approval':
        rules = JSON.stringify({ action_types: formActionTypes, action: 'require_approval' });
        break;
      case 'block_action_type':
        rules = JSON.stringify({ action_types: formActionTypes, action: 'block' });
        break;
      case 'rate_limit':
        rules = JSON.stringify({ max_actions: formMaxActions, window_minutes: formWindowMinutes, action: formAction });
        break;
      case 'webhook_check':
        rules = JSON.stringify({ url: formWebhookUrl, timeout_ms: formWebhookTimeout, on_timeout: formWebhookOnTimeout });
        break;
      default:
        rules = '{}';
    }

    try {
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, policy_type: formType, rules }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to create policy');
      } else {
        setShowAddForm(false);
        setFormName('');
        setFormType('risk_threshold');
        setFormActionTypes([]);
        setFormWebhookUrl('');
        setFormWebhookTimeout(5000);
        setFormWebhookOnTimeout('allow');
        fetchData();
      }
    } catch {
      setError('Failed to create policy');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (policy) => {
    try {
      const res = await fetch('/api/policies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: policy.id, active: policy.active ? 0 : 1 }),
      });
      if (res.ok) fetchData();
    } catch { /* ignore */ }
  };

  const handleDelete = async (policyId) => {
    if (!confirm('Delete this policy?')) return;
    try {
      const res = await fetch(`/api/policies?id=${policyId}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch { /* ignore */ }
  };

  const handleActionTypeToggle = (type) => {
    setFormActionTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const activePolicies = policies.filter(p => p.active);

  return (
    <PageLayout
      title="Policies"
      subtitle="Guard rules that govern agent behavior before actions execute"
      breadcrumbs={['Policies']}
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">&times;</button>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCompact label="Total Policies" value={policies.length} />
        <StatCompact label="Active" value={activePolicies.length} />
        <StatCompact label="Blocks (24h)" value={parseInt(stats.blocks_24h || 0, 10)} />
        <StatCompact label="Evaluations (24h)" value={parseInt(stats.total_24h || 0, 10)} />
      </div>

      {/* Policy List */}
      <Card className="mb-6">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-sm font-medium text-white">Guard Policies</h2>
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand-hover transition-colors"
            >
              {showAddForm ? <ChevronDown size={14} /> : <Plus size={14} />}
              {showAddForm ? 'Cancel' : 'Add Policy'}
            </button>
          )}
        </div>

        {/* Add form */}
        {showAddForm && isAdmin && (
          <form onSubmit={handleCreate} className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)] space-y-4 bg-[rgba(255,255,255,0.02)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Policy Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Block high-risk deploys"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.1)] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Policy Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.1)] text-sm text-white focus:outline-none focus:border-brand"
                >
                  {POLICY_TYPES.map(pt => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500 mt-1">
                  {POLICY_TYPES.find(pt => pt.value === formType)?.desc}
                </p>
              </div>
            </div>

            {/* Dynamic fields per type */}
            {formType === 'risk_threshold' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Risk Threshold (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.1)] text-sm text-white focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Action</label>
                  <select
                    value={formAction}
                    onChange={(e) => setFormAction(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.1)] text-sm text-white focus:outline-none focus:border-brand"
                  >
                    {DECISION_ACTIONS.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {(formType === 'require_approval' || formType === 'block_action_type') && (
              <div>
                <label className="block text-xs text-zinc-400 mb-2">Action Types</label>
                <div className="flex flex-wrap gap-2">
                  {ACTION_OPTIONS.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleActionTypeToggle(type)}
                      className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                        formActionTypes.includes(type)
                          ? 'bg-brand text-white'
                          : 'bg-[#1a1a1a] text-zinc-400 border border-[rgba(255,255,255,0.06)] hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formType === 'rate_limit' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Max Actions</label>
                  <input
                    type="number"
                    min="1"
                    value={formMaxActions}
                    onChange={(e) => setFormMaxActions(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.1)] text-sm text-white focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Window (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={formWindowMinutes}
                    onChange={(e) => setFormWindowMinutes(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.1)] text-sm text-white focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Action</label>
                  <select
                    value={formAction}
                    onChange={(e) => setFormAction(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.1)] text-sm text-white focus:outline-none focus:border-brand"
                  >
                    {DECISION_ACTIONS.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {formType === 'webhook_check' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-xs text-zinc-400 mb-1">Webhook URL (HTTPS required)</label>
                  <input
                    type="url"
                    value={formWebhookUrl}
                    onChange={(e) => setFormWebhookUrl(e.target.value)}
                    placeholder="https://your-api.example.com/guard"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.1)] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Timeout (ms)</label>
                  <input
                    type="number"
                    min="1000"
                    max="10000"
                    step="500"
                    value={formWebhookTimeout}
                    onChange={(e) => setFormWebhookTimeout(parseInt(e.target.value, 10) || 5000)}
                    className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.1)] text-sm text-white focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">On Timeout</label>
                  <select
                    value={formWebhookOnTimeout}
                    onChange={(e) => setFormWebhookOnTimeout(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.1)] text-sm text-white focus:outline-none focus:border-brand"
                  >
                    <option value="allow">Allow (fail-open)</option>
                    <option value="block">Block (fail-closed)</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={creating || !formName.trim() || ((formType === 'require_approval' || formType === 'block_action_type') && formActionTypes.length === 0) || (formType === 'webhook_check' && (() => { try { const u = new URL(formWebhookUrl); return u.protocol !== 'https:' || !u.hostname; } catch { return true; } })())}
              className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Policy'}
            </button>
          </form>
        )}

        <CardContent>
          {loading ? (
            <div className="text-sm text-zinc-500 py-8 text-center">Loading policies...</div>
          ) : policies.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No policies configured"
              description={isAdmin ? 'Create your first guard policy to control agent behavior.' : 'No policies have been configured yet. Ask an admin to set up guard policies.'}
            />
          ) : (
            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {policies.map(policy => (
                <div key={policy.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${policy.active ? 'text-white' : 'text-zinc-500'}`}>
                        {policy.name}
                      </span>
                      <Badge variant={policy.active ? 'success' : 'muted'}>
                        {policy.active ? 'active' : 'inactive'}
                      </Badge>
                      <Badge variant="info">{policy.policy_type.replace(/_/g, ' ')}</Badge>
                    </div>
                    <p className="text-xs text-zinc-400">{formatRules(policy)}</p>
                    <p className="text-xs text-zinc-600 mt-0.5 font-mono">{policy.id}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(policy)}
                        className="text-zinc-500 hover:text-white transition-colors"
                        title={policy.active ? 'Disable' : 'Enable'}
                      >
                        {policy.active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => handleDelete(policy.id)}
                        className="text-zinc-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Guard Decisions */}
      <Card>
        <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-sm font-medium text-white">Recent Guard Decisions</h2>
        </div>
        <CardContent>
          {decisions.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">No guard evaluations yet. Decisions appear when agents call the guard endpoint.</p>
          ) : (
            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {decisions.map(d => (
                <div key={d.id} className="py-2.5 flex items-center gap-3">
                  <Badge variant={DECISION_COLORS[d.decision] || 'muted'}>{d.decision}</Badge>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-zinc-300">{d.agent_id || 'unknown'}</span>
                    {d.action_type && (
                      <span className="text-xs text-zinc-500 ml-2">{d.action_type}</span>
                    )}
                    {d.reason && (
                      <p className="text-xs text-zinc-500 truncate">{d.reason}</p>
                    )}
                  </div>
                  {d.risk_score != null && (
                    <span className={`text-xs font-mono ${d.risk_score >= 80 ? 'text-red-400' : d.risk_score >= 50 ? 'text-yellow-400' : 'text-zinc-500'}`}>
                      risk:{d.risk_score}
                    </span>
                  )}
                  <span className="text-xs text-zinc-600 font-mono flex-shrink-0">
                    {new Date(d.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
