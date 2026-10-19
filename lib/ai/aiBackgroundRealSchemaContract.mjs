/**
 * Phase 21 / 10L: local Prisma *source* inspection and safe CAS argument previews.
 * Real schema probe 2026-10-19: AiQuotaBucket LIMIT FIELD IS limitValue.
 * No database client, HTTP import, provider import, file/network access, mutation,
 * migration or paid approval occurs in this module. Preview is NOT an execution gate.
 */
export const BG_REAL_SCHEMA_CONTRACT_REVIEW_ONLY = true;
export const BG_REAL_SCHEMA_DB_WRITES_ENABLED = false;
export const BG_REAL_SCHEMA_PROVIDER_ENABLED = false;
export const BG_REAL_SCHEMA_RELEASE_APPROVED = false;
export const BG_REAL_SCHEMA_FIELD_MAP = Object.freeze({
  quotaLimit: 'limitValue',
  quotaUsed: 'used',
  quotaKey: 'AI_ACTION',
  requestDispatchTimestamp: 'dispatchedAt',
  actionUnique: 'ownerId_idempotencyKey',
  usageEventActionLink: 'aiActionRequestId',
});

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const goodOwner = value => typeof value === 'string' && value.length >= 3 && value.length <= 256 &&
  value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value);
const goodInteger = n => Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000;
const midnightUTC = date => date instanceof Date && Number.isFinite(date.getTime()) &&
  date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 &&
  date.getUTCMilliseconds() === 0;
const reject = code => Object.freeze({ status: 'BLOCKED', code, reviewOnly: true, databaseWritten: false });

function findBlock(source, kind, name) {
  if (typeof source !== 'string' || source.length > 2_000_000) return null;
  const re = new RegExp(`\\b${kind}\\s+${name}\\s*\\{([^}]*)\\}`, 'm');
  return source.match(re)?.[1] ?? null;
}
function hasField(model, field, type) {
  if (typeof model !== 'string') return false;
  const literalType = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${field}\\s+${literalType}(?=\\s|$)`, 'm').test(model);
}
function required(found, group, model, items) {
  if (model === null) { found.push(`${group}_MODEL_MISSING`); return; }
  for (const [name, type] of items) if (!hasField(model, name, type)) found.push(`${group}_${name.toUpperCase()}_MISSING_OR_INCOMPATIBLE`);
}
export function inspectBackgroundRealPrismaSchema(source) {
  const problems = [];
  const quota = findBlock(source, 'model', 'AiQuotaBucket');
  const action = findBlock(source, 'model', 'AiActionRequest');
  const usage = findBlock(source, 'model', 'UsageEvent');
  const asset = findBlock(source, 'model', 'GeneratedAsset');
  const job = findBlock(source, 'model', 'ProcessingJob');
  required(problems, 'SHARED_QUOTA', quota, [
    ['id', 'String'], ['ownerId', 'String'], ['quotaKey', 'String'],
    ['period', 'AiQuotaPeriod'], ['periodStart', 'DateTime'], ['used', 'Int'], ['limitValue', 'Int'],
  ]);
  required(problems, 'AI_ACTION', action, [
    ['id', 'String'], ['ownerId', 'String'], ['idempotencyKey', 'String'],
    ['inputHash', 'String'], ['quotaCounted', 'Boolean'],
    ['quotaDayStart', 'DateTime'], ['quotaMonthStart', 'DateTime'],
    ['dispatchedAt', 'DateTime?'], ['completedAt', 'DateTime?'],
  ]);
  required(problems, 'USAGE_EVENT', usage, [
    ['id', 'String'], ['ownerId', 'String'], ['quotaKey', 'String'],
    ['aiActionRequestId', 'String?'],
  ]);
  required(problems, 'GENERATED_ASSET', asset, [
    ['id', 'String'], ['ownerId', 'String'], ['jobId', 'String?'],
    ['storageProvider', 'String?'], ['storageKey', 'String?'],
  ]);
  required(problems, 'PROCESSING_JOB', job, [
    ['id', 'String'], ['ownerId', 'String'], ['status', 'ProcessingJobStatus'],
  ]);
  if (quota !== null && !/@@unique\s*\(\s*\[\s*ownerId\s*,\s*quotaKey\s*,\s*period\s*,\s*periodStart\s*\]/.test(quota))
    problems.push('SHARED_QUOTA_UNIQUE_IDENTITY_NOT_CONFIRMED');
  if (action !== null && !/@@unique\s*\(\s*\[\s*ownerId\s*,\s*idempotencyKey\s*\]/.test(action))
    problems.push('AI_ACTION_UNIQUE_IDEMPOTENCY_NOT_CONFIRMED');
  if (usage !== null && !/^\s*aiActionRequestId\s+String\?\s+@unique\b/m.test(usage))
    problems.push('USAGE_EVENT_ACTION_LINK_UNIQUE_NOT_CONFIRMED');
  if (findBlock(source, 'enum', 'AiQuotaPeriod') === null) problems.push('AI_QUOTA_PERIOD_ENUM_MISSING');
  if (findBlock(source, 'enum', 'AiActionStatus') === null) problems.push('AI_ACTION_STATUS_ENUM_MISSING');
  const legacyIncorrectLimitName = quota !== null && hasField(quota, 'limit', 'Int');
  if (legacyIncorrectLimitName) problems.push('LEGACY_LIMIT_FIELD_UNEXPECTED');
  const namesAligned = problems.length === 0;
  return Object.freeze({
    status: namesAligned ? 'LOCAL_FIELD_NAMES_MATCH' : 'SCHEMA_MISMATCH',
    namesAligned,
    findings: Object.freeze([...problems]),
    actualQuotaLimitField: namesAligned ? 'limitValue' : null,
    legacy10iAdapterNeedsUpdate: true,
    bgPoolTablesProvenLive: false,
    dbSchemaProvenLive: false,
    readOnly: true,
    paidDispatchAllowed: false,
    migrationApproved: false,
    productionReady: false,
  });
}

/** Never calls Prisma. This only prints a safe structure for an eventual audited transaction. */
export function previewSharedAiActionQuotaCas({ authenticatedOwnerId, bucket, now = new Date() } = {}) {
  if (!goodOwner(authenticatedOwnerId)) return reject('INVALID_AUTHENTICATED_OWNER');
  if (!plain(bucket)) return reject('BUCKET_MISSING');
  if (typeof bucket.id !== 'string' || !bucket.id || bucket.ownerId !== authenticatedOwnerId ||
      bucket.quotaKey !== BG_REAL_SCHEMA_FIELD_MAP.quotaKey || !['DAY', 'MONTH'].includes(bucket.period))
    return reject('BUCKET_IDENTITY_MISMATCH');
  if (!midnightUTC(bucket.periodStart) || !(now instanceof Date) || !Number.isFinite(now.getTime()))
    return reject('INVALID_UTC_CLOCK');
  const ymd = now.toISOString().slice(0, 10);
  const expected = bucket.period === 'DAY' ? `${ymd}T00:00:00.000Z` : `${ymd.slice(0, 7)}-01T00:00:00.000Z`;
  if (bucket.periodStart.toISOString() !== expected) return reject('UTC_PERIOD_MISMATCH');
  if (!goodInteger(bucket.used) || !goodInteger(bucket.limitValue) || bucket.limitValue < 1 || bucket.used > bucket.limitValue)
    return reject('INVALID_SHARED_LIMIT_VALUE');
  if (bucket.used === bucket.limitValue) return reject('SHARED_QUOTA_EXHAUSTED');
  return Object.freeze({
    status: 'CAS_ARGUMENT_PREVIEW_ONLY', reviewOnly: true, databaseWritten: false,
    paidDispatchAllowed: false, requiresSerializableTransaction: true,
    targetModel: 'AiQuotaBucket',
    args: {
      where: { id: bucket.id, ownerId: authenticatedOwnerId, quotaKey: 'AI_ACTION',
        period: bucket.period, periodStart: new Date(bucket.periodStart.getTime()),
        used: bucket.used, limitValue: bucket.limitValue },
      data: { used: { increment: 1 } },
    },
  });
}
