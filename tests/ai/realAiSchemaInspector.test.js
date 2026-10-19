import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectRealAiPrismaSchema} from '../../lib/ai/realAiSchemaInspector.mjs';
test('invalid source fails closed',()=>assert.equal(inspectRealAiPrismaSchema('').ready,false));
test('actual local Prisma schema reports vendor budget missing',()=>{const s=readFileSync(new URL('../../prisma/schema.prisma',import.meta.url),'utf8');const r=inspectRealAiPrismaSchema(s);assert.ok(r.reasons.includes('MISSING_VENDOR_POOL_SCHEMA'));assert.equal(r.dbTouched,false);});
test('test inspector never approves DB migrations',()=>{const s=readFileSync(new URL('../../prisma/schema.prisma',import.meta.url),'utf8');assert.equal(inspectRealAiPrismaSchema(s).migrationApproved,false);});
