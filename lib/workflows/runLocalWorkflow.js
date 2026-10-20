// Shared strictly bounded pipeline helper; no dynamic imports, endpoints, provider or shell access.
const APPROVED_SEQUENCES = Object.freeze([
  Object.freeze(["IMG-03", "IMG-05", "IMG-14", "IMG-02"]),
  Object.freeze(["IMG-05", "IMG-02"]),
  Object.freeze(["IMG-02"]),
  Object.freeze(["IMG-10", "IMG-02"]),
  Object.freeze(["IMG-08", "IMG-03", "IMG-01"]),
]);
function isApprovedSequence(steps) {
  return Array.isArray(steps) && APPROVED_SEQUENCES.some((approved) =>
    steps.length === approved.length && approved.every((id, i) => id === steps[i]));
}

export async function runApprovedLocalSteps({steps, input, operations, onStep, signal}) {
  if (!isApprovedSequence(steps)) {
    throw new Error("This workflow step list is not approved.");
  }
  if (!operations || typeof operations !== "object") throw new Error("No processing operations configured.");
  let current = input;
  const trace = [];
  for (const [index, id] of steps.entries()) {
    if (signal?.aborted) throw new DOMException("Workflow cancelled.", "AbortError");
    const operation = operations[id];
    if (typeof operation !== "function") throw new Error("Processing adapter unavailable.");
    onStep?.({id, index, status: "PROCESSING"});
    try {
      const outcome = await operation(current);
      if (!outcome || !outcome.file || !["COMPLETED", "SKIPPED"].includes(outcome.status)) {
        throw new Error("Processor returned an invalid output.");
      }
      current = outcome.file;
      const item = Object.freeze({id, index, status: outcome.status, size: current.size});
      trace.push(item);
      onStep?.(item);
    } catch (error) {
      onStep?.({id, index, status: "FAILED"});
      throw error;
    }
  }
  if (signal?.aborted) throw new DOMException("Workflow cancelled.", "AbortError");
  return Object.freeze({file: current, trace: Object.freeze(trace)});
}
