import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import { BG_RELEASE_GATE_REVIEW_ONLY, BG_RELEASE_GATE_PAID_DISPATCH_ENABLED,
  BG_RELEASE_GATE_DB_WRITES_ENABLED, BG_RELEASE_GATE_STORAGE_ENABLED,
  BG_RELEASE_GATE_PUBLIC_REMOVE_ENABLED, BG_RELEASE_GATE_MIGRATION_APPROVED,
  evaluateBackgroundReleaseGate, verifyBackgroundFeatureSwitches,
} from '../../lib/ai/aiBackgroundReleaseGate.mjs';
import { auditBackgroundSchemaSource } from '../../lib/ai/aiBackgroundSchemaAudit.mjs';
import { auditBackgroundSharedQuotaSource } from '../../lib/ai/aiBackgroundSharedQuotaAudit.mjs';

const schema = `model AiQuotaBucket {
  ownerId String
  quotaKey String
  period AiQuotaPeriod
  periodStart DateTime
  used Int
}
model AiActionRequest { id String }
model UsageEvent { ownerId String\n quotaKey String }
`;
const reviewSql = 'CREATE TABLE "BgCreditBucket"; CREATE TABLE "BgCreditReservation";';
const diagnostics = () => ({
  schemaAudit: auditBackgroundSchemaSource({ prismaSchema: schema, reviewedSql: reviewSql }),
  sharedQuotaAudit: auditBackgroundSharedQuotaSource({ schema, reviewSql }),
  inspectionRouteExists: true,
  processingRouteExists: false,
});
const gate = patch => evaluateBackgroundReleaseGate({ ...diagnostics(), ...patch });
const codes = v => v.findings.map(f => f.code);
const goodSwitches = () => Object.fromEntries([
  'transportConnected', 'intakeConnected', 'decoderRouteEnabled',
  'outputRouteEnabled', 'creditDispatchEnabled', 'reservationDispatchEnabled',
  'inspectProviderEnabled', 'sharedQuotaDispatchEnabled', 'storageUploadEnabled',
  'downloadRouteEnabled', 'publicRemoveEnabled',
].map(key => [key, false]));

describe('Phase 21 / 10K immutable offline paid-release gate', () => {
  test('all new runtime permissions permanently default OFF', () => {
    assert.equal(BG_RELEASE_GATE_REVIEW_ONLY, true);
    for (const flag of [BG_RELEASE_GATE_PAID_DISPATCH_ENABLED,
      BG_RELEASE_GATE_DB_WRITES_ENABLED, BG_RELEASE_GATE_STORAGE_ENABLED,
      BG_RELEASE_GATE_PUBLIC_REMOVE_ENABLED, BG_RELEASE_GATE_MIGRATION_APPROVED])
      assert.equal(flag, false);
  });
  test('all 10H/10I diagnostics remain read-only and blocked', () => {
    const d = diagnostics();
    assert.equal(d.schemaAudit.status, 'BLOCKED');
    assert.equal(d.sharedQuotaAudit.status, 'BLOCKED');
    assert.equal(gate().status, 'BLOCKED');
  });
  test('cannot use schema text alone to approve production', () => {
    const completeText = `${schema}model BgCreditBucket { id String }\nmodel BgCreditReservation { id String }`;
    const a = auditBackgroundSchemaSource({ prismaSchema: completeText, reviewedSql: reviewSql });
    const b = auditBackgroundSharedQuotaSource({ schema: completeText + '\n  limit Int', reviewSql });
    const x = gate({ schemaAudit: a, sharedQuotaAudit: b });
    assert.equal(x.status, 'BLOCKED'); assert.equal(x.productionReady, false);
  });
  test('shared schema lacking limit is explicitly reported', () => {
    assert.ok(codes(gate()).includes('SHARED_QUOTA_LIMIT_MISMATCH'));
  });
  test('background Prisma models absent are explicitly reported', () => {
    assert.ok(codes(gate()).includes('BG_MODELS_NOT_PROVISIONED'));
  });
  test('always requires live schema review', () => {
    assert.ok(codes(gate()).includes('LIVE_NEON_SCHEMA_REVIEW'));
  });
  test('always requires real shared quota atomicity', () => {
    assert.ok(codes(gate()).includes('SHARED_QUOTA_ATOMICITY'));
  });
  test('always requires separate paid API credit approvals', () => {
    assert.ok(codes(gate()).includes('PROVIDER_BILLING_AND_EXPLICIT_APPROVAL'));
  });
  test('always requires no retry on unknown outcomes', () => {
    assert.ok(codes(gate()).includes('DISPATCH_AND_UNKNOWN_RECONCILIATION'));
  });
  test('always requires private output verification and retention', () => {
    assert.ok(codes(gate()).includes('VERIFIED_B2_PERSISTENCE'));
  });
  test('always requires exact-once asset and UsageEvent binding', () => {
    assert.ok(codes(gate()).includes('EXACT_ONCE_ASSET_LEDGER'));
  });
  test('always requires owner-scoped authenticated download', () => {
    assert.ok(codes(gate()).includes('AUTHENTICATED_DOWNLOAD'));
  });
  test('always requires gated UI and browser E2E', () => {
    assert.ok(codes(gate()).includes('CONTROLLED_UI_AND_E2E_QA'));
  });
  test('status cannot be bypassed through user supplied approvals', () => {
    const x = evaluateBackgroundReleaseGate({ ...diagnostics(), enabled: true,
      ownerPaidConsent: true, operatorApproval: true, productionReady: true,
      paidDispatchAllowed: true, migrationApproved: true, adminOverride: 'yes' });
    assert.equal(x.status, 'BLOCKED'); assert.equal(x.paidDispatchAllowed, false);
    assert.equal(x.migrationApproved, false); assert.equal(x.storageAllowed, false);
    assert.equal(x.downloadAllowed, false);
  });
  test('missing audits are a blocker rather than assumed safe', () => {
    const x = evaluateBackgroundReleaseGate({ inspectionRouteExists: true });
    assert.ok(codes(x).includes('SCHEMA_AUDIT_MISSING_OR_UNTRUSTED'));
    assert.ok(codes(x).includes('SHARED_QUOTA_AUDIT_MISSING_OR_UNTRUSTED'));
  });
  test('malformed audit evidence cannot authorize anything', () => {
    const x = gate({ schemaAudit: { status: 'APPROVED' },
      sharedQuotaAudit: { status: 'PASS', migrationApproved: true } });
    assert.equal(x.status, 'BLOCKED');
    assert.ok(codes(x).includes('SCHEMA_AUDIT_MISSING_OR_UNTRUSTED'));
    assert.ok(codes(x).includes('SHARED_QUOTA_AUDIT_MISSING_OR_UNTRUSTED'));
  });
  test('unexpected paid remove route is a security review finding', () => {
    const x = gate({ processingRouteExists: true });
    assert.ok(codes(x).includes('PROCESSING_ROUTE_MUST_BE_REVIEWED'));
    assert.equal(x.observations.processingRouteDetected, true);
  });
  test('missing local inspection route is reported without enabling it', () => {
    const x = gate({ inspectionRouteExists: false });
    assert.ok(codes(x).includes('INSPECTION_ROUTE_ABSENT'));
    assert.equal(x.paidDispatchAllowed, false);
  });
  test('release result does not claim external side effects', () => {
    const x = gate();
    for (const key of ['databaseConnected', 'providerCalled', 'storageWritten',
      'releaseApproved', 'productionReady', 'publicRemoveEnabled']) assert.equal(x[key], false);
  });
  test('final findings and observations are frozen', () => {
    const x = gate();
    assert.equal(Object.isFrozen(x), true);
    assert.equal(Object.isFrozen(x.findings), true);
    assert.equal(Object.isFrozen(x.findings[0]), true);
    assert.equal(Object.isFrozen(x.observations), true);
  });
  test('all expected feature switches OFF passes the OFF-state audit', () => {
    const x = verifyBackgroundFeatureSwitches(goodSwitches());
    assert.equal(x.allDisabled, true); assert.equal(x.status, 'ALL_KNOWN_SWITCHES_OFF');
  });
  test('an enabled provider switch fails closed', () => {
    const x = verifyBackgroundFeatureSwitches({ ...goodSwitches(), transportConnected: true });
    assert.equal(x.allDisabled, false); assert.deepEqual(x.invalid, ['transportConnected']);
  });
  test('an enabled cloud upload or download fails closed', () => {
    for (const key of ['storageUploadEnabled','downloadRouteEnabled','publicRemoveEnabled']) {
      const x = verifyBackgroundFeatureSwitches({ ...goodSwitches(), [key]: true });
      assert.equal(x.allDisabled, false); assert.ok(x.invalid.includes(key));
    }
  });
  test('missing switches never masquerade as OFF', () => {
    const x = verifyBackgroundFeatureSwitches({ transportConnected: false });
    assert.equal(x.allDisabled, false); assert.ok(x.invalid.length >= 10);
  });
  test('undefined, string false and numeric zero are not false switches', () => {
    for (const v of [undefined, 'false', 0, null]) {
      const x = verifyBackgroundFeatureSwitches({ ...goodSwitches(), creditDispatchEnabled: v });
      assert.equal(x.allDisabled, false);
    }
  });
  test('fake client payload cannot cause the audit to call network, DB or B2', () => {
    let calls = 0;
    const fakeClient = { ...diagnostics(), fetch: () => { calls++; },
      db: { $transaction: () => { calls++; } },
      storage: { putObject: () => { calls++; } },
      apiKey: 'SECRET', approved: true };
    const x = evaluateBackgroundReleaseGate(fakeClient);
    assert.equal(calls, 0); assert.equal(x.status, 'BLOCKED');
    assert.ok(!JSON.stringify(x).includes('SECRET'));
  });
});
