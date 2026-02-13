import { EventEmitter } from 'events';

// Global event bus for server-side broadcasting
// Note: In serverless (Vercel), this only works for connections on the SAME instance.
// For true scale-out real-time, we'd need Redis Pub/Sub or similar.
// For a single-instance or self-hosted setup, this works perfectly.

class DashClawEvents extends EventEmitter {}

// Singleton instance
export const eventBus = new DashClawEvents();

// Event constants
export const EVENTS = {
  ACTION_CREATED: 'action.created',
  ACTION_UPDATED: 'action.updated',
  SIGNAL_DETECTED: 'signal.detected',
  TOKEN_USAGE: 'token.usage',
};
