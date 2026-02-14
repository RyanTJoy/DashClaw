import Link from 'next/link';
import {
  Flame, ArrowRight, Github, ExternalLink, BookOpen,
  Terminal, Zap, CircleDot, Eye, ShieldAlert, Shield, BarChart3,
  ChevronRight,
} from 'lucide-react';
import CopyDocsButton from '../components/CopyDocsButton';
import PublicNavbar from '../components/PublicNavbar';

export const metadata = {
  title: 'DashClaw SDK Documentation',
  description: 'Full reference for the DashClaw SDK. Install, configure, and instrument your AI agents with 60+ methods across action recording, behavior guard, context management, session handoffs, security scanning, and more.',
};

/* ─── helpers ─── */

function CodeBlock({ children, title }) {
  return (
    <div className="rounded-xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] overflow-x-auto">
      {title && (
        <div className="px-5 py-2.5 border-b border-[rgba(255,255,255,0.06)] text-xs text-zinc-500 font-mono">{title}</div>
      )}
      <pre className="p-5 font-mono text-sm leading-relaxed text-zinc-300">{children}</pre>
    </div>
  );
}

function ParamTable({ params }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.06)]">
            <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Parameter</th>
            <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Type</th>
            <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Required</th>
            <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name} className="border-b border-[rgba(255,255,255,0.03)]">
              <td className="py-2 pr-4 font-mono text-xs text-brand">{p.name}</td>
              <td className="py-2 pr-4 font-mono text-xs text-zinc-500">{p.type}</td>
              <td className="py-2 pr-4 text-xs">{p.required ? <span className="text-red-400">Yes</span> : <span className="text-zinc-600">No</span>}</td>
              <td className="py-2 text-zinc-400 text-xs">{p.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MethodEntry({ id, signature, description, params, returns, example, children }) {
  return (
    <div id={id} className="scroll-mt-20 py-8 border-b border-[rgba(255,255,255,0.04)] last:border-b-0">
      <h3 className="text-lg font-semibold text-white font-mono">{signature}</h3>
      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{description}</p>
      {params && params.length > 0 && (
        <div className="mt-4">
          <ParamTable params={params} />
        </div>
      )}
      {returns && (
        <p className="mt-3 text-xs text-zinc-500"><span className="text-zinc-400 font-medium">Returns:</span> <code className="font-mono text-zinc-400">{returns}</code></p>
      )}
      {example && (
        <div className="mt-4">
          <CodeBlock>{example}</CodeBlock>
        </div>
      )}
      {children}
    </div>
  );
}

function SectionNav({ items }) {
  return (
    <nav className="hidden lg:block sticky top-24 w-52 shrink-0 self-start max-h-[calc(100vh-120px)] overflow-y-auto pr-4 scrollbar-hide hover:scrollbar-default transition-all">
      <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">On this page</div>
      <ul className="space-y-1.5 text-sm pb-8">
        {items.map((item) => (
          <li key={item.href}>
            <a href={item.href} className={`block text-zinc-400 hover:text-white transition-colors ${item.indent ? 'pl-3 text-xs' : ''}`}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ─── nav items for sidebar ─── */

const navItems = [
  { href: '#quick-start', label: 'Quick Start' },
  { href: '#constructor', label: 'Constructor' },
  { href: '#action-recording', label: 'Action Recording' },
  { href: '#createAction', label: 'createAction', indent: true },
  { href: '#waitForApproval', label: 'waitForApproval', indent: true },
  { href: '#updateOutcome', label: 'updateOutcome', indent: true },
  { href: '#track', label: 'track', indent: true },
  { href: '#getActions', label: 'getActions', indent: true },
  { href: '#getAction', label: 'getAction', indent: true },
  { href: '#getActionTrace', label: 'getActionTrace', indent: true },
  { href: '#loops-assumptions', label: 'Loops & Assumptions' },
  { href: '#registerOpenLoop', label: 'registerOpenLoop', indent: true },
  { href: '#resolveOpenLoop', label: 'resolveOpenLoop', indent: true },
  { href: '#registerAssumption', label: 'registerAssumption', indent: true },
  { href: '#getAssumption', label: 'getAssumption', indent: true },
  { href: '#validateAssumption', label: 'validateAssumption', indent: true },
  { href: '#getOpenLoops', label: 'getOpenLoops', indent: true },
  { href: '#getDriftReport', label: 'getDriftReport', indent: true },
  { href: '#signals', label: 'Signals' },
  { href: '#getSignals', label: 'getSignals', indent: true },
  { href: '#behavior-guard', label: 'Behavior Guard' },
  { href: '#guard', label: 'guard', indent: true },
  { href: '#getGuardDecisions', label: 'getGuardDecisions', indent: true },
  { href: '#dashboard-data', label: 'Dashboard Data' },
  { href: '#reportTokenUsage', label: 'reportTokenUsage', indent: true },
  { href: '#recordDecision', label: 'recordDecision', indent: true },
  { href: '#createGoal', label: 'createGoal', indent: true },
  { href: '#recordContent', label: 'recordContent', indent: true },
  { href: '#recordInteraction', label: 'recordInteraction', indent: true },
  { href: '#reportConnections', label: 'reportConnections', indent: true },
  { href: '#createCalendarEvent', label: 'createCalendarEvent', indent: true },
  { href: '#recordIdea', label: 'recordIdea', indent: true },
  { href: '#reportMemoryHealth', label: 'reportMemoryHealth', indent: true },
  { href: '#session-handoffs', label: 'Session Handoffs' },
  { href: '#createHandoff', label: 'createHandoff', indent: true },
  { href: '#getHandoffs', label: 'getHandoffs', indent: true },
  { href: '#getLatestHandoff', label: 'getLatestHandoff', indent: true },
  { href: '#context-manager', label: 'Context Manager' },
  { href: '#captureKeyPoint', label: 'captureKeyPoint', indent: true },
  { href: '#getKeyPoints', label: 'getKeyPoints', indent: true },
  { href: '#createThread', label: 'createThread', indent: true },
  { href: '#addThreadEntry', label: 'addThreadEntry', indent: true },
  { href: '#closeThread', label: 'closeThread', indent: true },
  { href: '#getThreads', label: 'getThreads', indent: true },
  { href: '#getContextSummary', label: 'getContextSummary', indent: true },
  { href: '#automation-snippets', label: 'Automation Snippets' },
  { href: '#saveSnippet', label: 'saveSnippet', indent: true },
  { href: '#getSnippets', label: 'getSnippets', indent: true },
  { href: '#useSnippet', label: 'useSnippet', indent: true },
  { href: '#deleteSnippet', label: 'deleteSnippet', indent: true },
  { href: '#user-preferences', label: 'User Preferences' },
  { href: '#logObservation', label: 'logObservation', indent: true },
  { href: '#setPreference', label: 'setPreference', indent: true },
  { href: '#logMood', label: 'logMood', indent: true },
  { href: '#trackApproach', label: 'trackApproach', indent: true },
  { href: '#getPreferenceSummary', label: 'getPreferenceSummary', indent: true },
  { href: '#getApproaches', label: 'getApproaches', indent: true },
  { href: '#daily-digest', label: 'Daily Digest' },
  { href: '#getDailyDigest', label: 'getDailyDigest', indent: true },
  { href: '#security-scanning', label: 'Security Scanning' },
  { href: '#scanContent', label: 'scanContent', indent: true },
  { href: '#reportSecurityFinding', label: 'reportSecurityFinding', indent: true },
  { href: '#agent-messaging', label: 'Agent Messaging' },
  { href: '#sendMessage', label: 'sendMessage', indent: true },
  { href: '#getInbox', label: 'getInbox', indent: true },
  { href: '#markRead', label: 'markRead', indent: true },
  { href: '#archiveMessages', label: 'archiveMessages', indent: true },
  { href: '#broadcast', label: 'broadcast', indent: true },
  { href: '#createMessageThread', label: 'createMessageThread', indent: true },
  { href: '#getMessageThreads', label: 'getMessageThreads', indent: true },
  { href: '#resolveMessageThread', label: 'resolveMessageThread', indent: true },
  { href: '#saveSharedDoc', label: 'saveSharedDoc', indent: true },
  { href: '#bulk-sync', label: 'Bulk Sync' },
  { href: '#syncState', label: 'syncState', indent: true },
  { href: '#error-handling', label: 'Error Handling' },
  { href: '#agent-tools', label: 'Agent Tools (Python)' },
];

/* ─── page ─── */

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navbar */}
      <PublicNavbar />

      {/* Hero */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
            <Link href="/" className="hover:text-zinc-300 transition-colors">Home</Link>
            <ChevronRight size={14} />
            <span className="text-zinc-300">SDK Documentation</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center">
              <BookOpen size={20} className="text-brand" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">SDK Documentation</h1>
          </div>
          <p className="text-zinc-400 max-w-2xl leading-relaxed">
            Full reference for the DashClaw SDK. 60+ methods across 13 categories to instrument your AI agents with
            action recording, governance, context management, session handoffs, security scanning, and more.
          </p>
          <CopyDocsButton />
        </div>
      </section>

      {/* Main content with side nav */}
      <div className="max-w-6xl mx-auto px-6 pb-20 flex gap-12">
        <SectionNav items={navItems} />

        <div className="min-w-0 flex-1">

          {/* ── Quick Start ── */}
          <section id="quick-start" className="scroll-mt-20 pb-12 border-b border-[rgba(255,255,255,0.06)]">
            <h2 className="text-2xl font-bold tracking-tight mb-6">Quick Start</h2>

            <div className="space-y-8">
              {/* Step 1 */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-7 h-7 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="text-base font-semibold">Copy the SDK</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-3 pl-10">
                  Install from npm, or copy the single-file SDK directly.
                </p>
                <div className="pl-10">
                  <CodeBlock title="terminal">{`npm install dashclaw`}</CodeBlock>
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-7 h-7 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center">2</span>
                  <h3 className="text-base font-semibold">Initialize the client</h3>
                </div>
                <div className="pl-10">
                  <CodeBlock title="agent.js">{`import { DashClaw } from 'dashclaw';

const claw = new DashClaw({
  baseUrl: 'https://your-dashboard.vercel.app',
  apiKey: process.env.DASHCLAW_API_KEY,
  agentId: 'my-agent',
  agentName: 'My Agent',
});`}</CodeBlock>
                </div>
              </div>

              {/* Step 3 */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-7 h-7 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center">3</span>
                  <h3 className="text-base font-semibold">Record your first action</h3>
                </div>
                <div className="pl-10">
                  <CodeBlock title="agent.js">{`// Create an action before doing work
const { action_id } = await claw.createAction({
  action_type: 'deploy',
  declared_goal: 'Deploy authentication service',
  risk_score: 60,
});

// ... do the work ...

// Update when done
await claw.updateOutcome(action_id, {
  status: 'completed',
  output_summary: 'Auth service deployed to prod',
});`}</CodeBlock>
                </div>
                <p className="text-sm text-zinc-400 mt-3 pl-10">
                  Or use <a href="#track" className="text-brand hover:underline">track()</a> to wrap it in a single call that auto-records success/failure.
                </p>
              </div>
            </div>
          </section>

          {/* ── Constructor ── */}
          <section id="constructor" className="scroll-mt-20 py-12 border-b border-[rgba(255,255,255,0.06)]">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Constructor</h2>
            <p className="text-sm text-zinc-400 mb-6">Create a DashClaw instance. Requires Node 18+ (native fetch).</p>

            <CodeBlock>{`const claw = new DashClaw({ baseUrl, apiKey, agentId, agentName, swarmId, guardMode, guardCallback });`}</CodeBlock>

            <div className="mt-6">
              <ParamTable params={[
                { name: 'baseUrl', type: 'string', required: true, desc: 'DashClaw dashboard URL (e.g. "https://your-app.vercel.app")' },
                { name: 'apiKey', type: 'string', required: true, desc: 'API key for authentication (determines which org\'s data you access)' },
                { name: 'agentId', type: 'string', required: true, desc: 'Unique identifier for this agent' },
                { name: 'agentName', type: 'string', required: false, desc: 'Human-readable agent name' },
                { name: 'swarmId', type: 'string', required: false, desc: 'Swarm/group identifier if part of a multi-agent system' },
                { name: 'guardMode', type: 'string', required: false, desc: 'Auto guard check before createAction/track: "off" (default), "warn" (log + proceed), "enforce" (throw on block)' },
                { name: 'guardCallback', type: 'Function', required: false, desc: 'Called with guard decision object when guardMode is active' },
              ]} />
            </div>

            <div className="mt-6 p-4 rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)]">
              <h4 className="text-sm font-semibold text-white mb-3">Guard Mode</h4>
              <p className="text-xs text-zinc-400 mb-3">
                When <code className="font-mono text-brand">guardMode</code> is set, every call to <code className="font-mono text-zinc-300">createAction()</code> and <code className="font-mono text-zinc-300">track()</code> automatically checks guard policies before proceeding.
              </p>
              <CodeBlock>{`import { DashClaw, GuardBlockedError } from 'dashclaw';

const claw = new DashClaw({
  baseUrl: 'https://your-app.vercel.app',
  apiKey: process.env.DASHCLAW_API_KEY,
  agentId: 'my-agent',
  guardMode: 'enforce', // throws GuardBlockedError on block/require_approval
  guardCallback: (decision) => console.log('Guard:', decision.decision),
});

try {
  await claw.createAction({ action_type: 'deploy', declared_goal: 'Ship v2' });
} catch (err) {
  if (err instanceof GuardBlockedError) {
    console.log(err.decision);  // 'block' or 'require_approval'
    console.log(err.reasons);   // ['Risk score 90 >= threshold 80']
  }
}`}</CodeBlock>
            </div>
          </section>

          {/* ── Action Recording ── */}
          <section id="action-recording" className="scroll-mt-20 pt-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center">
                <Zap size={16} className="text-brand" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Action Recording</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-4">Create, update, and query action records. Every agent action gets a full audit trail.</p>

            <MethodEntry
              id="createAction"
              signature="claw.createAction(action)"
              description="Create a new action record. The agent's agentId, agentName, and swarmId are automatically attached."
              params={[
                { name: 'action_type', type: 'string', required: true, desc: 'One of: build, deploy, post, apply, security, message, api, calendar, research, review, fix, refactor, test, config, monitor, alert, cleanup, sync, migrate, other' },
                { name: 'declared_goal', type: 'string', required: true, desc: 'What this action aims to accomplish' },
                { name: 'action_id', type: 'string', required: false, desc: 'Custom action ID (auto-generated act_ UUID if omitted)' },
                { name: 'reasoning', type: 'string', required: false, desc: 'Why the agent decided to take this action' },
                { name: 'authorization_scope', type: 'string', required: false, desc: 'What permissions were granted' },
                { name: 'trigger', type: 'string', required: false, desc: 'What triggered this action' },
                { name: 'systems_touched', type: 'string[]', required: false, desc: 'Systems this action interacts with' },
                { name: 'input_summary', type: 'string', required: false, desc: 'Summary of input data' },
                { name: 'parent_action_id', type: 'string', required: false, desc: 'Parent action if this is a sub-action' },
                { name: 'reversible', type: 'boolean', required: false, desc: 'Whether this action can be undone (default: true)' },
                { name: 'risk_score', type: 'number', required: false, desc: 'Risk score 0-100 (default: 0)' },
                { name: 'confidence', type: 'number', required: false, desc: 'Confidence level 0-100 (default: 50)' },
              ]}
              returns="Promise<{ action: Object, action_id: string }>"
              example={`const { action_id } = await claw.createAction({
  action_type: 'deploy',
  declared_goal: 'Deploy auth service to production',
  risk_score: 70,
  systems_touched: ['kubernetes', 'auth-service'],
  reasoning: 'Scheduled release after QA approval',
});`}
            />

            <MethodEntry
              id="waitForApproval"
              signature="claw.waitForApproval(actionId, options?)"
              description="Poll for human approval when an action enters pending_approval status. Useful with hitlMode='off' when you want explicit control over blocking behavior."
              params={[
                { name: 'actionId', type: 'string', required: true, desc: 'The pending action_id to poll' },
                { name: 'options.timeout', type: 'number', required: false, desc: 'Maximum wait in ms (default: 300000)' },
                { name: 'options.interval', type: 'number', required: false, desc: 'Polling interval in ms (default: 5000)' },
              ]}
              returns="Promise<{ action: Object, action_id: string }>"
              example={`const { action_id } = await claw.createAction({
  action_type: 'deploy',
  declared_goal: 'Ship release candidate',
});

const approval = await claw.waitForApproval(action_id, {
  timeout: 180000,
  interval: 3000,
});

console.log('Approved status:', approval.action.status);`}
            />

            <MethodEntry
              id="updateOutcome"
              signature="claw.updateOutcome(actionId, outcome)"
              description="Update the outcome of an existing action. Automatically sets timestamp_end if not provided."
              params={[
                { name: 'actionId', type: 'string', required: true, desc: 'The action_id to update' },
                { name: 'status', type: 'string', required: false, desc: 'New status: completed, failed, cancelled' },
                { name: 'output_summary', type: 'string', required: false, desc: 'What happened' },
                { name: 'side_effects', type: 'string[]', required: false, desc: 'Unintended consequences' },
                { name: 'artifacts_created', type: 'string[]', required: false, desc: 'Files, records, etc. created' },
                { name: 'error_message', type: 'string', required: false, desc: 'Error details if failed' },
                { name: 'duration_ms', type: 'number', required: false, desc: 'How long it took in milliseconds' },
                { name: 'cost_estimate', type: 'number', required: false, desc: 'Estimated cost in USD' },
              ]}
              returns="Promise<{ action: Object }>"
              example={`await claw.updateOutcome(action_id, {
  status: 'completed',
  output_summary: 'Auth service deployed successfully',
  artifacts_created: ['deploy-log-2024-01.txt'],
  duration_ms: 45000,
});`}
            />

            <MethodEntry
              id="track"
              signature="claw.track(actionDef, fn)"
              description="Helper that creates an action, runs your async function, and auto-updates the outcome. If fn throws, the action is marked as failed with the error message."
              params={[
                { name: 'actionDef', type: 'Object', required: true, desc: 'Action definition (same params as createAction)' },
                { name: 'fn', type: 'Function', required: true, desc: 'Async function to execute. Receives { action_id } as argument.' },
              ]}
              returns="Promise<*> (the return value of fn)"
              example={`const result = await claw.track(
  { action_type: 'build', declared_goal: 'Compile project' },
  async ({ action_id }) => {
    // Your logic here. If this throws, the action is marked failed.
    await runBuild();
    return 'Build succeeded';
  }
);`}
            />

            <MethodEntry
              id="getActions"
              signature="claw.getActions(filters?)"
              description="Get a list of actions with optional filters. Returns paginated results with stats."
              params={[
                { name: 'agent_id', type: 'string', required: false, desc: 'Filter by agent' },
                { name: 'swarm_id', type: 'string', required: false, desc: 'Filter by swarm' },
                { name: 'status', type: 'string', required: false, desc: 'Filter by status (running, completed, failed, cancelled)' },
                { name: 'action_type', type: 'string', required: false, desc: 'Filter by type' },
                { name: 'risk_min', type: 'number', required: false, desc: 'Minimum risk score' },
                { name: 'limit', type: 'number', required: false, desc: 'Max results (default: 50)' },
                { name: 'offset', type: 'number', required: false, desc: 'Pagination offset (default: 0)' },
              ]}
              returns="Promise<{ actions: Object[], total: number, stats: Object }>"
              example={`const { actions, total } = await claw.getActions({
  status: 'failed',
  risk_min: 50,
  limit: 20,
});`}
            />

            <MethodEntry
              id="getAction"
              signature="claw.getAction(actionId)"
              description="Get a single action with its associated open loops and assumptions."
              params={[
                { name: 'actionId', type: 'string', required: true, desc: 'The action_id to retrieve' },
              ]}
              returns="Promise<{ action: Object, open_loops: Object[], assumptions: Object[] }>"
              example={`const { action, open_loops, assumptions } = await claw.getAction('act_abc123');`}
            />

            <MethodEntry
              id="getActionTrace"
              signature="claw.getActionTrace(actionId)"
              description="Get root-cause trace for an action, including its assumptions, open loops, parent chain, and related actions."
              params={[
                { name: 'actionId', type: 'string', required: true, desc: 'The action_id to trace' },
              ]}
              returns="Promise<{ action: Object, trace: Object }>"
              example={`const { trace } = await claw.getActionTrace('act_abc123');
// trace includes: assumptions, open_loops, parent_chain, related_actions`}
            />
          </section>

          {/* ── Loops & Assumptions ── */}
          <section id="loops-assumptions" className="scroll-mt-20 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center">
                <CircleDot size={16} className="text-brand" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Loops & Assumptions</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-4">Track unresolved dependencies and log what your agents assume. Catch drift before it causes failures.</p>

            <MethodEntry
              id="registerOpenLoop"
              signature="claw.registerOpenLoop(loop)"
              description="Register an open loop (unresolved dependency, pending approval, etc.) for an action."
              params={[
                { name: 'action_id', type: 'string', required: true, desc: 'Parent action ID' },
                { name: 'loop_type', type: 'string', required: true, desc: 'One of: followup, question, dependency, approval, review, handoff, other' },
                { name: 'description', type: 'string', required: true, desc: 'What needs to be resolved' },
                { name: 'priority', type: 'string', required: false, desc: 'One of: low, medium, high, critical (default: medium)' },
                { name: 'owner', type: 'string', required: false, desc: 'Who is responsible for resolving this' },
              ]}
              returns="Promise<{ loop: Object, loop_id: string }>"
              example={`const { loop_id } = await claw.registerOpenLoop({
  action_id: 'act_abc123',
  loop_type: 'approval',
  description: 'Needs manager approval for prod deploy',
  priority: 'high',
  owner: 'ops-team',
});`}
            />

            <MethodEntry
              id="resolveOpenLoop"
              signature="claw.resolveOpenLoop(loopId, status, resolution?)"
              description="Resolve or cancel an open loop."
              params={[
                { name: 'loopId', type: 'string', required: true, desc: 'The loop_id to resolve' },
                { name: 'status', type: 'string', required: true, desc: '"resolved" or "cancelled"' },
                { name: 'resolution', type: 'string', required: false, desc: 'Resolution description (required when resolving)' },
              ]}
              returns="Promise<{ loop: Object }>"
              example={`await claw.resolveOpenLoop('loop_xyz789', 'resolved', 'Manager approved via Slack');`}
            />

            <MethodEntry
              id="registerAssumption"
              signature="claw.registerAssumption(assumption)"
              description="Register an assumption made during an action. Track what your agent assumes so you can validate or invalidate later."
              params={[
                { name: 'action_id', type: 'string', required: true, desc: 'Parent action ID' },
                { name: 'assumption', type: 'string', required: true, desc: 'The assumption being made' },
                { name: 'basis', type: 'string', required: false, desc: 'Evidence or reasoning for the assumption' },
                { name: 'validated', type: 'boolean', required: false, desc: 'Whether this has been validated (default: false)' },
              ]}
              returns="Promise<{ assumption: Object, assumption_id: string }>"
              example={`const { assumption_id } = await claw.registerAssumption({
  action_id: 'act_abc123',
  assumption: 'Database schema is unchanged since last deploy',
  basis: 'No migration files found in latest commits',
});`}
            />

            <MethodEntry
              id="getAssumption"
              signature="claw.getAssumption(assumptionId)"
              description="Get a single assumption by ID."
              params={[
                { name: 'assumptionId', type: 'string', required: true, desc: 'The assumption_id to retrieve' },
              ]}
              returns="Promise<{ assumption: Object }>"
              example={`const { assumption } = await claw.getAssumption('asm_abc123');`}
            />

            <MethodEntry
              id="validateAssumption"
              signature="claw.validateAssumption(assumptionId, validated, invalidated_reason?)"
              description="Validate or invalidate an assumption. When invalidating, a reason is required."
              params={[
                { name: 'assumptionId', type: 'string', required: true, desc: 'The assumption_id to update' },
                { name: 'validated', type: 'boolean', required: true, desc: 'true to validate, false to invalidate' },
                { name: 'invalidated_reason', type: 'string', required: false, desc: 'Required when invalidating (validated = false)' },
              ]}
              returns="Promise<{ assumption: Object }>"
              example={`// Validate
await claw.validateAssumption('asm_abc123', true);

// Invalidate
await claw.validateAssumption('asm_abc123', false, 'Schema was altered by migration #47');`}
            />

            <MethodEntry
              id="getOpenLoops"
              signature="claw.getOpenLoops(filters?)"
              description="Get open loops with optional filters. Returns paginated results with stats."
              params={[
                { name: 'status', type: 'string', required: false, desc: 'Filter by status: open, resolved, cancelled' },
                { name: 'loop_type', type: 'string', required: false, desc: 'Filter by loop type' },
                { name: 'priority', type: 'string', required: false, desc: 'Filter by priority' },
                { name: 'limit', type: 'number', required: false, desc: 'Max results (default: 50)' },
              ]}
              returns="Promise<{ loops: Object[], total: number, stats: Object }>"
              example={`const { loops } = await claw.getOpenLoops({
  status: 'open',
  priority: 'critical',
});`}
            />

            <MethodEntry
              id="getDriftReport"
              signature="claw.getDriftReport(filters?)"
              description="Get drift report for assumptions with risk scoring. Shows which assumptions are stale, unvalidated, or contradicted by outcomes."
              params={[
                { name: 'action_id', type: 'string', required: false, desc: 'Filter by action' },
                { name: 'limit', type: 'number', required: false, desc: 'Max results (default: 50)' },
              ]}
              returns="Promise<{ assumptions: Object[], drift_summary: Object }>"
              example={`const { assumptions, drift_summary } = await claw.getDriftReport();
console.log(drift_summary);
// { total, validated, invalidated, unvalidated, drift_score }`}
            />
          </section>

          {/* ── Signals ── */}
          <section id="signals" className="scroll-mt-20 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[rgba(239,68,68,0.1)] flex items-center justify-center">
                <ShieldAlert size={16} className="text-red-400" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Signals</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              Automatic detection of problematic agent behavior. Seven signal types fire based on action patterns — no configuration required.
            </p>

            <MethodEntry
              id="getSignals"
              signature="claw.getSignals()"
              description="Get current risk signals across all agents. Returns 7 signal types: autonomy_spike, high_impact_low_oversight, repeated_failures, stale_loop, assumption_drift, stale_assumption, and stale_running_action."
              params={[]}
              returns="Promise<{ signals: Object[], counts: { red: number, amber: number, total: number } }>"
              example={`const { signals, counts } = await claw.getSignals();
console.log(\`\${counts.red} red, \${counts.amber} amber signals\`);

for (const signal of signals) {
  console.log(\`[\${signal.severity}] \${signal.signal_type}: \${signal.help}\`);
}`}
            />

            <div className="mt-6 p-4 rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)]">
              <h4 className="text-sm font-semibold text-white mb-3">Signal Types</h4>
              <div className="space-y-2">
                {[
                  { name: 'autonomy_spike', desc: 'Agent taking too many actions without human checkpoints' },
                  { name: 'high_impact_low_oversight', desc: 'Critical actions without sufficient review' },
                  { name: 'repeated_failures', desc: 'Same action type failing multiple times' },
                  { name: 'stale_loop', desc: 'Open loops unresolved past their expected timeline' },
                  { name: 'assumption_drift', desc: 'Assumptions becoming stale or contradicted by outcomes' },
                  { name: 'stale_assumption', desc: 'Assumptions not validated within expected timeframe' },
                  { name: 'stale_running_action', desc: 'Actions stuck in running state for over 4 hours' },
                ].map((s) => (
                  <div key={s.name} className="flex items-start gap-3">
                    <code className="font-mono text-xs text-brand shrink-0 pt-0.5">{s.name}</code>
                    <span className="text-xs text-zinc-400">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Behavior Guard ── */}
          <section id="behavior-guard" className="scroll-mt-20 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[rgba(59,130,246,0.1)] flex items-center justify-center">
                <Shield size={16} className="text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Behavior Guard</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              Check org-level policies before executing risky actions. Returns allow, warn, block, or require_approval based on configured guard policies.
            </p>

            <MethodEntry
              id="guard"
              signature="claw.guard(context, options?)"
              description="Evaluate guard policies for a proposed action. Call this before risky operations to get a go/no-go decision. The agent_id is auto-attached from the SDK constructor."
              params={[
                { name: 'context.action_type', type: 'string', required: true, desc: 'The type of action being proposed' },
                { name: 'context.risk_score', type: 'number', required: false, desc: 'Risk score 0-100' },
                { name: 'context.systems_touched', type: 'string[]', required: false, desc: 'Systems this action will affect' },
                { name: 'context.reversible', type: 'boolean', required: false, desc: 'Whether the action can be undone' },
                { name: 'context.declared_goal', type: 'string', required: false, desc: 'What the action accomplishes' },
                { name: 'options.includeSignals', type: 'boolean', required: false, desc: 'Also check live risk signals (adds latency)' },
              ]}
              returns="Promise<{ decision: string, reasons: string[], warnings: string[], matched_policies: string[], evaluated_at: string }>"
              example={`const result = await claw.guard({
  action_type: 'deploy',
  risk_score: 85,
  systems_touched: ['production-api'],
  reversible: false,
  declared_goal: 'Deploy auth service v2',
});

if (result.decision === 'block') {
  console.log('Blocked:', result.reasons);
  return; // abort the action
}

if (result.decision === 'warn') {
  console.log('Warnings:', result.warnings);
}

// proceed with the action
await claw.createAction({ action_type: 'deploy', ... });`}
            />

            <MethodEntry
              id="getGuardDecisions"
              signature="claw.getGuardDecisions(filters?)"
              description="Retrieve recent guard evaluation decisions for audit and review."
              params={[
                { name: 'filters.decision', type: 'string', required: false, desc: 'Filter by decision: allow, warn, block, require_approval' },
                { name: 'filters.limit', type: 'number', required: false, desc: 'Max results (default 20, max 100)' },
                { name: 'filters.offset', type: 'number', required: false, desc: 'Pagination offset' },
              ]}
              returns="Promise<{ decisions: Object[], total: number, stats: { total_24h, blocks_24h, warns_24h, approvals_24h } }>"
              example={`const { decisions, stats } = await claw.getGuardDecisions({
  decision: 'block',
  limit: 10,
});

console.log(\`\${stats.blocks_24h} blocks in last 24h\`);`}
            />

            <div className="mt-6 p-4 rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)]">
              <h4 className="text-sm font-semibold text-white mb-3">Policy Types</h4>
              <div className="space-y-2">
                {[
                  { name: 'risk_threshold', desc: 'Block or warn when an action\'s risk score exceeds a configured threshold' },
                  { name: 'require_approval', desc: 'Require human approval for specific action types (e.g., deploy, security)' },
                  { name: 'block_action_type', desc: 'Unconditionally block specific action types from executing' },
                  { name: 'rate_limit', desc: 'Warn or block when an agent exceeds a configured action frequency' },
                  { name: 'webhook_check', desc: 'Call an external HTTPS endpoint for custom decision logic (can only escalate severity, never downgrade)' },
                ].map((s) => (
                  <div key={s.name} className="flex items-start gap-3">
                    <code className="font-mono text-xs text-brand shrink-0 pt-0.5">{s.name}</code>
                    <span className="text-xs text-zinc-400">{s.desc}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Policies are configured per-org via the Policies page in the dashboard. The guard endpoint evaluates all active policies and returns the strictest applicable decision.
              </p>
            </div>
          </section>

          {/* ── Dashboard Data ── */}
          <section id="dashboard-data" className="scroll-mt-20 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center">
                <BarChart3 size={16} className="text-brand" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Dashboard Data</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-4">Push data from your agent directly to the DashClaw dashboard. All methods auto-attach the agent&apos;s agentId.</p>

            <MethodEntry
              id="reportTokenUsage"
              signature="claw.reportTokenUsage(usage)"
              description="Report token and model-usage snapshots for cost/burn-rate analytics. API remains available even when token widgets are disabled in certain dashboard modes."
              params={[
                { name: 'tokens_in', type: 'number', required: true, desc: 'Input tokens consumed' },
                { name: 'tokens_out', type: 'number', required: true, desc: 'Output tokens generated' },
                { name: 'context_used', type: 'number', required: false, desc: 'Context window tokens used' },
                { name: 'context_max', type: 'number', required: false, desc: 'Maximum context window size' },
                { name: 'model', type: 'string', required: false, desc: 'Model identifier (e.g., gpt-4o-mini)' },
              ]}
              returns="Promise<{ snapshot: Object }>"
              example={`await claw.reportTokenUsage({
  tokens_in: 1234,
  tokens_out: 980,
  context_used: 2214,
  context_max: 128000,
  model: 'gpt-4o',
});`}
            />

            <MethodEntry
              id="recordDecision"
              signature="claw.recordDecision(entry)"
              description="Record a decision for the learning database. Track what your agent decides and why."
              params={[
                { name: 'decision', type: 'string', required: true, desc: 'What was decided' },
                { name: 'context', type: 'string', required: false, desc: 'Context around the decision' },
                { name: 'reasoning', type: 'string', required: false, desc: 'Why this decision was made' },
                { name: 'outcome', type: 'string', required: false, desc: '"success", "failure", or "pending"' },
                { name: 'confidence', type: 'number', required: false, desc: 'Confidence level 0-100' },
              ]}
              returns="Promise<{ decision: Object }>"
              example={`await claw.recordDecision({
  decision: 'Use Redis for session caching',
  reasoning: 'Lower latency than Postgres for read-heavy access pattern',
  confidence: 85,
});`}
            />

            <MethodEntry
              id="createGoal"
              signature="claw.createGoal(goal)"
              description="Create a goal in the goals tracker."
              params={[
                { name: 'title', type: 'string', required: true, desc: 'Goal title' },
                { name: 'category', type: 'string', required: false, desc: 'Goal category' },
                { name: 'description', type: 'string', required: false, desc: 'Detailed description' },
                { name: 'target_date', type: 'string', required: false, desc: 'Target completion date (ISO string)' },
                { name: 'progress', type: 'number', required: false, desc: 'Progress 0-100' },
                { name: 'status', type: 'string', required: false, desc: '"active", "completed", or "paused"' },
              ]}
              returns="Promise<{ goal: Object }>"
              example={`await claw.createGoal({
  title: 'Complete API migration',
  category: 'engineering',
  target_date: '2025-03-01T00:00:00.000Z',
  progress: 30,
});`}
            />

            <MethodEntry
              id="recordContent"
              signature="claw.recordContent(content)"
              description="Record content creation (articles, posts, documents)."
              params={[
                { name: 'title', type: 'string', required: true, desc: 'Content title' },
                { name: 'platform', type: 'string', required: false, desc: 'Platform (e.g., "linkedin", "twitter")' },
                { name: 'status', type: 'string', required: false, desc: '"draft" or "published"' },
                { name: 'url', type: 'string', required: false, desc: 'Published URL' },
              ]}
              returns="Promise<{ content: Object }>"
              example={`await claw.recordContent({
  title: 'How We Migrated to Edge Functions',
  platform: 'linkedin',
  status: 'published',
  url: 'https://linkedin.com/posts/...',
});`}
            />

            <MethodEntry
              id="recordInteraction"
              signature="claw.recordInteraction(interaction)"
              description="Record a relationship interaction (message, meeting, email)."
              params={[
                { name: 'summary', type: 'string', required: true, desc: 'What happened' },
                { name: 'contact_name', type: 'string', required: false, desc: 'Contact name (auto-resolves to contact_id)' },
                { name: 'contact_id', type: 'string', required: false, desc: 'Direct contact ID' },
                { name: 'direction', type: 'string', required: false, desc: '"inbound" or "outbound"' },
                { name: 'type', type: 'string', required: false, desc: 'Interaction type (e.g., "message", "meeting", "email")' },
                { name: 'platform', type: 'string', required: false, desc: 'Platform used' },
              ]}
              returns="Promise<{ interaction: Object }>"
              example={`await claw.recordInteraction({
  contact_name: 'Jane Smith',
  summary: 'Discussed Q1 roadmap and timeline',
  type: 'meeting',
  direction: 'outbound',
});`}
            />

            <MethodEntry
              id="reportConnections"
              signature="claw.reportConnections(connections)"
              description="Report active connections/integrations for this agent. Call at agent startup to register what services the agent is connected to."
              params={[
                { name: 'connections', type: 'Object[]', required: true, desc: 'Array of connection objects' },
                { name: 'connections[].provider', type: 'string', required: true, desc: 'Service name (e.g., "anthropic", "github")' },
                { name: 'connections[].authType', type: 'string', required: false, desc: 'Auth method: api_key, subscription, oauth, pre_configured, environment' },
                { name: 'connections[].planName', type: 'string', required: false, desc: 'Plan name (e.g., "Pro Max")' },
                { name: 'connections[].status', type: 'string', required: false, desc: 'Connection status: active, inactive, error' },
                { name: 'connections[].metadata', type: 'Object|string', required: false, desc: 'Optional metadata (e.g., { cost: "$100/mo" })' },
              ]}
              returns='Promise<{ connections: Object[], created: number }>'
              example={`await claw.reportConnections([
  { provider: 'anthropic', authType: 'subscription', planName: 'Pro Max', status: 'active' },
  { provider: 'github', authType: 'oauth', status: 'active' },
  { provider: 'slack', authType: 'api_key', status: 'active', metadata: { workspace: 'eng-team' } },
]);`}
            />

            <MethodEntry
              id="createCalendarEvent"
              signature="claw.createCalendarEvent(event)"
              description="Create a calendar event."
              params={[
                { name: 'summary', type: 'string', required: true, desc: 'Event title/summary' },
                { name: 'start_time', type: 'string', required: true, desc: 'Start time (ISO string)' },
                { name: 'end_time', type: 'string', required: false, desc: 'End time (ISO string)' },
                { name: 'location', type: 'string', required: false, desc: 'Event location' },
                { name: 'description', type: 'string', required: false, desc: 'Event description' },
              ]}
              returns="Promise<{ event: Object }>"
              example={`await claw.createCalendarEvent({
  summary: 'Deploy review',
  start_time: '2025-02-10T14:00:00.000Z',
  end_time: '2025-02-10T14:30:00.000Z',
  description: 'Review prod deploy results',
});`}
            />

            <MethodEntry
              id="recordIdea"
              signature="claw.recordIdea(idea)"
              description="Record an idea or inspiration for later review."
              params={[
                { name: 'title', type: 'string', required: true, desc: 'Idea title' },
                { name: 'description', type: 'string', required: false, desc: 'Detailed description' },
                { name: 'category', type: 'string', required: false, desc: 'Category (e.g., "feature", "optimization", "content")' },
                { name: 'score', type: 'number', required: false, desc: 'Priority/quality score 0-100 (default: 50)' },
                { name: 'status', type: 'string', required: false, desc: '"pending", "in_progress", "shipped", "rejected"' },
                { name: 'source', type: 'string', required: false, desc: 'Where this idea came from' },
              ]}
              returns="Promise<{ idea: Object }>"
              example={`await claw.recordIdea({
  title: 'Auto-summarize daily agent activity',
  category: 'feature',
  score: 75,
  source: 'User feedback in Slack #agents',
});`}
            />

            <MethodEntry
              id="reportMemoryHealth"
              signature="claw.reportMemoryHealth(report)"
              description="Report memory health snapshot with entities and topics. Call periodically (e.g., daily) to track memory system health over time."
              params={[
                { name: 'health', type: 'Object', required: true, desc: 'Health metrics object' },
                { name: 'health.score', type: 'number', required: true, desc: 'Health score 0-100' },
                { name: 'health.total_files', type: 'number', required: false, desc: 'Number of memory files' },
                { name: 'health.total_lines', type: 'number', required: false, desc: 'Total lines across all files' },
                { name: 'health.total_size_kb', type: 'number', required: false, desc: 'Total size in KB' },
                { name: 'health.duplicates', type: 'number', required: false, desc: 'Potential duplicate facts' },
                { name: 'health.stale_count', type: 'number', required: false, desc: 'Stale facts count' },
                { name: 'entities', type: 'Object[]', required: false, desc: 'Key entities found in memory' },
                { name: 'topics', type: 'Object[]', required: false, desc: 'Topics/themes found in memory' },
              ]}
              returns="Promise<{ snapshot: Object, entities_count: number, topics_count: number }>"
              example={`await claw.reportMemoryHealth({
  health: {
    score: 82,
    total_files: 15,
    total_lines: 340,
    duplicates: 3,
    stale_count: 7,
  },
  entities: [
    { name: 'PostgreSQL', type: 'service', mentions: 12 },
    { name: 'auth-service', type: 'service', mentions: 8 },
  ],
  topics: [
    { name: 'deployment', mentions: 15 },
    { name: 'authentication', mentions: 9 },
  ],
});`}
            />
          </section>

          {/* ── Session Handoffs ── */}
          <section id="session-handoffs" className="scroll-mt-20 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Session Handoffs</h2>
            <p className="text-sm text-zinc-400 mb-6">Create structured session handoff documents for continuity between agent sessions.</p>

            <MethodEntry
              id="createHandoff"
              signature="createHandoff(handoff)"
              description="Create a session handoff document summarizing work done, decisions made, and next priorities."
              params={[
                { name: 'summary', type: 'string', required: true, desc: 'Session summary' },
                { name: 'session_date', type: 'string', required: false, desc: 'Date string (defaults to today)' },
                { name: 'key_decisions', type: 'string[]', required: false, desc: 'Key decisions made this session' },
                { name: 'open_tasks', type: 'string[]', required: false, desc: 'Tasks still open' },
                { name: 'mood_notes', type: 'string', required: false, desc: 'User mood/energy observations' },
                { name: 'next_priorities', type: 'string[]', required: false, desc: 'What to focus on next' },
              ]}
              returns="Promise<{handoff: Object, handoff_id: string}>"
              example={`await claw.createHandoff({
  summary: 'Completed auth system overhaul',
  key_decisions: ['JWT over sessions', 'Added refresh tokens'],
  open_tasks: ['Write migration guide', 'Load test'],
  next_priorities: ['Deploy to staging'],
});`}
            />

            <MethodEntry
              id="getHandoffs"
              signature="getHandoffs(filters?)"
              description="Get handoffs for this agent with optional date and limit filters."
              params={[
                { name: 'date', type: 'string', required: false, desc: 'Filter by session_date' },
                { name: 'limit', type: 'number', required: false, desc: 'Max results' },
              ]}
              returns="Promise<{handoffs: Object[], total: number}>"
              example={`const { handoffs } = await claw.getHandoffs({ limit: 5 });`}
            />

            <MethodEntry
              id="getLatestHandoff"
              signature="getLatestHandoff()"
              description="Get the most recent handoff for this agent. Useful at session start to restore context."
              returns="Promise<{handoff: Object|null}>"
              example={`const { handoff } = await claw.getLatestHandoff();
if (handoff) {
  console.log('Last session:', handoff.summary);
  console.log('Open tasks:', JSON.parse(handoff.open_tasks));
}`}
            />
          </section>

          {/* ── Context Manager ── */}
          <section id="context-manager" className="scroll-mt-20 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Context Manager</h2>
            <p className="text-sm text-zinc-400 mb-6">Capture key points and organize context into threads for long-running topics.</p>

            <MethodEntry
              id="captureKeyPoint"
              signature="captureKeyPoint(point)"
              description="Capture a key point from the current session for later recall."
              params={[
                { name: 'content', type: 'string', required: true, desc: 'The key point content' },
                { name: 'category', type: 'string', required: false, desc: 'One of: decision, task, insight, question, general' },
                { name: 'importance', type: 'number', required: false, desc: 'Importance 1-10 (default 5)' },
                { name: 'session_date', type: 'string', required: false, desc: 'Date string (defaults to today)' },
              ]}
              returns="Promise<{point: Object, point_id: string}>"
              example={`await claw.captureKeyPoint({
  content: 'User wants dark mode as the default theme',
  category: 'decision',
  importance: 8,
});`}
            />

            <MethodEntry id="getKeyPoints" signature="getKeyPoints(filters?)" description="Get key points with optional category and date filters." params={[{ name: 'category', type: 'string', required: false, desc: 'Filter by category' }, { name: 'session_date', type: 'string', required: false, desc: 'Filter by date' }, { name: 'limit', type: 'number', required: false, desc: 'Max results' }]} returns="Promise<{points: Object[], total: number}>" example={`const { points } = await claw.getKeyPoints({ category: 'decision' });`} />

            <MethodEntry id="createThread" signature="createThread(thread)" description="Create a context thread for tracking a topic across multiple entries." params={[{ name: 'name', type: 'string', required: true, desc: 'Thread name (unique per agent per org)' }, { name: 'summary', type: 'string', required: false, desc: 'Initial summary' }]} returns="Promise<{thread: Object, thread_id: string}>" example={`const { thread_id } = await claw.createThread({ name: 'Auth System', summary: 'Tracking auth decisions' });`} />

            <MethodEntry id="addThreadEntry" signature="addThreadEntry(threadId, content, entryType?)" description="Add an entry to an existing thread." params={[{ name: 'threadId', type: 'string', required: true, desc: 'Thread ID' }, { name: 'content', type: 'string', required: true, desc: 'Entry content' }, { name: 'entryType', type: 'string', required: false, desc: 'Entry type (default: note)' }]} returns="Promise<{entry: Object, entry_id: string}>" example={`await claw.addThreadEntry(threadId, 'Decided on JWT strategy');`} />

            <MethodEntry id="closeThread" signature="closeThread(threadId, summary?)" description="Close a thread with an optional final summary." params={[{ name: 'threadId', type: 'string', required: true, desc: 'Thread ID' }, { name: 'summary', type: 'string', required: false, desc: 'Final summary' }]} returns="Promise<{thread: Object}>" example={`await claw.closeThread(threadId, 'Auth complete: JWT + refresh tokens');`} />

            <MethodEntry id="getThreads" signature="getThreads(filters?)" description="Get threads with optional status filter." params={[{ name: 'status', type: 'string', required: false, desc: 'Filter: active or closed' }, { name: 'limit', type: 'number', required: false, desc: 'Max results' }]} returns="Promise<{threads: Object[], total: number}>" example={`const { threads } = await claw.getThreads({ status: 'active' });`} />

            <MethodEntry id="getContextSummary" signature="getContextSummary()" description="Get a combined view of today's key points and active threads." returns="Promise<{points: Object[], threads: Object[]}>" example={`const { points, threads } = await claw.getContextSummary();`} />
          </section>

          {/* ── Automation Snippets ── */}
          <section id="automation-snippets" className="scroll-mt-20 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Automation Snippets</h2>
            <p className="text-sm text-zinc-400 mb-6">Save, search, and reuse code snippets across agent sessions.</p>

            <MethodEntry id="saveSnippet" signature="saveSnippet(snippet)" description="Save or update a reusable code snippet. Upserts on name." params={[{ name: 'name', type: 'string', required: true, desc: 'Snippet name (unique per org)' }, { name: 'code', type: 'string', required: true, desc: 'The snippet code' }, { name: 'description', type: 'string', required: false, desc: 'What this snippet does' }, { name: 'language', type: 'string', required: false, desc: 'Programming language' }, { name: 'tags', type: 'string[]', required: false, desc: 'Tags for categorization' }]} returns="Promise<{snippet: Object, snippet_id: string}>" example={`await claw.saveSnippet({
  name: 'fetch-with-retry',
  code: 'async function fetchRetry(url, n = 3) { ... }',
  language: 'javascript',
  tags: ['fetch', 'retry'],
});`} />

            <MethodEntry id="getSnippets" signature="getSnippets(filters?)" description="Search and list snippets." params={[{ name: 'search', type: 'string', required: false, desc: 'Search name/description' }, { name: 'tag', type: 'string', required: false, desc: 'Filter by tag' }, { name: 'language', type: 'string', required: false, desc: 'Filter by language' }, { name: 'limit', type: 'number', required: false, desc: 'Max results' }]} returns="Promise<{snippets: Object[], total: number}>" example={`const { snippets } = await claw.getSnippets({ language: 'javascript' });`} />

            <MethodEntry id="useSnippet" signature="useSnippet(snippetId)" description="Mark a snippet as used (increments use_count)." params={[{ name: 'snippetId', type: 'string', required: true, desc: 'Snippet ID' }]} returns="Promise<{snippet: Object}>" example={`await claw.useSnippet('sn_abc123');`} />

            <MethodEntry id="deleteSnippet" signature="deleteSnippet(snippetId)" description="Delete a snippet." params={[{ name: 'snippetId', type: 'string', required: true, desc: 'Snippet ID' }]} returns="Promise<{deleted: boolean, id: string}>" example={`await claw.deleteSnippet('sn_abc123');`} />
          </section>

          {/* ── User Preferences ── */}
          <section id="user-preferences" className="scroll-mt-20 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-2xl font-bold tracking-tight mb-2">User Preferences</h2>
            <p className="text-sm text-zinc-400 mb-6">Track user observations, learned preferences, mood, and successful approaches.</p>

            <MethodEntry id="logObservation" signature="logObservation(obs)" description="Log something you noticed about the user." params={[{ name: 'observation', type: 'string', required: true, desc: 'The observation text' }, { name: 'category', type: 'string', required: false, desc: 'Category tag' }, { name: 'importance', type: 'number', required: false, desc: 'Importance 1-10' }]} returns="Promise<{observation: Object}>" example={`await claw.logObservation({ observation: 'Prefers tabs over spaces', category: 'coding', importance: 6 });`} />

            <MethodEntry id="setPreference" signature="setPreference(pref)" description="Record a learned user preference." params={[{ name: 'preference', type: 'string', required: true, desc: 'Preference description' }, { name: 'category', type: 'string', required: false, desc: 'Category tag' }, { name: 'confidence', type: 'number', required: false, desc: 'Confidence 0-100' }]} returns="Promise<{preference: Object}>" example={`await claw.setPreference({ preference: 'Prefers concise responses', confidence: 90 });`} />

            <MethodEntry id="logMood" signature="logMood(entry)" description="Log user mood and energy level." params={[{ name: 'mood', type: 'string', required: true, desc: 'Mood (e.g., focused, frustrated)' }, { name: 'energy', type: 'string', required: false, desc: 'Energy level (high, low)' }, { name: 'notes', type: 'string', required: false, desc: 'Additional notes' }]} returns="Promise<{mood: Object}>" example={`await claw.logMood({ mood: 'focused', energy: 'high' });`} />

            <MethodEntry id="trackApproach" signature="trackApproach(entry)" description="Track an approach and whether it worked. Upserts — repeated calls update success/fail counts." params={[{ name: 'approach', type: 'string', required: true, desc: 'Approach description' }, { name: 'context', type: 'string', required: false, desc: 'When to use this' }, { name: 'success', type: 'boolean', required: false, desc: 'true = worked, false = failed' }]} returns="Promise<{approach: Object}>" example={`await claw.trackApproach({ approach: 'Show code before explanation', success: true });`} />

            <MethodEntry id="getPreferenceSummary" signature="getPreferenceSummary()" description="Get a summary of all user preference data for this agent." returns="Promise<{summary: Object}>" example={`const { summary } = await claw.getPreferenceSummary();`} />

            <MethodEntry id="getApproaches" signature="getApproaches(filters?)" description="Get tracked approaches ranked by success count." params={[{ name: 'limit', type: 'number', required: false, desc: 'Max results' }]} returns="Promise<{approaches: Object[], total: number}>" example={`const { approaches } = await claw.getApproaches({ limit: 10 });`} />
          </section>

          {/* ── Daily Digest ── */}
          <section id="daily-digest" className="scroll-mt-20 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Daily Digest</h2>
            <p className="text-sm text-zinc-400 mb-6">Aggregated daily summary from all data sources — no new storage needed.</p>

            <MethodEntry id="getDailyDigest" signature="getDailyDigest(date?)" description="Get a daily activity digest aggregated from actions, decisions, lessons, content, ideas, interactions, and goals." params={[{ name: 'date', type: 'string', required: false, desc: 'YYYY-MM-DD (defaults to today)' }]} returns="Promise<{date: string, digest: Object, summary: Object}>" example={`const { digest, summary } = await claw.getDailyDigest();
console.log(\`Today: \${summary.action_count} actions, \${summary.decision_count} decisions\`);`} />
          </section>

          {/* ── Security Scanning ── */}
          <section id="security-scanning" className="scroll-mt-20 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Security Scanning</h2>
            <p className="text-sm text-zinc-400 mb-6">Scan text for sensitive data (API keys, tokens, PII) before sending it externally. Content is never stored — only metadata.</p>

            <MethodEntry id="scanContent" signature="scanContent(text, destination?)" description="Scan text for sensitive data. Returns findings and redacted text. Does not store anything." params={[{ name: 'text', type: 'string', required: true, desc: 'Text to scan' }, { name: 'destination', type: 'string', required: false, desc: 'Where text is headed (context)' }]} returns="Promise<{clean: boolean, findings_count: number, findings: Object[], redacted_text: string}>" example={`const result = await claw.scanContent(messageText, 'slack');
if (!result.clean) {
  console.warn(\`Found \${result.findings_count} issues\`);
  messageText = result.redacted_text; // Use redacted version
}`} />

            <MethodEntry id="reportSecurityFinding" signature="reportSecurityFinding(text, destination?)" description="Same as scanContent but stores finding metadata (never the content) for audit trails." params={[{ name: 'text', type: 'string', required: true, desc: 'Text to scan' }, { name: 'destination', type: 'string', required: false, desc: 'Where text is headed' }]} returns="Promise<{clean: boolean, findings_count: number, findings: Object[], redacted_text: string}>" example={`await claw.reportSecurityFinding(outboundMessage, 'email');`} />
          </section>

          {/* ── Agent Messaging ── */}
          <section id="agent-messaging" className="scroll-mt-20 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Agent Messaging</h2>
            <p className="text-sm text-zinc-400 mb-6">Direct inter-agent messaging with inbox semantics, conversation threads, shared workspace documents, and broadcast capability.</p>

            <MethodEntry id="sendMessage" signature={`sendMessage({ to, type, subject, body, threadId?, urgent?, docRef? })`} description="Send a message to another agent. Omit 'to' to broadcast to all agents." params={[{ name: 'to', type: 'string', required: false, desc: 'Target agent ID (null = broadcast)' }, { name: 'type', type: 'string', required: false, desc: 'Message type: action|info|lesson|question|status (default: info)' }, { name: 'subject', type: 'string', required: false, desc: 'Subject line (max 200 chars)' }, { name: 'body', type: 'string', required: true, desc: 'Message body (max 2000 chars)' }, { name: 'threadId', type: 'string', required: false, desc: 'Thread ID to attach to' }, { name: 'urgent', type: 'boolean', required: false, desc: 'Mark as urgent' }, { name: 'docRef', type: 'string', required: false, desc: 'Reference to a shared doc ID' }]} returns="Promise<{message: Object, message_id: string}>" example={`await claw.sendMessage({
  to: 'ops-agent',
  type: 'question',
  subject: 'Deploy approval needed',
  body: 'Auth service ready for prod. Please review.',
  urgent: true,
});`} />

            <MethodEntry id="getInbox" signature="getInbox({ type?, unread?, threadId?, limit? })" description="Get inbox messages for this agent (direct + broadcasts, excluding archived)." params={[{ name: 'type', type: 'string', required: false, desc: 'Filter by message type' }, { name: 'unread', type: 'boolean', required: false, desc: 'Only unread messages' }, { name: 'threadId', type: 'string', required: false, desc: 'Filter by thread' }, { name: 'limit', type: 'number', required: false, desc: 'Max messages (default: 50)' }]} returns="Promise<{messages: Object[], total: number, unread_count: number}>" example={`const { messages, unread_count } = await claw.getInbox({ unread: true });
console.log(\`\${unread_count} unread messages\`);`} />

            <MethodEntry id="markRead" signature="markRead(messageIds)" description="Mark one or more messages as read." params={[{ name: 'messageIds', type: 'string[]', required: true, desc: 'Array of message IDs' }]} returns="Promise<{updated: number}>" example={`await claw.markRead(['msg_abc123', 'msg_def456']);`} />

            <MethodEntry id="archiveMessages" signature="archiveMessages(messageIds)" description="Archive messages (removes from inbox)." params={[{ name: 'messageIds', type: 'string[]', required: true, desc: 'Array of message IDs' }]} returns="Promise<{updated: number}>" example={`await claw.archiveMessages(['msg_abc123']);`} />

            <MethodEntry id="broadcast" signature={`broadcast({ type, subject, body, threadId? })`} description="Broadcast a message to all agents in the organization." params={[{ name: 'type', type: 'string', required: false, desc: 'Message type (default: info)' }, { name: 'subject', type: 'string', required: false, desc: 'Subject line' }, { name: 'body', type: 'string', required: true, desc: 'Message body' }, { name: 'threadId', type: 'string', required: false, desc: 'Thread ID' }]} returns="Promise<{message: Object, message_id: string}>" example={`await claw.broadcast({
  type: 'status',
  subject: 'Deployment complete',
  body: 'Auth service v2.1 deployed to production.',
});`} />

            <MethodEntry id="createMessageThread" signature={`createMessageThread({ name, participants? })`} description="Start a new conversation thread." params={[{ name: 'name', type: 'string', required: true, desc: 'Thread name' }, { name: 'participants', type: 'string[]', required: false, desc: 'Agent IDs (null = open to all)' }]} returns="Promise<{thread: Object, thread_id: string}>" example={`const { thread_id } = await claw.createMessageThread({
  name: 'Auth Service Migration',
  participants: ['ops-agent', 'security-agent'],
});`} />

            <MethodEntry id="getMessageThreads" signature="getMessageThreads({ status?, limit? })" description="List message threads this agent participates in." params={[{ name: 'status', type: 'string', required: false, desc: 'Filter: open|resolved|archived' }, { name: 'limit', type: 'number', required: false, desc: 'Max threads (default: 20)' }]} returns="Promise<{threads: Object[], total: number}>" example={`const { threads } = await claw.getMessageThreads({ status: 'open' });`} />

            <MethodEntry id="resolveMessageThread" signature="resolveMessageThread(threadId, summary?)" description="Close a conversation thread with an optional summary." params={[{ name: 'threadId', type: 'string', required: true, desc: 'Thread ID' }, { name: 'summary', type: 'string', required: false, desc: 'Resolution summary' }]} returns="Promise<{thread: Object}>" example={`await claw.resolveMessageThread('mt_abc123', 'Migration completed successfully.');`} />

            <MethodEntry id="saveSharedDoc" signature={`saveSharedDoc({ name, content })`} description="Create or update a shared workspace document. Upserts by name — updates increment the version." params={[{ name: 'name', type: 'string', required: true, desc: 'Document name (unique per org)' }, { name: 'content', type: 'string', required: true, desc: 'Document content' }]} returns="Promise<{doc: Object, doc_id: string}>" example={`await claw.saveSharedDoc({
  name: 'runbook/auth-deploy',
  content: '# Auth Deploy Runbook\\n\\n1. Run migrations...',
});`} />
          </section>

          {/* ── Bulk Sync ── */}
          <section id="bulk-sync" className="scroll-mt-20 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Bulk Sync</h2>
            <p className="text-sm text-zinc-400 mb-8">
              Push multiple data categories in a single request. Ideal for bootstrapping agent state or periodic state snapshots.
              Every key is optional &mdash; only provided categories are processed. Each category is independent; partial failures
              in one category don&apos;t block others.
            </p>

            <MethodEntry id="syncState" signature="syncState(state)" description="Sync multiple data categories in a single request. Accepts connections, memory, goals, learning, content, inspiration, context_points, context_threads, handoffs, preferences, and snippets." params={[{ name: 'state.connections', type: 'Object[]', required: false, desc: 'Service connections (max 50)' }, { name: 'state.memory', type: 'Object', required: false, desc: '{ health, entities[], topics[] }' }, { name: 'state.goals', type: 'Object[]', required: false, desc: 'Goals (max 100)' }, { name: 'state.learning', type: 'Object[]', required: false, desc: 'Decisions/lessons (max 100)' }, { name: 'state.context_points', type: 'Object[]', required: false, desc: 'Key points (max 200)' }, { name: 'state.context_threads', type: 'Object[]', required: false, desc: 'Threads (max 50, upserts by name)' }, { name: 'state.snippets', type: 'Object[]', required: false, desc: 'Code snippets (max 50, upserts by name)' }, { name: 'state.handoffs', type: 'Object[]', required: false, desc: 'Session handoffs (max 50)' }, { name: 'state.preferences', type: 'Object', required: false, desc: '{ observations[], preferences[], moods[], approaches[] }' }, { name: 'state.content', type: 'Object[]', required: false, desc: 'Content items (max 100)' }, { name: 'state.inspiration', type: 'Object[]', required: false, desc: 'Ideas (max 100)' }]} returns="Promise<{results: Object, total_synced: number, total_errors: number, duration_ms: number}>" example={`const result = await claw.syncState({
  connections: [
    { provider: 'github', auth_type: 'oauth', status: 'active' },
    { provider: 'neon', auth_type: 'api_key', status: 'active' },
  ],
  goals: [
    { title: 'Deploy v2', status: 'active' },
  ],
  learning: [
    { decision: 'Used JWT for Edge compat', reasoning: 'NextAuth on Vercel Edge' },
  ],
  context_points: [
    { content: 'Dark-only theme', category: 'insight', importance: 7 },
  ],
});
console.log(\`Synced \${result.total_synced} items in \${result.duration_ms}ms\`);`} />
          </section>

          {/* ── Error Handling ── */}
          <section id="error-handling" className="scroll-mt-20 pt-12 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Error Handling</h2>
            <p className="text-sm text-zinc-400 mb-6">
              All SDK methods throw on non-2xx responses. Errors include <code className="font-mono text-xs text-zinc-300 bg-[#1a1a1a] px-1.5 py-0.5 rounded">status</code> (HTTP code) and <code className="font-mono text-xs text-zinc-300 bg-[#1a1a1a] px-1.5 py-0.5 rounded">details</code> (when available).
            </p>

            <CodeBlock title="Error shape">{`{
  message: "Validation failed",  // error.message
  status: 400,                    // error.status (HTTP status code)
  details: { ... }                // error.details (optional)
}`}</CodeBlock>

            <div className="mt-6">
              <CodeBlock title="Recommended pattern">{`try {
  const { action_id } = await claw.createAction({
    action_type: 'deploy',
    declared_goal: 'Deploy to production',
  });
} catch (err) {
  if (err.status === 401) {
    console.error('Invalid API key');
  } else if (err.status === 429) {
    console.error('Rate limited — slow down');
  } else {
    console.error(\`Action failed: \${err.message}\`);
  }
}`}</CodeBlock>
            </div>
          </section>
        </div>
      </div>

      {/* Agent Tools */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <section id="agent-tools" className="scroll-mt-24">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <Terminal size={24} className="text-brand" />
            Agent Tools (Python)
          </h2>
          <p className="text-zinc-400 mb-6">
            The <code className="text-zinc-300">agent-tools/</code> directory contains Python CLI tools that run locally alongside your agent. They track learning, goals, context, memory health, security, and more in local SQLite databases. Each tool supports an optional <code className="text-zinc-300">--push</code> flag to sync data to your DashClaw dashboard.
          </p>

          <h3 className="text-lg font-semibold mb-3 text-zinc-200">Install &amp; Configure</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Run the installer for your platform, then configure dashboard sync (optional).
          </p>
          <div className="space-y-4 mb-8">
            <CodeBlock title="Mac / Linux">{`bash ./agent-tools/install-mac.sh`}</CodeBlock>
            <CodeBlock title="Windows (PowerShell)">{`powershell -ExecutionPolicy Bypass -File .\\agent-tools\\install-windows.ps1`}</CodeBlock>
            <CodeBlock title="Configure dashboard sync (optional)">{`# Copy and edit the config file
cp agent-tools/.env.example agent-tools/secrets/dashclaw.env

# Set your dashboard URL, API key, and agent ID
DASHCLAW_URL=https://your-deployment.vercel.app
DASHCLAW_API_KEY=oc_live_...
DASHCLAW_AGENT_ID=my-agent`}</CodeBlock>
          </div>

          <h3 className="text-lg font-semibold mb-3 text-zinc-200">Tool Categories</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[
              { group: 'Ops & Learning', tools: ['learning-database', 'error-logger', 'daily-digest', 'api-monitor'] },
              { group: 'Context & Sessions', tools: ['context-manager', 'session-handoff', 'open-loops'] },
              { group: 'Memory & Knowledge', tools: ['memory-health', 'memory-search', 'token-efficiency'] },
              { group: 'Security & Audit', tools: ['outbound-filter', 'session-isolator', 'audit-logger'] },
              { group: 'Relationships', tools: ['relationship-tracker', 'communication-analytics', 'user-context'] },
              { group: 'Automation', tools: ['automation-library', 'token-capture', 'sync_to_dashclaw'] },
            ].map((cat) => (
              <div key={cat.group} className="p-4 rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)]">
                <h4 className="text-sm font-semibold text-white mb-2">{cat.group}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {cat.tools.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] text-xs text-zinc-400 font-mono">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold mb-3 text-zinc-200">Tool-to-SDK Mapping</h3>
          <p className="text-sm text-zinc-500 mb-4">
            Python CLI tools push to the same API endpoints as the JavaScript SDK methods.
          </p>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Python Tool</th>
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Command</th>
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">API Endpoint</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">JS SDK Method</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {[
                  ['learner.py', 'log --push', 'POST /api/learning', 'recordDecision()'],
                  ['goals.py', 'add --push', 'POST /api/goals', 'createGoal()'],
                  ['tracker.py', 'log --push', 'POST /api/relationships', 'recordInteraction()'],
                  ['scanner.py', 'scan --push', 'POST /api/memory', 'reportMemoryHealth()'],
                  ['context.py', 'capture --push', 'POST /api/context/points', 'captureKeyPoint()'],
                  ['context.py', 'thread --push', 'POST /api/context/threads', 'createThread()'],
                  ['handoff.py', 'create --push', 'POST /api/handoffs', 'createHandoff()'],
                  ['snippets.py', 'add --push', 'POST /api/snippets', 'saveSnippet()'],
                  ['user_context.py', 'note --push', 'POST /api/preferences', 'logObservation()'],
                  ['loops.py', 'add --push', 'POST /api/actions/loops', 'registerOpenLoop()'],
                  ['comms.py', 'log --push', 'POST /api/relationships', 'recordInteraction()'],
                  ['errors.py', 'log --push', 'POST /api/learning', 'recordDecision()'],
                  ['outbound_filter.py', 'scan --push', 'POST /api/security/scan', 'scanContent()'],
                ].map(([tool, cmd, endpoint, sdk], i) => (
                  <tr key={i} className="border-b border-[rgba(255,255,255,0.03)]">
                    <td className="py-2 pr-4 font-mono text-xs">{tool}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{cmd}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-zinc-500">{endpoint}</td>
                    <td className="py-2 font-mono text-xs text-brand">{sdk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold mb-3 text-zinc-200">Bulk Sync</h3>
          <CodeBlock title="Sync all local data">{`# Preview what would sync
python agent-tools/tools/sync_to_dashclaw.py --dry-run

# Sync everything
python agent-tools/tools/sync_to_dashclaw.py

# Sync specific categories
python agent-tools/tools/sync_to_dashclaw.py --categories learning,goals,context_points`}</CodeBlock>
        </section>
      </div>

      <footer className="border-t border-[rgba(255,255,255,0.06)] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-brand" />
            <span className="text-sm text-zinc-400">DashClaw</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="https://github.com/ucsandman/DashClaw" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">GitHub</a>
            <Link href="/docs" className="hover:text-zinc-300">Docs</Link>
            <Link href="/toolkit" className="hover:text-zinc-300">Toolkit</Link>
            <Link href="/gallery" className="hover:text-zinc-300">Gallery</Link>
            <Link href="/self-host" className="hover:text-zinc-300">Self-Host</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
