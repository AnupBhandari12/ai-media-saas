import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const schema = readFileSync('prisma/schema.prisma', 'utf8');
const sql = readFileSync('prisma/migrations/20261019232000_phase21_bg_credits_private_assets/migration.sql', 'utf8');
describe('Phase21 actual background durable DB preparation: always paid-OFF', () => {
  test('has all three tables with exact Prisma model names', () => {
    for(const name of ['BgCreditBucket','BgCreditReservation','BgStoredAsset']){
      assert.match(schema, new RegExp(`model ${name} \\{`));
      assert.match(sql, new RegExp(`CREATE TABLE "${name}"`));
    }
  });
  test('enforces single credit and bounded counters in durable SQL', () => {
    assert.match(sql, /CHECK \("creditsReserved" = 1\)/);
    assert.match(sql, /"committed" <= "ceiling"/);
    assert.match(sql, /"scope" IN \('OWNER', 'POOL'\)/);
    assert.match(sql, /"period" IN \('DAY', 'MONTH'\)/);
  });
  test('all requests and private results are unique and owner-scoped', () => {
    assert.match(schema, /model BgCreditReservation[\s\S]*?requestId\s+String\s+@unique @db\.Uuid/);
    assert.match(schema, /model BgStoredAsset[\s\S]*?requestId\s+String\s+@unique @db\.Uuid/);
    assert.match(schema, /model BgStoredAsset[\s\S]*?ownerId\s+String/);
    assert.match(sql, /ADD CONSTRAINT "BgStoredAsset_requestId_fkey"/);
  });
  test('migration is additive and creates no provider credits or paid approvals', () => {
    assert.doesNotMatch(sql, /\b(?:DROP|TRUNCATE|DELETE FROM|INSERT INTO|UPDATE\s+"|ALTER TABLE "AiQuotaBucket")\b/i);
    assert.doesNotMatch(sql, /https?:\/\/|REMOVE_BG_API_KEY|OPENAI_API_KEY|PUBLIC URL/i);
    assert.match(sql, /"ceiling" INTEGER NOT NULL DEFAULT 0/);
  });
  test('no production side effects or public route added by schema stage', () => {
    assert.match(sql, /CREATE TABLE "BgStoredAsset"/);
    assert.doesNotMatch(sql, /CREATE\s+TRIGGER|CREATE\s+FUNCTION|CREATE\s+EXTENSION/i);
    assert.match(schema, /model AiSpendReservation \{/);
    assert.match(schema, /model AiQuotaBucket \{/);
  });
});
