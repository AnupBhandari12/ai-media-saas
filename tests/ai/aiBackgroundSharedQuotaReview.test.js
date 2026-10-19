import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import {
  BG_SHARED_QUOTA_PROTOTYPE_ONLY, BG_SHARED_QUOTA_PAID_DISPATCH_ENABLED,
  BG_SHARED_QUOTA_PUBLIC_ROUTE_ENABLED, BG_SHARED_QUOTA_PRODUCTION_MIGRATION_APPROVED,
  BG_SHARED_QUOTA_KEY, BG_VENDOR_POOL_ID, reserveBackgroundWithSharedQuotaForReview,
} from '../../lib/ai/aiBackgroundSharedQuotaReview.mjs';

const NOW = new Date('2026-10-19T10:15:00.000Z');
const OWNER = 'user_phase21';
const ID = '11111111-2222-4333-8444-555555555555';
const HASH = 'ab'.repeat(32);
const day = new Date('2026-10-19T00:00:00.000Z');
const month = new Date('2026-10-01T00:00:00.000Z');
const candidate = (patch = {}) => ({ status: 'READY_FOR_ATOMIC_RESERVATION',
  requiresDurableAtomicReservation: true, dispatchAllowed: false,
  atomicReservationCompleted: false, ownerId: OWNER, requestId: ID,
  imageSha256: HASH, quotaDayStart: '2026-10-19', quotaMonthStart: '2026-10',
  requiredCredits: 1, ...patch });
const args = (db, patch = {}) => ({ db, preflight: candidate(), now: NOW,
  ownerPaidConsent: true, operatorApproval: true, ...patch });
function fakeDatabase(options = {}) {
  let state = { quota: [
    { id: 'shared-m', ownerId: OWNER, quotaKey: 'AI_ACTION', period: 'MONTH', periodStart: month, used: 0, limit: 20 },
    { id: 'shared-d', ownerId: OWNER, quotaKey: 'AI_ACTION', period: 'DAY', periodStart: day, used: 0, limit: 3 },
  ], pool: [
    { id: 'pool-m', scope: 'POOL', scopeId: 'remove.bg', period: 'MONTH', periodKey: '2026-10', committed: 0, ceiling: 20 },
    { id: 'pool-d', scope: 'POOL', scopeId: 'remove.bg', period: 'DAY', periodKey: '2026-10-19', committed: 0, ceiling: 3 },
  ], requests: [] };
  if (options.quotaPatch) Object.assign(state.quota[options.quotaPatch.period === 'DAY' ? 1 : 0], options.quotaPatch);
  if (options.poolPatch) Object.assign(state.pool[options.poolPatch.period === 'DAY' ? 1 : 0], options.poolPatch);
  if (options.missingShared) state.quota = state.quota.filter(x => x.period !== options.missingShared);
  if (options.missingPool) state.pool = state.pool.filter(x => x.period !== options.missingPool);
  let chain = Promise.resolve();
  let transactionCount = 0;
  function matching(row, where) {
    return Object.entries(where).every(([k,v]) => v instanceof Date
      ? row[k] instanceof Date && row[k].getTime() === v.getTime() : row[k] === v);
  }
  return { get state() { return state; }, get transactionCount() { return transactionCount; },
    async $transaction(callback, config) {
      if (config?.isolationLevel !== 'Serializable') throw new Error('not serializable');
      transactionCount += 1;
      let unlock;
      const previous = chain;
      chain = new Promise(resolve => { unlock = resolve; });
      await previous;
      const pending = structuredClone(state);
      try {
        const tx = {
          bgCreditReservation: {
            async findUnique({where}) { return pending.requests.find(r => r.requestId === where.requestId) ?? null; },
            async create({data}) { if (options.failCreate) throw Error('FAKE_CRASH');
              if (pending.requests.some(r => r.requestId === data.requestId)) throw Error('duplicate');
              pending.requests.push(structuredClone(data)); return data; },
          },
          aiQuotaBucket: {
            async findFirst({where}) { return pending.quota.find(row => matching(row, where)) ?? null; },
            async updateMany({where, data}) {
              if (options.failShared === where.period) return {count:0};
              const row = pending.quota.find(r => matching(r, where)); if (!row) return {count:0};
              row.used += data.used.increment; return {count:1}; },
          },
          bgCreditBucket: {
            async findUnique({where}) { const key = where.scope_scopeId_period_periodKey;
              return pending.pool.find(r => matching(r, key)) ?? null; },
            async updateMany({where,data}) {
              if (options.failPool === where.period) return {count:0};
              const row = pending.pool.find(r => matching(r, where)); if (!row) return {count:0};
              row.committed += data.committed.increment; return {count:1}; },
          },
        };
        if (options.incompleteTx) delete tx.aiQuotaBucket;
        const answer = await callback(tx);
        state = pending;
        return answer;
      } finally { unlock(); }
    },
  };
}
const counts = (db) => ({shared: db.state.quota.map(x=>x.used),pool: db.state.pool.map(x=>x.committed),requests:db.state.requests.length});

describe('Phase 21 / 10I read-only aligned shared quota reservation prototype', () => {
  test('never enables public route, production migration, or paid dispatch', () => {
    assert.equal(BG_SHARED_QUOTA_PROTOTYPE_ONLY, true);
    assert.equal(BG_SHARED_QUOTA_PAID_DISPATCH_ENABLED, false);
    assert.equal(BG_SHARED_QUOTA_PUBLIC_ROUTE_ENABLED, false);
    assert.equal(BG_SHARED_QUOTA_PRODUCTION_MIGRATION_APPROVED, false);
  });
  test('pins the existing shared AI quota key', () => { assert.equal(BG_SHARED_QUOTA_KEY,'AI_ACTION'); assert.equal(BG_VENDOR_POOL_ID,'remove.bg'); });
  test('requires both independent paid consents BEFORE DB', async () => {
    const db=fakeDatabase();
    assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db,{ownerPaidConsent:false}))).status,'BLOCKED');
    assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db,{operatorApproval:false}))).status,'BLOCKED');
    assert.equal(db.transactionCount,0);
  });
  test('defaults deny even when candidate and db provided', async()=>{
    const db=fakeDatabase();const r=await reserveBackgroundWithSharedQuotaForReview({db, preflight:candidate(),now:NOW});
    assert.equal(r.dispatchAllowed,false);assert.equal(db.transactionCount,0);
  });
  test('rejects missing/forged candidate before DB', async()=>{
    const db=fakeDatabase();
    for(const preflight of [null, [], {}, candidate({status:'READY'}),candidate({dispatchAllowed:true}), candidate({requiresDurableAtomicReservation:false}),candidate({atomicReservationCompleted:true}),candidate({requiredCredits:2})]) {
      assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db,{preflight}))).status,'BLOCKED');
    }
    assert.equal(db.transactionCount,0);
  });
  test('rejects blank, padded and control-character owners', async()=>{
    const db=fakeDatabase();
    for(const ownerId of ['', 'a', ' hi ', 'abc\n', 'a'.repeat(257)]) {
      assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db,{preflight:candidate({ownerId})}))).status,'BLOCKED');
    }
    assert.equal(db.transactionCount,0);
  });
  test('rejects invalid UUID and sha before DB', async()=>{
    const db=fakeDatabase();
    for(const patch of [{requestId:'bad'}, {imageSha256:'zz'.repeat(32)}, {imageSha256:'A'.repeat(64)}]) {
      assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db,{preflight:candidate(patch)}))).status,'BLOCKED');
    }
    assert.equal(db.transactionCount,0);
  });
  test('rejects missing or off-period request, invalid date', async()=>{
    const db=fakeDatabase();
    for(const patch of [{quotaDayStart:'2026-10-18'}, {quotaMonthStart:'2026-09'}])
      assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db,{preflight:candidate(patch)}))).status,'BLOCKED');
    assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db,{now:new Date('not a date')}))).status,'BLOCKED');
    assert.equal(db.transactionCount,0);
  });
  test('missing db rejects before transaction', async()=>{
    const r=await reserveBackgroundWithSharedQuotaForReview(args(null));assert.equal(r.reason,'DATABASE_ADAPTER_MISSING');
  });
  test('single fake commit increments SHARED day/month + POOL day/month exactly once', async()=>{
    const db=fakeDatabase();const r=await reserveBackgroundWithSharedQuotaForReview(args(db));
    assert.equal(r.status,'MOCK_RESERVED_NEVER_DISPATCH');assert.equal(r.committed,true);
    assert.equal(r.dispatchAllowed,false);assert.equal(r.providerCalled,false);
    assert.deepEqual(counts(db),{shared:[1,1], pool:[1,1], requests:1});
    assert.equal(db.state.requests[0].status,'RESERVED');
  });
  test('same UUID cannot reserve twice and never debits duplicate counters', async()=>{
    const db=fakeDatabase();await reserveBackgroundWithSharedQuotaForReview(args(db));
    const r=await reserveBackgroundWithSharedQuotaForReview(args(db));
    assert.equal(r.reason,'EXISTING_REQUEST_NO_RETRY');assert.deepEqual(counts(db),{shared:[1,1],pool:[1,1],requests:1});
  });
  test('same UUID with other image cannot bypass idempotency', async()=>{
    const db=fakeDatabase();await reserveBackgroundWithSharedQuotaForReview(args(db));
    const r=await reserveBackgroundWithSharedQuotaForReview(args(db,{preflight:candidate({imageSha256:'cd'.repeat(32)})}));
    assert.equal(r.reason,'EXISTING_REQUEST_NO_RETRY');assert.equal(db.state.requests.length,1);
  });
  test('two concurrent same UUID calls commit once', async()=>{
    const db=fakeDatabase();const both=await Promise.all([reserveBackgroundWithSharedQuotaForReview(args(db)),reserveBackgroundWithSharedQuotaForReview(args(db))]);
    assert.equal(both.filter(x=>x.committed).length,1);assert.deepEqual(counts(db),{shared:[1,1],pool:[1,1],requests:1});
  });
  test('two distinct UUIDs race for last shared DAILY slot: one succeeds', async()=>{
    const db=fakeDatabase({quotaPatch:{period:'DAY',used:2,limit:3}});
    const alt=candidate({requestId:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'});
    const both=await Promise.all([reserveBackgroundWithSharedQuotaForReview(args(db)),reserveBackgroundWithSharedQuotaForReview(args(db,{preflight:alt}))]);
    assert.equal(both.filter(x=>x.committed).length,1);
    assert.deepEqual(counts(db),{shared:[1,3],pool:[1,1],requests:1});
  });
  test('two distinct UUIDs race for last VENDOR POOL DAILY slot: one succeeds', async()=>{
    const db=fakeDatabase({poolPatch:{period:'DAY',committed:2,ceiling:3}});
    const alt=candidate({requestId:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'});
    const both=await Promise.all([reserveBackgroundWithSharedQuotaForReview(args(db)),reserveBackgroundWithSharedQuotaForReview(args(db,{preflight:alt}))]);
    assert.equal(both.filter(x=>x.committed).length,1);
    assert.deepEqual(counts(db),{shared:[1,1],pool:[1,3],requests:1});
  });
  test('shared MONTH exhaustion denies and preserves all', async()=>{
    const db=fakeDatabase({quotaPatch:{period:'MONTH',used:20}});const before=counts(db);
    assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db))).reason,'SHARED_OWNER_QUOTA_EXHAUSTED');
    assert.deepEqual(counts(db),before);
  });
  test('vendor MONTH exhaustion denies and rolls back shared debit', async()=>{
    const db=fakeDatabase({poolPatch:{period:'MONTH',committed:20}});const before=counts(db);
    assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db))).reason,'VENDOR_POOL_BUDGET_EXHAUSTED');
    assert.deepEqual(counts(db),before);
  });
  test('missing shared period rolls back entire transaction', async()=>{
    for(const period of ['MONTH','DAY']) {
      const db=fakeDatabase({missingShared:period});const before=counts(db);
      assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db))).reason,'SHARED_OWNER_QUOTA_BUCKET_MISSING_OR_INVALID');
      assert.deepEqual(counts(db),before);
    }
  });
  test('missing POOL period rolls back shared counters and request', async()=>{
    for(const period of ['MONTH','DAY']) {
      const db=fakeDatabase({missingPool:period});const before=counts(db);
      assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db))).reason,'VENDOR_POOL_BUDGET_MISSING_OR_INVALID');
      assert.deepEqual(counts(db),before);
    }
  });
  test('invalid shared bucket counters reject fail-closed', async()=>{
    for(const patch of [{used:-1},{used:1.5},{used:21,limit:20},{limit:0},{quotaKey:'OTHER'},{ownerId:'other'}]) {
      const db=fakeDatabase({quotaPatch:{period:'MONTH',...patch}});
      assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db))).status,'BLOCKED');
      assert.equal(db.state.requests.length,0);
    }
  });
  test('invalid vendor pool bucket counters reject fail-closed', async()=>{
    for(const patch of [{committed:-1},{committed:2.5},{committed:21,ceiling:20},{ceiling:0},{scope:'OWNER'}, {scopeId:'bad'}]) {
      const db=fakeDatabase({poolPatch:{period:'MONTH',...patch}});
      assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db))).status,'BLOCKED');
      assert.equal(db.state.requests.length,0);
    }
  });
  test('shared month conditional conflict rolls back', async()=>{
    const db=fakeDatabase({failShared:'MONTH'});const before=counts(db);
    assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db))).reason,'SHARED_OWNER_CONCURRENT_CHANGE');
    assert.deepEqual(counts(db),before);
  });
  test('shared day conditional conflict rolls back already updated month', async()=>{
    const db=fakeDatabase({failShared:'DAY'});const before=counts(db);
    assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db))).reason,'SHARED_OWNER_CONCURRENT_CHANGE');
    assert.deepEqual(counts(db),before);
  });
  test('pool day conditional conflict rolls back shared+monthly vendor', async()=>{
    const db=fakeDatabase({failPool:'DAY'});const before=counts(db);
    assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db))).reason,'VENDOR_POOL_CONCURRENT_CHANGE');
    assert.deepEqual(counts(db),before);
  });
  test('pool month conditional conflict rolls back shared counters', async()=>{
    const db=fakeDatabase({failPool:'MONTH'});const before=counts(db);
    assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db))).reason,'VENDOR_POOL_CONCURRENT_CHANGE');
    assert.deepEqual(counts(db),before);
  });
  test('reservation record insert failure rolls back everything', async()=>{
    const db=fakeDatabase({failCreate:true});const before=counts(db);
    assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db))).reason,'TRANSACTION_ABORTED_NO_RETRY');
    assert.deepEqual(counts(db),before);
  });
  test('incomplete db adapter denies and makes no changes', async()=>{
    const db=fakeDatabase({incompleteTx:true});const before=counts(db);
    assert.equal((await reserveBackgroundWithSharedQuotaForReview(args(db))).reason,'DATABASE_SCHEMA_OR_METHODS_MISSING');
    assert.deepEqual(counts(db),before);
  });
  test('outputs never expose db refs or consent tokens', async()=>{
    const db=fakeDatabase();const result=await reserveBackgroundWithSharedQuotaForReview(args(db));
    assert.deepEqual(Object.keys(result).sort(),['committed','dispatchAllowed','productionReady','providerCalled','reason','schemaApplied','status'].sort());
  });
});
