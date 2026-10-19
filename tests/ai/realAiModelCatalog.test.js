import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {REAL_AI_MODEL,estimateRealAiUsd,getRealAiModelReview} from '../../lib/ai/realAiModelCatalog.mjs';
test('official model id confirmed and not substituted',()=>assert.equal(REAL_AI_MODEL,'gpt-6-luna'));
test('conservative full-rate price math',()=>assert.equal(estimateRealAiUsd({inputTokens:1000000,outputTokens:1000000}),0.6));
test('zero tokens are valid',()=>assert.equal(estimateRealAiUsd({inputTokens:0,outputTokens:0}),0));
test('bad usage fails closed',()=>assert.throws(()=>estimateRealAiUsd({inputTokens:-1,outputTokens:20})));
test('model review never approves paid spend',()=>assert.equal(getRealAiModelReview().paidDispatchAllowed,false));
