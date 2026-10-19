import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditPhase21Source,migrationIsAdditive,stripSqlComments} from '../../scripts/phase21/release-audit.mjs';
import {assessBgRuntime,assessBgRead} from '../../lib/ai/realBgRuntimePolicy.mjs';
const root=new URL('../../',import.meta.url);
const load=file=>readFileSync(new URL(file,root),'utf8');
const good=(file)=>load(file);

test('Phase21 offline release audit confirms 11 source invariants',()=>{
 const r=auditPhase21Source(new URL('../../',import.meta.url).pathname,good);
 assert.equal(r.status,'STATIC_AUDIT_PASSED_NOT_LIVE_RELEASE',r.issues.join('; '));
 assert.equal(r.issues.length,0);
});
test('static audit never asserts production readiness or verifies external side effects',()=>{
 const r=auditPhase21Source('',good);
 for(const field of ['liveDbVerified','b2AclVerified','providerCreditVerified','hostedFlagsVerified','manualBrowserVerified','productionReady'])
  assert.equal(r[field],false);
});
test('missing source blocks release',()=>{
 const r=auditPhase21Source('',()=>{throw Error('not found')});
 assert.equal(r.status,'STATIC_AUDIT_BLOCKED');assert.ok(r.issues.length>=10);
});
test('SQL comments cannot conceal a destructive command in migration',()=>{
 assert.equal(migrationIsAdditive('-- DROP TABLE fake;\nCREATE TABLE "A" (id int);'),true);
 assert.equal(migrationIsAdditive('CREATE TABLE "A" (id int); DROP TABLE "Users";'),false);
 assert.equal(migrationIsAdditive('ALTER TABLE "Users" DROP COLUMN "id";'),false);
 assert.equal(migrationIsAdditive('UPDATE "Users" SET name=\'x\';'),false);
 assert.equal(migrationIsAdditive(''),false);
});
test('comment stripping removes both ordinary SQL comment styles',()=>{
 const s=stripSqlComments('/* DELETE X */ CREATE TABLE T(id int); -- UPDATE X\n');
 assert.match(s,/CREATE TABLE/);assert.doesNotMatch(s,/DELETE|UPDATE/);
});
test('tampered Stage05 migration causes audit to fail closed',()=>{
 const p='prisma/migrations/20261019232000_phase21_bg_credits_private_assets/migration.sql';
 const r=auditPhase21Source('',f=>f===p?good(f)+'\nTRUNCATE TABLE "Users";':good(f));
 assert.equal(r.status,'STATIC_AUDIT_BLOCKED');
});
test('tampered Stage08 ledger migration causes audit to fail closed',()=>{
 const p='prisma/migrations/20261019235900_phase21_bg_unique_usage_ledger/migration.sql';
 assert.equal(auditPhase21Source('',f=>f===p?good(f).replace('CREATE UNIQUE INDEX','CREATE INDEX'):good(f)).status,'STATIC_AUDIT_BLOCKED');
});
test('removing origin validation from POST blocks offline audit',()=>{
 const p='app/api/ai/real/background/route.js';
 assert.equal(auditPhase21Source('',f=>f===p?good(f).replace("headers.get('origin')","headers.get('not-origin')"):good(f)).status,'STATIC_AUDIT_BLOCKED');
});
test('removing download owner ledger proof blocks audit',()=>{
 const p='app/api/ai/real/background/download/route.js';
 assert.equal(auditPhase21Source('',f=>f===p?good(f).replaceAll('getBgDownloadProof','getUnsafeProof'):good(f)).status,'STATIC_AUDIT_BLOCKED');
});
test('B2 public download exposure fails release audit',()=>{
 const p='app/api/ai/real/background/download/route.js';
 assert.equal(auditPhase21Source('',f=>f===p?good(f)+'\n// getSignedUrl must not be added':good(f)).status,'STATIC_AUDIT_BLOCKED');
});
test('paid vendor switches are OFF by default',()=>{
 assert.equal(assessBgRuntime({}).allowed,false);
 assert.equal(assessBgRuntime({AI_BG_REAL_ENABLED:'true'}).allowed,false);
});
test('explicit operator gates must have exact true string',()=>{
 const env={AI_BG_REAL_ENABLED:'true',AI_BG_REAL_SPEND_APPROVED:'true',AI_BG_PRIVATE_B2_WRITE_ENABLED:'true',
  AI_BG_PRIVATE_B2_OPERATOR_APPROVED:'true',REMOVE_BG_API_KEY:'fake-test-key-123456',
  B2_ENDPOINT:'https://s3.ap-southeast-1.backblazeb2.com',B2_REGION:'ap-southeast-1',
  B2_BUCKET_NAME:'private-bucket',B2_KEY_ID:'fake-key',B2_APPLICATION_KEY:'fake-private-key'};
 assert.equal(assessBgRuntime(env).allowed,true);
 assert.equal(assessBgRuntime({...env,AI_BG_REAL_SPEND_APPROVED:'TRUE'}).allowed,false);
});
test('B2 download is independently OFF by default',()=>{
 assert.equal(assessBgRead({}).allowed,false);
 assert.equal(assessBgRead({AI_BG_PRIVATE_B2_READ_ENABLED:'false'}).allowed,false);
 assert.equal(assessBgRead({AI_BG_PRIVATE_B2_READ_ENABLED:'true'}).allowed,true);
});
test('Phase21 exit doc explicitly defers real paid release and physical storage cleanup',()=>{
 const doc=load('docs/phase21/PHASE21_FINAL_EXIT.md');
 assert.match(doc,/Phase 24/);
 assert.match(doc,/physical B2 object cleanup/i);
 assert.match(doc,/migration status/i);
});
