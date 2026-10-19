import {describe,test} from 'node:test';
import assert from 'node:assert/strict';
import {getPhase21LocalReleaseGate} from '../../lib/ai/phase21LocalReleaseGate.mjs';
describe('Phase21 local kit handoff status',()=>{
  test('local manual QA is available but paid AI is blocked',()=>{
    const g=getPhase21LocalReleaseGate();
    assert.equal(g.localToolsReadyForManualQa,true);
    assert.equal(g.phase21PaidRelease,'BLOCKED');
  });
  test('no paid caption vision or background dispatch enabled',()=>{
    const g=getPhase21LocalReleaseGate();
    assert.equal(g.providerCaptionReady,false);
    assert.equal(g.providerVisionAltReady,false);
    assert.equal(g.aiBackgroundReady,false);
  });
  test('requires separate user approval',()=>{
    const g=getPhase21LocalReleaseGate();
    assert.equal(g.externalSpendApproved,false);
    assert.equal(g.dbMigrationApproved,false);
    assert.ok(g.requiredNext.length>=4);
  });
});
