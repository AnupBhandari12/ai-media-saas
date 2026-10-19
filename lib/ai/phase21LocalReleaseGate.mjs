export function getPhase21LocalReleaseGate() {
  return Object.freeze({
    localToolsReadyForManualQa: true,
    phase21PaidRelease: 'BLOCKED',
    providerCaptionReady: false,
    providerVisionAltReady: false,
    aiBackgroundReady: false,
    dbMigrationApproved: false,
    externalSpendApproved: false,
    requiredNext: Object.freeze([
      'Confirm accurate available model IDs and pricing for caption and vision alt text.',
      'Obtain explicit approval for any paid provider request, with a fixed spend ceiling.',
      'Align Prisma AiQuotaBucket.limitValue with a genuine serializable quota implementation.',
      'Design and test provider pool model on isolated database, not production Neon.',
      'Implement durable asset, owner-only download, UsageEvent exactly once and unknown reconciliation.',
      'Run manual browser/mobile, real DB concurrency, storage and provider contract QA.',
    ]),
  });
}
