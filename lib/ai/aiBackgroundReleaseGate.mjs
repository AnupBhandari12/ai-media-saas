/**
 * AI Media Phase 21 / Commit 10K — conservative OFFLINE release review.
 *
 * The input is limited to source-code diagnostics from 10H/10I, NOT runtime
 * credentials, HTTP bodies or operator authorization. This module can never
 * enable paid operations. Passing all source checks never proves production
 * safety or implies approval for a database migration.
 */
export const BG_RELEASE_GATE_REVIEW_ONLY = true;
export const BG_RELEASE_GATE_PAID_DISPATCH_ENABLED = false;
export const BG_RELEASE_GATE_DB_WRITES_ENABLED = false;
export const BG_RELEASE_GATE_STORAGE_ENABLED = false;
export const BG_RELEASE_GATE_PUBLIC_REMOVE_ENABLED = false;
export const BG_RELEASE_GATE_MIGRATION_APPROVED = false;

const ALWAYS_PENDING = Object.freeze([
  Object.freeze({ code: 'LIVE_NEON_SCHEMA_REVIEW', description: 'Review exact local Prisma fields and live Neon schema against isolated test branch; never migrate production from review SQL.' }),
  Object.freeze({ code: 'SHARED_QUOTA_ATOMICITY', description: 'Implement and test a real Prisma SERIALIZABLE transaction against existing AI_ACTION quota plus vendor POOL without duplicate owner debit.' }),
  Object.freeze({ code: 'PROVIDER_BILLING_AND_EXPLICIT_APPROVAL', description: 'Confirm remove.bg credits/pricing, fresh balance and server-side approvals before spending any credit.' }),
  Object.freeze({ code: 'DISPATCH_AND_UNKNOWN_RECONCILIATION', description: 'Durably mark exactly-once dispatch, reconcile ambiguous outcome and forbid blind retries/refunds.' }),
  Object.freeze({ code: 'VERIFIED_B2_PERSISTENCE', description: 'Verify private B2 upload, checksum, retention and cleanup before treating result as durable.' }),
  Object.freeze({ code: 'EXACT_ONCE_ASSET_LEDGER', description: 'Bind completed processing job, immutable output hash, asset and UsageEvent exactly once in a real transaction.' }),
  Object.freeze({ code: 'AUTHENTICATED_DOWNLOAD', description: 'Use DB-backed owner checks to download private objects; do not expose storage keys or public URLs.' }),
  Object.freeze({ code: 'CONTROLLED_UI_AND_E2E_QA', description: 'Build before/after UI only after full backend safety; run manual security, browser and concurrency QA.' }),
]);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
const verdict = (findings, observations) => Object.freeze({
  status: 'BLOCKED', releaseApproved: false, productionReady: false,
  paidDispatchAllowed: false, migrationApproved: false, storageAllowed: false,
  downloadAllowed: false, publicRemoveEnabled: false,
  databaseConnected: false, providerCalled: false, storageWritten: false,
  findings: Object.freeze(findings.map(x => Object.freeze(x))),
  observations: Object.freeze({ ...observations }),
});

/**
 * Consume *read-only* 10H/10I source diagnostics for a human-readable QA gate.
 * Never accept caller-provided 'approved', 'ready', 'enable', API key or operator
 * consent as evidence; those cannot alter this result. Deliberately ALWAYS
 * blocked until a separate, human-approved deployment workflow is authored.
 */
export function evaluateBackgroundReleaseGate({ schemaAudit, sharedQuotaAudit,
  inspectionRouteExists = false, processingRouteExists = false,
} = {}) {
  const findings = [];
  const schema = isRecord(schemaAudit) && schemaAudit.status === 'BLOCKED' &&
    schemaAudit.paidDispatchAllowed === false;
  const shared = isRecord(sharedQuotaAudit) && sharedQuotaAudit.status === 'BLOCKED' &&
    sharedQuotaAudit.paidDispatchAllowed === false && sharedQuotaAudit.migrationApproved === false;
  if (!schema) findings.push({ code: 'SCHEMA_AUDIT_MISSING_OR_UNTRUSTED', description: '10H read-only audit must exist and report BLOCKED.' });
  if (!shared) findings.push({ code: 'SHARED_QUOTA_AUDIT_MISSING_OR_UNTRUSTED', description: '10I read-only audit must exist and report BLOCKED.' });
  if (!schemaAudit?.sourceModelPresence?.bgCreditBucket ||
      !schemaAudit?.sourceModelPresence?.bgCreditReservation) {
    findings.push({ code: 'BG_MODELS_NOT_PROVISIONED', description: 'Background credit models are not verified in Prisma and production database.' });
  }
  if (!sharedQuotaAudit?.sharedQuotaFields?.includes?.('limit')) {
    findings.push({ code: 'SHARED_QUOTA_LIMIT_MISMATCH', description: 'The 10I fake adapter references AiQuotaBucket.limit; real Prisma schema compatibility remains unverified.' });
  }
  if (processingRouteExists !== false) {
    findings.push({ code: 'PROCESSING_ROUTE_MUST_BE_REVIEWED', description: 'An unexpected background processing route exists; stop before enabling it.' });
  }
  if (inspectionRouteExists !== true) {
    findings.push({ code: 'INSPECTION_ROUTE_ABSENT', description: 'Local inspection route is missing or unreadable.' });
  }
  findings.push(...ALWAYS_PENDING);
  return verdict(findings, {
    offlineInspectionRouteFound: inspectionRouteExists === true,
    processingRouteDetected: processingRouteExists === true,
    sourceSchemaAuditBlocked: schema,
    sourceSharedQuotaAuditBlocked: shared,
    sourceChecksAreNotRuntimeProof: true,
  });
}

/** Prove all known component switches are OFF using trusted server imports. */
export function verifyBackgroundFeatureSwitches(switches) {
  const required = [
    'transportConnected', 'intakeConnected', 'decoderRouteEnabled',
    'outputRouteEnabled', 'creditDispatchEnabled', 'reservationDispatchEnabled',
    'inspectProviderEnabled', 'sharedQuotaDispatchEnabled', 'storageUploadEnabled',
    'downloadRouteEnabled', 'publicRemoveEnabled',
  ];
  if (!isRecord(switches)) return Object.freeze({ status: 'CHECK_FAILED', allDisabled: false, invalid: Object.freeze([...required]) });
  const invalid = required.filter(key => switches[key] !== false);
  return Object.freeze({ status: invalid.length === 0 ? 'ALL_KNOWN_SWITCHES_OFF' : 'CHECK_FAILED',
    allDisabled: invalid.length === 0, invalid: Object.freeze(invalid) });
}
