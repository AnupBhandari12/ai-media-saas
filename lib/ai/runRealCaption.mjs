import { buildAiReservationIdentity } from "./aiReservationIdentity.mjs";
import { reserveAiAction } from "./aiQuotaReservation.mjs";
import { startAiAction, completeAiAction, markAiActionUnknown } from "./aiActionAccounting.mjs";
import {requestRealCaption} from "./realAiCaptionTransport.mjs";
import { AI_BUDGET_RESERVATION_MICROS } from "./realAiGlobalBudget.mjs";
/** Real server-only caption lifecycle. Requires database budget + user quota before vendor dispatch. */
export async function runRealCaption({prisma,ownerId,idempotencyKey,description,apiKey,fetchFn=fetch}={}) {
  // Misconfigured API key must not burn durable quota or global budget.
  if (typeof apiKey!=="string" || !apiKey.startsWith("sk-") || typeof fetchFn!=="function")
    return {outcome:"PROVIDER_NOT_CONFIGURED"};
  const identity=buildAiReservationIdentity({ownerId,idempotencyKey,action:"CAPTION",input:description});
  const claimed=await reserveAiAction({prisma,identity,budgetMicros:AI_BUDGET_RESERVATION_MICROS.CAPTION});
  if(claimed.outcome!=="RESERVED") return claimed; // Never retry an existing UUID.
  const requestId=claimed.requestId;
  const started=await startAiAction({prisma,ownerId:identity.ownerId,requestId});
  if(started.outcome!=="STARTED")return{outcome:"NOT_STARTABLE",requestId};
  try {
    const response=await requestRealCaption({description,enabled:true,serverApproval:true,apiKey,fetchFn});
    const committed=await completeAiAction({prisma,ownerId:identity.ownerId,requestId,
      text:response.text,model:response.model,inputTokens:response.usage.inputTokens,
      outputTokens:response.usage.outputTokens,requireBudgeted:true});
    if(committed.outcome!=="COMPLETED")throw new Error("COMPLETION_NOT_DURABLE");
    return{outcome:"COMPLETED",requestId,text:response.text,estimatedCostUsd:committed.estimatedCostUsd};
  } catch {
    // Any uncertain downstream outcome keeps the full reservation (no retry/refund).
    try {await markAiActionUnknown({prisma,ownerId:identity.ownerId,requestId});}
    catch{return{outcome:"RECONCILIATION_REQUIRED",requestId};}
    return{outcome:"UNKNOWN",requestId};
  }
}
