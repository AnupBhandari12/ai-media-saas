import { readFileSync } from 'node:fs';
import { auditBackgroundSchemaSource } from '../../lib/ai/aiBackgroundSchemaAudit.mjs';

// Read local tracked source files only. Does NOT access env secrets, Prisma,
// Neon, vendor credits or any network connection. Does not write reports.
const prismaSchema = readFileSync('prisma/schema.prisma', 'utf8');
const reviewedSql = readFileSync('docs/phase21/10g_background_db_review.sql', 'utf8');
const audit = auditBackgroundSchemaSource({ prismaSchema, reviewedSql });
console.log('PHASE 21 / 10H READ-ONLY SCHEMA AUDIT: ' + audit.status);
for (const [key, value] of Object.entries(audit.sourceModelPresence ?? {})) {
  console.log(`${key}: ${value ? 'PRESENT_IN_LOCAL_SCHEMA' : 'NOT_IN_LOCAL_SCHEMA'}`);
}
for (const issue of audit.findings) console.log('- ' + issue);
console.log('No migration, database connection or paid dispatch was attempted.');
