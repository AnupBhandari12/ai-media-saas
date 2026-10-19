// Hard budget bounds for a local paid beta. Micro-USD are integers.
// An estimate is never a guarantee of vendor billing; operator must also cap provider account billing.
export const OPENAI_BUDGET_ID = "OPENAI_STANDARD";
export const AI_BUDGET_RESERVATION_MICROS = Object.freeze({CAPTION: 1000, ALT_TEXT: 30000});
export function requireAiReservationMicros(action, amount) {
  if (!Object.hasOwn(AI_BUDGET_RESERVATION_MICROS, action) ||
      !Number.isSafeInteger(amount) || amount !== AI_BUDGET_RESERVATION_MICROS[action]) {
    throw new Error("AI_SPEND_BUDGET_POLICY_DENIED");
  }
  return amount;
}
export function usageToMicros(estimatedCostUsd) {
  if (typeof estimatedCostUsd !== "number" || !Number.isFinite(estimatedCostUsd) ||
      estimatedCostUsd < 0 || estimatedCostUsd > 100) throw new Error("INVALID_AI_VENDOR_COST");
  return Math.ceil(estimatedCostUsd * 1_000_000);
}
