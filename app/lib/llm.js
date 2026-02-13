/**
 * Lightweight LLM client for Semantic Guardrails.
 * Designed to be zero-dependency (uses native fetch).
 *
 * Cost Control:
 * - Only runs if GUARD_LLM_KEY is set.
 * - Defaults to 'allow' if no key is present (unless policy strictness overrides).
 */

const GUARD_PROMPT_TEMPLATE = `
You are a security guardrail for an AI agent.
Analyze the following ACTION against the POLICY.

ACTION:
{action_context}

POLICY:
{policy_instruction}

Your task:
1. Determine if the action violates the policy.
2. If it violates, return allowed: false.
3. If it is safe/compliant, return allowed: true.
4. Provide a short reason.

Respond ONLY with valid JSON:
{
  "allowed": boolean,
  "reason": "string"
}
`;

export async function checkSemanticGuardrail(context, instruction, model = 'gpt-4o-mini') {
  const apiKey = process.env.GUARD_LLM_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = process.env.GUARD_LLM_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
    console.warn('[Guard] No GUARD_LLM_KEY or OPENAI_API_KEY configured. Skipping semantic check.');
    return null; // Indeterminate result
  }

  const actionContext = JSON.stringify({
    type: context.action_type,
    goal: context.declared_goal,
    systems: context.systems_touched,
    risk: context.risk_score
  }, null, 2);

  const prompt = GUARD_PROMPT_TEMPLATE
    .replace('{action_context}', actionContext)
    .replace('{policy_instruction}', instruction);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are a JSON-only security compliance bot.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        max_tokens: 150,
        response_format: { type: "json_object" }
      })
    });

    if (!res.ok) {
      console.error(`[Guard] LLM request failed: ${res.status} ${await res.text()}`);
      return null;
    }

    const data = await res.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) return null;

    return JSON.parse(content); // Expected: { allowed, reason }

  } catch (error) {
    console.error('[Guard] Semantic check error:', error);
    return null;
  }
}
