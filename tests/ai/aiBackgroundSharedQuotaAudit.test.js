import {describe,test} from 'bun:test';
import assert from 'node:assert/strict';
import {auditBackgroundSharedQuotaSource} from '../../lib/ai/aiBackgroundSharedQuotaAudit.mjs';
const full = `model AiQuotaBucket {\n id String @id\n ownerId String\n quotaKey String\n period AiQuotaPeriod\n periodStart DateTime\n used Int\n limit Int\n}\nmodel UsageEvent {\n ownerId String\n quotaKey String\n}\nmodel BgCreditReservation {\n requestId String @id\n}\nmodel BgCreditBucket {\n id String @id\n}\n`;
const sql = 'CREATE TABLE "BgCreditBucket" (id TEXT); CREATE TABLE "BgCreditReservation" (id TEXT);';
describe('Phase 21 / 10I offline shared quota source audit (always blocked)',()=>{
  test('missing source is BLOCKED',()=>assert.equal(auditBackgroundSharedQuotaSource().status,'BLOCKED'));
  test('reports exact shared fields present',()=>assert.equal(auditBackgroundSharedQuotaSource({schema:full,reviewSql:sql}).sharedQuotaFields.length,6));
  test('reports missing used counter',()=>assert.ok(auditBackgroundSharedQuotaSource({schema:full.replace(' used Int',' other Int'),reviewSql:sql}).findings.some(x=>x.includes('used'))));
  test('reports missing limit field',()=>assert.ok(auditBackgroundSharedQuotaSource({schema:full.replace(' limit Int',' other Int'),reviewSql:sql}).findings.some(x=>x.includes('limit'))));
  test('reports missing periodStart date',()=>assert.ok(auditBackgroundSharedQuotaSource({schema:full.replace(' periodStart DateTime',' periodDate DateTime'),reviewSql:sql}).findings.some(x=>x.includes('periodStart'))));
  test('reports missing usage owner quota ledger',()=>assert.ok(auditBackgroundSharedQuotaSource({schema:full.replace('quotaKey String\n}', 'other String\n}'),reviewSql:sql}).findings.some(x=>x.includes('UsageEvent'))));
  test('reports absent background Prisma models',()=>assert.equal(auditBackgroundSharedQuotaSource({schema:full.replace('model BgCreditBucket','model NotBgCreditBucket'),reviewSql:sql}).bgSchemaPresent,false));
  test('reports review SQL missing',()=>assert.ok(auditBackgroundSharedQuotaSource({schema:full,reviewSql:'-- none'}).findings.some(x=>x.includes('review SQL'))));
  test('even perfect text schema does not approve production migration',()=>{
    const r=auditBackgroundSharedQuotaSource({schema:full,reviewSql:sql});
    assert.equal(r.status,'BLOCKED');assert.equal(r.paidDispatchAllowed,false);assert.equal(r.migrationApproved,false);
  });
  test('explicitly flags old duplicate BG OWNER counters as unsafe',()=>assert.ok(auditBackgroundSharedQuotaSource({schema:full,reviewSql:sql}).findings.some(x=>x.includes('old OWNER'))));
  test('audit is entirely offline and returns stable review-only envelope',()=>assert.equal(auditBackgroundSharedQuotaSource({schema:full,reviewSql:sql}).reviewOnly,true));
});
