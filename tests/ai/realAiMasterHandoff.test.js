import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {getRealAiMasterHandoff} from '../../lib/ai/realAiMasterHandoff.mjs';
test('provider transport prepared but real release blocked',()=>{const r=getRealAiMasterHandoff();assert.equal(r.offlineProviderContractsPrepared,true);assert.equal(r.phase21RealRelease,'BLOCKED');});
test('no routes or production DB accidentally enabled',()=>{const r=getRealAiMasterHandoff();assert.equal(r.captionRealRouteEnabled,false);assert.equal(r.productionDatabaseModified,false);});
test('both paid background and shared spending remain blocked',()=>{const r=getRealAiMasterHandoff();assert.equal(r.paidStatus,'BLOCKED');assert.equal(r.backgroundStatus,'BLOCKED');});
