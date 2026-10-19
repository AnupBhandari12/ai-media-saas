/**
 * Local-only MOCK caption HTTP core.
 * No paid model, provider adapter, tokens, reservation, or mutation here.
 * The caller MUST supply authenticated userId from server-side Clerk auth.
 * The caller MUST supply a server-controlled enable flag (never a body field).
 */
export const CAPTION_PREVIEW_MAX_BYTES = 4096;

export function isLocalCaptionPreviewEnabled({ nodeEnv, flag } = {}) {
  return nodeEnv === "development" && flag === "1";
}

function fail(status, message) {
  return { status, body: { error: message } };
}

async function readLimitedJson(request) {
  // Do not rely on Content-Length alone; callers may omit or forge it.
  const length = request.headers.get("content-length");
  if (length && /^\d+$/.test(length) && Number(length) > CAPTION_PREVIEW_MAX_BYTES) {
    return { error: fail(413, "Request body too large.") };
  }

  if (!request.body || typeof request.body.getReader !== "function") {
    return { error: fail(400, "A JSON request body is required.") };
  }

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > CAPTION_PREVIEW_MAX_BYTES) {
        await reader.cancel().catch(() => {});
        return { error: fail(413, "Request body too large.") };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { parsed: JSON.parse(source) };
  } catch {
    return { error: fail(400, "Invalid JSON request body.") };
  }
}

export async function handleLocalCaptionPreview({
  request,
  userId,
  enabled = false,
  readQuota,
} = {}) {
  // Disabled on production/hosted services and unless explicitly opted in.
  // Guard is FIRST: no authentication, body reads, quota queries, or AI calls.
  if (enabled !== true) return fail(404, "Not found.");

  if (typeof userId !== "string" || !userId.trim()) {
    return fail(401, "Unauthorized.");
  }
  if (!request || request.method !== "POST") {
    return fail(405, "Method not allowed.");
  }

  // Same-origin only. Auth cookies should not permit cross-origin POSTs.
  let expectedOrigin;
  try {
    expectedOrigin = new URL(request.url).origin;
  } catch {
    return fail(400, "Invalid request URL.");
  }
  if (request.headers.get("origin") !== expectedOrigin) {
    return fail(403, "Cross-origin requests are not allowed.");
  }

  const mediaType = (request.headers.get("content-type") || "")
    .split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    return fail(415, "JSON content type is required.");
  }

  const { parsed, error } = await readLimitedJson(request);
  if (error) return error;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return fail(400, "Request must be a JSON object.");
  }
  const keys = Object.keys(parsed);
  if (keys.length !== 1 || keys[0] !== "description") {
    // Blocks client-side overrides such as enabled, mode, model, provider.
    return fail(400, "Only description is supported.");
  }
  if (typeof parsed.description !== "string") {
    return fail(400, "Description must be text.");
  }
  const description = parsed.description.trim();
  if (description.length < 3 || description.length > 1200) {
    return fail(400, "Description must contain 3 to 1200 characters.");
  }

  if (typeof readQuota !== "function") {
    throw new Error("AI quota reader is not configured.");
  }
  const snapshot = await readQuota(userId.trim());

  return {
    status: 200,
    body: {
      mode: "MOCK_ONLY",
      generated: false,
      quotaConsumed: false,
      // Intentionally obvious fake text, never represented as AI generation.
      text: `MOCK PREVIEW ONLY — ${description}`,
      quota: {
        allowed: snapshot.allowed,
        daily: snapshot.daily,
        monthly: snapshot.monthly,
      },
    },
  };
}
