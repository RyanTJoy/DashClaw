import { checkSemanticGuardrail } from '../app/lib/llm.js';

// Mock process.env
process.env.GUARD_LLM_KEY = 'mock-key';

// Mock fetch
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
  console.log(`[MockFetch] ${url}`);
  const body = JSON.parse(options.body);
  //console.log('[MockFetch] Prompt:', body.messages[1].content);

  // Simple mock logic
  const isSafe = !body.messages[1].content.includes('Delete system logs');
  
  return {
    ok: true,
    json: async () => ({
      choices: [{
        message: {
          content: JSON.stringify({
            allowed: isSafe,
            reason: isSafe ? 'Safe action' : 'Cannot delete files'
          })
        }
      }]
    })
  };
};

async function test() {
  console.log('--- Test 1: Safe Action ---');
  const safeResult = await checkSemanticGuardrail(
    { action_type: 'read', declared_goal: 'Read config' },
    'Do not allow deleting files'
  );
  console.log('Result:', safeResult);

  console.log('\n--- Test 2: Unsafe Action ---');
  const unsafeResult = await checkSemanticGuardrail(
    { action_type: 'delete', declared_goal: 'Delete system logs' },
    'Do not allow deleting files'
  );
  console.log('Result:', unsafeResult);
}

test();
