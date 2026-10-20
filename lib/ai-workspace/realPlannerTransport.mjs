// Server-only provider transport: never import into a client component.
import { REAL_AI_MODEL } from "../ai/realAiModelCatalog.mjs";
import { WORKSPACE_PLANNER_SCHEMA, PLANNER_SYSTEM_INSTRUCTIONS, validatePlannerChoice } from "./realPlannerContract.js";

export function buildPlannerProviderPayload(prompt) {
  if (typeof prompt !== "string" || prompt.trim().length < 3 || prompt.length > 500) {
    throw new Error("Invalid planner prompt.");
  }
  return {
    model: REAL_AI_MODEL,
    store: false,
    reasoning: {effort: "none"},
    max_output_tokens: 220,
    instructions: PLANNER_SYSTEM_INSTRUCTIONS,
    input: prompt.trim(),
    text: {format: {type: "json_schema", name: "media_workspace_choice", strict: true, schema: WORKSPACE_PLANNER_SCHEMA}},
  };
}

export function parsePlannerProviderResponse(data) {
  if (!data || data.status !== "completed" || data.model !== REAL_AI_MODEL || !Array.isArray(data.output)) {
    throw new Error("Unverifiable planner response.");
  }
  const pieces = data.output.filter((item) => item?.type === "message")
    .flatMap((item) => Array.isArray(item.content) ? item.content : []);
  if (pieces.some((item) => item?.type === "refusal")) throw new Error("Model refused this request.");
  const text = pieces.filter((item) => item?.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text).join("").trim();
  const inputTokens = data.usage?.input_tokens;
  const outputTokens = data.usage?.output_tokens;
  if (!Number.isSafeInteger(inputTokens) || inputTokens < 1 || inputTokens > 20000 ||
      !Number.isSafeInteger(outputTokens) || outputTokens < 1 || outputTokens > 220) {
    throw new Error("Missing or unexpected planner usage.");
  }
  return Object.freeze({
    selection: validatePlannerChoice(text),
    text,
    model: REAL_AI_MODEL,
    usage: Object.freeze({inputTokens, outputTokens}),
  });
}

// An approval flag from the server is required even when a test supplies fetchFn.
export async function requestRealWorkspacePlan({prompt, serverApproval=false, apiKey, fetchFn=fetch, timeoutMs=20000}={}) {
  if (serverApproval !== true) throw new Error("PAID_PLANNER_DISPATCH_BLOCKED");
  if (typeof apiKey !== "string" || !apiKey.startsWith("sk-")) throw new Error("Missing server API key.");
  if (typeof fetchFn !== "function" || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 20000) {
    throw new Error("Invalid planner transport configuration.");
  }
  const payload = buildPlannerProviderPayload(prompt);
  const response = await fetchFn("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json"},
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response?.ok) throw new Error("AI provider result requires review; do not retry automatically.");
  return parsePlannerProviderResponse(await response.json());
}
