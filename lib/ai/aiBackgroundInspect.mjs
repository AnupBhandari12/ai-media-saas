/**
 * Phase 21 / Commit 10H: LOCAL-DEVELOPMENT ONLY image inspection core.
 * This is NOT background removal or paid-action permission.
 * Auth identity, decoded pixel inspection, and read-only AI quota must be
 * supplied from trusted server code, NEVER from HTTP body or query strings.
 */
export const BG_INSPECT_PROVIDER_DISPATCH_ENABLED = false;
export const BG_INSPECT_DATABASE_WRITES_ENABLED = false;
export const BG_INSPECT_MAX_INPUT_BYTES = 4 * 1024 * 1024;
export const BG_INSPECT_MAX_PIXELS = 4_000_000;
const MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function fail(status, error) {
  return { status, body: { error } };
}
export function isLocalBgInspectEnabled({ nodeEnv, flag, host } = {}) {
  return nodeEnv === 'development' && flag === '1' && LOCAL_HOSTS.has(host);
}

/** Read the stream under an absolute cap, whether or not Content-Length is honest. */
export async function readBoundedBackgroundBytes(request) {
  const advertised = request?.headers?.get?.('content-length');
  if (advertised !== null && advertised !== undefined && advertised !== '') {
    if (!/^\d+$/.test(advertised)) return { error: fail(400, 'Invalid Content-Length.') };
    if (Number(advertised) > BG_INSPECT_MAX_INPUT_BYTES) return { error: fail(413, 'Image too large.') };
  }
  if (!request?.body || typeof request.body.getReader !== 'function') {
    return { error: fail(400, 'Image bytes are required.') };
  }
  const reader = request.body.getReader();
  let total = 0;
  const parts = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) return { error: fail(400, 'Invalid image stream.') };
      total += value.byteLength;
      if (total > BG_INSPECT_MAX_INPUT_BYTES) {
        await reader.cancel().catch(() => {});
        return { error: fail(413, 'Image too large.') };
      }
      parts.push(value);
    }
  } catch {
    return { error: fail(400, 'Unable to read image bytes.') };
  } finally {
    reader.releaseLock();
  }
  if (total < 12) return { error: fail(400, 'Image is empty or invalid.') };
  const bytes = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { bytes.set(p, at); at += p.byteLength; }
  return { bytes };
}

export async function handleLocalBackgroundInspect({ request, userId, enabled = false, inspectImage, readQuota } = {}) {
  // Critical: disabled feature does not read auth/DB/body or create a network call.
  if (enabled !== true) return fail(404, 'Not found.');
  if (typeof userId !== 'string' || !userId.trim() || userId !== userId.trim()) {
    return fail(401, 'Unauthorized.');
  }
  if (!request || request.method !== 'POST' || !request.headers?.get) return fail(405, 'Method not allowed.');
  let url;
  try { url = new URL(request.url); } catch { return fail(400, 'Invalid request URL.'); }
  if (!LOCAL_HOSTS.has(url.hostname) || request.headers.get('origin') !== url.origin) {
    return fail(403, 'Same-origin localhost request required.');
  }
  if (url.search || url.hash) return fail(400, 'Query parameters are not accepted.');
  const contentType = request.headers.get('content-type');
  // No JSON, multipart, form fields, or provider-enable switches. Raw binary only.
  if (!MIMES.has(contentType)) return fail(415, 'PNG, JPEG or WebP bytes required.');
  const { bytes, error } = await readBoundedBackgroundBytes(request);
  if (error) return error;
  if (typeof inspectImage !== 'function' || typeof readQuota !== 'function') {
    throw new Error('Trusted server dependencies are missing.');
  }
  let inspected;
  try {
    inspected = await inspectImage({ ownerId: userId, imageBytes: bytes, declaredMimeType: contentType });
  } catch {
    return fail(422, 'The image failed safe server-side inspection.');
  }
  if (!inspected || inspected.ownerId !== userId || inspected.serverDecoded !== true ||
      inspected.preparation !== 'FULL_RGBA_DECODED' || inspected.mimeType !== contentType ||
      !Number.isSafeInteger(inspected.width) || !Number.isSafeInteger(inspected.height) ||
      inspected.width < 1 || inspected.height < 1 ||
      inspected.width * inspected.height > BG_INSPECT_MAX_PIXELS ||
      !(inspected.imageBytes instanceof Uint8Array) || inspected.imageBytes.byteLength !== bytes.byteLength) {
    return fail(422, 'The image failed safe server-side inspection.');
  }
  const quota = await readQuota(userId);
  if (!quota || typeof quota.allowed !== 'boolean' || !quota.daily || !quota.monthly) {
    throw new Error('Read-only AI quota snapshot unavailable.');
  }
  return {
    status: 200,
    body: {
      mode: 'LOCAL_INSPECTION_ONLY',
      verified: true,
      backgroundRemoved: false,
      providerCalled: false,
      quotaConsumed: false,
      uploadedToCloud: false,
      image: {
        mimeType: inspected.mimeType,
        width: inspected.width,
        height: inspected.height,
        bytes: inspected.imageBytes.byteLength,
      },
      quota: { allowed: quota.allowed, daily: quota.daily, monthly: quota.monthly },
    },
  };
}
