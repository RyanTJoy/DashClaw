export function isDemoMode() {
  // Primary signal: build-time client env.
  if (process.env.NEXT_PUBLIC_DASHCLAW_MODE === 'demo') return true;

  // Fallback: cookie set by /demo (works even if env wasn't set on the deployment).
  if (typeof document !== 'undefined') {
    return document.cookie.split(';').some(c => c.trim() === 'dashclaw_demo=1');
  }

  return false;
}

