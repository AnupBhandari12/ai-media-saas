import {describe,test} from 'node:test';
import assert from 'node:assert/strict';
import {createLocalCaptionDrafts} from '../../lib/ai/localCaptionDraft.mjs';
describe('Phase21 local caption templates',()=>{
  test('makes three editable drafts from user text',()=>{
    const r=createLocalCaptionDrafts({description:'A new website launched'});
    assert.equal(r.drafts.length,3);
    assert.equal(r.aiGenerated,false);
    assert.equal(r.quotaConsumed,false);
    assert.equal(r.imageAnalyzed,false);
    for(const draft of r.drafts) assert.ok(draft.text.includes('A new website launched'));
  });
  test('hashtags come only from supplied tokens',()=>{
    const r=createLocalCaptionDrafts({description:'Team met today',hashtags:'#nepal nepal coding,dev'});
    assert.match(r.drafts[0].text,/#nepal #coding #dev/);
  });
  test('rejects nontext and short source',()=>{
    assert.throws(()=>createLocalCaptionDrafts({description:5}));
    assert.throws(()=>createLocalCaptionDrafts({description:'  '}));
  });
  test('rejects oversized source or hashtags',()=>{
    assert.throws(()=>createLocalCaptionDrafts({description:'a'.repeat(601)}));
    assert.throws(()=>createLocalCaptionDrafts({description:'Useful post',hashtags:'a'.repeat(151)}));
  });
  test('normalizes multiline input without inventing context',()=>{
    const r=createLocalCaptionDrafts({description:'Fresh   update\n for users'});
    assert.match(r.drafts[1].text,/Fresh update for users/);
  });
});
