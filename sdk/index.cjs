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
