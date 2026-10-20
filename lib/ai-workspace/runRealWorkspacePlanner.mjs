// Paid AI action with durable quota + global spend reservation BEFORE dispatch.
// No automatic retry or refund after dispatch intent; failed/uncertain outcomes retain reservation.
import { buildAiReservationIdentity } from "../ai/aiReservationIdentity.mjs";
import { reserveAiAction } from "../ai/aiQuotaReservation.mjs";
import { startAiAction, completeAiAction, markAiActionUnknown } from "../ai/aiActionAccounting.mjs";
import { AI_BUDGET_RESERVATION_MICROS } from "../ai/realAiGlobalBudget.mjs";
import { preflightPaidPlannerPrompt } from "./realPlannerContract.js";
import { requestRealWorkspacePlan } from "./realPlannerTransport.mjs";

export async function runRealWorkspacePlanner({prisma,ownerId,idempotencyKey,prompt,apiKey,fetchFn=fetch}={}) {
  const preflight = preflightPaidPlannerPrompt(prompt);
  if (!preflight.allowed) return {outcome:"NEEDS_CLARIFICATION",question:preflight.question, charged:false};
  if (typeof apiKey !== "string" || !apiKey.startsWith("sk-") || typeof fetchFn !== "function") {
    return {outcome:"PROVIDER_NOT_CONFIGURED"};
  }
  const identity = buildAiReservationIdentity({
    ownerId, idempotencyKey, action:"WORKSPACE_PLAN", input:preflight.cleanPrompt,
  });
  const reserved = await reserveAiAction({prisma,identity,budgetMicros:AI_BUDGET_RESERVATION_MICROS.WORKSPACE_PLAN});
  if (reserved.outcome !== "RESERVED") return reserved; // EXISTING never gets redispatched.
  const requestId = reserved.requestId;
  const started = await startAiAction({prisma,ownerId:identity.ownerId,requestId});
  if (started.outcome !== "STARTED") return {outcome:"NOT_STARTABLE",requestId};
  try {
    const provider = await requestRealWorkspacePlan({
      prompt:preflight.cleanPrompt,serverApproval:true,apiKey,fetchFn,
    });
    const committed = await completeAiAction({
      prisma,ownerId:identity.ownerId,requestId,
      text:provider.text,model:provider.model,
      inputTokens:provider.usage.inputTokens,outputTokens:provider.usage.outputTokens,
      requireBudgeted:true,
    });
    if (committed.outcome !== "COMPLETED") throw new Error("AI_PLANNER_NOT_DURABLE");
    return Object.freeze({outcome:"COMPLETED",requestId,selection:provider.selection,
      estimatedCostUsd:committed.estimatedCostUsd});
  } catch {
    try { await markAiActionUnknown({prisma,ownerId:identity.ownerId,requestId}); }
    catch { return {outcome:"RECONCILIATION_REQUIRED",requestId}; }
    return {outcome:"UNKNOWN",requestId};
  }
}
