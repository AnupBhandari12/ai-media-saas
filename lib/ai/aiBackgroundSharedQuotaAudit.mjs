/** Offline source-text compatibility diagnostic. NEVER a production approval. */
export function auditBackgroundSharedQuotaSource({ schema, reviewSql } = {}) {
  const findings = [];
  const found = (str, name) => {
    if (typeof str !== 'string') return null;
    const m = str.match(new RegExp(`\\bmodel\\s+${name}\\s*\\{([^}]*)\\}`, 'm'));
    return m ? m[1] : null;
  };
  const field = (block, key, type) => typeof block === 'string' &&
    new RegExp(`^\\s*${key}\\s+${type}\\b`, 'm').test(block);
  const quota = found(schema, 'AiQuotaBucket');
  const bgRes = found(schema, 'BgCreditReservation');
  const bgBudget = found(schema, 'BgCreditBucket');
  const usage = found(schema, 'UsageEvent');
  const required = [['ownerId', 'String'], ['quotaKey', 'String'], ['period', 'AiQuotaPeriod'],
    ['periodStart', 'DateTime'], ['used', 'Int'], ['limit', 'Int']];
  const sharedFields = required.filter(([name, type]) => field(quota, name, type)).map(([name]) => name);
  if (!quota) findings.push('Missing AiQuotaBucket Prisma model.');
  for (const [name] of required) if (!sharedFields.includes(name)) findings.push(`Shared quota field missing or incompatible: ${name}`);
  if (!usage || !field(usage, 'ownerId', 'String') || !field(usage, 'quotaKey', 'String')) {
    findings.push('UsageEvent owner/quotaKey shared ledger is unverified.');
  }
  if (!bgRes || !bgBudget) findings.push('BgCreditReservation/BgCreditBucket not yet added to Prisma schema.');
  if (typeof reviewSql !== 'string' || !reviewSql.includes('CREATE TABLE "BgCreditReservation"') ||
      !reviewSql.includes('CREATE TABLE "BgCreditBucket"')) findings.push('10G review SQL missing or incomplete.');
  findings.push('10G old OWNER BgCreditBucket accounting must NOT be enabled alongside shared AiQuotaBucket debit.');
  findings.push('Pool and owner counters need a reviewed single atomic transaction and real Neon serializable contention tests.');
  findings.push('Verified output persistence, exact-once UsageEvent ledger, failure/refund reconciliation and provider billing still pending.');
  findings.push('Real database migrations, provider dispatch and production enablement have NOT been approved.');
  return Object.freeze({
    status: 'BLOCKED', paidDispatchAllowed: false, migrationApproved: false,
    reviewOnly: true, sharedQuotaFields: Object.freeze(sharedFields),
    bgSchemaPresent: Boolean(bgRes && bgBudget), findings: Object.freeze(findings),
  });
}
