import {REAL_AI_MODEL} from './realAiModelCatalog.mjs';

export function realCaptionPayload(description) {
  if (typeof description !== 'string') throw new Error('Description must be text.');
  const clean=description.trim();
  if (clean.length<3 || clean.length>1200) throw new Error('Description must be 3-1200 characters.');
  return Object.freeze({model:REAL_AI_MODEL,store:false,reasoning:{effort:'none'},max_output_tokens:220,
    instructions:'Write one concise, natural social media caption using only the user description. Do not claim to see an image. Do not add unverified claims.',
    input:clean});
}
export function parseRealCaptionResponse(data) {
  if (!data || data.status!=='completed' || data.model!==REAL_AI_MODEL || !Array.isArray(data.output)) {
    throw new Error('Unverifiable provider response.');
  }
  const text=data.output.filter(x=>x?.type==='message').flatMap(x=>Array.isArray(x.content)?x.content:[])
    .filter(x=>x?.type==='output_text' && typeof x.text==='string').map(x=>x.text).join('\n').trim();
  if (!text || text.length>4000) throw new Error('Invalid bounded caption output.');
  const inputTokens=data.usage?.input_tokens, outputTokens=data.usage?.output_tokens;
  if (!Number.isSafeInteger(inputTokens)||inputTokens<=0||!Number.isSafeInteger(outputTokens)||outputTokens<0) {
    throw new Error('Missing actual provider usage.');
  }
  return Object.freeze({status:'SUCCESS',provider:'openai',model:REAL_AI_MODEL,text,
    usage:Object.freeze({inputTokens,outputTokens})});
}
/** SERVER ONLY. NEVER called by this installer / no public route. In any future
 * route enabled/serverApproval MUST come from reviewed server-side permission.
 * Unknown outcome after fetch: no retry; hold quota for reconciliation. */
export async function requestRealCaption({description,enabled=false,serverApproval=false,apiKey,fetchFn,timeoutMs=20000}={}) {
  if (enabled!==true || serverApproval!==true) throw new Error('PAID_DISPATCH_BLOCKED');
  const body=realCaptionPayload(description);
  if (typeof apiKey!=='string' || !apiKey.startsWith('sk-')) throw new Error('Missing API secret.');
  if (typeof fetchFn!=='function') throw new Error('Server transport is required.');
  if (!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>20000) throw new Error('Invalid timeout.');
  const response=await fetchFn('https://api.openai.com/v1/responses',{
    method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(timeoutMs)});
  if (!response?.ok) throw new Error('OpenAI request outcome requires review; no retry.');
  return parseRealCaptionResponse(await response.json());
}
