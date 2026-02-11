/**
 * DashClaw SDK — CommonJS compatibility wrapper.
 * For ESM: import { DashClaw } from 'dashclaw'
 * For CJS: const { DashClaw } = require('dashclaw')
 */

let _module;

async function loadModule() {
  if (!_module) {
    _module = await import('./dashclaw.js');
  }
  return _module;
}

// Re-export via dynamic import (CJS → ESM bridge)
module.exports = new Proxy({}, {
  get(target, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'then') return undefined; // Prevent Promise-like behavior

    // Return a lazy-loading constructor wrapper
    if (prop === 'GuardBlockedError') {
      // Return a placeholder that resolves to the real class
      return class GuardBlockedErrorProxy extends Error {
        constructor(decision) {
          const reasons = (decision.reasons || []).join('; ') || 'no reason';
          super(`Guard blocked action: ${decision.decision}. Reasons: ${reasons}`);
          this.name = 'GuardBlockedError';
          this.decision = decision.decision;
          this.reasons = decision.reasons || [];
          this.warnings = decision.warnings || [];
          this.matchedPolicies = decision.matched_policies || [];
          this.riskScore = decision.risk_score ?? null;
        }
      };
    }
    if (prop === 'DashClaw' || prop === 'OpenClawAgent' || prop === 'default') {
      return class DashClawProxy {
        constructor(opts) {
          // Store options, actual instance created async
          this._opts = opts;
          this._ready = loadModule().then(m => {
            const Cls = m.DashClaw || m.default;
            this._instance = new Cls(opts);
          });
        }

        // For synchronous construction, use DashClaw.create()
        static async create(opts) {
          const mod = await loadModule();
          const Cls = mod.DashClaw || mod.default;
          return new Cls(opts);
        }
      };
    }
    return undefined;
  }
});

// Preferred: async factory
module.exports.create = async function create(opts) {
  const mod = await loadModule();
  const Cls = mod.DashClaw || mod.default;
  return new Cls(opts);
};
