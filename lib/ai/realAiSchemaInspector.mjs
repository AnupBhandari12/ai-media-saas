/** Offline text inspection, not a real database schema or migration assertion. */
export function inspectRealAiPrismaSchema(schema) {
  if (typeof schema!=='string'||schema.length<40||schema.length>500000) return Object.freeze({ready:false,reasons:['INVALID_SCHEMA_TEXT'],dbTouched:false});
  const includes=(value)=>schema.includes(value);
  const reasons=[];
  if (!/model\s+AiQuotaBucket\s*\{/.test(schema)||!includes('limitValue Int')) reasons.push('MISSING_SHARED_QUOTA_LIMITVALUE');
  if (!/model\s+AiActionRequest\s*\{/.test(schema)||!includes('idempotencyKey')) reasons.push('MISSING_AI_REQUEST_IDEMPOTENCY');
  if (!/model\s+UsageEvent\s*\{/.test(schema)||!includes('aiActionRequestId String?')) reasons.push('MISSING_AI_LEDGER_LINK');
  if (!/model\s+GeneratedAsset\s*\{/.test(schema)||!includes('storageKey')) reasons.push('MISSING_ASSET_STORAGE_KEY');
  if (!/model\s+BgCreditBucket\s*\{/.test(schema)) reasons.push('MISSING_VENDOR_POOL_SCHEMA');
  if (!/model\s+BgCreditReservation\s*\{/.test(schema)) reasons.push('MISSING_BG_IDEMPOTENCY_SCHEMA');
  reasons.push('LIVE_DATABASE_UNVERIFIED','CONCURRENCY_AND_MIGRATION_APPROVAL_MISSING');
  return Object.freeze({ready:false,reasons:Object.freeze(reasons),dbTouched:false,
    migrationApproved:false});
}
