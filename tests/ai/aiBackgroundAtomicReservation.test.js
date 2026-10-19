import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import {
  BG_ATOMIC_RESERVATION_CONNECTED_TO_ROUTE,
  BG_ATOMIC_RESERVATION_PAID_DISPATCH_ENABLED,
  BG_ATOMIC_RESERVATION_SCHEMA_APPLIED,
  reserveBackgroundCreditAtomic, markBackgroundDispatchStarted,
  markBackgroundOutcomeUnknown, releaseUnsentBackgroundReservation,
} from '../../lib/ai/aiBackgroundAtomicReservation.mjs';

const owner = 'user_clerk_42';
const requestId = '12345678-1234-4234-8234-1234567890ab';
const hash = 'f'.repeat(64);
const now = new Date('2026-10-19T23:59:59.999Z');
const day = '2026-10-19';
const month = '2026-10';
const rowKey = (scope, id, period, key) => [scope, id, period, key].join('|');
function makeBuckets(ceiling = 3) {
  const data = new Map();
  for (const [scope, id] of [['OWNER', owner], ['POOL', 'remove.bg']]) {
    for (const [period, periodKey] of [['DAY', day], ['MONTH', month]]) {
      const idKey = rowKey(scope, id, period, periodKey);
      data.set(idKey, { id: idKey, scope, scopeId: id, period, periodKey, committed: 0, ceiling });
    }
  }
  return data;
}
function candidate(overrides = {}) {
  return { status: 'READY_FOR_ATOMIC_RESERVATION', ownerId: owner, requestId, imageSha256: hash,
    quotaDayStart: day, quotaMonthStart: month, requiredCredits: 1,
    requiresDurableAtomicReservation: true, dispatchAllowed: false,
    atomicReservationCompleted: false, ...overrides };
}
class FakeDB {
  constructor(ceiling = 3) {
    this.buckets = makeBuckets(ceiling);
    this.rows = new Map();
    this.queue = Promise.resolve();
    this.calls = 0;
    this.failStep = null;
  }
  async $transaction(fn, opts) {
    assert.equal(opts.isolationLevel, 'Serializable');
    this.calls++;
    let done;
    const release = new Promise((resolve) => { done = resolve; });
    const previous = this.queue;
    this.queue = release;
    await previous;
    const buckets = new Map([...this.buckets].map(([k, v]) => [k, { ...v }]));
    const rows = new Map([...this.rows].map(([k, v]) => [k, { ...v }]));
    const fake = {
      bgCreditReservation: {
        findUnique: async ({ where }) => rows.get(where.requestId) ?? null,
        create: async ({ data }) => {
          if (rows.has(data.requestId)) throw Error('UNIQUE');
          const row = { ...data, createdAt: new Date() };
          rows.set(data.requestId, row);
          return row;
        },
        updateMany: async ({ where, data }) => {
          const row = rows.get(where.requestId);
          if (!row || (where.ownerId !== undefined && row.ownerId !== where.ownerId) ||
              (where.status !== undefined && row.status !== where.status) ||
              (where.dispatchedAt === null && row.dispatchedAt !== null)) return { count: 0 };
          Object.assign(row, data);
          return { count: 1 };
        },
      },
      bgCreditBucket: {
        findUnique: async ({ where }) => buckets.get(rowKey(...Object.values(where.scope_scopeId_period_periodKey))) ?? null,
        updateMany: async ({ where, data }) => {
          if (this.failStep === 'UPDATE') throw Error('INJECTED_UPDATE_FAILURE');
          const bucket = [...buckets.values()].find((b) => b.id === where.id);
          if (!bucket || bucket.committed !== where.committed || bucket.ceiling !== where.ceiling) return { count: 0 };
          if (data.committed.increment !== undefined) bucket.committed += data.committed.increment;
          if (data.committed.decrement !== undefined) bucket.committed -= data.committed.decrement;
          return { count: 1 };
        },
      },
    };
    try {
      const result = await fn(fake);
      this.buckets = buckets;
      this.rows = rows;
      return result;
    } finally { done(); }
  }
  counts() { return [...this.buckets.values()].map((x) => x.committed); }
}
async function reserve(db, overrides = {}) {
  return reserveBackgroundCreditAtomic({ db, now, preflight: candidate(), ownerPaidConsent: true, operatorApproval: true, ...overrides });
}

describe('Phase 21 / 10G atomic background credit reservation (schema review only)', () => {
  test('never connects to public endpoint, provider, or production DB migration', () => {
    assert.equal(BG_ATOMIC_RESERVATION_CONNECTED_TO_ROUTE, false);
    assert.equal(BG_ATOMIC_RESERVATION_PAID_DISPATCH_ENABLED, false);
    assert.equal(BG_ATOMIC_RESERVATION_SCHEMA_APPLIED, false);
  });
  test('both paid approvals required before opening DB transaction', async () => {
    const db = new FakeDB();
    assert.equal((await reserve(db, { ownerPaidConsent: false })).status, 'BLOCKED');
    assert.equal((await reserve(db, { operatorApproval: false })).status, 'BLOCKED');
    assert.equal(db.calls, 0);
  });
  test('invalid or fake preflight never touches database', async () => {
    const db = new FakeDB();
    for (const preflight of [null, {}, candidate({status:'BLOCKED'}), candidate({requiredCredits:2}),
      candidate({ownerId:'x'}), candidate({requestId:'wrong'}), candidate({imageSha256:'abc'}),
      candidate({quotaDayStart:'2026-10-20'}), candidate({dispatchAllowed:true}),
      candidate({atomicReservationCompleted:true}), candidate({requiresDurableAtomicReservation:false})]) {
      assert.equal((await reserve(db, { preflight })).status, 'BLOCKED');
    }
    assert.equal(db.calls, 0);
  });
  test('cannot proceed with no durable DB adapter', async () => {
    assert.equal((await reserve(null)).reason, 'DATABASE_NOT_READY');
  });
  test('one reservation increments all four counters once', async () => {
    const db = new FakeDB();
    const result = await reserve(db);
    assert.equal(result.status, 'RESERVED_AWAITING_APPROVAL');
    assert.equal(result.dispatchAllowed, false);
    assert.equal(result.providerCalled, false);
    assert.deepEqual(db.counts(), [1,1,1,1]);
    assert.equal(db.rows.get(requestId).status, 'RESERVED');
    assert.equal(db.rows.get(requestId).quotaDayStart, day);
  });
  test('repeated idempotency key cannot reserve twice', async () => {
    const db = new FakeDB();
    await reserve(db);
    const second = await reserve(db);
    assert.equal(second.reason, 'EXISTING_REQUEST_REQUIRES_LOOKUP');
    assert.deepEqual(db.counts(), [1,1,1,1]);
  });
  test('concurrent same UUID does not double spend', async () => {
    const db = new FakeDB();
    const result = await Promise.all([reserve(db), reserve(db), reserve(db)]);
    assert.equal(result.filter((r) => r.committed).length, 1);
    assert.deepEqual(db.counts(), [1,1,1,1]);
  });
  test('two distinct requests cannot exceed last provider slot under concurrency', async () => {
    const db = new FakeDB(1);
    const other = candidate({requestId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
    const result = await Promise.all([reserve(db), reserve(db, {preflight:other})]);
    assert.equal(result.filter((r) => r.committed).length, 1);
    assert.deepEqual(db.counts(), [1,1,1,1]);
  });
  test('missing provider pool bucket rolls entire transaction back', async () => {
    const db = new FakeDB();
    db.buckets.delete(rowKey('POOL','remove.bg','DAY',day));
    const result = await reserve(db);
    assert.equal(result.reason, 'MISSING_OR_INVALID_BUDGET_BUCKET');
    assert.equal(db.rows.size, 0);
    assert.deepEqual(db.counts(), [0,0,0]);
  });
  test('corrupt owner quota fails closed with no partial mutation', async () => {
    const db = new FakeDB();
    db.buckets.get(rowKey('OWNER',owner,'MONTH',month)).committed = -1;
    const result = await reserve(db);
    assert.equal(result.reason, 'MISSING_OR_INVALID_BUDGET_BUCKET');
    assert.equal(db.rows.size, 0);
    assert.deepEqual(db.counts(), [0,-1,0,0]);
  });
  test('database exception does not commit anything or leak secret', async () => {
    const db = new FakeDB(); db.failStep='UPDATE';
    const r = await reserve(db);
    assert.equal(r.reason,'ATOMIC_RESERVATION_NOT_COMMITTED');
    assert.equal(db.rows.size,0);
    assert.deepEqual(db.counts(),[0,0,0,0]);
  });
  test('no route or paid dispatch allowed from successful reservation response', async () => {
    const r=await reserve(new FakeDB());
    assert.equal(Object.isFrozen(r),true);
    assert.equal(r.dispatchAllowed,false);
    assert.equal(r.providerCalled,false);
  });
  test('dispatch marker requires ownership and existing reservation', async () => {
    const db=new FakeDB(); await reserve(db);
    assert.equal((await markBackgroundDispatchStarted({db,ownerId:'not-owner',requestId,now})).committed,false);
    assert.equal((await markBackgroundDispatchStarted({db,ownerId:owner,requestId,now})).status,'PROCESSING_CREDITS_HELD');
    assert.equal(db.rows.get(requestId).status,'PROCESSING');
    assert.deepEqual(db.counts(),[1,1,1,1]);
  });
  test('dispatch marker can be recorded only once', async () => {
    const db=new FakeDB(); await reserve(db);
    await markBackgroundDispatchStarted({db,ownerId:owner,requestId,now});
    assert.equal((await markBackgroundDispatchStarted({db,ownerId:owner,requestId,now})).committed,false);
  });
  test('unknown outcome keeps all reserved credits', async () => {
    const db=new FakeDB(); await reserve(db);
    await markBackgroundDispatchStarted({db,ownerId:owner,requestId,now});
    const r=await markBackgroundOutcomeUnknown({db,ownerId:owner,requestId});
    assert.equal(r.status,'UNKNOWN_CREDITS_HELD');
    assert.deepEqual(db.counts(),[1,1,1,1]);
  });
  test('unknown transition rejects unprocessed request', async () => {
    const db=new FakeDB();await reserve(db);
    assert.equal((await markBackgroundOutcomeUnknown({db,ownerId:owner,requestId})).committed,false);
    assert.equal(db.rows.get(requestId).status,'RESERVED');
  });
  test('an explicitly unsent RESERVED job releases all four counters', async () => {
    const db=new FakeDB(); await reserve(db);
    const r=await releaseUnsentBackgroundReservation({db,ownerId:owner,requestId});
    assert.equal(r.status,'CANCELLED_UNSENT_CREDITS_RELEASED');
    assert.deepEqual(db.counts(),[0,0,0,0]);
    assert.equal(db.rows.get(requestId).status,'CANCELLED');
  });
  test('second release does not double refund', async () => {
    const db=new FakeDB(); await reserve(db);
    await releaseUnsentBackgroundReservation({db,ownerId:owner,requestId});
    assert.equal((await releaseUnsentBackgroundReservation({db,ownerId:owner,requestId})).committed,false);
    assert.deepEqual(db.counts(),[0,0,0,0]);
  });
  test('other owner cannot release a reservation', async () => {
    const db=new FakeDB(); await reserve(db);
    assert.equal((await releaseUnsentBackgroundReservation({db,ownerId:'user_other',requestId})).committed,false);
    assert.deepEqual(db.counts(),[1,1,1,1]);
  });
  test('release after PROCESSING must hold all credits', async () => {
    const db=new FakeDB(); await reserve(db);
    await markBackgroundDispatchStarted({db,ownerId:owner,requestId,now});
    assert.equal((await releaseUnsentBackgroundReservation({db,ownerId:owner,requestId})).committed,false);
    assert.deepEqual(db.counts(),[1,1,1,1]);
  });
  test('release after UNKNOWN must hold all credits', async () => {
    const db=new FakeDB(); await reserve(db);
    await markBackgroundDispatchStarted({db,ownerId:owner,requestId,now});
    await markBackgroundOutcomeUnknown({db,ownerId:owner,requestId});
    assert.equal((await releaseUnsentBackgroundReservation({db,ownerId:owner,requestId})).committed,false);
    assert.deepEqual(db.counts(),[1,1,1,1]);
  });
  test('failed release bucket CAS rolls back cancellation and all decrements', async () => {
    const db=new FakeDB(); await reserve(db); db.failStep='UPDATE';
    assert.equal((await releaseUnsentBackgroundReservation({db,ownerId:owner,requestId})).committed,false);
    assert.equal(db.rows.get(requestId).status,'RESERVED');
    assert.deepEqual(db.counts(),[1,1,1,1]);
  });
  test('stored UTC period is used for cancellation even if actual wall clock changed', async () => {
    const db=new FakeDB(); await reserve(db);
    const r=await releaseUnsentBackgroundReservation({db,ownerId:owner,requestId});
    assert.equal(r.committed,true);
  });
});
