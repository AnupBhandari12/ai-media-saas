// Shared security boundaries for optional history HTTP mutations.
export const historyHeaders = Object.freeze({
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
});
export function historyReply(data, status = 200) {
  return Response.json(data, { status, headers: historyHeaders });
}
export function validHistoryOrigin(request) {
  try { return request.headers.get("origin") === new URL(request.url).origin; }
  catch { return false; }
}
export async function readHistoryJson(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || "")) {
    throw new Error("JSON_REQUIRED");
  }
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > 3200)) {
    throw new Error("TOO_LARGE");
  }
  if (!request.body) throw new Error("INVALID_BODY");
  const reader = request.body.getReader();
  const chunks = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 3200) throw new Error("TOO_LARGE");
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new Error("INVALID_BODY"); }
}
