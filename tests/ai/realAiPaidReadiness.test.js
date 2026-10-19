import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {reviewPaidReadiness} from '../../lib/ai/realAiPaidReadiness.mjs';
test('default paid readiness is blocked',()=>assert.equal(reviewPaidReadiness().dispatchAllowed,false));
test('human approval alone cannot spend',()=>assert.equal(reviewPaidReadiness({humanApproved:true}).dispatchAllowed,false));
test('even forged all-true evidence cannot enable provider',()=>{const r=reviewPaidReadiness({humanApproved:true,operatorApproved:true,isolatedDbVerified:true,durableUsdCeilingVerified:true,sharedQuotaAtomicVerified:true,idempotentLedgerVerified:true,unknownReconciliationVerified:true,ownerOnlyOutputVerified:true});assert.equal(r.status,'BLOCKED');});
test('missing evidence is identified',()=>assert.ok(reviewPaidReadiness().missing.includes('durableUsdCeilingVerified')));
