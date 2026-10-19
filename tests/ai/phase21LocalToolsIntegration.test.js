import {describe,test} from 'node:test';
import assert from 'node:assert/strict';
import {createLocalCaptionDrafts} from '../../lib/ai/localCaptionDraft.mjs';
import {reviewUserAltText} from '../../lib/ai/localAltTextReview.mjs';
import {removeConnectedSolidColor} from '../../lib/ai/localSolidBackground.mjs';
describe('Phase21 three local tool smoke flow',()=>{
  test('user-supplied description produces editable caption and manual alt text',()=>{
    const description='A yellow flower in a glass vase on a table';
    const caption=createLocalCaptionDrafts({description});
    const alt=reviewUserAltText(description);
    assert.equal(caption.drafts.length,3);
    assert.equal(alt.revision,description+'.');
    assert.equal(caption.aiGenerated,false);
    assert.equal(alt.imageAnalyzed,false);
  });
  test('local background output is transparent yet preserves the source',()=>{
    const source=new Uint8ClampedArray([255,255,255,255,5,5,5,255]);
    const out=removeConnectedSolidColor({rgba:source,width:2,height:1,tolerance:0});
    assert.equal(out.rgba[3],0);assert.equal(out.rgba[7],255);
    assert.equal(source[3],255);
  });
  test('none of the local functions authorize paid work',()=>{
    const draft=createLocalCaptionDrafts({description:'A new launch'});
    assert.equal(draft.quotaConsumed,false);
    assert.equal(draft.aiGenerated,false);
  });
});
