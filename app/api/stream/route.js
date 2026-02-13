import { getOrgId } from '../../lib/org.js';
import { eventBus, EVENTS } from '../../lib/events.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const orgId = getOrgId(request);
    
    // Create a TransformStream for the SSE response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Helper to send SSE messages
    const send = async (event, data) => {
      const message = `event: ${event}
data: ${JSON.stringify(data)}

`;
      await writer.write(encoder.encode(message));
    };

    // Event listener
    const onActionCreated = (payload) => {
      if (payload.orgId === orgId) send(EVENTS.ACTION_CREATED, payload.action);
    };
    const onActionUpdated = (payload) => {
      if (payload.orgId === orgId) send(EVENTS.ACTION_UPDATED, payload.action);
    };

    // Subscribe
    eventBus.on(EVENTS.ACTION_CREATED, onActionCreated);
    eventBus.on(EVENTS.ACTION_UPDATED, onActionUpdated);

    // Initial connection message
    send('connected', { status: 'ok', orgId });

    // Clean up on close (when the request is aborted by client)
    request.signal.addEventListener('abort', () => {
      eventBus.off(EVENTS.ACTION_CREATED, onActionCreated);
      eventBus.off(EVENTS.ACTION_UPDATED, onActionUpdated);
      writer.close().catch(() => {});
    });

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('SSE Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
