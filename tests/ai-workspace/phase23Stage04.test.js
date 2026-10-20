import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { CANONICAL_PROMPTS } from "../../lib/ai-workspace/canonicalPrompts.js";
import { understandWorkspacePrompt } from "../../lib/ai-workspace/interpretPrompt.js";
import { createWorkspaceLocalRunOffer, runWorkspaceWebsiteReady } from "../../lib/ai-workspace/localExecutionBridge.js";

const planFor = (id) => {
  const example = CANONICAL_PROMPTS.find((p) => p.workflowId === id);
  const outcome = understandWorkspacePrompt(example.prompt);
  expect(outcome.kind).toBe("PLAN");
  return outcome.plan;
};
const makeFile = (size = 200, type = "image/png") => new File([new Uint8Array(size)], "photo.png", { type });
const doneResult = (file, settings) => ({
  blob: new Blob([new Uint8Array(50)], { type: settings.outputMimeType }),
  filename: "photo-website-ready.webp",
  processingMode: "BROWSER_LOCAL",
  trace: ["IMG-03", "IMG-05", "IMG-14", "IMG-02"].map((id) => ({ id, status: "COMPLETED" })),
});

describe("Phase 23 Stage 04 — Website Ready local execution bridge", () => {
  test("all 10 plans require acknowledgment before any local run offer", () => {
    for (const {workflowId} of CANONICAL_PROMPTS) {
      const offer = createWorkspaceLocalRunOffer(planFor(workflowId), false);
      expect(offer.kind).toBe("REVIEW_REQUIRED");
      expect(offer.canRun).toBe(false);
    }
  });

  test("Website Ready offers only the frozen, registered default sequence", () => {
    const offer = createWorkspaceLocalRunOffer(planFor("WF-06"), true);
    expect(offer.kind).toBe("BROWSER_LOCAL_WEBSITE_READY");
    expect(offer.canRun).toBe(true);
    expect(offer.steps).toEqual(["IMG-03", "IMG-05", "IMG-14", "IMG-02"]);
    expect(offer.settings).toEqual({longSide:1600, targetKb:400, outputMimeType:"image/webp"});
    expect(Object.isFrozen(offer)).toBe(true);
    expect(Object.isFrozen(offer.settings)).toBe(true);
  });

  test("other nine variants only link to existing workflow pages", () => {
    for (const {workflowId} of CANONICAL_PROMPTS) {
      if (workflowId === "WF-06") continue;
      const offer = createWorkspaceLocalRunOffer(planFor(workflowId), true);
      expect(offer.kind).toBe("OPEN_EXISTING_WORKFLOW");
      expect(offer.href.startsWith("/workflows/")).toBe(true);
      expect(offer.canRun).toBe(false);
    }
  });

  test("rejects execution without acknowledgment, including the string 'true'", async () => {
    const plan = planFor("WF-06");
    for (const value of [false, null, "true", undefined]) {
      await expect(runWorkspaceWebsiteReady(plan, value, makeFile(), {runner: doneResult})).rejects.toThrow();
    }
  });

  test("rejects spoofed workflow IDs, step order, unknown keys, and approval flags", () => {
    const plan = planFor("WF-06");
    for (const tampered of [
      {...plan, workflowId:"WF-01"},
      {...plan, steps: [...plan.steps].reverse()},
      {...plan, command:"bash"},
      {...plan, executable:true},
      {...plan, costUsd:100},
    ]) expect(() => createWorkspaceLocalRunOffer(tampered, true)).toThrow();
  });

  test("rejects invalid files and never calls runner for them", async () => {
    const plan = planFor("WF-06");
    let count = 0;
    const runner = () => {count++;return doneResult();};
    for (const file of [null, new File([],"empty.jpg",{type:"image/jpeg"}),
      new File(["hello"],"x.txt",{type:"text/plain"}), makeFile(11*1024*1024)]) {
      await expect(runWorkspaceWebsiteReady(plan, true, file, {runner})).rejects.toThrow();
    }
    expect(count).toBe(0);
  });

  test("passes verified default settings to existing processor on explicit run", async () => {
    const plan = planFor("WF-06");
    const file = makeFile();
    const stepCalls = [];
    let invoked = 0;
    const runner = async (input, settings, options) => {
      invoked++;
      expect(input).toBe(file);
      expect(settings).toEqual({longSide:1600,targetKb:400,outputMimeType:"image/webp"});
      for (const id of ["IMG-03", "IMG-05", "IMG-14", "IMG-02"]) {
        options.onStep({id,status:"COMPLETED"});
      }
      return doneResult(file, settings);
    };
    const result = await runWorkspaceWebsiteReady(plan, true, file, {
      runner, onStep: event => stepCalls.push(event.id), signal: new AbortController().signal,
    });
    expect(result.filename).toBe("photo-website-ready.webp");
    expect(result.blob.size).toBe(50);
    expect(stepCalls).toEqual(["IMG-03", "IMG-05", "IMG-14", "IMG-02"]);
    expect(invoked).toBe(1);
  });

  test("fails closed for aborted requests and invalid runner output", async () => {
    const plan = planFor("WF-06");
    const file = makeFile();
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    await expect(runWorkspaceWebsiteReady(plan,true,file,{
      signal:controller.signal, runner:()=>{calls++;return doneResult(file,{outputMimeType:"image/webp"})}
    })).rejects.toThrow();
    expect(calls).toBe(0);
    for (const bad of [null, {...doneResult(file,{outputMimeType:"image/webp"}), filename:"../../secret.pdf"},
      {...doneResult(file,{outputMimeType:"image/webp"}), processingMode:"REMOTE"},
      {...doneResult(file,{outputMimeType:"image/webp"}), trace:[]},
      {...doneResult(file,{outputMimeType:"image/webp"}),blob:new Blob(["x"],{type:"text/plain"})}]) {
      await expect(runWorkspaceWebsiteReady(plan,true,file,{runner:()=>bad})).rejects.toThrow();
    }
  });

  test("guarded UI integration contains an explicit Run button and plan-change key", () => {
    const review = readFileSync("components/ai-workspace/WorkspacePlanReview.jsx", "utf8");
    const ui = readFileSync("components/ai-workspace/WorkspaceWebsiteRun.jsx", "utf8");
    const understanding = readFileSync("components/ai-workspace/AiWorkspaceUnderstanding.jsx", "utf8");
    expect(review).toContain("<WorkspaceWebsiteRun plan={plan} />");
    expect(review).toContain('plan.workflowId === "WF-06"');
    expect(ui).toContain("onClick={runLocal}");
    expect(ui).toContain("URL.revokeObjectURL");
    expect(understanding).toContain("<WorkspacePlanReview key={");
  });
});
