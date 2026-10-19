import {describe,test} from 'node:test';
import assert from 'node:assert/strict';
import {LOCAL_MAX_PIXELS,removeConnectedSolidColor} from '../../lib/ai/localSolidBackground.mjs';
const make=(width,height,rgb=[255,255,255])=>{
 const x=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<width*height;i++)x.set([...rgb,255],i*4);
 return x;
};
describe('Phase 21 local-only solid-color removal',()=>{
 test('removes connected white background but keeps colored subject',()=>{
  const source=make(3,3);source.set([255,0,0,255],4*4);
  const r=removeConnectedSolidColor({rgba:source,width:3,height:3,tolerance:0});
  assert.equal(r.removedPixels,8);assert.equal(r.rgba[4*4+3],255);
  assert.equal(r.rgba[3],0);assert.equal(source[3],255);
  assert.equal(r.aiGenerated,false);
 });
 test('one pixel',()=>assert.equal(removeConnectedSolidColor({rgba:make(1,1),width:1,height:1}).removedPixels,1));
 test('isolated same-color island untouched',()=>{
  const p=make(3,1);p.set([0,0,0,255],4);
  const r=removeConnectedSolidColor({rgba:p,width:3,height:1,tolerance:0});
  assert.equal(r.removedPixels,1);assert.equal(r.rgba[11],255);
 });
 test('rejects malformed inputs',()=>{
  assert.throws(()=>removeConnectedSolidColor({rgba:make(2,2),width:3,height:3}));
  assert.throws(()=>removeConnectedSolidColor({rgba:make(2,2),width:2,height:2,tolerance:999}));
 });
 test('limits huge pixel arrays',()=>assert.throws(()=>removeConnectedSolidColor({rgba:new Uint8Array(0),width:LOCAL_MAX_PIXELS+1,height:1})));
 test('rejects out of bounds click',()=>assert.throws(()=>removeConnectedSolidColor({rgba:make(2,2),width:2,height:2,x:2})));
 test('tolerance can remove neighboring offwhite',()=>{
  const p=make(2,1);p.set([250,250,250,255],4);
  assert.equal(removeConnectedSolidColor({rgba:p,width:2,height:1,tolerance:10}).removedPixels,2);
 });
});
