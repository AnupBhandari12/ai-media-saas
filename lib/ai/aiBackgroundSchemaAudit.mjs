/**
 * Read-only, source-text audit for Phase 21 / 10G proposed tables.
 * This is NOT a replacement for live DB inspection, Prisma introspection,
 * accounting reconciliation, concurrency tests, or migration approval.
 * The paid provider MUST remain disabled irrespective of these findings.
 */
export function auditBackgroundSchemaSource({ prismaSchema, reviewedSql } = {}) {
  if (typeof prismaSchema !== 'string' || typeof reviewedSql !== 'string') {
    return Object.freeze({ status: 'BLOCKED', findings: ['Missing schema or reviewed SQL source.'] });
  }
  const model = (name) => {
    const match = prismaSchema.match(new RegExp(`\\bmodel\\s+${name}\\s*\\{([^}]*)\\}`, 'm'));
    return match ? match[1] : null;
  };
  const hasField = (text, field) => typeof text === 'string' && new RegExp(`^\\s*${field}\\s+`, 'm').test(text);
  const aiQuota = model('AiQuotaBucket');
  const aiAction = model('AiActionRequest');
  const usage = model('UsageEvent');
  const bgBucket = model('BgCreditBucket');
  const bgReservation = model('BgCreditReservation');
  const findings = [];
  if (!aiQuota) findings.push('AiQuotaBucket is absent from the checked Prisma source.');
  if (!aiAction) findings.push('AiActionRequest is absent from the checked Prisma source.');
  if (!usage || !hasField(usage, 'ownerId') || !hasField(usage, 'quotaKey')) {
    findings.push('UsageEvent cannot be confirmed as an owner-scoped shared quota ledger.');
  }
  if (!bgBucket) findings.push('BgCreditBucket Prisma model is not defined (10G SQL remains review-only).');
  if (!bgReservation) findings.push('BgCreditReservation Prisma model is not defined (10G SQL remains review-only).');
  if (!reviewedSql.includes('CREATE TABLE "BgCreditBucket"') ||
      !reviewedSql.includes('CREATE TABLE "BgCreditReservation"')) {
    findings.push('10G SQL review file does not contain both expected proposals.');
  }
  // In 10G, separate OWNER counters do not update the existing AiQuotaBucket.
  // This must be reconciled before any production migration or dispatch.
  findings.push('BLOCKER: 10G separate OWNER credit counters are not proven to debit the shared AiQuotaBucket atomically.');
  findings.push('BLOCKER: actual Neon DB schema, approved migration, pool provisioning, vendor billing and multi-instance SERIALIZABLE behavior have not been verified.');
  findings.push('BLOCKER: processing completion, verified output storage, idempotent ledger and UNKNOWN reconciliation are still pending.');
  return Object.freeze({
    status: 'BLOCKED', paidDispatchAllowed: false, migrationApproved: false,
    sourceModelPresence: Object.freeze({
      aiQuotaBucket: Boolean(aiQuota), aiActionRequest: Boolean(aiAction),
      usageEvent: Boolean(usage), bgCreditBucket: Boolean(bgBucket),
      bgCreditReservation: Boolean(bgReservation),
    }),
    findings: Object.freeze(findings),
  });
}
