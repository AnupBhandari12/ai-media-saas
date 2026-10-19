/** Standalone offline 10K audit; never touches Neon or paid providers. */
import { readFileSync, existsSync } from 'node:fs';
import { auditBackgroundSchemaSource } from '../../lib/ai/aiBackgroundSchemaAudit.mjs';
import { auditBackgroundSharedQuotaSource } from '../../lib/ai/aiBackgroundSharedQuotaAudit.mjs';
import { evaluateBackgroundReleaseGate, verifyBackgroundFeatureSwitches } from '../../lib/ai/aiBackgroundReleaseGate.mjs';
import { REMOVE_BG_CONNECTED_TO_PUBLIC_ROUTE } from '../../lib/ai/aiRemoveBgProvider.mjs';
import { BACKGROUND_INTAKE_CONNECTED_TO_ROUTE } from '../../lib/ai/aiBackgroundIntake.mjs';
import { BACKGROUND_SHARP_DECODER_PUBLIC_ROUTE_ENABLED } from '../../lib/ai/aiSharpDecoder.mjs';
import { BACKGROUND_OUTPUT_PUBLIC_ROUTE_ENABLED } from '../../lib/ai/aiBackgroundOutput.mjs';
import { BACKGROUND_CREDIT_POLICY_DISPATCH_ENABLED } from '../../lib/ai/aiBackgroundCreditPolicy.mjs';
import { BG_ATOMIC_RESERVATION_PAID_DISPATCH_ENABLED } from '../../lib/ai/aiBackgroundAtomicReservation.mjs';
import { BG_INSPECT_PROVIDER_DISPATCH_ENABLED } from '../../lib/ai/aiBackgroundInspect.mjs';
import { BG_SHARED_QUOTA_PAID_DISPATCH_ENABLED } from '../../lib/ai/aiBackgroundSharedQuotaReview.mjs';
import { BG_ARTIFACT_STORAGE_UPLOAD_ENABLED, BG_ARTIFACT_DOWNLOAD_ROUTE_ENABLED } from '../../lib/ai/aiBackgroundPrivateArtifact.mjs';
import { BG_RELEASE_GATE_PUBLIC_REMOVE_ENABLED } from '../../lib/ai/aiBackgroundReleaseGate.mjs';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const sql = readFileSync('docs/phase21/10g_background_db_review.sql', 'utf8');
const schemaAudit = auditBackgroundSchemaSource({ prismaSchema: schema, reviewedSql: sql });
const sharedQuotaAudit = auditBackgroundSharedQuotaSource({ schema, reviewSql: sql });
const processingRouteExists = [
  'app/api/ai/background/remove/route.js', 'app/api/ai/background/process/route.js',
  'app/api/ai/background/dispatch/route.js', 'app/api/ai/background/run/route.js',
].some(path => existsSync(path));
const review = evaluateBackgroundReleaseGate({ schemaAudit, sharedQuotaAudit,
  inspectionRouteExists: existsSync('app/api/ai/background/inspect/route.js'),
  processingRouteExists });
const switches = verifyBackgroundFeatureSwitches({
  transportConnected: REMOVE_BG_CONNECTED_TO_PUBLIC_ROUTE,
  intakeConnected: BACKGROUND_INTAKE_CONNECTED_TO_ROUTE,
  decoderRouteEnabled: BACKGROUND_SHARP_DECODER_PUBLIC_ROUTE_ENABLED,
  outputRouteEnabled: BACKGROUND_OUTPUT_PUBLIC_ROUTE_ENABLED,
  creditDispatchEnabled: BACKGROUND_CREDIT_POLICY_DISPATCH_ENABLED,
  reservationDispatchEnabled: BG_ATOMIC_RESERVATION_PAID_DISPATCH_ENABLED,
  inspectProviderEnabled: BG_INSPECT_PROVIDER_DISPATCH_ENABLED,
  sharedQuotaDispatchEnabled: BG_SHARED_QUOTA_PAID_DISPATCH_ENABLED,
  storageUploadEnabled: BG_ARTIFACT_STORAGE_UPLOAD_ENABLED,
  downloadRouteEnabled: BG_ARTIFACT_DOWNLOAD_ROUTE_ENABLED,
  publicRemoveEnabled: BG_RELEASE_GATE_PUBLIC_REMOVE_ENABLED,
});
console.log('PHASE 21 / 10K OFFLINE RELEASE GATE:', review.status);
console.log('Known provider/storage/route switches:', switches.status);
console.log('Previous shared-quota audit:', sharedQuotaAudit.status);
console.log('Findings:');
for (const finding of review.findings) console.log(' -', finding.code, '-', finding.description);
console.log('NO database connection, migration, provider request, storage operation or Git push.');
// A disabled, correctly blocked system exits zero. Unexpected enablement fails.
if (!switches.allDisabled || processingRouteExists ||
    schemaAudit.status !== 'BLOCKED' || sharedQuotaAudit.status !== 'BLOCKED' ||
    review.status !== 'BLOCKED' || review.paidDispatchAllowed !== false) {
  console.error('SECURITY REGRESSION: Refusing release review success.');
  process.exitCode = 1;
}
