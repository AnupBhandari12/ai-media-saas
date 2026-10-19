/** Pricing snapshot reviewed 2026-10-19 against official OpenAI model docs.
 * IMPORTANT: estimate is NOT a billing limit. Paid dispatch needs an external
 * durable budget reservation and an explicit human approval. */
export const REAL_AI_MODEL = 'gpt-6-luna';
export const REAL_AI_PRICE_PER_MILLION = Object.freeze({input: 0.10, output: 0.50});
export const REAL_AI_PRICING_SOURCE = 'https://developers.openai.com/api/docs/models/gpt-6-luna';
export function estimateRealAiUsd({inputTokens, outputTokens} = {}) {
  for (const value of [inputTokens, outputTokens]) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 2_000_000) {
      throw new Error('Invalid actual token usage.');
    }
  }
  return Number(((inputTokens * REAL_AI_PRICE_PER_MILLION.input +
    outputTokens * REAL_AI_PRICE_PER_MILLION.output) / 1_000_000).toFixed(9));
}
/** An ESTIMATE deliberately never returns dispatch authorization. */
export function getRealAiModelReview() {
  return Object.freeze({model:REAL_AI_MODEL, prices:REAL_AI_PRICE_PER_MILLION,
    documentation:REAL_AI_PRICING_SOURCE, billableImageTokens:true,
    paidDispatchAllowed:false, costEstimateIsSpendingApproval:false});
}
