/**
 * Phase 21 static, OFFLINE, read-only release audit.
 * This is NOT a live Neon, B2, remove.bg, Clerk, browser or hosted-env verification.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const filesToAudit = Object.freeze([
  'prisma/schema.prisma',
  'prisma/migrations/20261019232000_phase21_bg_credits_private_assets/migration.sql',
  'prisma/migrations/20261019235900_phase21_bg_unique_usage_ledger/migration.sql',
  'lib/ai/realBgCreditReservation.mjs',
  'lib/ai/realBgRuntimePolicy.mjs',
  'lib/ai/runRealBackground.mjs',
  'lib/ai/realBgPrivateB2.mjs',
  'lib/ai/realBgPersistence.mjs',
  'app/api/ai/real/background/route.js',
  'app/api/ai/real/background/download/route.js',
  'components/ai/RealBackgroundLab.jsx',
  'docs/phase21/PHASE21_FINAL_EXIT.md',
]);

export function stripSqlComments(sql) {
  if (typeof sql !== 'string') return '';
  return sql.replace(/\/\*[\s\S]*?\*\//g,'').replace(/--[^\n]*/g,'');
}

export function migrationIsAdditive(sql) {
  const bare=stripSqlComments(sql);
  if (!bare.trim()) return false;
  return !(/\b(?:DROP\s+(?:TABLE|SCHEMA|COLUMN|INDEX|CONSTRAINT)|TRUNCATE|DELETE\s+FROM|INSERT\s+INTO|REPLACE\s+INTO|GRANT|REVOKE)\b/i.test(bare) ||
    /\bUPDATE\s+(?:\"[^\"]+\"|[A-Za-z_][\w.]*)\s+SET\b/i.test(bare) ||
    /\bALTER\s+TABLE\b[^;]*?\b(?:DROP|RENAME|SET\s+SCHEMA|DISABLE|ENABLE)\b/i.test(bare));
}

export function auditPhase21Source(root, load = relative => readFileSync(path.join(root,relative),'utf8')) {
  const issues=[];
  const read=(key)=>{try {return load(key);} catch {issues.push(`missing/unreadable: ${key}`);return '';}};
  const values=Object.fromEntries(filesToAudit.map(f=>[f,read(f)]));
  const get=f=>values[f]??'';
  const check=(name,predicate)=>{if(!predicate)issues.push(name);};
  const migration05=get(filesToAudit[1]),migration08=get(filesToAudit[2]);
  check('Stage05 credit and asset schema is not verified additive',
    migrationIsAdditive(migration05) && /CREATE TABLE "BgCreditBucket"/.test(migration05) &&
    /CREATE TABLE "BgCreditReservation"/.test(migration05) &&
    /CREATE TABLE "BgStoredAsset"/.test(migration05) &&
    /CREATE UNIQUE INDEX "BgCreditReservation_requestId_key"/.test(migration05));
  check('Stage08 unique usage migration is not verified additive',
    migrationIsAdditive(migration08) && /ADD COLUMN "bgCreditReservationId" UUID/.test(migration08) &&
    /CREATE UNIQUE INDEX "UsageEvent_bgCreditReservationId_key"/.test(migration08) &&
    /REFERENCES "BgCreditReservation"/.test(migration08));
  const schema=get('prisma/schema.prisma');
  check('Prisma schema missing background ownership and usage models',
    ['model BgCreditBucket','model BgCreditReservation','model BgStoredAsset',
     'bgCreditReservationId String? @unique @db.Uuid'].every(t=>schema.includes(t)));
  const credit=get('lib/ai/realBgCreditReservation.mjs');
  check('shared + vendor credit reservation lacks atomic serializable protection',
    /\$transaction\(/.test(credit) && /Serializable/.test(credit) &&
    /aiQuotaBucket\.updateMany/.test(credit) && /bgCreditBucket\.updateMany/.test(credit) &&
    /REQUEST_EXISTS_NO_RETRY/.test(credit));
  const policy=get('lib/ai/realBgRuntimePolicy.mjs');
  check('background runtime operator gates not present',
    ['AI_BG_REAL_ENABLED','AI_BG_REAL_SPEND_APPROVED',
     'AI_BG_PRIVATE_B2_WRITE_ENABLED','AI_BG_PRIVATE_B2_OPERATOR_APPROVED',
     'AI_BG_PRIVATE_B2_READ_ENABLED'].every(v=>policy.includes(v)) &&
    /env\[key\] !== 'true'/.test(policy));
  const flow=get('lib/ai/runRealBackground.mjs');
  const mark=flow.indexOf('await markBgDispatch'), vendor=flow.indexOf('await vendor(');
  const reserve=flow.indexOf('await reserveRealBackgroundCredit');
  check('background workflow lacks ordered durable reservation and dispatch',
    reserve>=0 && mark>reserve && vendor>mark &&
    /UNKNOWN_NO_AUTO_RETRY/.test(flow) && /await upload\(/.test(flow) &&
    /completeBgWithUniqueLedger/.test(flow));
  const persistence=get('lib/ai/realBgPersistence.mjs');
  check('persistence lacks owned exact-once usage ledger',
    /bgCreditReservationId:requestId/.test(persistence) &&
    /Serializable/.test(persistence) && /ownerId/.test(persistence) &&
    /getBgDownloadProof/.test(persistence));
  const privateB2=get('lib/ai/realBgPrivateB2.mjs');
  check('private B2 upload/download integrity not verified',
    /PutObjectCommand/.test(privateB2) && /HeadObjectCommand/.test(privateB2) &&
    /GetObjectCommand/.test(privateB2) && /DIGEST\(/.test(privateB2) &&
    /PRIVATE_DOWNLOAD_INTEGRITY_MISMATCH/.test(privateB2) &&
    /PRIVATE_STORAGE_READ_DISABLED/.test(privateB2));
  const post=get('app/api/ai/real/background/route.js');
  check('POST missing auth, same-origin validation, bounds or consent',
    /await auth\(\)/.test(post) && /headers\.get\('origin'\)/.test(post) &&
    /content-length/.test(post) && /paidConsent/.test(post) &&
    /assessBgRuntime/.test(post));
  const download=get('app/api/ai/real/background/download/route.js');
  check('download missing auth, owner DB proof or private cache header',
    /await auth\(\)/.test(download) && /await getBgDownloadProof\(/.test(download) &&
    /readRealBgPrivatePng/.test(download) && /private, no-store/.test(download) &&
    !/getSignedUrl|createPresignedPost|publicUrl/.test(download));
  const ui=get('components/ai/RealBackgroundLab.jsx');
  check('paid beta UI missing explicit consent or uncertain outcome handling',
    /type="checkbox"/.test(ui) && /paidConsent/.test(ui) &&
    /response\.status===409/.test(ui));
  const doc=get('docs/phase21/PHASE21_FINAL_EXIT.md');
  check('release handoff must acknowledge private object cleanup remains pending',
    /physical B2 object cleanup/i.test(doc) && /Phase 24/.test(doc));
  return Object.freeze({status:issues.length?'STATIC_AUDIT_BLOCKED':'STATIC_AUDIT_PASSED_NOT_LIVE_RELEASE',
    checked:11,issues:Object.freeze(issues),
    liveDbVerified:false,b2AclVerified:false,providerCreditVerified:false,
    hostedFlagsVerified:false,manualBrowserVerified:false,productionReady:false});
}

const invoked=process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if (invoked) {
  const result=auditPhase21Source(process.cwd());
  if (result.issues.length) {
    console.error('PHASE21 OFFLINE RELEASE AUDIT BLOCKED:',result.issues.join('; '));
    process.exitCode=1;
  } else {
    console.log('PHASE21 OFFLINE SOURCE AUDIT PASS (11 checks).');
    console.log('NOT A PRODUCTION READINESS CLAIM: Neon status, B2 ACL, hosted flags, vendor credits, browser QA and physical B2 cleanup are NOT verified by this audit.');
  }
}
