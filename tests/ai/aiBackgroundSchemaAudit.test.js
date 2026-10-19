import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import {auditBackgroundSchemaSource} from '../../lib/ai/aiBackgroundSchemaAudit.mjs';
const sql='CREATE TABLE "BgCreditBucket" (id TEXT); CREATE TABLE "BgCreditReservation" (id TEXT);';
const schema=`model AiQuotaBucket {\n id String @id\n}\nmodel AiActionRequest {\n id String @id\n}\nmodel UsageEvent {\n ownerId String\n quotaKey String\n}\n`;
const withModels=schema+'model BgCreditBucket {\n id String @id\n}\nmodel BgCreditReservation {\n requestId String @id\n}\n';
describe('Phase 21 / 10H static database and shared quota audit',()=>{
  test('missing schema is blocked',()=>{assert.equal(auditBackgroundSchemaSource().status,'BLOCKED');});
  test('read-only audit identifies absent new background models',()=>{
    const r=auditBackgroundSchemaSource({prismaSchema:schema,reviewedSql:sql});
    assert.equal(r.sourceModelPresence.bgCreditBucket,false);
    assert.equal(r.sourceModelPresence.bgCreditReservation,false);
    assert.equal(r.sourceModelPresence.aiQuotaBucket,true);
  });
  test('even proposed models present cannot authorize real paid dispatch',()=>{
    const r=auditBackgroundSchemaSource({prismaSchema:withModels,reviewedSql:sql});
    assert.equal(r.status,'BLOCKED');assert.equal(r.paidDispatchAllowed,false);
    assert.equal(r.migrationApproved,false);
  });
  test('separate owner counters require reconciliation with AiQuotaBucket',()=>{
    const r=auditBackgroundSchemaSource({prismaSchema:withModels,reviewedSql:sql});
    assert.ok(r.findings.some(s=>s.includes('not proven to debit the shared AiQuotaBucket')));
  });
  test('missing usage ledger details are reported',()=>{
    const r=auditBackgroundSchemaSource({prismaSchema:withModels.replace('quotaKey String','other String'),reviewedSql:sql});
    assert.ok(r.findings.some(s=>s.includes('UsageEvent cannot')));
  });
  test('incomplete review SQL is blocked',()=>{
    const r=auditBackgroundSchemaSource({prismaSchema:withModels,reviewedSql:'-- empty'});
    assert.ok(r.findings.some(s=>s.includes('SQL review file')));
  });
  test('audit has no network, DB client or secret configuration requirements',()=>{
    const r=auditBackgroundSchemaSource({prismaSchema:withModels,reviewedSql:sql});
    assert.equal(r.status,'BLOCKED');assert.ok(Array.isArray(r.findings));
  });
});
