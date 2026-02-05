'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Integration configurations with their settings fields
const INTEGRATION_CONFIGS = {
  // === AI PROVIDERS ===
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    color: 'from-teal-400 to-teal-600',
    category: 'AI',
    description: 'GPT models & embeddings',
    fields: [
      { key: 'OPENAI_API_KEY', label: 'API Key', type: 'password', required: true },
      { key: 'OPENAI_ORG_ID', label: 'Organization ID', type: 'text', required: false }
    ]
  },
  anthropic: {
    name: 'Anthropic',
    icon: '🧠',
    color: 'from-amber-400 to-orange-600',
    category: 'AI',
    description: 'Claude models',
    fields: [
      { key: 'ANTHROPIC_API_KEY', label: 'API Key', type: 'password', required: true }
    ]
  },
  groq: {
    name: 'Groq',
    icon: '⚡',
    color: 'from-orange-500 to-red-600',
    category: 'AI',
    description: 'Ultra-fast LLM inference',
    fields: [
      { key: 'GROQ_API_KEY', label: 'API Key', type: 'password', required: true }
    ]
  },
  together: {
    name: 'Together AI',
    icon: '🤝',
    color: 'from-blue-500 to-purple-600',
    category: 'AI',
    description: 'Open source model hosting',
    fields: [
      { key: 'TOGETHER_API_KEY', label: 'API Key', type: 'password', required: true }
    ]
  },
  replicate: {
    name: 'Replicate',
    icon: '🔄',
    color: 'from-gray-600 to-gray-800',
    category: 'AI',
    description: 'Run ML models in the cloud',
    fields: [
      { key: 'REPLICATE_API_TOKEN', label: 'API Token', type: 'password', required: true }
    ]
  },
  huggingface: {
    name: 'Hugging Face',
    icon: '🤗',
    color: 'from-yellow-400 to-orange-500',
    category: 'AI',
    description: 'Models, datasets, spaces',
    fields: [
      { key: 'HUGGINGFACE_API_KEY', label: 'API Key', type: 'password', required: true }
    ]
  },
  perplexity: {
    name: 'Perplexity',
    icon: '🔍',
    color: 'from-cyan-400 to-blue-600',
    category: 'AI',
    description: 'AI-powered search',
    fields: [
      { key: 'PERPLEXITY_API_KEY', label: 'API Key', type: 'password', required: true }
    ]
  },
  elevenlabs: {
    name: 'ElevenLabs',
    icon: '🎙️',
    color: 'from-pink-400 to-pink-600',
    category: 'AI',
    description: 'Text-to-speech voice generation',
    fields: [
      { key: 'ELEVENLABS_API_KEY', label: 'API Key', type: 'password', required: true },
      { key: 'ELEVENLABS_VOICE_ID', label: 'Default Voice ID', type: 'text', required: false }
    ]
  },

  // === DATABASES ===
  neon: {
    name: 'Neon',
    icon: '🗄️',
    color: 'from-emerald-400 to-emerald-600',
    category: 'Database',
    description: 'Serverless PostgreSQL',
    fields: [
      { key: 'DATABASE_URL', label: 'Connection String', type: 'password', required: true, placeholder: 'postgresql://user:pass@host/db' }
    ]
  },
  supabase: {
    name: 'Supabase',
    icon: '⚡',
    color: 'from-green-500 to-emerald-600',
    category: 'Database',
    description: 'Postgres + Auth + Storage',
    fields: [
      { key: 'SUPABASE_URL', label: 'Project URL', type: 'text', required: true },
      { key: 'SUPABASE_ANON_KEY', label: 'Anon Key', type: 'password', required: true },
      { key: 'SUPABASE_SERVICE_KEY', label: 'Service Key', type: 'password', required: false }
    ]
  },
  planetscale: {
    name: 'PlanetScale',
    icon: '🌍',
    color: 'from-gray-700 to-gray-900',
    category: 'Database',
    description: 'Serverless MySQL',
    fields: [
      { key: 'PLANETSCALE_URL', label: 'Connection String', type: 'password', required: true }
    ]
  },
  mongodb: {
    name: 'MongoDB',
    icon: '🍃',
    color: 'from-green-600 to-green-800',
    category: 'Database',
    description: 'NoSQL document database',
    fields: [
      { key: 'MONGODB_URI', label: 'Connection URI', type: 'password', required: true }
    ]
  },
  redis: {
    name: 'Redis',
    icon: '🔴',
    color: 'from-red-500 to-red-700',
    category: 'Database',
    description: 'In-memory cache & data store',
    fields: [
      { key: 'REDIS_URL', label: 'Connection URL', type: 'password', required: true }
    ]
  },
  pinecone: {
    name: 'Pinecone',
    icon: '🌲',
    color: 'from-teal-500 to-cyan-600',
    category: 'Database',
    description: 'Vector database for AI',
    fields: [
      { key: 'PINECONE_API_KEY', label: 'API Key', type: 'password', required: true },
      { key: 'PINECONE_ENVIRONMENT', label: 'Environment', type: 'text', required: true }
    ]
  },

  // === COMMUNICATION ===
  telegram: {
    name: 'Telegram',
    icon: '💬',
    color: 'from-blue-400 to-blue-600',
    category: 'Communication',
    description: 'Chat bot interface',
    fields: [
      { key: 'TELEGRAM_BOT_TOKEN', label: 'Bot Token', type: 'password', required: true },
      { key: 'TELEGRAM_CHAT_ID', label: 'Chat ID', type: 'text', required: false }
    ]
  },
  discord: {
    name: 'Discord',
    icon: '🎮',
    color: 'from-indigo-500 to-purple-600',
    category: 'Communication',
    description: 'Community & bot platform',
    fields: [
      { key: 'DISCORD_BOT_TOKEN', label: 'Bot Token', type: 'password', required: true },
      { key: 'DISCORD_CLIENT_ID', label: 'Client ID', type: 'text', required: false },
      { key: 'DISCORD_GUILD_ID', label: 'Server ID', type: 'text', required: false }
    ]
  },
  slack: {
    name: 'Slack',
    icon: '💼',
    color: 'from-purple-500 to-pink-500',
    category: 'Communication',
    description: 'Workspace messaging',
    fields: [
      { key: 'SLACK_BOT_TOKEN', label: 'Bot Token', type: 'password', required: true },
      { key: 'SLACK_SIGNING_SECRET', label: 'Signing Secret', type: 'password', required: false },
      { key: 'SLACK_APP_TOKEN', label: 'App Token', type: 'password', required: false }
    ]
  },
  twilio: {
    name: 'Twilio',
    icon: '📱',
    color: 'from-red-400 to-red-600',
    category: 'Communication',
    description: 'SMS & voice APIs',
    fields: [
      { key: 'TWILIO_ACCOUNT_SID', label: 'Account SID', type: 'text', required: true },
      { key: 'TWILIO_AUTH_TOKEN', label: 'Auth Token', type: 'password', required: true },
      { key: 'TWILIO_PHONE_NUMBER', label: 'Phone Number', type: 'text', required: false }
    ]
  },
  resend: {
    name: 'Resend',
    icon: '📧',
    color: 'from-gray-800 to-black',
    category: 'Communication',
    description: 'Developer-first email API',
    fields: [
      { key: 'RESEND_API_KEY', label: 'API Key', type: 'password', required: true }
    ]
  },
  sendgrid: {
    name: 'SendGrid',
    icon: '✉️',
    color: 'from-blue-500 to-blue-700',
    category: 'Communication',
    description: 'Email delivery service',
    fields: [
      { key: 'SENDGRID_API_KEY', label: 'API Key', type: 'password', required: true }
    ]
  },

  // === PRODUCTIVITY ===
  google: {
    name: 'Google Workspace',
    icon: '📅',
    color: 'from-green-400 to-green-600',
    category: 'Productivity',
    description: 'Calendar, Gmail, Drive',
    fields: [
      { key: 'GOOGLE_ACCOUNT', label: 'Account Email', type: 'email', required: true },
      { key: 'GOOGLE_CREDENTIALS_PATH', label: 'Credentials Path', type: 'text', required: false }
    ]
  },
  notion: {
    name: 'Notion',
    icon: '📝',
    color: 'from-gray-400 to-gray-600',
    category: 'Productivity',
    description: 'Workspace & documentation',
    fields: [
      { key: 'NOTION_API_KEY', label: 'API Key', type: 'password', required: true },
      { key: 'NOTION_PARENT_PAGE_ID', label: 'Parent Page ID', type: 'text', required: false }
    ]
  },
  linear: {
    name: 'Linear',
    icon: '📐',
    color: 'from-indigo-400 to-indigo-600',
    category: 'Productivity',
    description: 'Issue tracking for teams',
    fields: [
      { key: 'LINEAR_API_KEY', label: 'API Key', type: 'password', required: true }
    ]
  },
  airtable: {
    name: 'Airtable',
    icon: '📊',
    color: 'from-yellow-400 to-yellow-600',
    category: 'Productivity',
    description: 'Spreadsheet-database hybrid',
    fields: [
      { key: 'AIRTABLE_API_KEY', label: 'API Key', type: 'password', required: true },
      { key: 'AIRTABLE_BASE_ID', label: 'Base ID', type: 'text', required: false }
    ]
  },
  calendly: {
    name: 'Calendly',
    icon: '🗓️',
    color: 'from-blue-400 to-cyan-500',
    category: 'Productivity',
    description: 'Scheduling automation',
    fields: [
      { key: 'CALENDLY_API_KEY', label: 'API Key', type: 'password', required: true }
    ]
  },

  // === DEV & HOSTING ===
  github: {
    name: 'GitHub',
    icon: '🐙',
    color: 'from-purple-400 to-purple-600',
    category: 'Development',
    description: 'Code repos & version control',
    fields: [
      { key: 'GITHUB_TOKEN', label: 'Personal Access Token', type: 'password', required: true },
      { key: 'GITHUB_USERNAME', label: 'Username', type: 'text', required: false }
    ]
  },
  vercel: {
    name: 'Vercel',
    icon: '▲',
    color: 'from-white to-gray-400',
    category: 'Development',
    description: 'Frontend deployment',
    fields: [
      { key: 'VERCEL_TOKEN', label: 'API Token', type: 'password', required: true },
      { key: 'VERCEL_PROJECT_ID', label: 'Project ID', type: 'text', required: false }
    ]
  },
  railway: {
    name: 'Railway',
    icon: '🚂',
    color: 'from-purple-600 to-pink-600',
    category: 'Development',
    description: 'Full-stack deployment',
    fields: [
      { key: 'RAILWAY_TOKEN', label: 'API Token', type: 'password', required: true }
    ]
  },
  cloudflare: {
    name: 'Cloudflare',
    icon: '☁️',
    color: 'from-orange-400 to-orange-600',
    category: 'Development',
    description: 'CDN, DNS, Workers',
    fields: [
      { key: 'CLOUDFLARE_API_TOKEN', label: 'API Token', type: 'password', required: true },
      { key: 'CLOUDFLARE_ACCOUNT_ID', label: 'Account ID', type: 'text', required: false }
    ]
  },
  sentry: {
    name: 'Sentry',
    icon: '🐛',
    color: 'from-pink-500 to-purple-600',
    category: 'Development',
    description: 'Error tracking & monitoring',
    fields: [
      { key: 'SENTRY_DSN', label: 'DSN', type: 'password', required: true },
      { key: 'SENTRY_AUTH_TOKEN', label: 'Auth Token', type: 'password', required: false }
    ]
  },

  // === SOCIAL & SEARCH ===
  twitter: {
    name: 'Twitter/X',
    icon: '🐦',
    color: 'from-sky-400 to-sky-600',
    category: 'Social',
    description: 'Social media integration',
    fields: [
      { key: 'TWITTER_API_KEY', label: 'API Key', type: 'password', required: true },
      { key: 'TWITTER_API_SECRET', label: 'API Secret', type: 'password', required: true },
      { key: 'TWITTER_ACCESS_TOKEN', label: 'Access Token', type: 'password', required: false },
      { key: 'TWITTER_ACCESS_SECRET', label: 'Access Secret', type: 'password', required: false }
    ]
  },
  brave: {
    name: 'Brave Search',
    icon: '🦁',
    color: 'from-orange-400 to-orange-600',
    category: 'Social',
    description: 'Web search API',
    fields: [
      { key: 'BRAVE_API_KEY', label: 'API Key', type: 'password', required: true }
    ]
  },
  moltbook: {
    name: 'Moltbook',
    icon: '🔥',
    color: 'from-orange-400 to-red-600',
    category: 'Social',
    description: 'AI social platform',
    fields: [
      { key: 'MOLTBOOK_API_KEY', label: 'API Key', type: 'password', required: true }
    ]
  },

  // === PAYMENTS ===
  stripe: {
    name: 'Stripe',
    icon: '💳',
    color: 'from-indigo-500 to-purple-600',
    category: 'Payments',
    description: 'Payment processing',
    fields: [
      { key: 'STRIPE_SECRET_KEY', label: 'Secret Key', type: 'password', required: true },
      { key: 'STRIPE_PUBLISHABLE_KEY', label: 'Publishable Key', type: 'text', required: false },
      { key: 'STRIPE_WEBHOOK_SECRET', label: 'Webhook Secret', type: 'password', required: false }
    ]
  },
  lemonsqueezy: {
    name: 'Lemon Squeezy',
    icon: '🍋',
    color: 'from-yellow-400 to-lime-500',
    category: 'Payments',
    description: 'Merchant of record',
    fields: [
      { key: 'LEMONSQUEEZY_API_KEY', label: 'API Key', type: 'password', required: true }
    ]
  }
};

const CATEGORIES = [
  { id: 'all', name: 'All', icon: '🔌' },
  { id: 'AI', name: 'AI Providers', icon: '🤖' },
  { id: 'Database', name: 'Databases', icon: '🗄️' },
  { id: 'Communication', name: 'Communication', icon: '💬' },
  { id: 'Productivity', name: 'Productivity', icon: '📝' },
  { id: 'Development', name: 'Dev & Hosting', icon: '🛠️' },
  { id: 'Social', name: 'Social & Search', icon: '🌐' },
  { id: 'Payments', name: 'Payments', icon: '💳' }
];

export default function IntegrationsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingIntegration, setEditingIntegration] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showValues, setShowValues] = useState({});
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings?category=integration');
      const data = await res.json();
      const settingsMap = {};
      (data.settings || []).forEach(s => {
        settingsMap[s.key] = s;
      });
      setSettings(settingsMap);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationStatus = (integrationKey) => {
    const config = INTEGRATION_CONFIGS[integrationKey];
    const requiredFields = config.fields.filter(f => f.required);
    const hasAllRequired = requiredFields.every(f => settings[f.key]?.hasValue);
    
    if (hasAllRequired) return 'connected';
    if (config.fields.some(f => settings[f.key]?.hasValue)) return 'configured';
    return 'not_configured';
  };

  const openEditor = (integrationKey) => {
    const config = INTEGRATION_CONFIGS[integrationKey];
    const initialData = {};
    config.fields.forEach(f => {
      initialData[f.key] = settings[f.key]?.value || '';
    });
    setFormData(initialData);
    setEditingIntegration(integrationKey);
    setTestResult(null);
  };

  const closeEditor = () => {
    setEditingIntegration(null);
    setFormData({});
    setTestResult(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const config = INTEGRATION_CONFIGS[editingIntegration];
      
      for (const field of config.fields) {
        if (formData[field.key] !== undefined) {
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: field.key,
              value: formData[field.key],
              category: 'integration',
              encrypted: field.type === 'password'
            })
          });
        }
      }
      
      await fetchSettings();
      closeEditor();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTestResult({ status: 'testing', message: 'Testing connection...' });
    
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration: editingIntegration,
          credentials: formData
        })
      });
      const data = await res.json();
      setTestResult({ 
        status: data.success ? 'success' : 'error', 
        message: data.success ? `✓ ${data.message}` : `✗ ${data.message}`
      });
    } catch (error) {
      setTestResult({ status: 'error', message: `✗ Test failed: ${error.message}` });
    }
  };

  const toggleShowValue = (key) => {
    setShowValues(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'connected':
        return <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full font-bold">● Connected</span>;
      case 'configured':
        return <span className="px-2 py-1 bg-yellow-500 text-black text-xs rounded-full font-bold">◐ Partial</span>;
      default:
        return <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded-full font-bold">○ Not Set</span>;
    }
  };

  const allIntegrations = Object.entries(INTEGRATION_CONFIGS);
  
  // Filter by category and search
  const integrationsList = allIntegrations.filter(([key, config]) => {
    const matchesCategory = activeCategory === 'all' || config.category === activeCategory;
    const matchesSearch = !searchQuery || 
      config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  const connectedCount = allIntegrations.filter(([k]) => getIntegrationStatus(k) === 'connected').length;
  const configuredCount = allIntegrations.filter(([k]) => getIntegrationStatus(k) === 'configured').length;

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-gray-400">Loading integrations...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Navigation */}
      <nav className="mb-6">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
          ← Back to Dashboard
        </Link>
      </nav>

      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-2xl">
              🔌
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Integrations & Settings</h1>
              <p className="text-gray-400">Configure your connected services</p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-white">{allIntegrations.length}</div>
          <div className="text-sm text-gray-400">Available</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{connectedCount}</div>
          <div className="text-sm text-gray-400">Connected</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">{configuredCount}</div>
          <div className="text-sm text-gray-400">Partial</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="🔍 Search integrations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Results count */}
      {(activeCategory !== 'all' || searchQuery) && (
        <p className="text-gray-400 text-sm mb-4">
          Showing {integrationsList.length} of {allIntegrations.length} integrations
        </p>
      )}

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrationsList.map(([key, config]) => {
          const status = getIntegrationStatus(key);
          return (
            <div 
              key={key} 
              className="glass-card p-5 hover:bg-opacity-20 transition-all cursor-pointer group"
              onClick={() => openEditor(key)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${config.color} rounded-xl flex items-center justify-center text-2xl`}>
                    {config.icon}
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">{config.name}</div>
                    <div className="text-xs text-gray-400">{config.description}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                {getStatusBadge(status)}
                <span className="text-xs text-gray-500 group-hover:text-cyan-400 transition-colors">
                  Click to configure →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${INTEGRATION_CONFIGS[editingIntegration].color} rounded-xl flex items-center justify-center text-xl`}>
                    {INTEGRATION_CONFIGS[editingIntegration].icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {INTEGRATION_CONFIGS[editingIntegration].name}
                    </h2>
                    <p className="text-sm text-gray-400">
                      {INTEGRATION_CONFIGS[editingIntegration].description}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={closeEditor}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {INTEGRATION_CONFIGS[editingIntegration].fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showValues[field.key] ? 'text' : field.type}
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                      {field.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => toggleShowValue(field.key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showValues[field.key] ? '🙈' : '👁️'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{field.key}</p>
                  </div>
                ))}
              </div>

              {/* Test Result */}
              {testResult && (
                <div className={`mt-4 p-3 rounded-lg ${
                  testResult.status === 'success' ? 'bg-green-900 text-green-300' :
                  testResult.status === 'error' ? 'bg-red-900 text-red-300' :
                  'bg-gray-800 text-gray-300'
                }`}>
                  {testResult.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={testConnection}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Test Connection
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="glass-card p-6 mt-8">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <span className="mr-2">ℹ️</span>
          About Settings
        </h2>
        <div className="text-gray-300 space-y-2 text-sm">
          <p><strong>🔒 Security:</strong> Sensitive values are encrypted and masked in the UI</p>
          <p><strong>☁️ Cloud Sync:</strong> Settings are stored in your Neon database</p>
          <p><strong>🔧 Environment:</strong> For Clawdbot gateway settings, update your config file</p>
        </div>
      </div>
    </div>
  );
}
