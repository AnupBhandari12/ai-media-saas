// Phase 21 / Commit 10F — REMOVE.BG credit preflight: PURE, SERVER-ONLY, READ-ONLY.
// This does not reserve credits, contact remove.bg, grant dispatch permissions,
// read a provider balance, create a database row, or authorize real spending.
// 10G must atomically reserve durable per-owner AND provider-pool quota before
// 10H can consider an authenticated, explicitly approved live operation.

export const BACKGROUND_CREDIT_POLICY_CONNECTED_TO_ROUTE = false;
export const BACKGROUND_CREDIT_POLICY_DISPATCH_ENABLED = false;
export const BACKGROUND_CREDIT_SNAPSHOT_MAX_AGE_MS = 5 * 60 * 1000;
export const BACKGROUND_CREDITS_PER_REMOVAL_CEILING = 1;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;

function block(reason) {
  return Object.freeze({
    status: "BLOCKED",
    reason,
    dispatchAllowed: false,
    atomicReservationCompleted: false,
    providerRequestMade: false,
    safeToCallPaidProvider: false,
  });
}

function safeWhole(value, minimum = 0, maximum = 1000000) {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

function utcDay(now) {
  return now.toISOString().slice(0, 10);
}
function utcMonth(now) {
  return now.toISOString().slice(0, 7);
}

function ownerQuotaValid(quota, ownerId, day, month) {
  return quota !== null && typeof quota === "object" && !Array.isArray(quota) &&
    quota.ownerId === ownerId && quota.dayStart === day && quota.monthStart === month &&
    safeWhole(quota.dayUsed) && safeWhole(quota.monthUsed) &&
    safeWhole(quota.dayLimit, 1) && safeWhole(quota.monthLimit, 1) &&
    quota.dayUsed <= quota.dayLimit && quota.monthUsed <= quota.monthLimit;
}

function providerBudgetValid(budget, day, month) {
  return budget !== null && typeof budget === "object" && !Array.isArray(budget) &&
    budget.dayStart === day && budget.monthStart === month &&
    safeWhole(budget.dayCommitted) && safeWhole(budget.monthCommitted) &&
    safeWhole(budget.dayCeiling, 1) && safeWhole(budget.monthCeiling, 1) &&
    budget.dayCommitted <= budget.dayCeiling && budget.monthCommitted <= budget.monthCeiling;
}

function creditSnapshotValid(snapshot, now) {
  if (snapshot === null || typeof snapshot !== "object" || Array.isArray(snapshot)) return false;
  const checkedAt = snapshot.checkedAt;
  if (!(checkedAt instanceof Date) || Number.isNaN(checkedAt.getTime())) return false;
  const age = now.getTime() - checkedAt.getTime();
  return age >= 0 && age <= BACKGROUND_CREDIT_SNAPSHOT_MAX_AGE_MS &&
    safeWhole(snapshot.confirmedUncommittedCredits) &&
    snapshot.verifiedMaximumCreditsPerJob === BACKGROUND_CREDITS_PER_REMOVAL_CEILING &&
    snapshot.billingTermsReviewed === true;
}

/**
 * Performs a fail-closed PRE-CHECK only; even a READY result NEVER permits
 * vendor dispatch. Inputs must come from trusted server-side authentication,
 * durable database counters and separately confirmed vendor billing. No HTTP
 * client's declared credit balance, date, or quota may be passed as authority.
 *
 * A snapshot cannot protect against concurrent requests. Only a subsequent
 * 10G atomic DB transaction can make the actual reservation.
 */
export function assessBackgroundCreditPreflight({
  ownerId,
  requestId,
  imageSha256,
  now = new Date(),
  explicitOwnerPaidConsent = false,
  operatorApprovedPaidFeature = false,
  ownerQuota,
  providerBudget,
  vendorCreditSnapshot,
  priorRequest = null,
} = {}) {
  // Require TWO explicit trusted, SERVER-SIDE approvals. Neither is supplied
  // by 10F, and neither can be set from a browser request in a future route.
  if (explicitOwnerPaidConsent !== true || operatorApprovedPaidFeature !== true) {
    return block("PAID_OPERATION_NOT_APPROVED");
  }
  if (typeof ownerId !== "string" || ownerId.length < 3 || ownerId.length > 256 ||
      !UUID.test(requestId ?? "") || !SHA256.test(imageSha256 ?? "")) {
    return block("INVALID_REQUEST_IDENTITY");
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    return block("INVALID_TIME");
  }
  if (priorRequest !== null) {
    if (typeof priorRequest !== "object" || Array.isArray(priorRequest) ||
        priorRequest.ownerId !== ownerId || priorRequest.requestId !== requestId ||
        priorRequest.imageSha256 !== imageSha256) {
      return block("IDEMPOTENCY_CONFLICT");
    }
    // Includes FAILED/UNKNOWN: never blindly redispatch a prior request ID.
    return block("EXISTING_REQUEST_REQUIRES_LOOKUP");
  }

  const day = utcDay(now);
  const month = utcMonth(now);
  if (!ownerQuotaValid(ownerQuota, ownerId, day, month)) {
    return block("UNTRUSTED_OWNER_QUOTA_SNAPSHOT");
  }
  if (ownerQuota.dayUsed >= ownerQuota.dayLimit || ownerQuota.monthUsed >= ownerQuota.monthLimit) {
    return block("OWNER_QUOTA_EXHAUSTED");
  }
  if (!providerBudgetValid(providerBudget, day, month)) {
    return block("UNTRUSTED_PROVIDER_BUDGET_SNAPSHOT");
  }
  const requiredCredits = BACKGROUND_CREDITS_PER_REMOVAL_CEILING;
  if (providerBudget.dayCommitted + requiredCredits > providerBudget.dayCeiling ||
      providerBudget.monthCommitted + requiredCredits > providerBudget.monthCeiling) {
    return block("PROVIDER_BUDGET_EXHAUSTED");
  }
  if (!creditSnapshotValid(vendorCreditSnapshot, now)) {
    return block("VENDOR_CREDITS_UNVERIFIED_OR_STALE");
  }
  if (vendorCreditSnapshot.confirmedUncommittedCredits < requiredCredits) {
    return block("INSUFFICIENT_CONFIRMED_VENDOR_CREDITS");
  }
  // A snapshot is NOT atomic, even when all its counters look healthy.
  return Object.freeze({
    status: "READY_FOR_ATOMIC_RESERVATION",
    reason: null,
    ownerId,
    requestId,
    imageSha256,
    quotaDayStart: day,
    quotaMonthStart: month,
    requiredCredits,
    dispatchAllowed: false,
    atomicReservationCompleted: false,
    providerRequestMade: false,
    safeToCallPaidProvider: false,
    requiresDurableAtomicReservation: true,
    requiresPreDispatchApproval: true,
  });
}

/**
 * Classify a vendor outcome after an actual future transport invocation.
 * Conservatively hold everything after dispatch, on missing evidence, and on
 * success until output verification, storage, and ledger completion. This
 * function never automatically refunds, retries, or makes paid requests.
 */
export function classifyRemoveBgCreditOutcome({ result = null, error = null } = {}) {
  if (result && error) {
    return Object.freeze({ outcome: "AMBIGUOUS", holdCredits: true, autoRetry: false, autoRefund: false });
  }
  if (result && result.status === "SUCCESS" && result.provider === "remove.bg" &&
      result.providerCreditUnits === BACKGROUND_CREDITS_PER_REMOVAL_CEILING &&
      result.generated === true) {
    return Object.freeze({ outcome: "AWAITING_OUTPUT_VERIFICATION", holdCredits: true, autoRetry: false, autoRefund: false });
  }
  if (error && error.dispatched === false && error.safeToRefund === true) {
    // This is advisory: the request might already be PROCESSING in our DB.
    // Only the future atomic 10G lifecycle may decide safe release.
    return Object.freeze({ outcome: "UNSENT_RECONCILIATION_REQUIRED", holdCredits: true, autoRetry: false, autoRefund: false });
  }
  return Object.freeze({ outcome: "UNKNOWN_RECONCILIATION_REQUIRED", holdCredits: true, autoRetry: false, autoRefund: false });
}
