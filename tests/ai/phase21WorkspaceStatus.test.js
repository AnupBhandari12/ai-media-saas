import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectPhase21Workspace } from '../../lib/ai/phase21WorkspaceStatus.mjs';
describe('Phase 21 master kit baseline', () => {
  test('requires real Prisma limitValue, not stale limit', () => {
    const r = inspectPhase21Workspace({schema:'model AiQuotaBucket { limitValue Int }'});
    assert.equal(r.aiQuotaLimitField, 'limitValue');
    assert.equal(inspectPhase21Workspace({schema:'limit Int'}).aiQuotaLimitField, 'UNKNOWN');
  });
  test('reads page references without opening any API', () => {
    const r=inspectPhase21Workspace({ captionPage:'CaptionGeneratorClient',altPage:'AltTextGeneratorClient',backgroundPage:'BackgroundRemoverClient' });
    assert.equal(r.hasCaptionPage && r.hasAltTextPage && r.hasBackgroundPage, true);
  });
  test('no paid or migration approval is inferred',()=>{
    const r=inspectPhase21Workspace({});
    assert.equal(r.paidAiReady, false);
    assert.equal(r.approvedNeonMigration, false);
    assert.equal(r.sourceOnly,true);
  });
});
