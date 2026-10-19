import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectRealAiPrismaSchema } from '../../lib/ai/realAiSchemaInspector.mjs';

test('invalid source fails closed', () => {
  assert.equal(inspectRealAiPrismaSchema('').ready, false);
});

test('actual local Prisma schema recognizes new background tables but does not approve live deployment', () => {
  const source = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8');
  const result = inspectRealAiPrismaSchema(source);
  assert.equal(result.reasons.includes('MISSING_VENDOR_POOL_SCHEMA'), false);
  assert.equal(result.reasons.includes('MISSING_BG_IDEMPOTENCY_SCHEMA'), false);
  assert.ok(result.reasons.includes('LIVE_DATABASE_UNVERIFIED'));
  assert.ok(result.reasons.includes('CONCURRENCY_AND_MIGRATION_APPROVAL_MISSING'));
  assert.equal(result.ready, false);
  assert.equal(result.dbTouched, false);
  assert.equal(result.migrationApproved, false);
});

test('test inspector never approves DB migrations', () => {
  const source = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8');
  assert.equal(inspectRealAiPrismaSchema(source).migrationApproved, false);
});
