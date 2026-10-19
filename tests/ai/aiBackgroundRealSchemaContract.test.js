import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import {
  BG_REAL_SCHEMA_CONTRACT_REVIEW_ONLY, BG_REAL_SCHEMA_DB_WRITES_ENABLED,
  BG_REAL_SCHEMA_PROVIDER_ENABLED, BG_REAL_SCHEMA_RELEASE_APPROVED,
  BG_REAL_SCHEMA_FIELD_MAP, inspectBackgroundRealPrismaSchema,
  previewSharedAiActionQuotaCas,
} from '../../lib/ai/aiBackgroundRealSchemaContract.mjs';

// Exact field NAMES from the user's REAL 2026-10-19 local Prisma probe.
// This fixture does NOT attest to Neon production tables or grant a release.
const SCHEMA = `
model AiQuotaBucket {
 id String @id @default(cuid())
 ownerId String
 quotaKey String @db.VarChar(40)
 period AiQuotaPeriod
 periodStart DateTime
 used Int @default(0)
 limitValue Int
 createdAt DateTime @default(now())
 updatedAt DateTime @updatedAt
 @@unique([ownerId, quotaKey, period, periodStart])
 @@index([ownerId, periodStart])
}
model AiActionRequest {
 id String @id @default(cuid())
 ownerId String
 idempotencyKey String @db.VarChar(128)
 inputHash String @db.Char(64)
 action String @db.VarChar(40)
 status AiActionStatus @default(RESERVED)
 quotaCounted Boolean @default(false)
 quotaDayStart DateTime
 quotaMonthStart DateTime
 dispatchedAt DateTime?
 completedAt DateTime?
 usageEvent UsageEvent?
 @@unique([ownerId, idempotencyKey])
}
model UsageEvent {
 id String @id @default(cuid())
 ownerId String
 quotaKey String
 aiActionRequestId String? @unique
 aiActionRequest AiActionRequest? @relation(fields: [aiActionRequestId], references: [id], onDelete: SetNull)
}
model GeneratedAsset {
 id String @id @default(cuid())
 ownerId String
 jobId String?
 storageProvider String?
 storageKey String?
}
model ProcessingJob {
 id String @id @default(cuid())
 ownerId String
 status ProcessingJobStatus @default(PENDING)
}
enum AiQuotaPeriod { DAY MONTH }
enum AiActionStatus { RESERVED PROCESSING COMPLETED FAILED UNKNOWN CANCELLED }
`;
const day = new Date('2026-10-19T00:00:00.000Z');
const month = new Date('2026-10-01T00:00:00.000Z');
const now = new Date('2026-10-19T08:00:00.000Z');
const bucket = (overrides = {}) => ({id:'bucket-1',ownerId:'user_abc',quotaKey:'AI_ACTION',period:'DAY',periodStart:day,used:1,limitValue:3,...overrides});
const preview = (overrides={})=>previewSharedAiActionQuotaCas({authenticatedOwnerId:'user_abc',bucket:bucket(),now,...overrides});

describe('Phase 21 / 10L REAL Prisma field alignment (read only)',()=>{
 test('never enables migration, database writes, provider or paid release',()=>{
  assert.equal(BG_REAL_SCHEMA_CONTRACT_REVIEW_ONLY,true);
  assert.equal(BG_REAL_SCHEMA_DB_WRITES_ENABLED,false);
  assert.equal(BG_REAL_SCHEMA_PROVIDER_ENABLED,false);
  assert.equal(BG_REAL_SCHEMA_RELEASE_APPROVED,false);
 });
 test('maps exactly the probed database field names',()=>{
  assert.equal(BG_REAL_SCHEMA_FIELD_MAP.quotaLimit,'limitValue');
  assert.equal(BG_REAL_SCHEMA_FIELD_MAP.requestDispatchTimestamp,'dispatchedAt');
  assert.equal(BG_REAL_SCHEMA_FIELD_MAP.usageEventActionLink,'aiActionRequestId');
  assert.equal(BG_REAL_SCHEMA_FIELD_MAP.quotaKey,'AI_ACTION');
 });
 test('recognizes actual local schema field set but NEVER approves production',()=>{
  const r=inspectBackgroundRealPrismaSchema(SCHEMA);
  assert.equal(r.status,'LOCAL_FIELD_NAMES_MATCH');
  assert.equal(r.namesAligned,true);
  assert.deepEqual(r.findings,[]);
  assert.equal(r.paidDispatchAllowed,false);
  assert.equal(r.migrationApproved,false);
  assert.equal(r.dbSchemaProvenLive,false);
  assert.equal(r.legacy10iAdapterNeedsUpdate,true);
 });
 test('missing or invalid source fails closed',()=>{
  for(const schema of [undefined,null,{},[],42,'', 'x'.repeat(2_000_001)])
   assert.equal(inspectBackgroundRealPrismaSchema(schema).namesAligned,false);
 });
 test('detects legacy limit instead of limitValue',()=>{
  const r=inspectBackgroundRealPrismaSchema(SCHEMA.replace('limitValue Int','limit Int'));
  assert.equal(r.namesAligned,false);
  assert.ok(r.findings.some(x=>x.includes('LIMITVALUE')));
 });
 test('rejects simultaneous unexpected legacy limit and real field',()=>{
  const r=inspectBackgroundRealPrismaSchema(SCHEMA.replace('limitValue Int','limitValue Int\n limit Int'));
  assert.equal(r.namesAligned,false);
  assert.ok(r.findings.includes('LEGACY_LIMIT_FIELD_UNEXPECTED'));
 });
 test('catches incorrect quotaPeriod enum types',()=>{
  const r=inspectBackgroundRealPrismaSchema(SCHEMA.replace('period AiQuotaPeriod','period String'));
  assert.equal(r.namesAligned,false);
 });
 test('catches removed quota identity unique constraint',()=>{
  const r=inspectBackgroundRealPrismaSchema(SCHEMA.replace('@@unique([ownerId, quotaKey, period, periodStart])',''));
  assert.ok(r.findings.includes('SHARED_QUOTA_UNIQUE_IDENTITY_NOT_CONFIRMED'));
 });
 test('catches incorrect dispatched timestamp spelling',()=>{
  const r=inspectBackgroundRealPrismaSchema(SCHEMA.replace('dispatchedAt DateTime?','dispatchAt DateTime?'));
  assert.ok(r.findings.some(x=>x.includes('DISPATCHEDAT')));
 });
 test('catches missing AI action idempotency unique constraint',()=>{
  const r=inspectBackgroundRealPrismaSchema(SCHEMA.replace('@@unique([ownerId, idempotencyKey])',''));
  assert.ok(r.findings.includes('AI_ACTION_UNIQUE_IDEMPOTENCY_NOT_CONFIRMED'));
 });
 test('catches missing UsageEvent unique action linkage',()=>{
  const r=inspectBackgroundRealPrismaSchema(SCHEMA.replace('aiActionRequestId String? @unique','aiActionRequestId String?'));
  assert.ok(r.findings.includes('USAGE_EVENT_ACTION_LINK_UNIQUE_NOT_CONFIRMED'));
 });
 test('catches removed GeneratedAsset storage key',()=>{
  const r=inspectBackgroundRealPrismaSchema(SCHEMA.replace('storageKey String?','storageKey Int?'));
  assert.equal(r.namesAligned,false);
 });
 test('catches absent required enum definition',()=>{
  const r=inspectBackgroundRealPrismaSchema(SCHEMA.replace('enum AiQuotaPeriod { DAY MONTH }',''));
  assert.ok(r.findings.includes('AI_QUOTA_PERIOD_ENUM_MISSING'));
 });
 test('catches absent processing job model',()=>{
  const r=inspectBackgroundRealPrismaSchema(SCHEMA.replace(/model ProcessingJob \{[^}]*\}/,''));
  assert.equal(r.namesAligned,false);
 });
 test('rejects padded, empty and nonauthenticated owner',()=>{
  for(const authenticatedOwnerId of ['', 'u', ' user_abc', 'user_abc\n', null])
   assert.equal(preview({authenticatedOwnerId}).status,'BLOCKED');
 });
 test('rejects missing bucket',()=>{
  assert.equal(preview({bucket:null}).code,'BUCKET_MISSING');
 });
 test('rejects cross-account quota bucket',()=>{
  assert.equal(preview({bucket:bucket({ownerId:'user_other'})}).code,'BUCKET_IDENTITY_MISMATCH');
 });
 test('rejects wrong quota key, no silent fallthrough to other usage',()=>{
  assert.equal(preview({bucket:bucket({quotaKey:'VIDEO'})}).code,'BUCKET_IDENTITY_MISMATCH');
 });
 test('rejects missing bucket ID or unsupported period',()=>{
  assert.equal(preview({bucket:bucket({id:''})}).status,'BLOCKED');
  assert.equal(preview({bucket:bucket({period:'WEEK'})}).status,'BLOCKED');
 });
 test('rejects string, missing, negative, fractional, excessive and legacy limit',()=>{
  for(const b of [bucket({limitValue:'3'}),bucket({limitValue:undefined}),bucket({limitValue:-1}),
   bucket({limitValue:1.5}),bucket({limitValue:2_000_000}),{...bucket(),limit:3,limitValue:undefined}])
   assert.equal(preview({bucket:b}).status,'BLOCKED');
 });
 test('rejects invalid used count and already overspent shared quota',()=>{
  for(const used of ['1',-1,1.1,4,2_000_000])
   assert.equal(preview({bucket:bucket({used})}).status,'BLOCKED');
 });
 test('rejects exhausted shared daily slot',()=>{
  assert.equal(preview({bucket:bucket({used:3,limitValue:3})}).code,'SHARED_QUOTA_EXHAUSTED');
 });
 test('rejects mismatched UTC period, invalid dates and non-midnight period start',()=>{
  assert.equal(preview({bucket:bucket({periodStart:new Date('2026-10-18T00:00:00Z')})}).code,'UTC_PERIOD_MISMATCH');
  assert.equal(preview({bucket:bucket({periodStart:new Date('2026-10-19T13:00:00Z')})}).code,'INVALID_UTC_CLOCK');
  assert.equal(preview({now:new Date('invalid')}).code,'INVALID_UTC_CLOCK');
 });
 test('builds REAL Prisma updateMany where.limitValue and never where.limit',()=>{
  const r=preview();
  assert.equal(r.status,'CAS_ARGUMENT_PREVIEW_ONLY');
  assert.equal(r.databaseWritten,false);
  assert.equal(r.paidDispatchAllowed,false);
  assert.equal(r.requiresSerializableTransaction,true);
  assert.equal(r.args.where.limitValue,3);
  assert.equal(Object.prototype.hasOwnProperty.call(r.args.where,'limit'),false);
  assert.deepEqual(r.args.data,{used:{increment:1}});
 });
 test('preserves UTC day and owner in conditional update preview',()=>{
  const r=preview();
  assert.equal(r.args.where.ownerId,'user_abc');
  assert.equal(r.args.where.period,'DAY');
  assert.equal(r.args.where.quotaKey,'AI_ACTION');
  assert.equal(r.args.where.periodStart.toISOString(),day.toISOString());
 });
 test('accepts safe shared MONTH when in current UTC month',()=>{
  const r=preview({bucket:bucket({period:'MONTH',periodStart:month,used:19,limitValue:20})});
  assert.equal(r.status,'CAS_ARGUMENT_PREVIEW_ONLY');
  assert.equal(r.args.where.period,'MONTH');
  assert.equal(r.args.where.limitValue,20);
 });
 test('rejects previous month rather than borrowing last month quota',()=>{
  const r=preview({bucket:bucket({period:'MONTH',periodStart:new Date('2026-09-01T00:00:00Z')})});
  assert.equal(r.code,'UTC_PERIOD_MISMATCH');
 });
 test('does not mutate quota bucket or externally passed period date',()=>{
  const b=bucket();const d=b.periodStart;const start=d.getTime();
  const r=preview({bucket:b});
  assert.equal(b.used,1);assert.equal(b.limitValue,3);
  assert.equal(d.getTime(),start);
  assert.notEqual(r.args.where.periodStart,d);
 });
});
