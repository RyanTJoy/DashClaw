/**
 * Billing & Cost Calculation Library
 */

/**
 * Estimate cost based on token usage and model.
 * Pricing based on Anthropic Claude (Feb 2026).
 * 
 * @param {number} tokensIn - Input tokens
 * @param {number} tokensOut - Output tokens
 * @param {string} model - Model identifier
 * @returns {number} Estimated cost in USD
 */
export function estimateCost(tokensIn, tokensOut, model = 'opus') {
  const m = String(model || 'opus').toLowerCase();
  
  // Haiku 3.5: $0.25/M input, $1.25/M output
  if (m.includes('haiku')) {
    return (tokensIn * 0.25 / 1000000) + (tokensOut * 1.25 / 1000000);
  }
  
  // Sonnet 3.5: $3/M input, $15/M output
  if (m.includes('sonnet')) {
    return (tokensIn * 3 / 1000000) + (tokensOut * 15 / 1000000);
  }
  
  // GPT-4o: $5/M input, $15/M output
  if (m.includes('gpt-4o') && !m.includes('mini')) {
    return (tokensIn * 5 / 1000000) + (tokensOut * 15 / 1000000);
  }

  // GPT-4o-mini: $0.15/M input, $0.60/M output
  if (m.includes('gpt-4o-mini')) {
    return (tokensIn * 0.15 / 1000000) + (tokensOut * 0.60 / 1000000);
  }

  // Default to Opus pricing: $15/M input, $75/M output
  return (tokensIn * 15 / 1000000) + (tokensOut * 75 / 1000000);
}
