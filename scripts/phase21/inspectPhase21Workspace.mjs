import { readFileSync } from 'node:fs';
import { inspectPhase21Workspace } from '../../lib/ai/phase21WorkspaceStatus.mjs';
const read = (name) => readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8');
const result = inspectPhase21Workspace({
  schema: read('prisma/schema.prisma'),
  captionPage: read('app/tools/ai/caption-generator/page.js'),
  altPage: read('app/tools/ai/alt-text-generator/page.js'),
  backgroundPage: read('app/tools/ai/background-remover/page.js'),
});
console.log('PHASE 21 BASELINE: READ ONLY');
console.log(`Prisma quota limit: ${result.aiQuotaLimitField}`);
console.log(`Pages found: caption=${result.hasCaptionPage} alt=${result.hasAltTextPage} background=${result.hasBackgroundPage}`);
console.log('Paid AI release: BLOCKED');
console.log('No database, provider, storage or network call.');
if (result.aiQuotaLimitField !== 'limitValue' || !result.hasCaptionPage || !result.hasAltTextPage || !result.hasBackgroundPage) process.exitCode = 1;
