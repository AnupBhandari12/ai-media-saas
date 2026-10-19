/**
 * Phase 21 / Commit 10I: PROPOSED atomic accounting compatibility adapter.
 * NO route imports this module. NO vendor/provider calls. NO storage writes.
 * This is an OFFLINE transaction prototype against an injected test adapter.
 * A successful mock reservation is NEVER permission to dispatch paid work.
 * A separate Prisma schema review, migration approval and isolated REAL DB
 * concurrency verification are required before any production integration.
 */
export const BG_SHARED_QUOTA_PROTOTYPE_ONLY = true;
export const BG_SHARED_QUOTA_PAID_DISPATCH_ENABLED = false;
export const BG_SHARED_QUOTA_PUBLIC_ROUTE_ENABLED = false;
export const BG_SHARED_QUOTA_PRODUCTION_MIGRATION_APPROVED = false;
export const BG_SHARED_QUOTA_KEY = 'AI_ACTION';
export const BG_VENDOR_POOL_ID = 'remove.bg';

const REQUEST_ID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const SHA256 = /^[a-f\d]{64}$/;
const MAX_COUNTER = 1_000_000;
const safeInt = (n, min = 0) => Number.isSafeInteger(n) && n >= min && n <= MAX_COUNTER;
const result = (status, reason, committed = false) => Object.freeze({
  status, reason, committed, providerCalled: false, dispatchAllowed: false,
  schemaApplied: false, productionReady: false,
});
const reject = (reason) => result('BLOCKED', reason);
const dateIsValid = (d) => d instanceof Date && !Number.isNaN(d.getTime());
const validOwner = (s) => typeof s === 'string' && s.length >= 3 && s.length <= 256 &&
  s.trim() === s && !/[\u0000-\u001f]/.test(s);
function utcPeriods(date) {
  const ymd = date.toISOString().slice(0, 10);
  return { day: ymd, month: ymd.slice(0, 7), dayDate: new Date(`${ymd}T00:00:00.000Z`),
    monthDate: new Date(`${ymd.slice(0, 7)}-01T00:00:00.000Z`) };
}
function validCandidate(candidate, now) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || !dateIsValid(now)) return false;
  const periods = utcPeriods(now);
  return candidate.status === 'READY_FOR_ATOMIC_RESERVATION' &&
    candidate.requiresDurableAtomicReservation === true &&
    candidate.dispatchAllowed === false && candidate.atomicReservationCompleted === false &&
    candidate.requiredCredits === 1 && validOwner(candidate.ownerId) &&
    typeof candidate.requestId === 'string' && REQUEST_ID.test(candidate.requestId) &&
    typeof candidate.imageSha256 === 'string' && SHA256.test(candidate.imageSha256) &&
    candidate.quotaDayStart === periods.day && candidate.quotaMonthStart === periods.month;
}
function validateTx(tx) {
  return typeof tx?.bgCreditReservation?.findUnique === 'function' &&
    typeof tx?.bgCreditReservation?.create === 'function' &&
    typeof tx?.aiQuotaBucket?.findFirst === 'function' &&
    typeof tx?.aiQuotaBucket?.updateMany === 'function' &&
    typeof tx?.bgCreditBucket?.findUnique === 'function' &&
    typeof tx?.bgCreditBucket?.updateMany === 'function';
}
function validSharedBucket(bucket, key) {
  return bucket && typeof bucket.id === 'string' && bucket.id.length > 0 &&
    bucket.ownerId === key.ownerId && bucket.quotaKey === BG_SHARED_QUOTA_KEY &&
    bucket.period === key.period && bucket.periodStart instanceof Date &&
    bucket.periodStart.getTime() === key.periodStart.getTime() &&
    safeInt(bucket.used) && safeInt(bucket.limit, 1) && bucket.used <= bucket.limit;
}
function validPoolBucket(bucket, key) {
  return bucket && typeof bucket.id === 'string' && bucket.id.length > 0 &&
    bucket.scope === 'POOL' && bucket.scopeId === BG_VENDOR_POOL_ID &&
    bucket.period === key.period && bucket.periodKey === key.periodKey &&
    safeInt(bucket.committed) && safeInt(bucket.ceiling, 1) && bucket.committed <= bucket.ceiling;
}
class Rejected extends Error { constructor(reason) { super(reason); this.reason = reason; } }
function fail(reason) { throw new Rejected(reason); }

/**
 * IMPORTANT: Call ONLY from isolated FAKE-DB tests for now. When a real adapter is
 * developed it must independently check source authenticity and verified 10F
 * snapshots; the source must NEVER be an HTTP request body.
 *
 * Compared with 10G's review-only prototype, this version REPLACES separate
 * BG OWNER budget writes with existing AiQuotaBucket AI_ACTION writes, while
 * reserving the BG POOL budget (2 buckets) in the SAME SERIALIZABLE transaction.
 */
export async function reserveBackgroundWithSharedQuotaForReview({
  db, preflight, now = new Date(), ownerPaidConsent = false, operatorApproval = false,
} = {}) {
  if (ownerPaidConsent !== true || operatorApproval !== true) return reject('PAID_CONSENT_OR_OPERATOR_APPROVAL_MISSING');
  if (!validCandidate(preflight, now)) return reject('INVALID_SERVER_PREFLIGHT');
  if (typeof db?.$transaction !== 'function') return reject('DATABASE_ADAPTER_MISSING');
  const p = utcPeriods(now);
  const sharedKeys = [
    { ownerId: preflight.ownerId, period: 'MONTH', periodStart: p.monthDate },
    { ownerId: preflight.ownerId, period: 'DAY', periodStart: p.dayDate },
  ];
  const poolKeys = [
    { period: 'MONTH', periodKey: p.month },
    { period: 'DAY', periodKey: p.day },
  ];
  try {
    return await db.$transaction(async (tx) => {
      if (!validateTx(tx)) fail('DATABASE_SCHEMA_OR_METHODS_MISSING');
      const previous = await tx.bgCreditReservation.findUnique({ where: { requestId: preflight.requestId } });
      if (previous !== null) fail('EXISTING_REQUEST_NO_RETRY');
      // Transaction rollback MUST remove this row if any later conditional update fails.
      await tx.bgCreditReservation.create({ data: {
        requestId: preflight.requestId, ownerId: preflight.ownerId,
        imageSha256: preflight.imageSha256, status: 'RESERVED',
        creditsReserved: 1, dispatchedAt: null,
        quotaDayStart: p.day, quotaMonthStart: p.month,
      } });
      // MONTH first, DAY second: consistent order with current shared AI accounting.
      for (const key of sharedKeys) {
        const bucket = await tx.aiQuotaBucket.findFirst({ where: {
          ...key, quotaKey: BG_SHARED_QUOTA_KEY,
        } });
        if (!validSharedBucket(bucket, key)) fail('SHARED_OWNER_QUOTA_BUCKET_MISSING_OR_INVALID');
        if (bucket.used + 1 > bucket.limit) fail('SHARED_OWNER_QUOTA_EXHAUSTED');
        const updated = await tx.aiQuotaBucket.updateMany({
          where: { id: bucket.id, ownerId: key.ownerId, quotaKey: BG_SHARED_QUOTA_KEY,
            period: key.period, periodStart: key.periodStart, used: bucket.used, limit: bucket.limit },
          data: { used: { increment: 1 } },
        });
        if (updated?.count !== 1) fail('SHARED_OWNER_CONCURRENT_CHANGE');
      }
      for (const key of poolKeys) {
        const lookup = { scope: 'POOL', scopeId: BG_VENDOR_POOL_ID,
          period: key.period, periodKey: key.periodKey };
        const bucket = await tx.bgCreditBucket.findUnique({
          where: { scope_scopeId_period_periodKey: lookup },
        });
        if (!validPoolBucket(bucket, key)) fail('VENDOR_POOL_BUDGET_MISSING_OR_INVALID');
        if (bucket.committed + 1 > bucket.ceiling) fail('VENDOR_POOL_BUDGET_EXHAUSTED');
        const updated = await tx.bgCreditBucket.updateMany({
          where: { id: bucket.id, scope: 'POOL', scopeId: BG_VENDOR_POOL_ID,
            period: key.period, periodKey: key.periodKey,
            committed: bucket.committed, ceiling: bucket.ceiling },
          data: { committed: { increment: 1 } },
        });
        if (updated?.count !== 1) fail('VENDOR_POOL_CONCURRENT_CHANGE');
      }
      return result('MOCK_RESERVED_NEVER_DISPATCH', 'REVIEW_ONLY_FAKE_DB', true);
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    return reject(error instanceof Rejected ? error.reason : 'TRANSACTION_ABORTED_NO_RETRY');
  }
}
