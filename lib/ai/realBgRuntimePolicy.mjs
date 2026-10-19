/** Phase21 Stage08 guarded paid runtime. No implicit permission or credits. */
const required = Object.freeze([
  'AI_BG_REAL_ENABLED',
  'AI_BG_REAL_SPEND_APPROVED',
  'AI_BG_PRIVATE_B2_WRITE_ENABLED',
  'AI_BG_PRIVATE_B2_OPERATOR_APPROVED',
]);
export function assessBgRuntime(env = {}) {
  if (!env || required.some(key => env[key] !== 'true'))
    return Object.freeze({allowed:false,reason:'OPERATOR_SWITCHES_OFF'});
  if (typeof env.REMOVE_BG_API_KEY !== 'string' || env.REMOVE_BG_API_KEY.trim().length < 12)
    return Object.freeze({allowed:false,reason:'VENDOR_KEY_UNAVAILABLE'});
  for (const key of ['B2_ENDPOINT','B2_REGION','B2_BUCKET_NAME','B2_KEY_ID','B2_APPLICATION_KEY']) {
    if (typeof env[key] !== 'string' || env[key].trim().length < 3)
      return Object.freeze({allowed:false,reason:'PRIVATE_STORAGE_UNAVAILABLE'});
  }
  return Object.freeze({allowed:true,reason:null});
}
export function assessBgRead(env = {}) {
  return Object.freeze({allowed:env?.AI_BG_PRIVATE_B2_READ_ENABLED === 'true',
    reason:env?.AI_BG_PRIVATE_B2_READ_ENABLED === 'true' ? null : 'PRIVATE_READ_DISABLED'});
}
