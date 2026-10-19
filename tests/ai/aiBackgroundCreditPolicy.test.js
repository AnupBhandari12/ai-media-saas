import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import {
  BACKGROUND_CREDIT_POLICY_CONNECTED_TO_ROUTE,
  BACKGROUND_CREDIT_POLICY_DISPATCH_ENABLED,
  BACKGROUND_CREDIT_SNAPSHOT_MAX_AGE_MS,
  BACKGROUND_CREDITS_PER_REMOVAL_CEILING,
  assessBackgroundCreditPreflight,
  classifyRemoveBgCreditOutcome,
} from "../../lib/ai/aiBackgroundCreditPolicy.mjs";

const now = new Date("2026-10-19T12:30:00.000Z");
const requestId = "8c37d0e9-38d1-4ac4-b325-0a711d3bb92e";
const imageSha256 = "b".repeat(64);
const ownerId = "user_an_authenticated_owner";
const make = (overrides = {}) => ({
  ownerId, requestId, imageSha256, now,
  explicitOwnerPaidConsent: true,
  operatorApprovedPaidFeature: true,
  ownerQuota: { ownerId, dayStart: "2026-10-19", monthStart: "2026-10", dayUsed: 1, dayLimit: 3, monthUsed: 2, monthLimit: 20 },
  providerBudget: { dayStart: "2026-10-19", monthStart: "2026-10", dayCommitted: 1, dayCeiling: 4, monthCommitted: 5, monthCeiling: 12 },
  vendorCreditSnapshot: { checkedAt: new Date(now.getTime() - 60_000), confirmedUncommittedCredits: 4, verifiedMaximumCreditsPerJob: 1, billingTermsReviewed: true },
  ...overrides,
});

function expectBlocked(data, reason) {
  const result = assessBackgroundCreditPreflight(data);
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.reason, reason);
  assert.equal(result.dispatchAllowed, false);
  assert.equal(result.atomicReservationCompleted, false);
  assert.equal(result.providerRequestMade, false);
  assert.equal(result.safeToCallPaidProvider, false);
  assert.equal(Object.isFrozen(result), true);
}

describe("Phase 21 / 10F strict remove.bg vendor credit preflight", () => {
  test("nothing is connected to a route or enabled for paid transport", () => {
    assert.equal(BACKGROUND_CREDIT_POLICY_CONNECTED_TO_ROUTE, false);
    assert.equal(BACKGROUND_CREDIT_POLICY_DISPATCH_ENABLED, false);
    assert.equal(BACKGROUND_CREDITS_PER_REMOVAL_CEILING, 1);
  });
  test("paid feature defaults blocked without both approvals and does not query any external service", () => {
    expectBlocked({}, "PAID_OPERATION_NOT_APPROVED");
    expectBlocked(make({ explicitOwnerPaidConsent: false }), "PAID_OPERATION_NOT_APPROVED");
    expectBlocked(make({ operatorApprovedPaidFeature: false }), "PAID_OPERATION_NOT_APPROVED");
  });
  test("both approvals allow only a CANDIDATE for future durable atomic reservation", () => {
    const got = assessBackgroundCreditPreflight(make());
    assert.equal(got.status, "READY_FOR_ATOMIC_RESERVATION");
    assert.equal(got.requiredCredits, 1);
    assert.equal(got.dispatchAllowed, false);
    assert.equal(got.safeToCallPaidProvider, false);
    assert.equal(got.atomicReservationCompleted, false);
    assert.equal(got.requiresDurableAtomicReservation, true);
    assert.equal(got.requiresPreDispatchApproval, true);
    assert.equal(Object.isFrozen(got), true);
  });
  test("rejects invalid owner, request ID and image hash", () => {
    for (const attrs of [{ ownerId: "" }, { ownerId: 1 }, { requestId: "not-uuid" }, { imageSha256: "x" }, { imageSha256: "A".repeat(64) }]) {
      expectBlocked(make(attrs), "INVALID_REQUEST_IDENTITY");
    }
  });
  test("rejects invalid date rather than silently falling back to local time", () => {
    expectBlocked(make({now: new Date(NaN)}), "INVALID_TIME");
    expectBlocked(make({now: "2026-10-19"}), "INVALID_TIME");
  });
  test("prior matching request, even FAILED, is never silently dispatched again", () => {
    expectBlocked(make({ priorRequest: { ownerId, requestId, imageSha256, status: "FAILED" } }), "EXISTING_REQUEST_REQUIRES_LOOKUP");
    expectBlocked(make({ priorRequest: { ownerId, requestId, imageSha256, status: "UNKNOWN" } }), "EXISTING_REQUEST_REQUIRES_LOOKUP");
  });
  test("same request ID with different image hash fails closed", () => {
    expectBlocked(make({ priorRequest: { ownerId, requestId, imageSha256: "a".repeat(64) } }), "IDEMPOTENCY_CONFLICT");
  });
  test("prior request from another owner is never reused", () => {
    expectBlocked(make({ priorRequest: { ownerId: "another_user", requestId, imageSha256 } }), "IDEMPOTENCY_CONFLICT");
  });
  test("untrusted or malformed prior request fails closed", () => {
    expectBlocked(make({ priorRequest: "OLD" }), "IDEMPOTENCY_CONFLICT");
    expectBlocked(make({ priorRequest: [] }), "IDEMPOTENCY_CONFLICT");
  });
  test("rejects quota snapshots missing owner or wrong owner", () => {
    expectBlocked(make({ ownerQuota: null }), "UNTRUSTED_OWNER_QUOTA_SNAPSHOT");
    expectBlocked(make({ ownerQuota: { ...make().ownerQuota, ownerId: "other" } }), "UNTRUSTED_OWNER_QUOTA_SNAPSHOT");
  });
  test("rejects quota snapshots with UTC day/month mismatch", () => {
    expectBlocked(make({ ownerQuota: { ...make().ownerQuota, dayStart: "2026-10-18" } }), "UNTRUSTED_OWNER_QUOTA_SNAPSHOT");
    expectBlocked(make({ ownerQuota: { ...make().ownerQuota, monthStart: "2026-09" } }), "UNTRUSTED_OWNER_QUOTA_SNAPSHOT");
  });
  test("rejects fraudulent and fractional quota counters", () => {
    for (const changes of [{dayUsed:-1},{monthLimit:0},{dayUsed:0.5},{dayUsed:5,dayLimit:3},{monthUsed:22,monthLimit:20},{monthUsed:"1"}]) {
      expectBlocked(make({ownerQuota:{...make().ownerQuota,...changes}}), "UNTRUSTED_OWNER_QUOTA_SNAPSHOT");
    }
  });
  test("blocks user daily or monthly quota exhaustion separately", () => {
    expectBlocked(make({ ownerQuota: { ...make().ownerQuota, dayUsed: 3 } }), "OWNER_QUOTA_EXHAUSTED");
    expectBlocked(make({ ownerQuota: { ...make().ownerQuota, monthUsed: 20 } }), "OWNER_QUOTA_EXHAUSTED");
  });
  test("missing vendor pool budget fails closed", () => {
    expectBlocked(make({ providerBudget: null }), "UNTRUSTED_PROVIDER_BUDGET_SNAPSHOT");
    expectBlocked(make({ providerBudget: {} }), "UNTRUSTED_PROVIDER_BUDGET_SNAPSHOT");
  });
  test("vendor pool counters reject type coercion, negative or overspent data", () => {
    for (const changes of [{dayCommitted:"1"},{dayCommitted:-1},{monthCeiling:0},{monthCommitted:13},{dayStart:"2026-10-18"},{monthStart:"2026-09"}]) {
      expectBlocked(make({providerBudget:{...make().providerBudget,...changes}}), "UNTRUSTED_PROVIDER_BUDGET_SNAPSHOT");
    }
  });
  test("hard vendor daily/monthly caps block new request before any dispatch", () => {
    expectBlocked(make({ providerBudget: { ...make().providerBudget, dayCommitted: 4 } }), "PROVIDER_BUDGET_EXHAUSTED");
    expectBlocked(make({ providerBudget: { ...make().providerBudget, monthCommitted: 12 } }), "PROVIDER_BUDGET_EXHAUSTED");
  });
  test("budget at last available slot is a candidate, NEVER real dispatch authorization", () => {
    const got = assessBackgroundCreditPreflight(make({providerBudget:{...make().providerBudget,dayCommitted:3,monthCommitted:11}}));
    assert.equal(got.status,"READY_FOR_ATOMIC_RESERVATION");
    assert.equal(got.dispatchAllowed,false);
  });
  test("unknown vendor credits cannot be assumed from a local budget", () => {
    expectBlocked(make({ vendorCreditSnapshot: null }), "VENDOR_CREDITS_UNVERIFIED_OR_STALE");
    expectBlocked(make({ vendorCreditSnapshot: {} }), "VENDOR_CREDITS_UNVERIFIED_OR_STALE");
  });
  test("provider credit verification needs exact 1-credit upper ceiling and reviewed billing", () => {
    expectBlocked(make({ vendorCreditSnapshot: {...make().vendorCreditSnapshot,verifiedMaximumCreditsPerJob:2} }), "VENDOR_CREDITS_UNVERIFIED_OR_STALE");
    expectBlocked(make({ vendorCreditSnapshot: {...make().vendorCreditSnapshot,billingTermsReviewed:false} }), "VENDOR_CREDITS_UNVERIFIED_OR_STALE");
  });
  test("vendor snapshot older than five minutes is rejected; boundary is inclusive", () => {
    expectBlocked(make({vendorCreditSnapshot:{...make().vendorCreditSnapshot,checkedAt:new Date(now.getTime()-BACKGROUND_CREDIT_SNAPSHOT_MAX_AGE_MS-1)}}),"VENDOR_CREDITS_UNVERIFIED_OR_STALE");
    const got = assessBackgroundCreditPreflight(make({vendorCreditSnapshot:{...make().vendorCreditSnapshot,checkedAt:new Date(now.getTime()-BACKGROUND_CREDIT_SNAPSHOT_MAX_AGE_MS)}}));
    assert.equal(got.status,"READY_FOR_ATOMIC_RESERVATION");
  });
  test("future, string and invalid snapshot timestamps are blocked", () => {
    for (const checkedAt of [new Date(now.getTime()+1),new Date(NaN),"2026-10-19T12:29:00Z"]) {
      expectBlocked(make({vendorCreditSnapshot:{...make().vendorCreditSnapshot,checkedAt}}),"VENDOR_CREDITS_UNVERIFIED_OR_STALE");
    }
  });
  test("vendor snapshot cannot claim unavailable or fractional credits", () => {
    for (const value of [-1,0.2,"5",null]) {
      expectBlocked(make({vendorCreditSnapshot:{...make().vendorCreditSnapshot,confirmedUncommittedCredits:value}}),"VENDOR_CREDITS_UNVERIFIED_OR_STALE");
    }
  });
  test("confirmed vendor credit exhausted blocks the proposed job", () => {
    expectBlocked(make({vendorCreditSnapshot:{...make().vendorCreditSnapshot,confirmedUncommittedCredits:0}}),"INSUFFICIENT_CONFIRMED_VENDOR_CREDITS");
  });
  test("UTC month and day boundaries do not borrow yesterday's quota", () => {
    const later = new Date("2026-11-01T00:00:00.000Z");
    expectBlocked(make({now:later}),"UNTRUSTED_OWNER_QUOTA_SNAPSHOT");
    const complete = make({ now: later, ownerQuota:{...make().ownerQuota,dayStart:"2026-11-01",monthStart:"2026-11"},providerBudget:{...make().providerBudget,dayStart:"2026-11-01",monthStart:"2026-11"},vendorCreditSnapshot:{...make().vendorCreditSnapshot,checkedAt:later} });
    assert.equal(assessBackgroundCreditPreflight(complete).status,"READY_FOR_ATOMIC_RESERVATION");
  });
  test("any post-dispatch ambiguity holds credits and disallows auto retry/refund", () => {
    for (const args of [{},{error:{dispatched:true}},{error:new Error("timeout")},{result:{status:"SUCCESS",provider:"unknown"}},{result:{status:"SUCCESS",provider:"remove.bg",providerCreditUnits:1,generated:true},error:{}}]) {
      const out = classifyRemoveBgCreditOutcome(args);
      assert.equal(out.holdCredits,true);
      assert.equal(out.autoRetry,false);
      assert.equal(out.autoRefund,false);
    }
  });
  test("even an expressly unsent failure is not auto-refunded without the atomic DB lifecycle", () => {
    const out = classifyRemoveBgCreditOutcome({error:{dispatched:false,safeToRefund:true,code:"MISSING_API_KEY"}});
    assert.equal(out.outcome,"UNSENT_RECONCILIATION_REQUIRED");
    assert.equal(out.autoRefund,false);
    assert.equal(out.holdCredits,true);
  });
  test("provider success is not completion until verified PNG is stored and ledger reconciles", () => {
    const out = classifyRemoveBgCreditOutcome({result:{status:"SUCCESS",provider:"remove.bg",providerCreditUnits:1,generated:true}});
    assert.equal(out.outcome,"AWAITING_OUTPUT_VERIFICATION");
    assert.equal(out.holdCredits,true);
    assert.equal(out.autoRetry,false);
    assert.equal(Object.isFrozen(out),true);
  });
});
