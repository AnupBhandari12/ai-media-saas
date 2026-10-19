import {REAL_AI_MODEL} from './realAiModelCatalog.mjs';
const MIMES=new Set(['image/png','image/jpeg','image/webp']);
export function makeVisionPayload({mimeType,bytes,width,height}={}) {
  if (!MIMES.has(mimeType) || !(bytes instanceof Uint8Array) || bytes.length<64 || bytes.length>2_000_000) {
    throw new Error('Trusted bounded image bytes required.');
  }
  if (!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>4096||height>4096||width*height>4_000_000) {
    throw new Error('Invalid trusted decoded image dimensions.');
  }
  // Caller must supply bytes after full decoder validation of actual format,
  // not unchecked client metadata or public URL. This module is not a decoder.
  const base64=Buffer.from(bytes).toString('base64');
  return {model:REAL_AI_MODEL,store:false,reasoning:{effort:'none'},max_output_tokens:180,
    instructions:'Write a factual, concise accessibility alt text description. Describe only clearly visible objects and relevant context. Do not infer identities, health, or unverified details.',
    input:[{role:'user',content:[{type:'input_text',text:'Describe this image for accessible alt text.'},
      {type:'input_image',detail:'low',image_url:`data:${mimeType};base64,${base64}`}]}]};
}
export function parseVisionAltText(data) {
  if (!data || data.status!=='completed'||data.model!==REAL_AI_MODEL||!Array.isArray(data.output)) throw new Error('Unverified vision response.');
  const text=data.output.filter(x=>x?.type==='message').flatMap(x=>Array.isArray(x.content)?x.content:[])
    .filter(x=>x?.type==='output_text'&&typeof x.text==='string').map(x=>x.text).join('\n').trim();
  if (!text || text.length>1200 || !Number.isSafeInteger(data.usage?.input_tokens) || data.usage.input_tokens<=0 ||
    !Number.isSafeInteger(data.usage?.output_tokens) || data.usage.output_tokens<0) throw new Error('Invalid vision text or usage.');
  return {status:'SUCCESS',provider:'openai',model:REAL_AI_MODEL,text,
    usage:{inputTokens:data.usage.input_tokens,outputTokens:data.usage.output_tokens}};
}
/** Server-only; consumes billable image tokens if explicitly enabled later. */
export async function requestRealAltText({image,enabled=false,serverApproval=false,apiKey,fetchFn}={}) {
  if (enabled!==true||serverApproval!==true) throw new Error('VISION_DISPATCH_BLOCKED');
  if (typeof apiKey!=='string'||!apiKey.startsWith('sk-')||typeof fetchFn!=='function') throw new Error('Secret and transport required.');
  const body=makeVisionPayload(image);
  const response=await fetchFn('https://api.openai.com/v1/responses',{method:'POST',
    headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  if (!response?.ok) throw new Error('Unknown vision outcome. No automatic retry.');
  return parseVisionAltText(await response.json());
}
