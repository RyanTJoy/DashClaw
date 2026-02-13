import { fetch } from 'undici';
import EventSource from 'eventsource';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.DASHCLAW_API_KEY || 'oc_live_dev';

console.log(`Connecting to stream at ${BASE_URL}/api/stream...`);

const es = new EventSource(`${BASE_URL}/api/stream`, {
  headers: {
    'x-api-key': API_KEY,
    // Simulate same-origin for middleware if needed, though API key should suffice
    'sec-fetch-site': 'same-origin' 
  }
});

es.onopen = () => {
  console.log('✅ SSE Connected!');
  
  // Trigger an action to see if we get the event
  console.log('Triggering action...');
  triggerAction();
};

es.onerror = (err) => {
  console.error('❌ SSE Error:', err);
  process.exit(1);
};

es.addEventListener('action.created', (e) => {
  console.log('✅ Received action.created event:');
  console.log(JSON.parse(e.data));
  es.close();
  process.exit(0);
});

async function triggerAction() {
  try {
    const res = await fetch(`${BASE_URL}/api/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        agent_id: 'realtime-test',
        action_type: 'test',
        declared_goal: 'Verify Real-Time Flight Recorder',
        risk_score: 10
      })
    });
    
    if (!res.ok) {
      console.error('❌ Failed to trigger action:', await res.text());
    } else {
      console.log('✅ Action triggered via API');
    }
  } catch (err) {
    console.error('❌ Error triggering action:', err);
  }
}
