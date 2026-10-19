import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {reviewRealRemoveBg} from '../../lib/ai/realAiRemoveBgReadiness.mjs';
test('remove bg defaults off',()=>assert.equal(reviewRealRemoveBg().providerCallAllowed,false));
test('free calls do not bypass owner/pool budget',()=>assert.ok(reviewRealRemoveBg({actualCreditBalanceVerified:true}).missing.includes('vendorPoolReserved')));
test('no forged booleans unlock paid provider',()=>{const x={};for(const key of reviewRealRemoveBg().missing)x[key]=true;assert.equal(reviewRealRemoveBg(x).providerCallAllowed,false);});
test('failure reconciliation is not a retry',()=>assert.equal(reviewRealRemoveBg().automaticRetryAllowed,false));
