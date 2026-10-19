// Phase 21 / 10G. NOT wired to HTTP or the paid remove.bg transport.
// Requires future, REVIEWED Prisma schema + migration + provisioned bucket rows.
// Uses a single SERIALIZABLE transaction, a UNIQUE request ID and compare-and-swap
// updates to four durable counters. Never grants paid dispatch permission.
export const BG_ATOMIC_RESERVATION_CONNECTED_TO_ROUTE = false;
export const BG_ATOMIC_RESERVATION_PAID_DISPATCH_ENABLED = false;
export const BG_ATOMIC_RESERVATION_SCHEMA_APPLIED = false;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
const MAX = 1_000_000;
const frozen = (x) => Object.freeze(x);
const blocked = (reason) => frozen({ status: 'BLOCKED', reason, committed: false, dispatchAllowed: false, providerCalled: false });
const okay = (status, extra = {}) => frozen({ status, committed: true, dispatchAllowed: false, providerCalled: false, ...extra });
const validWhole = (n, min = 0) => Number.isSafeInteger(n) && n >= min && n <= MAX;
const validOwner = (s) => typeof s === 'string' && s.length >= 3 && s.length <= 256 && !/[\u0000-\u001f]/.test(s);
const validId = (s) => typeof s === 'string' && UUID.test(s);
const validHash = (s) => typeof s === 'string' && HASH.test(s);
const validTime = (d) => d instanceof Date && !Number.isNaN(d.getTime());

function bucketKeys(ownerId, day, month) {
  // Fixed order is important for serializable transactions and avoiding deadlocks.
  return [
    { scope: 'OWNER', scopeId: ownerId, period: 'DAY', periodKey: day },
    { scope: 'OWNER', scopeId: ownerId, period: 'MONTH', periodKey: month },
    { scope: 'POOL', scopeId: 'remove.bg', period: 'DAY', periodKey: day },
    { scope: 'POOL', scopeId: 'remove.bg', period: 'MONTH', periodKey: month },
  ];
}
const compound = (key) => ({ scope_scopeId_period_periodKey: key });
const validBucket = (bucket, key) => bucket && typeof bucket === 'object' &&
  bucket.scope === key.scope && bucket.scopeId === key.scopeId &&
  bucket.period === key.period && bucket.periodKey === key.periodKey &&
  typeof bucket.id === 'string' && bucket.id.length > 0 &&
  validWhole(bucket.committed) && validWhole(bucket.ceiling, 1) &&
  bucket.committed <= bucket.ceiling;

function validCandidate(candidate, now) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || !validTime(now)) return false;
  const day = now.toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  return candidate.status === 'READY_FOR_ATOMIC_RESERVATION' &&
    candidate.requiresDurableAtomicReservation === true &&
    candidate.dispatchAllowed === false &&
    candidate.atomicReservationCompleted === false &&
    validOwner(candidate.ownerId) && validId(candidate.requestId) && validHash(candidate.imageSha256) &&
    candidate.quotaDayStart === day && candidate.quotaMonthStart === month &&
    candidate.requiredCredits === 1;
}

function validDb(db) {
  return db && typeof db.$transaction === 'function';
}
function validTx(tx) {
  return tx && tx.bgCreditReservation && tx.bgCreditBucket &&
    typeof tx.bgCreditReservation.findUnique === 'function' &&
    typeof tx.bgCreditReservation.create === 'function' &&
    typeof tx.bgCreditReservation.updateMany === 'function' &&
    typeof tx.bgCreditBucket.findUnique === 'function' &&
    typeof tx.bgCreditBucket.updateMany === 'function';
}

class Revert extends Error {
  constructor(reason) { super(reason); this.reason = reason; }
}
function deny(reason) { throw new Revert(reason); }

/**
 * Caller must independently obtain a trusted 10F preflight, authenticated owner
 * and BOTH owner/operator consents. These arguments MUST NEVER originate from
 * HTTP JSON fields. No automatic retries even on serialization conflict.
 *
 * This function is deliberately DISCONNECTED until schema and shared global
 * AiQuotaBucket accounting have been reviewed. Reservations alone do not grant
 * permission to call remove.bg.
 */
export async function reserveBackgroundCreditAtomic({
  db, preflight, now = new Date(), ownerPaidConsent = false,
  operatorApproval = false,
} = {}) {
  if (ownerPaidConsent !== true || operatorApproval !== true) return blocked('PAID_ACTION_NOT_APPROVED');
  if (!validCandidate(preflight, now)) return blocked('INVALID_PREFLIGHT');
  if (!validDb(db)) return blocked('DATABASE_NOT_READY');
  const keys = bucketKeys(preflight.ownerId, preflight.quotaDayStart, preflight.quotaMonthStart);
  try {
    return await db.$transaction(async (tx) => {
      if (!validTx(tx)) deny('DATABASE_SCHEMA_NOT_READY');
      const prior = await tx.bgCreditReservation.findUnique({ where: { requestId: preflight.requestId } });
      if (prior !== null) deny('EXISTING_REQUEST_REQUIRES_LOOKUP');
      // Uniqueness on requestId is enforced by the REVIEWED DB schema, NOT the precheck.
      await tx.bgCreditReservation.create({ data: {
        requestId: preflight.requestId, ownerId: preflight.ownerId,
        imageSha256: preflight.imageSha256, status: 'RESERVED',
        creditsReserved: 1, dispatchedAt: null,
        quotaDayStart: preflight.quotaDayStart, quotaMonthStart: preflight.quotaMonthStart,
      }});
      for (const key of keys) {
        // No implicit bucket creation: caps must be pre-provisioned by operator.
        const bucket = await tx.bgCreditBucket.findUnique({ where: compound(key) });
        if (!validBucket(bucket, key)) deny('MISSING_OR_INVALID_BUDGET_BUCKET');
        if (bucket.committed + 1 > bucket.ceiling) deny('BUDGET_EXHAUSTED');
        // Compare-and-swap: even if a read was stale, concurrent changes cannot
        // increment a counter twice. Failure rolls back all four updates + request.
        const change = await tx.bgCreditBucket.updateMany({
          where: { id: bucket.id, committed: bucket.committed, ceiling: bucket.ceiling },
          data: { committed: { increment: 1 } },
        });
        if (!change || change.count !== 1) deny('CONCURRENT_BUDGET_CHANGE');
      }
      return okay('RESERVED_AWAITING_APPROVAL', { requestId: preflight.requestId, ownerId: preflight.ownerId });
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    // No secrets, raw SQL/Prisma errors, or request details in any client output.
    return blocked(error instanceof Revert ? error.reason : 'ATOMIC_RESERVATION_NOT_COMMITTED');
  }
}

function validRequestIdentity(ownerId, requestId) {
  return validOwner(ownerId) && validId(requestId);
}

/** Strictly records the LAST safe point before attempted vendor dispatch.
 * PROCESSING/UNKNOWN reservations must NEVER be automatically refunded.
 * Transition does not itself invoke a vendor or grant dispatch permission.
 */
export async function markBackgroundDispatchStarted({ db, ownerId, requestId, now = new Date() } = {}) {
  if (!validRequestIdentity(ownerId, requestId) || !validTime(now) || !validDb(db)) return blocked('INVALID_TRANSITION_INPUT');
  try {
    return await db.$transaction(async (tx) => {
      if (!validTx(tx)) deny('DATABASE_SCHEMA_NOT_READY');
      const changed = await tx.bgCreditReservation.updateMany({
        where: { requestId, ownerId, status: 'RESERVED', dispatchedAt: null },
        data: { status: 'PROCESSING', dispatchedAt: now },
      });
      if (changed?.count !== 1) deny('NOT_UNSENT_RESERVED');
      return okay('PROCESSING_CREDITS_HELD', { requestId });
    }, { isolationLevel: 'Serializable' });
  } catch { return blocked('TRANSITION_NOT_COMMITTED'); }
}

export async function markBackgroundOutcomeUnknown({ db, ownerId, requestId } = {}) {
  if (!validRequestIdentity(ownerId, requestId) || !validDb(db)) return blocked('INVALID_TRANSITION_INPUT');
  try {
    return await db.$transaction(async (tx) => {
      if (!validTx(tx)) deny('DATABASE_SCHEMA_NOT_READY');
      const change = await tx.bgCreditReservation.updateMany({
        where: { requestId, ownerId, status: 'PROCESSING' },
        data: { status: 'UNKNOWN' },
      });
      if (change?.count !== 1) deny('NOT_PROCESSING');
      return okay('UNKNOWN_CREDITS_HELD', { requestId });
    }, { isolationLevel: 'Serializable' });
  } catch { return blocked('TRANSITION_NOT_COMMITTED'); }
}

/** Explicit refund before ANY dispatch only. No timer-driven refunds. */
export async function releaseUnsentBackgroundReservation({ db, ownerId, requestId } = {}) {
  if (!validRequestIdentity(ownerId, requestId) || !validDb(db)) return blocked('INVALID_RELEASE_INPUT');
  try {
    return await db.$transaction(async (tx) => {
      if (!validTx(tx)) deny('DATABASE_SCHEMA_NOT_READY');
      const prior = await tx.bgCreditReservation.findUnique({ where: { requestId } });
      if (!prior || prior.ownerId !== ownerId || prior.status !== 'RESERVED' || prior.dispatchedAt !== null ||
          prior.creditsReserved !== 1 || !validHash(prior.imageSha256) ||
          typeof prior.quotaDayStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(prior.quotaDayStart) ||
          prior.quotaMonthStart !== prior.quotaDayStart.slice(0, 7)) deny('NOT_PROVEN_UNSENT');
      const day = prior.quotaDayStart;
      const month = prior.quotaMonthStart;
      const change = await tx.bgCreditReservation.updateMany({
        where: { requestId, ownerId, status: 'RESERVED', dispatchedAt: null },
        data: { status: 'CANCELLED' },
      });
      if (change?.count !== 1) deny('NOT_PROVEN_UNSENT');
      for (const key of bucketKeys(ownerId, day, month)) {
        const bucket = await tx.bgCreditBucket.findUnique({ where: compound(key) });
        if (!validBucket(bucket, key) || bucket.committed < 1) deny('INVALID_REFUND_BUCKET');
        const decremented = await tx.bgCreditBucket.updateMany({
          where: { id: bucket.id, committed: bucket.committed, ceiling: bucket.ceiling },
          data: { committed: { decrement: 1 } },
        });
        if (decremented?.count !== 1) deny('CONCURRENT_REFUND_CONFLICT');
      }
      return okay('CANCELLED_UNSENT_CREDITS_RELEASED', { requestId });
    }, { isolationLevel: 'Serializable' });
  } catch { return blocked('RELEASE_NOT_COMMITTED'); }
}
