import {describe,test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewUserAltText} from '../../lib/ai/localAltTextReview.mjs';
describe('Phase21 local alt text writing review',()=>{
  test('removes redundant prefix without inventing visible features',()=>{
    const r=reviewUserAltText('A photo of a blue mug beside a green plant');
    assert.equal(r.revision,'A blue mug beside a green plant.');
    assert.equal(r.aiGenerated,false);assert.equal(r.imageAnalyzed,false);
  });
  test('reports uncertainty',()=>assert.ok(reviewUserAltText('A person probably at the station').issues.length));
  test('warns when long',()=>assert.ok(reviewUserAltText('A'.repeat(200)).issues.some(x=>x.includes('shorter'))));
  test('empty cannot be ready',()=>assert.equal(reviewUserAltText(' ').ready,false));
  test('rejects invalid text',()=>{assert.throws(()=>reviewUserAltText(123)); assert.throws(()=>reviewUserAltText('a'.repeat(1001)));});
  test('keeps already written concrete details intact',()=>{
    const r=reviewUserAltText('Red bicycle leaning against a brick wall.');
    assert.equal(r.revision,'Red bicycle leaning against a brick wall.');
  });
});
