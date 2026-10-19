import { readFileSync } from 'node:fs';
import { inspectBackgroundRealPrismaSchema, BG_REAL_SCHEMA_FIELD_MAP } from '../../lib/ai/aiBackgroundRealSchemaContract.mjs';
const schema = readFileSync('prisma/schema.prisma', 'utf8');
const output = inspectBackgroundRealPrismaSchema(schema);
console.log('PHASE 21 / 10L LOCAL FIELD-COMPATIBILITY:', output.status);
console.log('Real limit field:', BG_REAL_SCHEMA_FIELD_MAP.quotaLimit);
console.log('Real dispatch field:', BG_REAL_SCHEMA_FIELD_MAP.requestDispatchTimestamp);
console.log('Real ledger field:', BG_REAL_SCHEMA_FIELD_MAP.usageEventActionLink);
console.log('10I legacy adapter incompatible:', output.legacy10iAdapterNeedsUpdate);
console.log('Paid release:', 'BLOCKED');
for (const finding of output.findings) console.log(' -', finding);
console.log('No Neon connection, Prisma query, schema migration, transaction, B2 upload, paid provider call or Git push.');
if (!output.namesAligned || output.status !== 'LOCAL_FIELD_NAMES_MATCH' ||
    output.paidDispatchAllowed !== false || output.migrationApproved !== false) process.exitCode = 1;
